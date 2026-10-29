import "server-only";
import { after } from "next/server";
import { col } from "@street-wolf/db";
import { env } from "./env";
import { newId } from "./crypto";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** One shared shell so every email looks the same. All dynamic text is escaped. */
function layout(title: string, lines: string[], cta?: { label: string; url: string }) {
  const html = `<!doctype html><html><body style="margin:0;background:#fafafa;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0a0a0a">
<div style="max-width:480px;margin:32px auto;background:#fff;border:1px solid #e5e5e5;border-radius:16px;padding:32px">
<p style="font-size:20px;font-weight:700;margin:0 0 16px">Street Wolf</p>
<h1 style="font-size:22px;margin:0 0 12px">${esc(title)}</h1>
${lines.map((l) => `<p style="font-size:15px;line-height:1.5;color:#404040;margin:0 0 12px">${l}</p>`).join("")}
${cta ? `<p style="margin:24px 0"><a href="${esc(cta.url)}" style="background:#0a0a0a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:15px;display:inline-block">${esc(cta.label)}</a></p><p style="font-size:12px;color:#737373;word-break:break-all">Or paste this link: ${esc(cta.url)}</p>` : ""}
</div></body></html>`;
  const text = `${title}\n\n${lines.map((l) => l.replace(/<[^>]+>/g, "")).join("\n\n")}${cta ? `\n\n${cta.label}: ${cta.url}` : ""}`;
  return { html, text };
}

export const templates = {
  signIn: (url: string) =>
    ({ subject: "Your Street Wolf sign-in link", ...layout("Sign in to Street Wolf", ["Click the button to sign in. The link works once and expires in 15 minutes.", "If you didn't ask for this, ignore this email."], { label: "Sign in", url }) }),
  invite: (p: { inviter: string; campaign: string; url: string }) =>
    ({ subject: `${p.inviter} invited you to ${p.campaign} on Street Wolf`, ...layout(`Join ${p.campaign}`, [`<b>${esc(p.inviter)}</b> invited you to work on the campaign <b>${esc(p.campaign)}</b>.`, "The invite is valid for 14 days."], { label: "Accept invite", url: p.url }) }),
};

export type Message = { to: string; subject: string; html: string; text: string };

/** Queue a message. The send happens after the response, with retries if the provider fails. */
export async function enqueueEmail(m: Message) {
  const id = newId();
  await (await col("emails")).insertOne({ _id: id, ...m, status: "queued", attempts: 0, nextAttemptAt: new Date(), lastError: null, createdAt: new Date(), sentAt: null });
  try {
    after(() => drainOutbox(5));
  } catch {
    // Outside a request (scripts): the cron drain will pick it up.
  }
  return id;
}

async function deliver(m: Message) {
  if (!env.resendKey) {
    // No provider yet: log so local development works end to end.
    console.log(`[email:dev] to=${m.to} subject="${m.subject}"\n${m.text}\n`);
    return;
  }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.emailFrom, to: m.to, subject: m.subject, html: m.html, text: m.text }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

/** Claims queued messages one at a time (atomic), sends, and backs off on failure. Safe to run on many instances. */
export async function drainOutbox(max = 20) {
  const emails = await col("emails");
  let sent = 0;
  for (let i = 0; i < max; i++) {
    const m = await emails.findOneAndUpdate(
      { status: "queued", nextAttemptAt: { $lte: new Date() } },
      { $inc: { attempts: 1 }, $set: { nextAttemptAt: new Date(Date.now() + 5 * 60_000) } }, // lease: nobody else takes it for 5 min
      { sort: { nextAttemptAt: 1 }, returnDocument: "after" },
    );
    if (!m) break;
    try {
      await deliver(m);
      // Sign-in and invite links are bearer secrets. Once a real provider has the message, keep the record but not the secret.
      await emails.updateOne({ _id: m._id }, { $set: { status: "sent", sentAt: new Date(), lastError: null, ...(env.resendKey ? { html: "", text: "" } : {}) } });
      sent++;
    } catch (e) {
      const dead = m.attempts >= 6;
      await emails.updateOne(
        { _id: m._id },
        { $set: { status: dead ? "failed" : "queued", lastError: String(e).slice(0, 300), nextAttemptAt: new Date(Date.now() + Math.min(2 ** m.attempts, 60) * 60_000) } },
      );
    }
  }
  return sent;
}
