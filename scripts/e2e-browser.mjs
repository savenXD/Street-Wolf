// Real-browser checks of the sheet: virtualization, live merge between two people, stale screens, retries, CSV guard.
//   BASE=http://localhost:3100 node scripts/e2e-browser.mjs   (needs the same throwaway server as e2e.mjs, and apps/scraper installed for its Chromium)
import { createRequire } from "node:module";
const require = createRequire(new URL("../apps/scraper/package.json", import.meta.url));
const { chromium } = require("patchright");
const BASE = process.env.BASE ?? "http://localhost:3100";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const t = (name, cond, extra = "") => { cond ? pass++ : fail++; console.log(`${cond ? "  ok " : "  FAIL"} ${name}${cond ? "" : "  " + extra}`); };

class Api {
  jar = new Map(); ip = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.7`;
  async req(method, path, json) {
    const res = await fetch(BASE + path, { method, redirect: "manual", headers: { "x-forwarded-for": this.ip, cookie: [...this.jar].map(([k, v]) => `${k}=${v}`).join("; "), ...(json ? { "content-type": "application/json" } : {}) }, body: json ? JSON.stringify(json) : undefined });
    for (const c of res.headers.getSetCookie?.() ?? []) { const [kv] = c.split(";"); const i = kv.indexOf("="); this.jar.set(kv.slice(0, i), kv.slice(i + 1)); }
    let data = null; try { data = await res.json(); } catch {}
    return { status: res.status, data };
  }
  get = (p) => this.req("GET", p); post = (p, b = {}) => this.req("POST", p, b); patch = (p, b) => this.req("PATCH", p, b);
  async signIn(email) {
    const r = await this.post("/api/auth/email", { email });
    await this.post("/api/auth/verify", { token: new URL(r.data.devLink).searchParams.get("token") });
  }
}
const uuid = () => crypto.randomUUID();
const A = new Api(), B = new Api();
const stamp = Date.now();
const emailB = `bobby+${stamp}@example.com`;
await A.signIn(`alice+${stamp}@example.com`); await B.signIn(emailB);
await A.patch("/api/profile", { name: "Alice", title: "Founder", welcomed: true }); await B.patch("/api/profile", { name: "Bob", title: "Sales", welcomed: true });
const cid = (await A.post("/api/campaigns", { name: "Browser test" })).data.campaign.id;
await A.post(`/api/campaigns/${cid}/invites`, { email: emailB });
const inc = (await B.get("/api/bootstrap")).data.incomingInvites.find((i) => i.campaignId === cid);
await B.post(`/api/invites/by-id/${inc.id}/accept`);
const did = uuid(), pid = uuid();
await A.post(`/api/campaigns/${cid}/domains`, { id: did, name: "Cafes" });
await A.post(`/api/campaigns/${cid}/domains/${did}/places`, { id: pid, name: "Delhi" });
const P = `/api/campaigns/${cid}/domains/${did}/places/${pid}`;
await A.patch(P, { scrape: { queries: ["cafe"], limit: "all", fields: ["name", "category", "phone"], filters: { minRating: 0, minReviews: 0, website: "any", mustHavePhone: false, skipClosed: true, skipScraped: true, exclude: [] } } });
const N = 1500;
for (let i = 0; i < N; i += 500) {
  const changes = Array.from({ length: Math.min(500, N - i) }, (_, k) => ({ row: i + k, set: { name: `Biz ${i + k}`, category: "Cafe", phone: `+91 ${i + k}` } }));
  await A.patch(`${P}/sheet`, { changes });
}
const server = async () => (await B.get(`${P}/sheet`)).data;
t("seeded 1500 leads", (await server()).stats.leads === N);

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME });
const open = async (api) => {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await ctx.addCookies([{ name: "sw_session", value: api.jar.get("sw_session"), url: BASE }]);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("   [pageerror]", e.message));
  await page.goto(`${BASE}/dashboard/maps/${cid}/${did}/${pid}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForSelector("tbody tr[data-row]", { timeout: 120000 });
  return { ctx, page };
};
const cell = (page, r, c) => page.evaluate(([r, c]) => document.querySelector(`[data-cell="${r}-${c}"]`)?.textContent ?? null, [r, c]);
const rowsInDom = (page) => page.evaluate(() => document.querySelectorAll("tbody tr[data-row]").length);
const scrollTo = async (page, top) => { await page.evaluate((t) => { document.querySelector("[tabindex='0']").scrollTop = t; }, top); await sleep(250); };
const typeInto = async (page, r, c, text) => {
  await page.click(`[data-cell="${r}-${c}"]`);
  await page.keyboard.type(text);
  await page.keyboard.press("Enter");
};

