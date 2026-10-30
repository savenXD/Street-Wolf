import { after } from "next/server";
import { z } from "zod";
import { col } from "@street-wolf/db";
import { requireRole } from "@/lib/server/access";
import { api, body, ok, uuid } from "@/lib/server/http";
import { notify } from "@/lib/server/notify";
import { requireBrowserUser } from "@/lib/server/session";
import { featureIds } from "@/lib/server/schemas";
import { nonOutreachIds } from "@/lib/outreach";
import { purgeLeads, repairCampaign } from "@/lib/server/sheets";

const Patch = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  purpose: z.string().trim().max(500).optional(),
  features: featureIds.optional(),
  labelTree: z.unknown().nullable().optional(),
});

/** Long enough for the biggest delete, save or repair; hosts that cap functions lower than this use their own limit. */
export const maxDuration = 60;

export const PATCH = api<{ id: string }>(async (req, { id }) => {
  const user = await requireBrowserUser(req);
  uuid.parse(id);
  await requireRole(id, user._id, "admin");
  const { labelTree, ...rest } = await body(req, Patch, 500_000);
  const before = labelTree !== undefined ? await (await col("campaigns")).findOne({ _id: id }, { projection: { labelTree: 1 } }) : null;
  await (await col("campaigns")).updateOne({ _id: id }, { $set: { ...rest, ...(labelTree !== undefined ? { labelTree } : {}), updatedAt: new Date() } });
  // Which labels count as outreach just changed: take back credit that no longer applies and rebuild every sheet's counters.
  if (before) {
    const was = [...nonOutreachIds(before.labelTree)].sort().join("|");
    const now = [...nonOutreachIds(labelTree)].sort().join("|");
    if (was !== now) after(() => repairCampaign(id).catch((e) => console.error("[repair]", e)));
  }
  return ok({ ok: true });
});

/** Owner only. Removes everything that belongs to the campaign, then tells the other members. */
export const DELETE = api<{ id: string }>(async (req, { id }) => {
  const user = await requireBrowserUser(req);
  await requireRole(id, user._id, "owner");
  const campaign = await (await col("campaigns")).findOne({ _id: id });
  const others = await (await col("members")).find({ campaignId: id, userId: { $ne: user._id } }).toArray();
  // Order matters: the owner's membership and the campaign go LAST, so a failure halfway leaves a campaign they can still open and delete again,
  // instead of orphaned data nobody can reach. Jobs go first so a running scraper stops writing.
  const filter = { campaignId: id } as never;
  await (await col("jobs")).deleteMany(filter);
  const placeIds = (await (await col("places")).find(filter, { projection: { _id: 1 } }).toArray()).map((p) => p._id);
  await purgeLeads(placeIds); // (placeId,row) index; leads has no campaign-first index
  await Promise.all([col("places"), col("domains"), col("invites"), col("dailyStats")].map(async (c) => (await c).deleteMany(filter)));
  await (await col("members")).deleteMany(filter);
  await (await col("campaigns")).deleteOne({ _id: id });
  await Promise.all(others.map((m) => notify(m.userId, "member_removed", "Campaign deleted", `${user.name || user.email} deleted "${campaign?.name ?? "a campaign"}"`)));
  return ok({ ok: true });
});
