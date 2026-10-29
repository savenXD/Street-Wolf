import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
/** 32 random bytes, url-safe. This is what goes in cookies and emailed links; only its hash is stored. */
export const newToken = () => randomBytes(32).toString("base64url");
export const newId = () => crypto.randomUUID();
export const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};
