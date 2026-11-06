import { z } from "zod";
import { col } from "@street-wolf/db";
import { requireRole } from "@/lib/server/access";
import { newId } from "@/lib/server/crypto";
import { api, bad, body, conflict, notFound, ok, uuid } from "@/lib/server/http";
import { reapStaleJobs } from "@/lib/server/jobs";
import { scrapers } from "@/lib/server/platforms";
import { rateLimit } from "@/lib/server/ratelimit";
import { requireBrowserUser } from "@/lib/server/session";

const Body = z.object({ campaignId: uuid, placeId: uuid.nullable().default(null), tool: z.string().max(40), input: z.unknown() });

/** The dashboard asks for a scrape; the local worker claims it (see /api/jobs/claim). */
export const POST = api(async (req) => {
  const user = await requireBrowserUser(req);
  const b = await body(req, Body, 200_000);
  await requireRole(b.campaignId, user._id);
  await rateLimit("job-create", user._id, 60, 3600);
  if (b.placeId && !(await (await col("places")).findOne({ _id: b.placeId, campaignId: b.campaignId }))) throw notFound("Place not found");
  // Each platform checks its own job input (platforms/<name>/server.ts).
  const platform = scrapers[b.tool as keyof typeof scrapers];
  if (!platform) throw bad("That platform can't scrape yet");
  const checked = platform.parseJobInput(b.input, b.placeId);
  if ("error" in checked) throw bad(checked.error);
  b.input = checked.input;
  const jobs = await col("jobs");
  await reapStaleJobs(b.placeId ? { placeId: b.placeId } : { campaignId: b.campaignId });
  if (b.placeId && (await jobs.findOne({ placeId: b.placeId, status: { $in: ["queued", "running"] } }, { projection: { _id: 1 } }))) throw conflict("This sheet already has a scrape running");
  if ((await jobs.countDocuments({ campaignId: b.campaignId, status: { $in: ["queued", "running"] } })) >= 50) throw conflict("Too many jobs are already waiting on this campaign");
  const id = newId();
  await jobs.insertOne({ _id: id, campaignId: b.campaignId, placeId: b.placeId, tool: b.tool as keyof typeof scrapers, input: b.input, status: "queued", progress: 0, leadsFound: 0, error: null, createdBy: user._id, claimedBy: null, createdAt: new Date(), startedAt: null, finishedAt: null });
  return ok({ id }, { status: 201 });
});

export const GET = api(async (req) => {
  const user = await requireBrowserUser(req);
  const campaignId = uuid.parse(req.nextUrl.searchParams.get("campaignId"));
  await requireRole(campaignId, user._id);
  const pid = req.nextUrl.searchParams.get("placeId");
  const j = await (await col("jobs")).find({ campaignId, ...(pid ? { placeId: uuid.parse(pid) } : {}) }).sort({ createdAt: -1 }).limit(50).toArray();
  return ok({ jobs: j.map((x) => ({ id: x._id, tool: x.tool, placeId: x.placeId, status: x.status, progress: x.progress, leadsFound: x.leadsFound, error: x.error, at: x.createdAt.getTime() })) });
});
