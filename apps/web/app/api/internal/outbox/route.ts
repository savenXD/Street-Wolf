import { env } from "@/lib/server/env";
import { safeEqual } from "@/lib/server/crypto";
import { api, forbidden, ok } from "@/lib/server/http";
import { drainOutbox } from "@/lib/server/mail";

/**
 * Retry queue for email. A cron calls this every few minutes with the secret, either as
 * `x-cron-secret: <secret>` or `Authorization: Bearer <secret>` (what Vercel Cron sends, via GET).
 */
async function drain(req: Request) {
  const given = req.headers.get("x-cron-secret") ?? req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!env.cronSecret || !safeEqual(given, env.cronSecret)) throw forbidden("Not allowed");
  return ok({ sent: await drainOutbox(100) });
}

export const POST = api(async (req) => drain(req));
export const GET = api(async (req) => drain(req));
