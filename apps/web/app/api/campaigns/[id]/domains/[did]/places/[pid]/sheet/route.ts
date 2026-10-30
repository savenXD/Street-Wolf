import { z } from "zod";
import { cellKey } from "@/lib/server/schemas";
import { col } from "@street-wolf/db";
import { requireRole } from "@/lib/server/access";
import { api, body, notFound, ok } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/ratelimit";
import { applyChanges, MAX_ROW, readSheet } from "@/lib/server/sheets";
import { nonOutreachIds } from "@/lib/outreach";
import { requireBrowserUser } from "@/lib/server/session";
import { validTz } from "@/lib/server/workspace";

type P = { id: string; did: string; pid: string };

async function place(id: string, did: string, pid: string) {
  const p = await (await col("places")).findOne({ _id: pid, campaignId: id, domainId: did });
  if (!p) throw notFound("Place not found");
  return p;
}

/** Long enough for the biggest delete, save or repair; hosts that cap functions lower than this use their own limit. */
export const maxDuration = 60;

export const GET = api<P>(async (req, { id, did, pid }) => {
  const user = await requireBrowserUser(req);
  await requireRole(id, user._id);
  const p = await place(id, did, pid);
  const cursor = Date.now(); // taken before the read, so anything written while we read shows up in the first live sync
  const campaign = await (await col("campaigns")).findOne({ _id: id }, { projection: { labelTree: 1 } });
  const { rows, labels, counts, complete } = await readSheet(pid, nonOutreachIds(campaign?.labelTree));
  // The rows are the truth. If the counters drifted (a save that died halfway, an old bug), opening the sheet repairs them.
  let stats = p.stats;
  if (complete && (counts.leads !== stats.leads || counts.outreached !== stats.outreached || counts.converted !== stats.converted)) {
    stats = counts;
    await (await col("places")).updateOne({ _id: pid }, { $set: { stats } });
  }
  return ok({ rows, labels, stats, cursor });
});

const Change = z
  .strictObject({
    row: z.number().int().min(0).max(MAX_ROW),
    set: z.record(cellKey, z.string().max(5000)).optional(),
    unset: z.array(cellKey).max(60).optional(),
    label: z.string().max(60).nullable().optional(),
    isNew: z.boolean().optional(),
  })
  .refine((c) => !c.set || Object.keys(c.set).length <= 60, "Too many columns")
  .refine((c) => c.set !== undefined || !!c.unset?.length || c.label !== undefined, "Nothing to change");

/** Changed rows only. The browser debounces, and a burst of edits arrives as one request. */
export const PATCH = api<P>(async (req, { id, did, pid }) => {
  const user = await requireBrowserUser(req);
  await requireRole(id, user._id);
  await place(id, did, pid);
  await rateLimit("sheet-write", user._id, 600, 60);
  const { changes, tz } = await body(req, z.object({ changes: z.array(Change).min(1).max(2000), tz: z.string().optional() }), 8_000_000);
  // The browser's timezone decides what "today" means for this person's outreach. Stored only when it changes.
  const zone = validTz(tz) ? tz : user.tz;
  if (validTz(tz) && tz !== user.tz) await (await col("users")).updateOne({ _id: user._id }, { $set: { tz } });
  return ok(await applyChanges({ campaignId: id, placeId: pid, userId: user._id, tz: zone, changes }));
});
