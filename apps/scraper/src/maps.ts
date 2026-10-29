import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Page } from "patchright";
import { Pacer } from "./pacer";
import { Session } from "./browser";
import { enrich } from "./enrich";
import type { Hooks, Row, ScrapeConfig } from "./types";
import { Aborted, clean, jitter, nap } from "./util";

export class BlockedError extends Error {}
/** Saving to Street Wolf failed for good (after retries). Scraping on would only throw rows away. */
export class SaveError extends Error {}

/** Fields that only exist on a business's own Maps page. Everything else comes from the search list, which is far cheaper. */
const DETAIL_FIELDS = new Set(["phone", "website", "hours", "attributes", "photo", "plusCode", "priceLevel", "reviewSnippets", "email", "instagram", "facebook", "linkedin"]);
const ENRICH_FIELDS = new Set(["email", "instagram", "facebook", "linkedin"]);

type Card = {
  id: string;
  href: string;
  name: string;
  category: string;
  address: string;
  rating: number | null;
  reviews: number | null;
  status: string;
  lat: string;
  lng: string;
};

type Detail = Partial<Record<string, string>>;

const num = (s: string | undefined) => {
  if (!s) return null;
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};

export function searchUrl(query: string, location: string) {
  const q = location && !query.toLowerCase().includes(location.toLowerCase().split(",")[0]) ? `${query} in ${location}` : query;
  return `https://www.google.com/maps/search/${encodeURIComponent(q).replace(/%20/g, "+")}?hl=en`;
}

async function blocked(page: Page) {
  const url = page.url();
  if (url.includes("/sorry/") || url.includes("recaptcha")) return true;
  return page.evaluate(() => /unusual traffic|not a robot|automated queries/i.test(document.body?.innerText ?? "")).catch(() => false);
}

async function consent(page: Page) {
  if (!page.url().includes("consent.google")) return;
  await page.locator('button:has-text("Accept all"), button:has-text("Reject all"), form[action*="consent"] button').first().click().catch(() => {});
  await page.waitForLoadState("domcontentloaded").catch(() => {});
}

const DOT = /[·⋅•∙]/;

function parseCard(raw: { href: string; name: string; label: string; lines: string[] }): Card | null {
  const id = raw.href.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i)?.[1] ?? raw.href.match(/\/place\/([^/?]+)/)?.[1];
  if (!id || !raw.name) return null;
  const detail = raw.lines.find((l) => DOT.test(l) && !/^(Open|Closed|Opens|Closes|Temporarily|Permanently)/i.test(l)) ?? "";
  const parts = detail.split(DOT).map(clean).filter(Boolean);
  const status = raw.lines.find((l) => /^(Open|Closed|Opens|Closes|Temporarily closed|Permanently closed)/i.test(l)) ?? "";
  const rating = raw.label.match(/(\d(?:\.\d)?)\s*stars?/i)?.[1];
  const reviews = raw.label.match(/stars?\s*([\d,]+)\s*Reviews?/i)?.[1] ?? raw.lines.join(" ").match(/\(([\d,]+)\)/)?.[1];
  return {
    id,
    href: raw.href,
    name: clean(raw.name),
    category: parts[0] ?? "",
    address: parts[1] ?? "",
    rating: num(rating),
    reviews: num(reviews),
    status,
    lat: raw.href.match(/!3d(-?[\d.]+)/)?.[1] ?? "",
    lng: raw.href.match(/!4d(-?[\d.]+)/)?.[1] ?? "",
  };
}

const readCards = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLAnchorElement>('div[role="feed"] a.hfpxzc')].map((a) => {
      const box = a.closest('div[role="feed"] > div') as HTMLElement | null;
      return {
        href: a.href,
        name: a.getAttribute("aria-label") ?? "",
        label: box?.querySelector('span[role="img"]')?.getAttribute("aria-label") ?? "",
        lines: (box?.innerText ?? "").split("\n").map((l) => l.trim()).filter(Boolean),
      };
    }),
  );

