import { col } from "@street-wolf/db";
import { requireRole } from "@/lib/server/access";
import { api, notFound, ok } from "@/lib/server/http";
import { requireBrowserUser } from "@/lib/server/session";

export const DELETE = api<{ id: string; inviteId: string }>(async (req, { id, inviteId }) => {
  const user = await requireBrowserUser(req);
  await requireRole(id, user._id, "admin");
  const r = await (await col("invites")).updateOne({ _id: inviteId, campaignId: id, status: "pending" }, { $set: { status: "revoked" } });
  if (!r.matchedCount) throw notFound("Invite not found");
  return ok({ ok: true });
});
