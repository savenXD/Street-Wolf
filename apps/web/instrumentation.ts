// Runs once when the server starts. Creates every index (idempotent), so a fresh database is ready with no manual step.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  if (process.env.NODE_ENV === "production") {
    // Misconfiguration that "works" but is wrong is the worst kind: say it loudly at boot.
    const missing = [
      !process.env.MONGODB_URI && "MONGODB_URI",
      /localhost|127\.0\.0\.1/.test(process.env.NEXT_PUBLIC_SITE_URL ?? "localhost") && "NEXT_PUBLIC_SITE_URL (emailed links would point at localhost)",
      !process.env.RESEND_API_KEY && "RESEND_API_KEY (emails are only logged)",
      !process.env.CRON_SECRET && "CRON_SECRET (failed emails are never retried)",
    ].filter(Boolean);
    if (missing.length) console.warn(`[config] production is missing: ${missing.join("; ")}`);
  }
  await (await import("./instrumentation-node")).boot();
}
