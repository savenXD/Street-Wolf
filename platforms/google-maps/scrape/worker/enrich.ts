import { clean } from "./util";

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/gi;
const JUNK = /\.(png|jpe?g|gif|webp|svg|css|js)$|sentry|wixpress|example\.|domain\.com|your-?email|@2x/i;

export type Contact = { email?: string; instagram?: string; facebook?: string; linkedin?: string };

async function html(url: string): Promise<string> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (compatible; StreetWolfBot/1.0)", accept: "text/html" } });
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html")) return "";
    return (await res.text()).slice(0, 1_500_000);
  } catch {
    return "";
  }
}

function scan(page: string, into: Contact) {
  if (!into.email) {
    const mailto = page.match(/mailto:([^"'?>\s]+)/i)?.[1];
    const found = [mailto, ...(page.match(EMAIL) ?? [])].filter((e): e is string => !!e && !JUNK.test(e));
    if (found[0]) into.email = decodeURIComponent(found[0]).toLowerCase();
  }
  const link = (re: RegExp) => page.match(re)?.[0];
  into.instagram ??= link(/https?:\/\/(?:www\.)?instagram\.com\/(?!p\/|explore|reel)[\w.]+/i);
  into.facebook ??= link(/https?:\/\/(?:www\.)?facebook\.com\/(?!sharer|tr\?|plugins|dialog)[\w.\-/]+/i);
  into.linkedin ??= link(/https?:\/\/(?:[a-z]+\.)?linkedin\.com\/(?:company|in)\/[\w\-%]+/i);
}

/** Looks on the business's own website (plain HTTP, nothing to do with Google) for an email and social links. */
export async function enrich(website: string): Promise<Contact> {
  const out: Contact = {};
  let base: URL;
  try {
    base = new URL(website);
  } catch {
    return out;
  }
  scan(await html(base.href), out);
  if (!out.email) {
    for (const p of ["/contact", "/contact-us", "/about"]) {
      scan(await html(new URL(p, base).href), out);
      if (out.email) break;
    }
  }
  for (const k of Object.keys(out) as (keyof Contact)[]) out[k] = clean(out[k]);
  return out;
}
