import { col } from "@street-wolf/db";
import { api, ok } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/ratelimit";
import { requireUser } from "@/lib/server/session";

/**
 * A worker only runs jobs its own user queued, in campaigns that user still belongs to. (A teammate's scraper never picks up
 * your job, so a scrape always runs on, and is attributed to, the person who asked for it.) findOneAndUpdate makes the claim atomic.
 */
export const POST = api(async (req) => {
  const user = await requireUser(req);
  await rateLimit("job-claim", user._id, 60, 60);
  const ids = (await (await col("members")).find({ userId: user._id }, { projection: { campaignId: 1 } }).toArray()).map((m) => m.campaignId);
  const job = await (await col("jobs")).findOneAndUpdate(
    { status: "queued", createdBy: user._id, campaignId: { $in: ids } },
    { $set: { status: "running", startedAt: new Date(), heartbeatAt: new Date(), claimedBy: user.viaToken ?? user._id } },
    { sort: { createdAt: 1 }, returnDocument: "after" },
  );
  return ok({ job: job ? { id: job._id, campaignId: job.campaignId, placeId: job.placeId, tool: job.tool, input: job.input } : null });
});
