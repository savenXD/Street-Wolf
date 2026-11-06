import type { Job } from "@street-wolf/db";

/**
 * The searches (`queries`) and full setups (`runs`) already used on a sheet, newest first, read from its finished scrape
 * jobs, so nothing extra is stored and nothing can drift from what was really scraped. `jobs` must be sorted newest first.
 */
export function scrapeHistory(jobs: Job[]) {
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
  return { queries, runs };
}
