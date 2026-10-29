import { z } from "zod";
import { col } from "@street-wolf/db";
import { requireRole } from "@/lib/server/access";
import { newId } from "@/lib/server/crypto";
import { api, body, conflict, ok, uuid } from "@/lib/server/http";
import { requireBrowserUser } from "@/lib/server/session";

const imageUrl = z.string().trim().max(2000).url().refine((u) => /^https?:\/\//i.test(u), "Use an http(s) link").nullable().optional();

export const POST = api<{ id: string }>(async (req, { id }) => {
  const user = await requireBrowserUser(req);
  await requireRole(id, user._id);
  const b = await body(req, z.object({ id: uuid.optional(), name: z.string().trim().min(1).max(80), image: imageUrl }));
  const domains = await col("domains");
  if ((await domains.countDocuments({ campaignId: id })) >= 200) throw conflict("A campaign can have up to 200 domains");
  const last = await domains.find({ campaignId: id }).sort({ position: -1 }).limit(1).next();
  const did = b.id ?? newId();
  await domains.updateOne(
    { _id: did, campaignId: id },
    { $setOnInsert: { _id: did, campaignId: id, name: b.name, image: b.image ?? null, position: (last?.position ?? -1) + 1, createdAt: new Date() } },
    { upsert: true },
  );
  return ok({ id: did }, { status: 201 });
});