/** Opens the search and scrolls the results panel until we have enough, Maps runs out, or it stops loading new rows. */
async function collectCards(page: Page, url: string, limit: number, hooks: Hooks): Promise<Card[]> {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await consent(page);
  const seen = new Map<string, Card>();
  const feed = page.locator('div[role="feed"]');
  try {
    await page.waitForSelector('div[role="feed"] a.hfpxzc, h1', { timeout: 15_000 });
  } catch {
    if (await blocked(page)) throw new BlockedError("Google asked for a CAPTCHA");
    return [];
  }
  if (await blocked(page)) throw new BlockedError("Google asked for a CAPTCHA");
  if (!(await feed.count())) return []; // a single exact match opens the place directly; not a list

  let stale = 0;
  while (seen.size < limit && stale < 4) {
    for (const r of await readCards(page)) {
      const c = parseCard(r);
      if (c) seen.set(c.id, c);
    }
    hooks.onProgress({ done: 0, total: seen.size, found: 0, note: `Listing results (${seen.size})` });
    const before = seen.size;
    const atEnd = await feed.evaluate((el) => /reached the end of the list/i.test(el.textContent ?? "")).catch(() => false);
    if (atEnd) break;
    await feed.evaluate((el) => el.scrollBy(0, el.scrollHeight)).catch(() => {});
    await nap(jitter(700, 1300), hooks.signal);
    for (const r of await readCards(page)) {
      const c = parseCard(r);
      if (c) seen.set(c.id, c);
    }
    stale = seen.size === before ? stale + 1 : 0;
  }
  return [...seen.values()].slice(0, limit);
}

const READ_DETAIL = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "read-detail.js"), "utf8");
const readDetail = (page: Page): Promise<Detail> => page.evaluate(READ_DETAIL);

// Last match wins: in "4601 N Lamar Blvd, Austin, TX 78751" the street number also looks like a postcode.
const postalCode = (address: string) => {
  const us = [...address.matchAll(/\b\d{5}(?:-\d{4})?\b/g)].pop()?.[0];
  return us ?? address.match(/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/)?.[0] ?? address.match(/(?:^|,\s*)(\d{4,6})\b(?=[^,]*(?:,|$))/)?.[1] ?? "";
};

function build(card: Card, d: Detail, fields: string[], contact: Record<string, string | undefined>): Record<string, string> {
  const rating = d.ratingText?.match(/^(\d(?:\.\d)?)/)?.[1] ?? (card.rating?.toString() ?? "");
  const reviews = d.ratingText?.match(/\(([\d,]+)\)/)?.[1]?.replace(/,/g, "") ?? (card.reviews?.toString() ?? "");
  const address = d.address || card.address;
  const all: Record<string, string> = {
    name: d.name || card.name,
    category: d.category || card.category,
    address,
    phone: d.phone ?? "",
    website: d.website ?? "",
    mapsUrl: card.href.split("?")[0],
    rating,
    reviews,
    priceLevel: d.priceLevel ?? "",
    reviewSnippets: d.reviewSnippets ?? "",
    hours: d.hours ?? "",
    openNow: card.status ? (/^Open/i.test(card.status) ? "Yes" : "No") : "",
    attributes: d.attributes ?? "",
    photo: d.photo ?? "",
    lat: card.lat,
    lng: card.lng,
    plusCode: d.plusCode ?? "",
    postalCode: postalCode(address),
    email: contact.email ?? "",
    instagram: contact.instagram ?? "",
    facebook: contact.facebook ?? "",
    linkedin: contact.linkedin ?? "",
  };
  return Object.fromEntries(fields.filter((f) => f in all).map((f) => [f, clean(all[f])]));
}

const norm = (s: string) => clean(s).toLowerCase();

