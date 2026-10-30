import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "./env";

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
/** 32 random bytes, url-safe. This is what goes in cookies and emailed links; only its hash is stored. */
export const newToken = () => randomBytes(32).toString("base64url");
export const newId = () => crypto.randomUUID();
export const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

const sealKey = () => (env.appSecret ? createHash("sha256").update(`street-wolf:seal:${env.appSecret}`).digest() : null);
/** AES-256-GCM with a key from APP_SECRET. Null when no secret is configured (the caller then simply doesn't keep the value). */
export function seal(plain: string): string | null {
  const key = sealKey();
  if (!key) return null;
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64url")).join(".");
}
export function unseal(sealed: string): string | null {
  const key = sealKey();
  const [iv, tag, enc] = sealed.split(".").map((p) => Buffer.from(p ?? "", "base64url"));
  if (!key || !iv?.length || !tag?.length || !enc) return null;
  try {
    const d = createDecipheriv("aes-256-gcm", key, iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}
