import { z } from "zod";
import { col } from "@street-wolf/db";
import { requireRole } from "@/lib/server/access";
import { api, body, forbidden, notFound, ok } from "@/lib/server/http";
import { notify } from "@/lib/server/notify";
import { requireBrowserUser } from "@/lib/server/session";

/** Change a member's role. Only the owner can, and the owner's own role can't be changed (no orphaned campaigns). */
export const PATCH = api<{ id: string; userId: string }>(async (req, { id, userId }) => {
  const me = await requireBrowserUser(req);
  await requireRole(id, me._id, "owner");
  const { role } = await body(req, z.object({ role: z.enum(["admin", "member"]) }));
  const target = await (await col("members")).findOne({ campaignId: id, userId });
  if (!target) throw notFound("Member not found");
  if (target.role === "owner") throw forbidden("The owner's role can't be changed");
  await (await col("members")).updateOne({ _id: target._id }, { $set: { role } });
  const c = await (await col("campaigns")).findOne({ _id: id });
  await notify(userId, "role_changed", "Your role changed", `You're now ${role === "admin" ? "an admin" : "a member"} of "${c?.name}"`, { campaignId: id });
  return ok({ ok: true });
});

/** Admins remove members; anyone can leave. The owner can only leave by deleting the campaign. */
export const DELETE = api<{ id: string; userId: string }>(async (req, { id, userId }) => {
  const me = await requireBrowserUser(req);
  const mine = await requireRole(id, me._id);
  const leaving = userId === me._id;
  if (!leaving) await requireRole(id, me._id, "admin");
  const target = await (await col("members")).findOne({ campaignId: id, userId });
  if (!target) throw notFound("Member not found");
  if (target.role === "owner") throw forbidden("The owner can't be removed. Delete the campaign instead.");
  if (!leaving && target.role === "admin" && mine.role !== "owner") throw forbidden("Only the owner can remove an admin");
  await (await col("members")).deleteOne({ _id: target._id });
  const c = await (await col("campaigns")).findOne({ _id: id });
  if (!leaving) await notify(userId, "member_removed", "Removed from a campaign", `You were removed from "${c?.name}"`);
  else if (c) await notify(c.ownerId, "member_removed", `${me.name || me.email} left`, `${me.name || me.email} left "${c.name}"`, { campaignId: id });
  return ok({ ok: true });
});
