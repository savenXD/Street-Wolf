import { z } from "zod";
import { col } from "@street-wolf/db";
import { api, body, forbidden, notFound, ok } from "@/lib/server/http";
import { notify } from "@/lib/server/notify";
import { requireRole } from "@/lib/server/access";
import { requireUser } from "@/lib/server/session";

const Patch = z.object({ progress: z.number().min(0).max(1).optional(), leadsFound: z.number().int().min(0).optional(), status: z.enum(["running", "done", "failed", "cancelled"]).optional(), error: z.string().max(500).nullable().optional() });

export const PATCH = api<{ id: string }>(async (req, { id }) => {
  const user = await requireUser(req);
  const jobs = await col("jobs");
  const job = await jobs.findOne({ _id: id });
  if (!job) throw notFound("Job not found");
  const claimant = user.viaToken ?? user._id;
  if (job.createdBy !== user._id || (user.viaToken && job.claimedBy !== claimant)) throw forbidden("That job isn't yours");
  await requireRole(job.campaignId, user._id);
  const b = await body(req, Patch);
  // Once a job has ended (or been stopped from the dashboard) nothing can revive it; the worker just learns the status.
  if (job.status === "done" || job.status === "failed" || job.status === "cancelled") return ok({ ok: true, status: job.status });
  // Only the browser may cancel a job that hasn't been claimed; a token may only touch jobs it claimed (checked above).
  const finished = b.status && b.status !== "running";
  const res = await jobs.findOneAndUpdate({ _id: id, status: { $in: ["queued", "running"] } }, { $set: { ...b, heartbeatAt: new Date(), ...(finished ? { finishedAt: new Date() } : {}) } }, { returnDocument: "after" });
  if (!res) return ok({ ok: true, status: "cancelled" });
  if (b.status === "done") await notify(job.createdBy, "job_done", "Scrape finished", `Found ${b.leadsFound ?? job.leadsFound} leads`, { campaignId: job.campaignId });
  return ok({ ok: true, status: res.status });
});
