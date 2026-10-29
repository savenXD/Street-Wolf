import { z } from "zod";
import { col } from "@street-wolf/db";
import { api, body, ok } from "@/lib/server/http";
import { requireBrowserUser } from "@/lib/server/session";

/** Newest first, cursor-paginated on createdAt so the list stays fast however many notifications pile up. */
export const GET = api(async (req) => {
  const user = await requireBrowserUser(req);
  const q = req.nextUrl.searchParams;
  const limit = Math.min(Number(q.get("limit") ?? 30) || 30, 100);
  const before = q.get("before");
  const notifications = await col("notifications");
  const items = await notifications
    .find({ userId: user._id, ...(before && !Number.isNaN(Date.parse(before)) ? { createdAt: { $lt: new Date(before) } } : {}) })
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .toArray();
  const page = items.slice(0, limit);
  return ok({
    unread: await notifications.countDocuments({ userId: user._id, readAt: null }),
    items: page.map((n) => ({ id: n._id, type: n.type, title: n.title, body: n.body, data: n.data, read: !!n.readAt, at: n.createdAt.getTime() })),
    next: items.length > limit ? page[page.length - 1].createdAt.toISOString() : null,
  });
});

export const POST = api(async (req) => {
  const user = await requireBrowserUser(req);
  const b = await body(req, z.object({ ids: z.array(z.string()).max(200).optional(), all: z.boolean().optional() }));
  const filter = b.all ? { userId: user._id, readAt: null } : { userId: user._id, _id: { $in: b.ids ?? [] }, readAt: null };
  await (await col("notifications")).updateMany(filter, { $set: { readAt: new Date() } });
  return ok({ ok: true });
});
