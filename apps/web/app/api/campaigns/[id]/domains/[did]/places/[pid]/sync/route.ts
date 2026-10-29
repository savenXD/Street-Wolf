import { col } from "@street-wolf/db";
import { requireRole } from "@/lib/server/access";
import { api, notFound, ok } from "@/lib/server/http";
import { reapStaleJobs } from "@/lib/server/jobs";
import { rateLimit } from "@/lib/server/ratelimit";
import { requireBrowserUser } from "@/lib/server/session";

type P = { id: string; did: string; pid: string };

/**
 * Live view of one sheet while a scrape runs: the newest job for the sheet plus every row changed since `since`
 * (an updatedAt cursor in ms). One cheap indexed query per poll, only issued while a scrape is active.
 * Every read is pinned to (campaign, domain, place), so ids from another campaign return nothing.
 */
export const GET = api<P>(async (req, { id, did, pid }) => {
  const user = await requireBrowserUser(req);
  await requireRole(id, user._id);
  await rateLimit("sheet-sync", user._id, 120, 60);
  const place = await (await col("places")).findOne({ _id: pid, campaignId: id, domainId: did });
  if (!place) throw notFound("Place not found");
  const now = Date.now();
  const since = Math.max(0, Number(req.nextUrl.searchParams.get("since")) || 0);
  await reapStaleJobs({ placeId: pid });
  const job = await (await col("jobs")).find({ campaignId: id, placeId: pid }).sort({ createdAt: -1 }).limit(1).next();
  const changed = await (await col("leads")).find({ placeId: pid, campaignId: id, updatedAt: { $gte: new Date(since) } }, { projection: { row: 1, cells: 1, updatedAt: 1 } }).sort({ updatedAt: 1 }).limit(2000).toArray();
  const cursor = changed.length ? changed[changed.length - 1].updatedAt.getTime() : since;
  return ok({
    job: job && { id: job._id, status: job.status, progress: job.progress, leadsFound: job.leadsFound, error: job.error, at: job.createdAt.getTime() },
    rows: changed.map((l) => ({ row: l.row, cells: l.cells })),
    more: changed.length === 2000,
    cursor,
    now,
    stats: place.stats,
  });
});
