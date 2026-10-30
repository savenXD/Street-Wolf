import { col } from "@street-wolf/db";
import { requireRole } from "@/lib/server/access";
import { api, notFound, ok } from "@/lib/server/http";
import { reapStaleJobs } from "@/lib/server/jobs";
import { rateLimit } from "@/lib/server/ratelimit";
import { requireBrowserUser } from "@/lib/server/session";

type P = { id: string; did: string; pid: string };

/**
 * Live view of one sheet: the newest job for the sheet plus every row (cells and label) changed since `since` (an updatedAt
 * cursor in ms). One cheap indexed query per poll. It runs for every open sheet, so teammates' edits and labels show up
 * within seconds. A big backlog is paged by (updatedAt, row): pass the last row of the previous page as `afterRow`, so rows
 * written in the same millisecond can't be skipped or repeated.
 * Every read is pinned to (campaign, domain, place), so ids from another campaign return nothing.
 */
const PAGE = 2000;

export const GET = api<P>(async (req, { id, did, pid }) => {
  const user = await requireBrowserUser(req);
  await requireRole(id, user._id);
  await rateLimit("sheet-sync", user._id, 240, 60);
  const place = await (await col("places")).findOne({ _id: pid, campaignId: id, domainId: did });
  if (!place) throw notFound("Place not found");
  const now = Date.now();
  const q = req.nextUrl.searchParams;
  const since = Math.max(0, Number(q.get("since")) || 0);
  const afterRow = q.get("afterRow") === null ? null : Number(q.get("afterRow"));
  await reapStaleJobs({ placeId: pid });
  const job = await (await col("jobs")).find({ campaignId: id, placeId: pid }).sort({ createdAt: -1 }).limit(1).next();
  const when = new Date(since);
  const changed = await (await col("leads"))
    .find(
      { placeId: pid, campaignId: id, ...(afterRow !== null && Number.isFinite(afterRow) ? { $or: [{ updatedAt: { $gt: when } }, { updatedAt: when, row: { $gt: afterRow } }] } : { updatedAt: { $gte: when } }) },
      { projection: { row: 1, cells: 1, label: 1, updatedAt: 1 } },
    )
    .sort({ updatedAt: 1, row: 1 })
    .limit(PAGE)
    .toArray();
  const last = changed[changed.length - 1];
  return ok({
    job: job && { id: job._id, status: job.status, progress: job.progress, leadsFound: job.leadsFound, error: job.error, at: job.createdAt.getTime() },
    rows: changed.map((l) => ({ row: l.row, cells: l.cells ?? {}, label: l.label ?? null })),
    more: changed.length === PAGE,
    cursor: last ? { at: last.updatedAt.getTime(), row: last.row } : null,
    now,
    stats: place.stats,
  });
});