/** Filters that only need what the results list already shows. */
function passes(c: Card, cfg: ScrapeConfig, seen: Set<string>) {
  const { filters } = cfg;
  if (seen.has(c.id)) return false;
  const name = c.name.toLowerCase();
  if (filters.exclude.some((e) => e && name.includes(e.toLowerCase()))) return false;
  if (filters.minRating && c.rating !== null && c.rating < filters.minRating) return false;
  if (filters.minReviews && c.reviews !== null && c.reviews < filters.minReviews) return false;
  if (filters.skipClosed && /permanently closed|temporarily closed/i.test(c.status)) return false;
  return true;
}

const FEED_LINKS = 'div[role="feed"] a.hfpxzc';
const atEnd = (page: Page) => page.evaluate(() => /reached the end of the list/i.test(document.querySelector('div[role="feed"]')?.textContent ?? "")).catch(() => false);
const cardCount = (page: Page) => page.locator(FEED_LINKS).count().catch(() => 0);

/** Waits for the list to get longer, the end marker to appear, or the timeout. Never waits forever (the old "loads endlessly" trap). */
async function waitGrow(page: Page, before: number, ms: number, signal: AbortSignal) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if ((await cardCount(page)) > before) return true;
    if (await atEnd(page)) return false;
    await nap(250, signal);
  }
  return false;
}

type ClickArgs = {
  cfg: ScrapeConfig;
  query: string;
  location: string;
  qi: number;
  limit: number;
  needEnrich: boolean;
  foundBefore: number;
  session: Session;
  pacer: Pacer;
  hooks: Hooks;
  seenIds: Set<string>;
};

/**
 * Click-through mode: each worker keeps ONE tab on the search results, clicks a business, reads its panel (a few hundred ms, no
 * page load), closes it and clicks the next, scrolling for more only when it runs out. Workers share one "claimed" set so no
 * business is done twice. The walk ends on the "reached the end" marker, after 3 scrolls that load nothing, at the limit, or at a
 * hard time cap, so it can't spin on a list that never finishes.
 */
