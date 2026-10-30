import { z } from "zod";
import { cellKey } from "@/lib/server/schemas";
import { col } from "@street-wolf/db";
import { requireRole } from "@/lib/server/access";
import { api, body, conflict, notFound, ok } from "@/lib/server/http";
import { purgeLeads, recount, releasePlaces } from "@/lib/server/sheets";
import { requireBrowserUser } from "@/lib/server/session";

const Patch = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  scrape: z.unknown().nullable().optional(), // ScrapeConfig; its shape belongs to the platform tool
  /** Columns the person just deleted in the scrape setup: their values are removed from every lead on this sheet. */
  dropFields: z.array(cellKey).max(60).optional(),
  view: z.object({ order: z.array(z.string().max(60)).max(100).optional(), widths: z.record(z.string().max(60), z.number().min(20).max(2000)).optional() }).nullable().optional(),
});

/** Long enough for the biggest delete, save or repair; hosts that cap functions lower than this use their own limit. */
export const maxDuration = 60;

export const PATCH = api<{ id: string; did: string; pid: string }>(async (req, { id, did, pid }) => {
  const user = await requireBrowserUser(req);
  await requireRole(id, user._id);
  const { dropFields, ...b } = await body(req, Patch, 200_000);
  const places = await col("places");
  if (!(await places.findOne({ _id: pid, campaignId: id, domainId: did }, { projection: { _id: 1 } }))) throw notFound("Place not found");
  if (dropFields?.length) {
    // A running scrape would write the column straight back, so it has to be stopped first.
    if (await (await col("jobs")).findOne({ placeId: pid, status: { $in: ["queued", "running"] } }, { projection: { _id: 1 } })) throw conflict("Stop the running scrape before deleting columns");
  }
  await places.updateOne({ _id: pid, campaignId: id, domainId: did }, { $set: { ...b, updatedAt: new Date() } });
  let stats: unknown;
  if (dropFields?.length) {
    const leads = await col("leads");
    // updatedAt moves so teammates' open sheets lose the column's values on their next live sync.
    await leads.updateMany({ placeId: pid, campaignId: id }, { $unset: Object.fromEntries(dropFields.map((k) => [`cells.${k}`, ""])), $set: { updatedAt: new Date() }, $pull: { edited: { $in: dropFields } } } as never);
    // A lead that has nothing left (no cells, no label) is no lead any more: it stays as an empty row (so teammates see it
    // vanish) but loses its scrape id, so a later scrape can add that business again.
    await leads.updateMany({ placeId: pid, campaignId: id, label: null, cells: {}, sourceId: { $type: "string" } }, { $set: { source: "manual", sourceId: null } });
    stats = await recount(pid);
  }
  return ok({ ok: true, stats });
});

export const DELETE = api<{ id: string; did: string; pid: string }>(async (req, { id, did, pid }) => {
  const user = await requireBrowserUser(req);
  await requireRole(id, user._id, "admin");
  await releasePlaces(id, [pid]); // people's outreach numbers drop by what this sheet had credited them
  await purgeLeads([pid]);
  await (await col("jobs")).deleteMany({ campaignId: id, placeId: pid }); // a running scraper notices its job is gone and stops
  await (await col("places")).deleteOne({ _id: pid, campaignId: id, domainId: did });
  return ok({ ok: true });
});
