import { z } from "zod";
import { cellKey } from "@/lib/server/schemas";
import { col } from "@street-wolf/db";
import { requireRole } from "@/lib/server/access";
import { api, body, forbidden, notFound, ok, uuid } from "@/lib/server/http";
import { requireRunningJob } from "@/lib/server/jobs";
import { rateLimit } from "@/lib/server/ratelimit";
import { requireUser } from "@/lib/server/session";
import { ingestLeads } from "@/lib/server/sheets";

const Items = z.array(z.object({ sourceId: z.string().min(1).max(300), cells: z.record(cellKey, z.string().max(5000)) })).min(1).max(1000);
const Body = z.object({ jobId: uuid.optional(), campaignId: uuid.optional(), placeId: uuid.optional(), source: z.enum(["googlemaps", "instagram", "reddit"]), items: Items });

/** Long enough for the biggest delete, save or repair; hosts that cap functions lower than this use their own limit. */
export const maxDuration = 60;

/**
 * Where scrapers push what they found. A scraper token must name a running job it claimed; the job fixes the campaign and
 * place (a body that disagrees is refused). A browser session (not a token) may still name the campaign and place directly.
 */
export const POST = api(async (req) => {
  const user = await requireUser(req);
  const b = await body(req, Body, 6_000_000);
  await rateLimit("ingest", user._id, 240, 60);
  let campaignId = b.campaignId;
  let placeId = b.placeId;
  if (user.viaToken) {
    const job = await requireRunningJob(user, b.jobId);
    if ((b.campaignId && b.campaignId !== job.campaignId) || (b.placeId && b.placeId !== job.placeId)) throw forbidden("That doesn't match the job");
    if (job.tool !== b.source) throw forbidden("That doesn't match the job");
    campaignId = job.campaignId;
    placeId = job.placeId!;
  } else {
    if (!campaignId || !placeId) throw forbidden("campaignId and placeId are required");
    await requireRole(campaignId, user._id);
  }
  if (!(await (await col("places")).findOne({ _id: placeId, campaignId }))) throw notFound("Place not found");
  return ok(await ingestLeads({ campaignId: campaignId!, placeId: placeId!, userId: user._id, source: b.source, items: b.items }));
});