async function clickQuery(a: ClickArgs): Promise<number> {
  const { cfg, hooks, pacer, session, seenIds } = a;
  const { filters } = cfg;
  const url = searchUrl(a.query, a.location);
  const claimed = new Set<string>();
  const tries = new Map<string, number>();
  const out: Row[] = [];
  const pending = new Set<Promise<void>>();
  let added = 0;
  let kept = 0; // leads that passed every filter: the limit counts these, not the businesses merely looked at
  let done = 0;
  let listed = 0;
  let fatal: unknown = null;

  let best = 0;
  const progress = () => {
    // Against the limit you asked for (or a typical ~60 for "all"), and never backwards: the list grows as it scrolls.
    const denom = cfg.limit === "all" ? Math.max(listed, 60) : a.limit;
    best = Math.max(best, Math.min(0.98, done / Math.max(1, denom)));
    hooks.onProgress({ done: a.qi + best, total: cfg.queries.length, found: a.foundBefore + added + out.length, note: `${a.query}: ${done} checked, ${listed} listed` });
  };
  const flush = async (force = false) => {
    if (out.length >= 1 || (force && out.length)) {
      const batch = out.splice(0);
      try {
        await hooks.onRows(batch);
      } catch (e) {
        throw new SaveError(`Couldn't save to Street Wolf: ${(e as Error).message}`);
      }
      added += batch.length;
    }
  };
  const track = (p: Promise<void>) => {
    pending.add(p);
    void p.finally(() => pending.delete(p));
  };

  async function openList(page: Page) {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await consent(page);
    try {
      await page.waitForSelector(`${FEED_LINKS}, h1`, { timeout: 15_000 });
    } catch {
      if (await blocked(page)) throw new BlockedError("Google asked for a CAPTCHA");
      throw new Error("The results didn't load");
    }
    if (await blocked(page)) throw new BlockedError("Google asked for a CAPTCHA");
  }

  async function processCard(page: Page, c: Card, idx: number, slot: number) {
    const T = process.env.SW_DEBUG ? (label: string, t0: number) => hooks.log(`  [t] w${slot} ${label} ${Date.now() - t0}ms`) : () => {};
    let t = Date.now();
    await pacer.gate(slot);
    T("gate", t);
    t = Date.now();
    const link = page.locator(FEED_LINKS).nth(idx);
    await link.scrollIntoViewIfNeeded({ timeout: 5000 });
    await link.click({ timeout: 8000 });
    T("scroll+click", t);
    t = Date.now();
    // A string, not a function: no transpiler can touch what runs in the page.
    const want = JSON.stringify({ name: norm(c.name), id: c.id });
    await page.waitForFunction(
      `(() => { const w = ${want}; const t = (document.querySelector("h1.DUwDvf")?.innerText ?? "").replace(/\\s+/g, " ").trim().toLowerCase(); return !!t && (t === w.name || location.href.includes(w.id)); })()`,
      undefined,
      { timeout: 7000 },
    );
    T("panel appeared", t);
    t = Date.now();
    let d = await readDetail(page);
    T("read", t);
    if (norm(d.name ?? "") !== norm(c.name) && !norm(d.name ?? "").includes(norm(c.name).slice(0, 12))) {
      await nap(500, hooks.signal); // the panel was still showing the previous business: read again
      d = await readDetail(page);
      if (!norm(d.name ?? "").includes(norm(c.name).slice(0, 12))) throw new Error(`Panel showed "${d.name}" instead of "${c.name}"`);
    }
    pacer.ok();
    t = Date.now();
    // Close the panel; the list underneath keeps its place and everything already loaded. No need to wait for the animation:
    // the pause before the next click overlaps it, and that click itself waits until the link is really reachable.
    await page.locator('div[role="main"] button[aria-label="Close"]:visible').first().click({ timeout: 3000 }).catch(() => page.keyboard.press("Escape"));
    T("close", t);

    done++;
    if (filters.website === "has" && !d.website) return progress();
    if (filters.website === "none" && d.website) return progress();
    if (filters.mustHavePhone && !d.phone) return progress();
    if (kept >= a.limit) return progress();
    kept++;
    if (a.needEnrich && d.website) {
      while (pending.size >= 6) await Promise.race(pending);
      const site = d.website;
      track(
        enrich(site)
          .then((contact) => void out.push({ sourceId: c.id, cells: build(c, d, cfg.fields, contact) }))
          .catch(() => void out.push({ sourceId: c.id, cells: build(c, d, cfg.fields, {}) }))
          .then(() => flush().catch((e) => void (fatal ??= e))),
      );
    } else {
      out.push({ sourceId: c.id, cells: build(c, d, cfg.fields, {}) });
      await flush();
    }
    progress();
  }

  async function walk(page: Page, slot: number) {
    const started = Date.now();
    let stale = 0;
    let fails = 0;
    for (;;) {
      if (hooks.signal.aborted) throw new Aborted();
      if (fatal || kept >= a.limit || claimed.size >= a.limit * 8 + 50) return;
      const cards = (await readCards(page)).map(parseCard);
      listed = Math.max(listed, cards.length);
      const idx = cards.findIndex((c) => c && !claimed.has(c.id));
      if (idx >= 0) {
        const c = cards[idx]!;
        claimed.add(c.id);
        stale = 0;
        if (!passes(c, cfg, seenIds)) {
          done++;
          progress();
          continue;
        }
        seenIds.add(c.id);
        try {
          await processCard(page, c, idx, slot);
          fails = 0;
        } catch (e) {
          if (e instanceof Aborted || e instanceof SaveError) throw e;
          if (process.env.SW_DEBUG) hooks.log(`  [err] ${c.name}: ${(e as Error).message.split("\n").slice(0, 3).join(" | ")}`, "warn");
          if (await blocked(page)) throw new BlockedError("CAPTCHA");
          seenIds.delete(c.id);
          claimed.delete(c.id);
          const n = (tries.get(c.id) ?? 0) + 1;
          tries.set(c.id, n);
          if (n >= 3) {
            claimed.add(c.id);
            done++;
            hooks.log(`Skipped ${c.name}: ${(e as Error).message.split("\n")[0]}`, "warn");
          }
          if (++fails >= 4) throw new Error("This tab got stuck");
          await page.keyboard.press("Escape").catch(() => {});
          await nap(800, hooks.signal);
        }
        continue;
      }
      // Nothing unclaimed in view: scroll for more, or finish.
      if (await atEnd(page)) return;
      const before = cards.length;
      await page.locator('div[role="feed"]').evaluate((el) => el.scrollBy(0, el.scrollHeight)).catch(() => {});
      const grew = await waitGrow(page, before, 4500, hooks.signal);
      stale = grew ? 0 : stale + 1;
      if (stale >= 3 || Date.now() - started > 20 * 60_000) return;
    }
  }

  async function worker(slot: number) {
    let restarts = 0;
    while (!fatal) {
      let page: Page | null = null;
      const gen = session.generation;
      try {
        await pacer.gate(slot);
        page = await session.page();
        await openList(page);
        await walk(page, slot);
        if (process.env.SW_DEBUG) hooks.log(`  [w${slot}] walk finished`);
        return;
      } catch (e) {
        if (e instanceof Aborted || e instanceof SaveError) {
          fatal = e;
          return;
        }
        const msg = (e as Error).message.split("\n")[0];
        if (gen !== session.generation) continue; // the session was swapped under us (a block elsewhere); just reopen
        if (e instanceof BlockedError) {
          if (pacer.blocked() >= 4) {
            fatal = new BlockedError("Google keeps blocking this connection. Try again later, switch network, or use window mode to solve the CAPTCHA.");
            return;
          }
          hooks.log("Google pushed back. Cooling down and switching session.", "warn");
          await session.rotate(true);
        } else if (++restarts > 3) {
          fatal = e;
          return;
        } else {
          hooks.log(`Reopening a tab: ${msg}`, "warn");
        }
      } finally {
        await page?.close().catch(() => {});
      }
    }
  }

  await Promise.all(Array.from({ length: pacer.max }, (_, slot) => worker(slot)));
  if (process.env.SW_DEBUG) hooks.log(`  [all workers done] pending enrich: ${pending.size}`);
  await Promise.all(pending);
  await flush(true);
  if (process.env.SW_DEBUG) hooks.log("  [flushed]");
  if (fatal) throw fatal;
  return added;
}

