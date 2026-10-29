import { connection, NextResponse } from "next/server";
import { getDb } from "@street-wolf/db";

/**
 * For load balancers and uptime monitors. `GET /api/health` is liveness (the process answers, no database call, so a
 * database blip can't make the platform kill healthy instances); `?deep=1` also pings MongoDB (readiness).
 */
export async function GET(req: Request) {
  await connection();
  const headers = { "Cache-Control": "no-store" };
  if (!new URL(req.url).searchParams.has("deep")) return NextResponse.json({ ok: true }, { headers });
  const t = performance.now();
  try {
    await Promise.race([(await getDb()).command({ ping: 1 }), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000))]);
    return NextResponse.json({ ok: true, db: "up", ms: Math.round(performance.now() - t) }, { headers });
  } catch {
    return NextResponse.json({ ok: false, db: "down" }, { status: 503, headers });
  }
}
