import { col } from "@street-wolf/db";
import { api, ok, uuid } from "@/lib/server/http";
import { requireRunningJob } from "@/lib/server/jobs";
import { requireUser } from "@/lib/server/session";

/** The sourceIds already on this job's sheet, so the scraper can skip opening businesses it already has. */
export const GET = api(async (req) => {
  const user = await requireUser(req);
  const job = await requireRunningJob(user, uuid.parse(req.nextUrl.searchParams.get("jobId")));
  const docs = await (await col("leads")).find({ placeId: job.placeId!, campaignId: job.campaignId, source: job.tool, sourceId: { $type: "string" } }, { projection: { sourceId: 1 } }).limit(100_000).toArray();
  return ok({ ids: docs.map((d) => d.sourceId) });
});