const alice = await open(A), bob = await open(B);
const ap = alice.page, bp = bob.page;

console.log("\nVirtual scrolling");
t("only a window of rows is in the page, not 1500", (await rowsInDom(ap)) < 80, String(await rowsInDom(ap)));
t("the header still shows all 1500 leads", (await ap.textContent("dl")).includes("1500"));
await scrollTo(ap, 1_000_000);
t("scrolling to the bottom shows the last rows", (await cell(ap, 1499, 1)) === "Biz 1499", String(await cell(ap, 1499, 1)));
t("and still a small DOM", (await rowsInDom(ap)) < 80);
await scrollTo(ap, 0);
await ap.click(`[data-cell="0-1"]`);
const t0 = Date.now();
for (let i = 0; i < 40; i++) await ap.keyboard.press("ArrowDown");
const perKey = (Date.now() - t0) / 40;
t(`arrow keys stay fast (${perKey.toFixed(0)} ms per key incl. browser automation)`, perKey < 120);
await scrollTo(ap, 0);
await ap.click(`[data-cell="0-1"]`);
for (let i = 0; i < 100; i++) await ap.keyboard.press("ArrowDown");
t("keyboard navigation scrolls the selected row into view", await ap.evaluate(() => { const g = document.querySelector("[tabindex='0']"); const c = document.querySelector('[data-cell="100-1"]'); if (!c) return false; const a = c.getBoundingClientRect(), b = g.getBoundingClientRect(); return a.top >= b.top && a.bottom <= b.bottom + 1; }));

console.log("\nTwo people, one sheet");
// Bob labels row 3 through the API; Alice's open sheet picks the label up by itself.
await scrollTo(ap, 0);
await B.patch(`${P}/sheet`, { changes: [{ row: 3, label: "interested" }] });
let seen = false;
for (let i = 0; i < 20 && !seen; i++) { await sleep(500); seen = ((await cell(ap, 3, 0)) ?? "").includes("nterested"); }
t("a teammate's label appears on my screen without reloading", seen, String(await cell(ap, 3, 0)));
t("and the Outreached counter moves", (await ap.textContent("dl")).includes("Outreached1"), await ap.textContent("dl"));
// Alice edits a cell of the labelled row: the label must survive.
await typeInto(ap, 3, 3, "999");
await sleep(2500);
let g = await server();
t("editing a cell on a labelled row keeps the teammate's label", g.labels["3"] === "interested" && g.rows[3].phone === "999", JSON.stringify([g.labels["3"], g.rows[3]]));

// A stale screen: Alice stops hearing from the server, Bob labels, Alice edits.
await ap.route("**/sync*", (r) => r.abort());
await B.patch(`${P}/sheet`, { changes: [{ row: 5, label: "converted" }, { row: 6, set: { category: "Bakery" } }] });
await typeInto(ap, 5, 1, "Renamed 5");
await typeInto(ap, 6, 3, "666");
await sleep(2500);
g = await server();
t("a stale screen cannot wipe a label it never saw", g.labels["5"] === "converted" && g.rows[5].name === "Renamed 5", JSON.stringify([g.labels["5"], g.rows[5]]));
t("or a cell it never changed", g.rows[6].category === "Bakery" && g.rows[6].phone === "666", JSON.stringify(g.rows[6]));
await ap.unroute("**/sync*");
seen = false;
for (let i = 0; i < 20 && !seen; i++) { await sleep(500); seen = ((await cell(ap, 5, 0)) ?? "").length > 0 && (await cell(ap, 6, 2)) === "Bakery"; }
t("when sync returns, the stale screen catches up", seen, `${await cell(ap, 5, 0)} / ${await cell(ap, 6, 2)}`);

console.log("\nTyping into a row a teammate just filled");
await ap.route("**/sync*", (r) => r.abort());
await scrollTo(ap, 1_000_000);
await B.patch(`${P}/sheet`, { changes: [{ row: N, set: { name: "Bob's lead" } }] });
await typeInto(ap, N, 1, "Alice's lead");
await sleep(2500);
g = await server();
t("Bob's lead stays on its row", g.rows[N].name === "Bob's lead", JSON.stringify(g.rows[N]));
t("Alice's lead is saved on the next free row", g.rows[N + 1]?.name === "Alice's lead", JSON.stringify(g.rows.slice(N)));
await ap.unroute("**/sync*");
await scrollTo(ap, 1_000_000);
seen = false;
for (let i = 0; i < 20 && !seen; i++) { await sleep(500); seen = (await cell(ap, N, 1)) === "Bob's lead" && (await cell(ap, N + 1, 1)) === "Alice's lead"; }
t("Alice's screen shows both, in the right places", seen, `${await cell(ap, N, 1)} | ${await cell(ap, N + 1, 1)}`);

