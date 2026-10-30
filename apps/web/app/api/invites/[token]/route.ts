import { col } from "@street-wolf/db";
import { api, clientIp, forbidden, ok } from "@/lib/server/http";
import { acceptInvite, findInviteByToken } from "@/lib/server/invites";
import { rateLimit } from "@/lib/server/ratelimit";
import { currentUser, requireBrowserUser } from "@/lib/server/session";

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const mask = (e: string) => e.replace(/^(.).*(@.*)$/, "$1•••$2");

/** Public preview for the /invite/[token] page: enough to say who invited you, not enough to leak anything. */
export const GET = api<{ token: string }>(async (req, { token }) => {
  await rateLimit("invite-peek", clientIp(req) ?? "unknown", 60, 900);
  const inv = await findInviteByToken(token);
  const [c, inviter, me] = await Promise.all([(await col("campaigns")).findOne({ _id: inv.campaignId }), (await col("users")).findOne({ _id: inv.invitedBy }), currentUser(req)]);
  return ok({
    campaign: c?.name ?? "",
    inviter: inviter?.name || inviter?.email || "",
    email: mask(inv.email),
    status: inv.expiresAt < new Date() && inv.status === "pending" ? "expired" : inv.status,
    signedIn: !!me,
    emailMatches: me ? same(me.email, inv.email) : null,
    signedInAs: me?.email ?? null,
  });
});

export const POST = api<{ token: string }>(async (req, { token }) => {
  const user = await requireBrowserUser(req);
  await rateLimit("invite-accept", user._id, 30, 900);
  const inv = await findInviteByToken(token);
  if (inv.status === "accepted" && inv.acceptedBy === user._id) return ok({ campaignId: inv.campaignId }); // double click
  if (inv.status !== "pending") throw forbidden("This invite was already used.");
  if (inv.expiresAt < new Date()) throw forbidden("This invite has expired. Ask for a new one.");
  if (!same(inv.email, user.email)) throw forbidden(`This invite was sent to ${mask(inv.email)}. Sign in with that address to accept it.`);
  await acceptInvite(inv, user);
  return ok({ campaignId: inv.campaignId });
});
