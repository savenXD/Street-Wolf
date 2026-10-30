import "server-only";

// Everything the backend reads from the environment, in one place. Anything optional degrades gracefully
// (no email provider -> links are logged in dev; no Google keys -> Google sign-in answers 501).
const trim = (v: string | undefined) => v?.trim() || undefined;

export const env = {
  prod: process.env.NODE_ENV === "production",
  appUrl: (trim(process.env.NEXT_PUBLIC_SITE_URL) ?? "http://localhost:3000").replace(/\/$/, ""),
  sessionDays: Number(process.env.SESSION_DAYS ?? 30),
  resendKey: trim(process.env.RESEND_API_KEY),
  emailFrom: trim(process.env.EMAIL_FROM) ?? "Street Wolf <onboarding@resend.dev>",
  googleId: trim(process.env.GOOGLE_CLIENT_ID),
  googleSecret: trim(process.env.GOOGLE_CLIENT_SECRET),
  cronSecret: trim(process.env.CRON_SECRET),
  /** Proxies we trust to append to x-forwarded-for (Vercel: 1). The client address is that many entries from the right. */
  proxyHops: Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS ?? 1) || 1),
  /** Encrypts invite links at rest. Falls back to CRON_SECRET; in dev a fixed key is used. Without any, links aren't kept. */
  appSecret: trim(process.env.APP_SECRET) ?? trim(process.env.CRON_SECRET) ?? (process.env.NODE_ENV === "production" ? undefined : "street-wolf-dev-secret"),
  /** Dev convenience: sign-in links are returned in the response when no email provider is configured. */
  exposeDevLinks: !(process.env.NODE_ENV === "production") && !trim(process.env.RESEND_API_KEY),
};
