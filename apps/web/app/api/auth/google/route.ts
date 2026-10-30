import { NextResponse } from "next/server";
import { startGoogle } from "@/lib/server/google";
import { api, clientIp, safeNext } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/ratelimit";

export const GET = api(async (req) => {
  await rateLimit("auth-google", clientIp(req) ?? "unknown", 30, 900);
  return NextResponse.redirect(await startGoogle(safeNext(req.nextUrl.searchParams.get("next"))));
});
