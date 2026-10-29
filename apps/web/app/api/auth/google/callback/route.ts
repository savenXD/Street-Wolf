import { NextResponse } from "next/server";
import { env } from "@/lib/server/env";
import { finishGoogle } from "@/lib/server/google";
import { api, safeNext } from "@/lib/server/http";
import { COOKIE, cookieOptions, createSession } from "@/lib/server/session";
import { upsertUser } from "@/lib/server/users";

export const GET = api(async (req) => {
  const q = req.nextUrl.searchParams;
  const code = q.get("code");
  const state = q.get("state");
  if (!code || !state) return NextResponse.redirect(`${env.appUrl}/signup?error=1`);
  try {
    const g = await finishGoogle(code, state);
    const user = await upsertUser({ email: g.email, name: g.name, avatarUrl: g.avatarUrl, googleId: g.googleId });
    const { token, maxAge } = await createSession(user._id, req);
    const res = NextResponse.redirect(`${env.appUrl}${safeNext(g.next)}`);
    res.cookies.set(COOKIE, token, cookieOptions(maxAge));
    return res;
  } catch {
    return NextResponse.redirect(`${env.appUrl}/signup?error=1`);
  }
});
