import { col } from "@street-wolf/db";
import { api, forbidden, notFound, ok } from "@/lib/server/http";
import { acceptInvite } from "@/lib/server/invites";
import { requireBrowserUser } from "@/lib/server/session";

/** Accept from the notification bell: no token needed, the signed-in email must match the invited one. */
export const POST = api<{ id: string }>(async (req, { id }) => {
  const user = await requireBrowserUser(req);
  const inv = await (await col("invites")).findOne({ _id: id, email: user.email });
  if (inv?.status === "accepted" && inv.acceptedBy === user._id) return ok({ campaignId: inv.campaignId }); // double click
  if (!inv || inv.status !== "pending") throw notFound("Invite not found");
  if (inv.expiresAt < new Date()) throw forbidden("This invite has expired. Ask for a new one.");
  await acceptInvite(inv, user);
  return ok({ campaignId: inv.campaignId });
});
