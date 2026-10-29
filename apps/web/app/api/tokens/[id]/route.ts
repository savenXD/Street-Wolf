import { col } from "@street-wolf/db";
import { api, notFound, ok } from "@/lib/server/http";
import { requireBrowserUser } from "@/lib/server/session";

export const DELETE = api<{ id: string }>(async (req, { id }) => {
  const user = await requireBrowserUser(req);
  const r = await (await col("apiTokens")).deleteOne({ _id: id, userId: user._id });
  if (!r.deletedCount) throw notFound("Token not found");
  return ok({ ok: true });
});
