import "server-only";
import { col } from "@street-wolf/db";
import { HttpError } from "./http";

/**
 * Fixed-window limiter backed by Mongo, so it holds across every server instance (an in-memory map would
 * let N instances allow N times the limit). Throws 429 when exceeded.
 */
export async function rateLimit(bucket: string, key: string, limit: number, windowSec: number) {
  const rl = await col("rateLimits");
  const window = Math.floor(Date.now() / (windowSec * 1000));
  const r = await rl.findOneAndUpdate(
    { _id: `${bucket}:${key}:${window}` },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((window + 1) * windowSec * 1000 + 60_000) } },
    { upsert: true, returnDocument: "after" },
  );
  if ((r?.count ?? 1) > limit) throw new HttpError(429, "Too many attempts. Try again in a few minutes.", "rate_limited");
}
