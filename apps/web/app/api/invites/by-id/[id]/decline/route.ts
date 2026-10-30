import { col } from "@street-wolf/db";
import { api, notFound, ok } from "@/lib/server/http";
import { requireBrowserUser } from "@/lib/server/session";

export const POST = api<{ id: string }>(async (req, { id }) => {
  const user = await requireBrowserUser(req);
  const r = await (await col("invites")).updateOne({ _id: id, email: user.email, status: "pending" }, { $set: { status: "revoked" }, $unset: { token: "" } });
  if (!r.matchedCount) throw notFound("Invite not found");
  return ok({ ok: true });
});
