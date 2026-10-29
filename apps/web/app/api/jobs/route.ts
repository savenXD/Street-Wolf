import { z } from "zod";
import { col } from "@street-wolf/db";
import { requireRole } from "@/lib/server/access";
import { newId } from "@/lib/server/crypto";
import { api, bad, body, conflict, notFound, ok, uuid } from "@/lib/server/http";
import { reapStaleJobs } from "@/lib/server/jobs";
import { rateLimit } from "@/lib/server/ratelimit";
import { requireBrowserUser } from "@/lib/server/session";

const MapsInput = z.object({
  location: z.string().trim().max(120).default(""),
  config: z.object({
    queries: z.array(z.string().trim().min(1).max(200)).min(1).max(20),
    limit: z.union([z.literal("all"), z.number().int().min(1).max(5000)]),
    fields: z.array(z.string().regex(/^[A-Za-z0-9_-]{1,60}$/)).min(1).max(40),
    filters: z.object({
      minRating: z.number().min(0).max(5),
      minReviews: z.number().int().min(0),
      website: z.enum(["any", "has", "none"]),
      mustHavePhone: z.boolean(),
      skipClosed: z.boolean(),
      skipScraped: z.boolean(),
      exclude: z.array(z.string().max(100)).max(100),
    }),
  }),
});
const Body = z.object({ campaignId: uuid, placeId: uuid.nullable().default(null), tool: z.enum(["googlemaps", "instagram", "reddit"]), input: z.unknown() });

/** The dashboard asks for a scrape; the local worker claims it (see /api/jobs/claim). */
export const POST = api(async (req) => {
  const user = await requireBrowserUser(req);
  const b = await body(req, Body, 200_000);
  await requireRole(b.campaignId, user._id);
  await rateLimit("job-create", user._id, 60, 3600);
  if (b.placeId && !(await (await col("places")).findOne({ _id: b.placeId, campaignId: b.campaignId }))) throw notFound("Place not found");
  if (b.tool === "googlemaps") {
    if (!b.placeId) throw bad("Pick a city sheet to scrape into");
    const parsed = MapsInput.safeParse(b.input);
    if (!parsed.success) throw bad("That scrape setup isn't valid. Open Edit setup and save it again");
    b.input = parsed.data;
  }
  const jobs = await col("jobs");
  await reapStaleJobs(b.placeId ? { placeId: b.placeId } : { campaignId: b.campaignId });
  if (b.placeId && (await jobs.findOne({ placeId: b.placeId, status: { $in: ["queued", "running"] } }, { projection: { _id: 1 } }))) throw conflict("This sheet already has a scrape running");
  if ((await jobs.countDocuments({ campaignId: b.campaignId, status: { $in: ["queued", "running"] } })) >= 50) throw conflict("Too many jobs are already waiting on this campaign");
  const id = newId();
  await jobs.insertOne({ _id: id, campaignId: b.campaignId, placeId: b.placeId, tool: b.tool, input: b.input, status: "queued", progress: 0, leadsFound: 0, error: null, createdBy: user._id, claimedBy: null, createdAt: new Date(), startedAt: null, finishedAt: null });
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
