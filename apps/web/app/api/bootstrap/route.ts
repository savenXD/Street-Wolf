import { col } from "@street-wolf/db";
import { api, ok } from "@/lib/server/http";
import { currentUser } from "@/lib/server/session";
import { loadWorkspace, unreadCount } from "@/lib/server/workspace";

/** One call that hydrates the whole app. Anonymous callers get { user: null } so the client sends them to sign in. */
export const GET = api(async (req) => {
  const user = await currentUser(req);
  if (!user) return ok({ user: null });
  const [campaigns, unread, incoming] = await Promise.all([
    loadWorkspace(user._id),
    unreadCount(user._id),
    (await col("invites")).find({ email: user.email, status: "pending", expiresAt: { $gt: new Date() } }).toArray(),
  ]);
  const cs = await (await col("campaigns")).find({ _id: { $in: incoming.map((i) => i.campaignId) } }).toArray();
  const inviters = await (await col("users")).find({ _id: { $in: incoming.map((i) => i.invitedBy) } }).toArray();
  return ok({
    user: { id: user._id, email: user.email, name: user.name, title: user.title, avatarUrl: user.avatarUrl, welcomed: user.welcomed },
    campaigns,
    unread,
    incomingInvites: incoming.map((i) => ({
      id: i._id,
      campaignId: i.campaignId,
      campaign: cs.find((c) => c._id === i.campaignId)?.name ?? "",
      inviter: inviters.find((u) => u._id === i.invitedBy)?.name || inviters.find((u) => u._id === i.invitedBy)?.email || "",
      role: i.role,
    })),
  });
});
