import { z } from "zod";
import { col } from "@street-wolf/db";
import { requireRole } from "@/lib/server/access";
import { api, body, conflict, email, ok } from "@/lib/server/http";
import { createInvite } from "@/lib/server/invites";
import { rateLimit } from "@/lib/server/ratelimit";
import { requireBrowserUser } from "@/lib/server/session";

export const POST = api<{ id: string }>(async (req, { id }) => {
  const user = await requireBrowserUser(req);
  await requireRole(id, user._id, "admin");
  const { email: to, role } = await body(req, z.object({ email, role: z.enum(["admin", "member"]).default("member") }));
  if (to === user.email) throw conflict("That's you");
  // Invites send real email, so cap them per person per day to stop the endpoint being used to spam addresses.
  await rateLimit("invite", user._id, 50, 86400);
  const campaign = (await (await col("campaigns")).findOne({ _id: id }))!;
  const r = await createInvite({ campaign, inviter: user, email: to, role });
  return ok({ invite: { id: r.id, email: r.email, role }, resent: r.resent, ...(process.env.NODE_ENV !== "production" && !process.env.RESEND_API_KEY ? { devLink: r.url } : {}) }, { status: 201 });
});
