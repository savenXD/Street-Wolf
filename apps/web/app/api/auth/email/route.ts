import { z } from "zod";
import { col } from "@street-wolf/db";
import { newToken, sha256 } from "@/lib/server/crypto";
import { env } from "@/lib/server/env";
import { api, body, clientIp, email, ok, safeNext } from "@/lib/server/http";
import { enqueueEmail, templates } from "@/lib/server/mail";
import { rateLimit } from "@/lib/server/ratelimit";

const Body = z.object({ email, next: z.string().optional() });

/** Step 1 of passwordless sign-in: email a one-time link. Always answers the same, so it can't reveal who has an account. */
export const POST = api(async (req) => {
  const { email: to, next } = await body(req, Body);
  const ip = clientIp(req) ?? "unknown";
  await rateLimit("auth-email-ip", ip, 20, 3600);
  // Per (address, caller): a stranger spamming someone's address can't use up that person's own attempts. A higher cap per address
  // alone still stops the endpoint being used to flood an inbox from many addresses.
  await rateLimit("auth-email-addr", `${to}|${ip}`, 5, 900);
  await rateLimit("auth-email-flood", to, 30, 3600);

  const token = newToken();
  await (await col("authTokens")).insertOne({
    _id: sha256(token),
    email: to,
    next: safeNext(next),
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 15 * 60_000),
    usedAt: null,
  });
  const url = `${env.appUrl}/auth/confirm?token=${token}`;
  await enqueueEmail({ to, ...templates.signIn(url) });
  return ok({ sent: true, ...(env.exposeDevLinks ? { devLink: url } : {}) });
});
