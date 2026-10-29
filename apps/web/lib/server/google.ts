import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { col } from "@street-wolf/db";
import { env } from "./env";
import { HttpError } from "./http";

const AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";
const USERINFO = "https://openidconnect.googleapis.com/v1/userinfo";
export const redirectUri = () => `${env.appUrl}/api/auth/google/callback`;

export function requireGoogle() {
  if (!env.googleId || !env.googleSecret) throw new HttpError(501, "Google sign-in isn't configured yet (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).", "not_configured");
  return { id: env.googleId, secret: env.googleSecret };
}

/** OAuth code flow with PKCE and a stored one-time state, so the callback can't be forged or replayed. */
export async function startGoogle(next: string) {
  const { id } = requireGoogle();
  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  await (await col("oauthStates")).insertOne({ _id: state, verifier, next, expiresAt: new Date(Date.now() + 10 * 60_000) });
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const q = new URLSearchParams({ client_id: id, redirect_uri: redirectUri(), response_type: "code", scope: "openid email profile", state, code_challenge: challenge, code_challenge_method: "S256", prompt: "select_account" });
  return `${AUTH}?${q}`;
}

export async function finishGoogle(code: string, state: string) {
  const { id, secret } = requireGoogle();
  const st = await (await col("oauthStates")).findOneAndDelete({ _id: state, expiresAt: { $gt: new Date() } }); // single use
  if (!st) throw new HttpError(400, "Sign-in expired. Try again.", "bad_state");
  const tr = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: id, client_secret: secret, redirect_uri: redirectUri(), grant_type: "authorization_code", code_verifier: st.verifier }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!tr.ok) throw new HttpError(400, "Google rejected the sign-in", "oauth_failed");
  const { access_token } = (await tr.json()) as { access_token: string };
  const ur = await fetch(USERINFO, { headers: { Authorization: `Bearer ${access_token}` }, signal: AbortSignal.timeout(10_000) });
  if (!ur.ok) throw new HttpError(400, "Couldn't read your Google profile", "oauth_failed");
  const p = (await ur.json()) as { sub: string; email?: string; email_verified?: boolean; name?: string; picture?: string };
  // An unverified Google email must never be trusted: it could be used to take over someone else's invited seat.
  if (!p.email || !p.email_verified) throw new HttpError(400, "Your Google email isn't verified", "unverified");
  return { googleId: p.sub, email: p.email.toLowerCase(), name: p.name, avatarUrl: p.picture ?? null, next: st.next };
}
