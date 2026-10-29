import { z } from "zod";
import { cellKey } from "@/lib/server/schemas";
import { col } from "@street-wolf/db";
import { requireRole } from "@/lib/server/access";
import { api, body, notFound, ok } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/ratelimit";
import { applyChanges, readSheet } from "@/lib/server/sheets";
import { requireBrowserUser } from "@/lib/server/session";
import { validTz } from "@/lib/server/workspace";

type P = { id: string; did: string; pid: string };

async function place(id: string, did: string, pid: string) {
  const p = await (await col("places")).findOne({ _id: pid, campaignId: id, domainId: did });
  if (!p) throw notFound("Place not found");
  return p;
}

export const GET = api<P>(async (req, { id, did, pid }) => {
  const user = await requireBrowserUser(req);
  await requireRole(id, user._id);
  const p = await place(id, did, pid);
  const cursor = Date.now(); // taken before the read, so anything written while we read shows up in the first live sync
  return ok({ ...(await readSheet(pid)), stats: p.stats, cursor });
});

const Change = z.object({
  row: z.number().int().min(0).max(199_999),
  cells: z.record(cellKey, z.string().max(5000)).nullable().refine((c) => !c || Object.keys(c).length <= 60, "Too many columns"),
  label: z.string().max(60).nullable(),
});

/** Changed rows only. The browser debounces, and a burst of edits arrives as one request. */
export const PATCH = api<P>(async (req, { id, did, pid }) => {
  const user = await requireBrowserUser(req);
  await requireRole(id, user._id);
  await place(id, did, pid);
  await rateLimit("sheet-write", user._id, 600, 60);
  const { changes, tz } = await body(req, z.object({ changes: z.array(Change).min(1).max(5000), tz: z.string().optional() }), 8_000_000);
  // The browser's timezone decides what "today" means for this person's outreach. Stored only when it changes.
  const zone = validTz(tz) ? tz : user.tz;
  if (validTz(tz) && tz !== user.tz) await (await col("users")).updateOne({ _id: user._id }, { $set: { tz } });
  const dedup = [...new Map(changes.map((c) => [c.row, c])).values()]; // last write per row wins
  return ok(await applyChanges({ campaignId: id, placeId: pid, userId: user._id, tz: zone, changes: dedup }));
});
