import "server-only";
import { col, type Campaign, type Invite, type Role, type User } from "@street-wolf/db";
import { newId, newToken, seal, sha256, unseal } from "./crypto";
import { env } from "./env";
import { conflict, notFound } from "./http";
import { enqueueEmail, templates } from "./mail";
import { notify } from "./notify";

const INVITE_DAYS = 14;
export const inviteUrl = (token: string) => `${env.appUrl}/invite/${token}`;

/** Creates (or refreshes) an invite and sends the email + in-app notification. Returns the invite and its link. */
export async function createInvite(p: { campaign: Campaign; inviter: User; email: string; role: Exclude<Role, "owner"> }) {
  const invites = await col("invites");
  const members = await col("members");
  const users = await col("users");

  const existingUser = await users.findOne({ email: p.email });
  if (existingUser && (await members.findOne({ campaignId: p.campaign._id, userId: existingUser._id }))) throw conflict("They're already on this campaign");

  const token = newToken();
  const now = new Date();
  const enc = seal(token);
  const fields = { tokenHash: sha256(token), ...(enc ? { tokenEnc: enc } : {}), invitedBy: p.inviter._id, role: p.role, createdAt: now, expiresAt: new Date(now.getTime() + INVITE_DAYS * 86400_000) };
  // One open invite per person: re-inviting refreshes the link instead of creating a second row.
  const before = await invites.findOneAndUpdate({ campaignId: p.campaign._id, email: p.email, status: "pending" }, { $set: fields, $unset: { token: "", ...(enc ? {} : { tokenEnc: "" }) } }, { returnDocument: "before" });
  let id = before?._id;
  if (!before) {
    id = newId();
    await invites.insertOne({ _id: id, campaignId: p.campaign._id, email: p.email, status: "pending", acceptedBy: null, acceptedAt: null, ...fields });
  }

  const url = inviteUrl(token);
  const inviterName = p.inviter.name || p.inviter.email;
  await enqueueEmail({ to: p.email, ...templates.invite({ inviter: inviterName, campaign: p.campaign.name, url }) });
  if (existingUser) {
    await notify(existingUser._id, "invite_received", `${inviterName} invited you`, `Join the campaign "${p.campaign.name}"`, { campaignId: p.campaign._id, inviteId: id! });
  }
  return { id: id!, url, email: p.email, resent: !!before };
}

/** Accepting is idempotent: a second click (or a double submit) is a no-op that still succeeds. */
export async function acceptInvite(invite: Invite, user: User) {
  const members = await col("members");
  const invites = await col("invites");
  await members.updateOne(
    { campaignId: invite.campaignId, userId: user._id },
    { $setOnInsert: { _id: newId(), campaignId: invite.campaignId, userId: user._id, role: invite.role, addedBy: invite.invitedBy, createdAt: new Date() } },
    { upsert: true },
  );
  const flipped = await invites.updateOne({ _id: invite._id, status: "pending" }, { $set: { status: "accepted", acceptedBy: user._id, acceptedAt: new Date() }, $unset: { token: "", tokenEnc: "" } });
  if (flipped.modifiedCount) {
    const campaign = await (await col("campaigns")).findOne({ _id: invite.campaignId });
    const who = user.name || user.email;
    await notify(invite.invitedBy, "invite_accepted", `${who} joined`, `${who} accepted your invite to "${campaign?.name ?? "the campaign"}"`, { campaignId: invite.campaignId });
    // Tell everyone else already on the campaign (except the inviter, who just got the message above).
    const others = await members.find({ campaignId: invite.campaignId, userId: { $nin: [user._id, invite.invitedBy] } }).toArray();
    await Promise.all(others.map((m) => notify(m.userId, "member_joined", `${who} joined`, `${who} is now on "${campaign?.name ?? "the campaign"}"`, { campaignId: invite.campaignId })));
  }
}

/**
 * On every sign-in: invites sent to this address become visible as notifications. They are NOT auto-accepted,
 * so signing up never silently adds someone to a team. Returns the pending invites for the UI.
 */
export async function claimInvitesFor(user: User) {
  const invites = await col("invites");
  const pending = await invites.find({ email: user.email, status: "pending", expiresAt: { $gt: new Date() } }).toArray();
  if (!pending.length) return;
  const notifications = await col("notifications");
  for (const inv of pending) {
    // Skip ones we've already announced (the invite email may predate the account, so no notification exists yet).
    const seen = await notifications.findOne({ userId: user._id, type: "invite_received", "data.inviteId": inv._id });
    if (seen) continue;
    const [campaign, inviter] = await Promise.all([(await col("campaigns")).findOne({ _id: inv.campaignId }), (await col("users")).findOne({ _id: inv.invitedBy })]);
    if (!campaign) continue;
    const who = inviter?.name || inviter?.email || "Someone";
    await notify(user._id, "invite_received", `${who} invited you`, `Join the campaign "${campaign.name}"`, { campaignId: campaign._id, inviteId: inv._id });
  }
}

export async function findInviteByToken(token: string) {
  const inv = await (await col("invites")).findOne({ tokenHash: sha256(token) });
  if (!inv || inv.status === "revoked") throw notFound("This invite isn't valid any more");
  return inv;
}

/** The copyable link for an open invite, or null when it can't be recovered (no key configured, or an old row). */
export function linkFor(i: Pick<Invite, "tokenEnc" | "token">) {
  const token = i.tokenEnc ? unseal(i.tokenEnc) : (i.token ?? null);
  return token ? inviteUrl(token) : null;
}

/** One-time clean-up of invites stored before links were encrypted: seal them, or drop the copy if there is no key. */
export async function sealLegacyInviteTokens() {
  const invites = await col("invites");
  for await (const i of invites.find({ token: { $exists: true } })) {
    const enc = i.token ? seal(i.token) : null;
    await invites.updateOne({ _id: i._id }, { $unset: { token: "" }, ...(enc ? { $set: { tokenEnc: enc } } : {}) });
  }
}
