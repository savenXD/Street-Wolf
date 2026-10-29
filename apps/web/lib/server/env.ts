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
  /** Dev convenience: sign-in links are returned in the response when no email provider is configured. */
  exposeDevLinks: !(process.env.NODE_ENV === "production") && !trim(process.env.RESEND_API_KEY),
};
