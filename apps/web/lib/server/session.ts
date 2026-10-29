import "server-only";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { col, type User } from "@street-wolf/db";
import { sha256, newToken } from "./crypto";
import { env } from "./env";
import { clientIp, forbidden, unauthorized } from "./http";

export const COOKIE = "sw_session";

export async function createSession(userId: string, req: NextRequest) {
  const token = newToken();
  const maxAge = env.sessionDays * 86400;
  await (await col("sessions")).insertOne({
    _id: sha256(token),
    userId,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + maxAge * 1000),
    ip: clientIp(req),
    userAgent: req.headers.get("user-agent")?.slice(0, 200) ?? null,
  });
  return { token, maxAge };
}

export const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.prod,
  path: "/",
  maxAge,
});

/** The signed-in user from the session cookie, or a Bearer API token (local scraper). Null when anonymous. */
export async function currentUser(req?: NextRequest): Promise<(User & { viaToken?: string }) | null> {
  const bearer = req?.headers.get("authorization");
  if (bearer?.startsWith("Bearer ")) {
    const hash = sha256(bearer.slice(7).trim());
    const tokens = await col("apiTokens");
    const t = await tokens.findOne({ _id: hash });
    if (!t) return null;
    // A scraper calls this every few seconds; writing lastUsedAt every time would double its database load for a label nobody needs to the second.
    if (!t.lastUsedAt || Date.now() - t.lastUsedAt.getTime() > 5 * 60_000) void tokens.updateOne({ _id: hash }, { $set: { lastUsedAt: new Date() } }).catch(() => undefined);
    const u = await (await col("users")).findOne({ _id: t.userId });
    return u ? { ...u, viaToken: t._id } : null;
  }
  const token = req ? req.cookies.get(COOKIE)?.value : (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const s = await (await col("sessions")).findOne({ _id: sha256(token) });
  if (!s || s.expiresAt < new Date()) return null;
  return (await (await col("users")).findOne({ _id: s.userId })) ?? null;
}

export async function requireUser(req: NextRequest) {
  const u = await currentUser(req);
  if (!u) throw unauthorized();
  return u;
}

/** Cookie-only: endpoints that manage the account itself must not be reachable with a scraper token. */
export async function requireBrowserUser(req: NextRequest) {
  const u = await requireUser(req);
  if (u.viaToken) throw forbidden("Use your browser session for this");
  return u;
}

export async function destroySession(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  if (token) await (await col("sessions")).deleteOne({ _id: sha256(token) });
}