// Same thing, but the teammate's row reaches Alice's screen before her save does.
let hold; const gate = new Promise((r) => (hold = r));
await ap.route("**/places/*/sheet", async (r) => { if (r.request().method() === "PATCH") { await gate; } await r.continue(); });
await typeInto(ap, N + 3, 1, "Alice late");
await B.patch(`${P}/sheet`, { changes: [{ row: N + 3, set: { name: "Bob late" } }] });
await sleep(1500);
hold(); // her save reaches the server after Bob's
await sleep(7000); // then she moves down and syncs
const dom = [await cell(ap, N + 3, 1), await cell(ap, N + 4, 1)];
g = await server();
t("on the screen, Bob's row stays Bob's and Alice's typing moves down", dom[0] === "Bob late" && dom[1] === "Alice late", JSON.stringify(dom));
t("on the server too, with nothing mixed or lost", g.rows[N + 3].name === "Bob late" && g.rows[N + 4].name === "Alice late" && !g.rows[N + 3].category, JSON.stringify(g.rows.slice(N + 3, N + 5)));
await ap.unroute("**/places/*/sheet");

console.log("\nSaving trouble");
// A server outage heals by itself.
let failing = 2;
await ap.route("**/places/*/sheet", async (r) => { if (r.request().method() === "PATCH" && failing-- > 0) return r.abort(); return r.continue(); });
await scrollTo(ap, 0);
await typeInto(ap, 10, 1, "After outage");
await sleep(9000);
g = await server();
t("a failed save is retried on its own", g.rows[10].name === "After outage", JSON.stringify(g.rows[10]));
await ap.unroute("**/places/*/sheet");
// One poisoned row must not block the others.
await ap.route("**/places/*/sheet", async (r) => {
  if (r.request().method() !== "PATCH") return r.continue();
  const b = r.request().postDataJSON();
  if (JSON.stringify(b).includes("POISON") && b.changes.length >= 1) return r.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "nope" }) });
  return r.continue();
});
await typeInto(ap, 20, 1, "Fine 20");
await typeInto(ap, 21, 1, "POISON");
await typeInto(ap, 22, 1, "Fine 22");
await sleep(3500);
g = await server();
t("good rows save even when one row is refused", g.rows[20].name === "Fine 20" && g.rows[22].name === "Fine 22" && g.rows[21].name === "Biz 21", JSON.stringify([g.rows[20].name, g.rows[21].name, g.rows[22].name]));
t("the refused row goes back to the saved version on screen", (await cell(ap, 21, 1)) === "Biz 21", String(await cell(ap, 21, 1)));
await ap.unroute("**/places/*/sheet");

console.log("\nUndo survives the sync echo");
await typeInto(ap, 30, 1, "Undo me");
await sleep(8000); // the save, then at least one poll that echoes it back
await ap.click(`[data-cell="31-1"]`);
await ap.keyboard.press("Control+z");
await sleep(400);
t("Ctrl+Z still works after a poll", (await cell(ap, 30, 1)) === "Biz 30", String(await cell(ap, 30, 1)));
await sleep(2500);

console.log("\nImport CSV guard");
const csv = "name,phone\nX,1\n";
for (const [who, p, canReplace] of [["owner", ap, true], ["member", bp, false]]) {
  await p.setInputFiles("input[type=file]", { name: "x.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await p.waitForSelector("text=Import CSV", { timeout: 10000 });
  const hasReplace = await p.locator("text=Replace existing").count();
  t(`${who}: replace option ${canReplace ? "is offered" : "is hidden"}`, (hasReplace > 0) === canReplace);
  if (canReplace) {
    await p.click("text=Replace existing");
    const btn = p.locator("button", { hasText: /^Import \d+ lead/ });
    t("owner: import is blocked until they confirm", await btn.isDisabled());
    await p.locator("input[type=checkbox]").last().check();
    t("owner: confirming enables it", !(await btn.isDisabled()));
  }
  await p.keyboard.press("Escape");
  await p.locator("button", { hasText: "Cancel" }).click().catch(() => {});
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
