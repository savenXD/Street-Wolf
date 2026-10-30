import { NextResponse } from "next/server";
import { z } from "zod";
import { col } from "@street-wolf/db";
import { sha256 } from "@/lib/server/crypto";
import { env } from "@/lib/server/env";
import { api, body, clientIp, HttpError, ok, safeNext } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/ratelimit";
import { COOKIE, cookieOptions, createSession } from "@/lib/server/session";
import { upsertUser } from "@/lib/server/users";

/**
 * Old-style links (and anything that opens the URL directly) land on a page that confirms with a POST. Mail
 * scanners (Outlook SafeLinks, corporate gateways) pre-fetch every link in an email with GET; if GET consumed
 * the one-time token they would burn it before the person ever clicked.
 */
export const GET = api(async (req) => {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  return NextResponse.redirect(`${env.appUrl}/auth/confirm?token=${encodeURIComponent(token)}`);
});

/** Single use (atomic), expires in 15 minutes. */
export const POST = api(async (req) => {
  const { token } = await body(req, z.object({ token: z.string().min(20).max(200) }));
  await rateLimit("auth-verify", clientIp(req) ?? "unknown", 60, 900);
  // findOneAndUpdate with usedAt:null makes the claim atomic: two submits can't both win.
  const t = await (await col("authTokens")).findOneAndUpdate({ _id: sha256(token), usedAt: null, expiresAt: { $gt: new Date() } }, { $set: { usedAt: new Date() } });
  if (!t) throw new HttpError(400, "This sign-in link has expired or was already used. Request a new one.", "bad_link");

  let user, session, maxAge;
  try {
    user = await upsertUser({ email: t.email });
    ({ token: session, maxAge } = await createSession(user._id, req));
  } catch (e) {
    // The link was spent but nobody got signed in (database hiccup): hand it back so the person can simply click it again.
    await (await col("authTokens")).updateOne({ _id: sha256(token), usedAt: { $ne: null } }, { $set: { usedAt: null } }).catch(() => undefined);
    throw e;
  }
  const res = ok({ next: safeNext(t.next) });
  res.cookies.set(COOKIE, session, cookieOptions(maxAge));
  return res;
});
