import { col } from "@street-wolf/db";
import { requireRole } from "@/lib/server/access";
import { api, notFound, ok } from "@/lib/server/http";
import { requireBrowserUser } from "@/lib/server/session";

type P = { id: string; did: string; pid: string };

/**
 * The searches (`queries`) and full setups (`runs`) already used on this sheet, newest first. Read from the finished scrape jobs,
 * so nothing extra is stored and nothing can drift from what was really scraped.
 */
export const GET = api<P>(async (req, { id, did, pid }) => {
  const user = await requireBrowserUser(req);
  await requireRole(id, user._id);
  if (!(await (await col("places")).findOne({ _id: pid, campaignId: id, domainId: did }, { projection: { _id: 1 } }))) throw notFound("Place not found");
  const jobs = await (await col("jobs"))
    .find({ campaignId: id, placeId: pid, status: { $in: ["done", "cancelled", "failed"] } })
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray();
  const seen = new Set<string>();
  const queries: { q: string; at: number; status: string; leads: number | null }[] = [];
  for (const j of jobs) {
    const qs = (j.input as { config?: { queries?: unknown } } | null)?.config?.queries;
    if (!Array.isArray(qs)) continue;
    for (const q of qs) {
      if (typeof q !== "string" || !q.trim() || seen.has(q.trim().toLowerCase())) continue;
      seen.add(q.trim().toLowerCase());
      // The worker reports one total per job, so it is only a per-query number when the job ran a single query.
      queries.push({ q: q.trim(), at: (j.finishedAt ?? j.createdAt).getTime(), status: j.status, leads: qs.length === 1 ? j.leadsFound : null });
    }
  }
  // Every run with the full setup it used (searches, limit, filters, columns), so a past setup can be reviewed or reused.
  const runs = jobs.flatMap((j) => {
    const c = (j.input as { config?: { queries?: unknown; limit?: unknown; fields?: unknown; filters?: unknown } } | null)?.config;
    if (!c || !Array.isArray(c.queries)) return [];
    return [{ id: j._id, at: (j.finishedAt ?? j.createdAt).getTime(), status: j.status, leads: j.leadsFound, config: { queries: c.queries, limit: c.limit, fields: c.fields, filters: c.filters } }];
  });
  return ok({ queries, runs });
});