export type RunOptions = { session: Session; pacer: Pacer; hooks: Hooks; seenIds?: Set<string>; mode?: "click" | "tabs" };

/** Scrapes every query in the config for one location and streams rows to hooks.onRows. */
export async function scrapeMaps(cfg: ScrapeConfig, location: string, { session, pacer, hooks, seenIds = new Set(), mode = "click" }: RunOptions) {
  const { filters } = cfg;
  const limit = cfg.limit === "all" ? 500 : cfg.limit;
  const needDetail = cfg.fields.some((f) => DETAIL_FIELDS.has(f)) || filters.website !== "any" || filters.mustHavePhone;
  const needEnrich = cfg.fields.some((f) => ENRICH_FIELDS.has(f));
  const exclude = filters.exclude.map((e) => e.toLowerCase()).filter(Boolean);
  let found = 0;

  for (let qi = 0; qi < cfg.queries.length; qi++) {
    const query = cfg.queries[qi];
    hooks.log(`Searching: ${query}${location ? ` in ${location}` : ""}`);

    if (mode === "click" && needDetail) {
      found += await clickQuery({ cfg, query, location, qi, limit, needEnrich, foundBefore: found, session, pacer, hooks, seenIds });
      hooks.onProgress({ done: qi + 1, total: cfg.queries.length, found, note: `${query}: done` });
      continue;
    }

    // 1. The list. One page load plus scrolling gives dozens of businesses.
    let cards: Card[] = [];
    for (let attempt = 0; ; attempt++) {
      await pacer.gate(0);
      const page = await session.page();
      try {
        cards = await collectCards(page, searchUrl(query, location), limit * 3 + 20, hooks);
        pacer.ok();
        break;
      } catch (e) {
        if (e instanceof Aborted) throw e;
        if (!(e instanceof BlockedError) && attempt >= 2) throw e;
        if (pacer.blocked() >= 4) throw new BlockedError("Google keeps blocking this connection. Try again later or use a different network.");
        hooks.log("Google pushed back on the search. Cooling down.", "warn");
        await session.rotate(true);
      } finally {
        await page.close().catch(() => {});
      }
    }

    const wanted = cards.filter((c) => passes(c, cfg, seenIds)).slice(0, limit);
    wanted.forEach((c) => seenIds.add(c.id));
    hooks.log(`${cards.length} listed, ${wanted.length} after filters${needDetail ? "; opening each for details" : ""}`);

    // 2. Details. Skipped entirely when the chosen fields are all on the list.
    const out: Row[] = [];
    let done = 0;
    const flush = async (force = false) => {
      if (out.length >= 1 || (force && out.length)) {
        const batch = out.splice(0);
        try {
          await hooks.onRows(batch);
        } catch (e) {
          throw new SaveError(`Couldn't save to Street Wolf: ${(e as Error).message}`);
        }
        found += batch.length;
      }
    };
    const progress = () => hooks.onProgress({ done: qi + done / Math.max(1, wanted.length), total: cfg.queries.length, found: found + out.length, note: `${query}: ${done}/${wanted.length}` });

    if (!needDetail) {
      // Everything is already on the list, so save in small steps instead of one dump: the sheet fills in a few rows at a time.
      for (const c of wanted) {
        out.push({ sourceId: c.id, cells: build(c, {}, cfg.fields, {}) });
        if (out.length >= 5) {
          await flush();
          await nap(400, hooks.signal);
        }
      }
      await flush(true);
    } else {
      const queue = [...wanted];
      const tries = new Map<string, number>();
      let fatal: unknown = null;
      await Promise.all(
        Array.from({ length: pacer.max }, async (_, slot) => {
          while (!fatal) {
            const c = queue.shift();
            if (!c) return;
            try {
              await pacer.gate(slot);
              const page = await session.page();
              try {
                await page.goto(c.href, { waitUntil: "domcontentloaded" });
                await consent(page);
                if (await blocked(page)) throw new BlockedError("CAPTCHA");
                await page.waitForSelector("h1", { timeout: 15_000 }).catch(async (e) => {
                  throw (await blocked(page)) ? new BlockedError("CAPTCHA") : e;
                });
                await page.waitForSelector('button[data-item-id="address"], a[data-item-id="authority"], button[data-item-id^="phone"], div.F7nice', { timeout: 4000 }).catch(() => {});
                const d = await readDetail(page);
                pacer.ok();
                if (filters.website === "has" && !d.website) { done++; progress(); continue; }
                if (filters.website === "none" && d.website) { done++; progress(); continue; }
                if (filters.mustHavePhone && !d.phone) { done++; progress(); continue; }
                const contact = needEnrich && d.website ? await enrich(d.website) : {};
                out.push({ sourceId: c.id, cells: build(c, d, cfg.fields, contact) });
                done++;
                progress();
                await flush();
              } finally {
                await page.close().catch(() => {});
              }
            } catch (e) {
              if (e instanceof Aborted || e instanceof SaveError) { fatal = e; return; }
              const n = (tries.get(c.id) ?? 0) + 1;
              tries.set(c.id, n);
              if (e instanceof BlockedError) {
                if (pacer.blocked() >= 4) { fatal = new BlockedError("Google keeps blocking this connection. Try again later or use a different network."); return; }
                hooks.log("Google pushed back. Cooling down and switching session.", "warn");
                await session.rotate(true);
              }
              if (n < 3) queue.push(c);
              else { done++; hooks.log(`Skipped ${c.name}: ${(e as Error).message.split("\n")[0]}`, "warn"); }
            }
          }
        }),
      );
      await flush(true);
      if (fatal) throw fatal;
    }
    hooks.onProgress({ done: qi + 1, total: cfg.queries.length, found, note: `${query}: done` });
  }
  return found;
}
