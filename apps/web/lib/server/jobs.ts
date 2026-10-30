import "server-only";
import { col, type Job } from "@street-wolf/db";
import { requireRole } from "./access";
import { forbidden, notFound } from "./http";
import type { requireUser } from "./session";

/** A worker pings every few seconds; this long without any sign of life means it crashed or lost its connection. */
export const JOB_STALE_MS = 3 * 60_000;

/** A job nobody's scraper picked up within this long is given up on, so it can't block the sheet for everybody. */
export const JOB_QUEUED_MS = 30 * 60_000;

/**
 * Fails running jobs whose worker went silent. Without this, a crashed scraper leaves the job "running" forever and the
 * sheet can never be scraped again ("already has a scrape running"). Cheap: one indexed updateMany, run when the state is read.
 */
export async function reapStaleJobs(scope: { placeId?: string; campaignId?: string }) {
  const cutoff = new Date(Date.now() - JOB_STALE_MS);
  // Queued but never claimed (the person's scraper is off, or they left the team): the sheet would stay "busy" forever.
  await (await col("jobs")).updateMany(
    { ...scope, status: "queued", createdAt: { $lt: new Date(Date.now() - JOB_QUEUED_MS) } },
    { $set: { status: "failed", error: "No scraper picked this up in 30 minutes. Start your scraper and try again.", finishedAt: new Date() } },
  );
  await (await col("jobs")).updateMany(
    { ...scope, status: "running", $or: [{ heartbeatAt: { $lt: cutoff } }, { heartbeatAt: { $exists: false }, startedAt: { $lt: cutoff } }, { heartbeatAt: null, startedAt: { $lt: cutoff } }] },
    { $set: { status: "failed", error: "The scraper stopped responding. Start it again to continue.", finishedAt: new Date() } },
  );
}

type Caller = Awaited<ReturnType<typeof requireUser>>;

/**
 * The only way a scraper token may touch a campaign's data: through a job that (1) the token's owner created,
 * (2) this exact token claimed and (3) is still running. The job, not the request body, decides which campaign and
 * place rows go to, so a token can never be pointed at somewhere else. Membership is re-checked on every call.
 */
export async function requireRunningJob(user: Caller, jobId: string | undefined): Promise<Job> {
  if (!user.viaToken) throw forbidden("Scraper requests need a job");
  if (!jobId) throw forbidden("Scraper requests need a jobId");
  const job = await (await col("jobs")).findOne({ _id: jobId });
  if (!job || job.createdBy !== user._id || job.claimedBy !== user.viaToken) throw notFound("Job not found");
  if (job.status !== "running") throw forbidden("That job isn't running");
  if (!job.placeId) throw forbidden("That job isn't attached to a sheet");
  await requireRole(job.campaignId, user._id);
  await (await col("jobs")).updateOne({ _id: job._id }, { $set: { heartbeatAt: new Date() } });
  return job;
}
