// End-to-end check of the whole backend against a real MongoDB and a running Next server.
//   BASE=http://localhost:3100 node scripts/e2e.mjs
// Expects the server to run with MONGODB_URI pointing at a throwaway database and no RESEND_API_KEY / Google keys.
import { createRequire } from "node:module";
const BASE = process.env.BASE ?? "http://localhost:3100";
const MONGO = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27099";
const DBNAME = process.env.MONGODB_DB ?? "e2e";
const { MongoClient } = createRequire(new URL("../packages/db/package.json", import.meta.url))("mongodb");
const mongo = await new MongoClient(MONGO).connect();
const db = mongo.db(DBNAME);
let pass = 0, fail = 0;
const t = (name, cond, extra = "") => { (cond ? pass++ : fail++); console.log(`${cond ? "  ok " : "  FAIL"} ${name}${cond ? "" : "  " + extra}`); };
const section = (s) => console.log(`\n${s}`);
const uuid = () => crypto.randomUUID();

/** Production never returns links in API responses, so tests read them out of the email outbox, like a real inbox. */
async function mailLink(to, re) {
  const m = await db.collection("emails").find({ to }).sort({ createdAt: -1 }).limit(1).next();
  return m?.text.match(re)?.[0] ?? null;
}

class Client {
  jar = new Map();
  ip = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
  headers(extra = {}) { return { "x-forwarded-for": this.ip, cookie: [...this.jar].map(([k, v]) => `${k}=${v}`).join("; "), ...extra }; }
  store(res) { for (const c of res.headers.getSetCookie?.() ?? []) { const [kv] = c.split(";"); const i = kv.indexOf("="); const k = kv.slice(0, i), v = kv.slice(i + 1); v ? this.jar.set(k, v) : this.jar.delete(k); } }
  async req(method, path, json, extra = {}) {
    const res = await fetch(BASE + path, { method, redirect: "manual", headers: this.headers(json !== undefined ? { "content-type": "application/json", ...extra } : extra), body: json !== undefined ? JSON.stringify(json) : undefined });
    this.store(res);
    let data = null; try { data = await res.json(); } catch {}
    if (res.ok && method === "POST" && json?.email && data && !data.devLink) {
      if (path === "/api/auth/email") data.devLink = await mailLink(json.email, /https?:\/\/\S+\/auth\/confirm\?token=[\w-]+/);
      else if (/\/invites$/.test(path)) data.devLink = await mailLink(json.email, /https?:\/\/\S+\/invite\/[\w-]+/);
    }
    return { status: res.status, data, res };
  }
  get = (p, h) => this.req("GET", p, undefined, h);
  post = (p, b = {}, h) => this.req("POST", p, b, h);
  patch = (p, b, h) => this.req("PATCH", p, b, h);
  del = (p, h) => this.req("DELETE", p, undefined, h);
  /** Full passwordless sign-in: request link, follow it, end up with a session cookie. */
  async signIn(email) {
    const r = await this.post("/api/auth/email", { email });
    if (!r.data?.devLink) throw new Error("no devLink: " + JSON.stringify(r));
    // The emailed link opens /auth/confirm, whose script POSTs the token. Do the same.
    const token = new URL(r.data.devLink).searchParams.get("token");
    const v = await this.post("/api/auth/verify", { token });
    return { r, v: v.res, verify: v };
  }
}

const a = new Client(), b = new Client(), anon = new Client(), c = new Client();
const emailA = `alice+${Date.now()}@example.com`, emailB = `bob+${Date.now()}@example.com`, emailC = `carol+${Date.now()}@example.com`;

section("Auth: magic link");
t("anonymous bootstrap is { user: null }", (await anon.get("/api/bootstrap")).data?.user === null);
t("bad email is rejected", (await anon.post("/api/auth/email", { email: "nope" })).status === 400);
const s1 = await a.signIn(emailA);
t("confirming the link signs you in with a session cookie", s1.v.status === 200 && a.jar.has("sw_session"), `status=${s1.v.status}`);
t("session cookie is HttpOnly + SameSite=Lax", /HttpOnly/i.test(s1.v.headers.get("set-cookie") ?? "") && /SameSite=lax/i.test(s1.v.headers.get("set-cookie") ?? ""));
const link = s1.r.data.devLink;
const tok1 = new URL(link).searchParams.get("token");
t("link is single-use (second use fails)", (await anon.post("/api/auth/verify", { token: tok1 })).status === 400);
t("garbage token fails", (await anon.post("/api/auth/verify", { token: "x".repeat(40) })).status === 400);
t("scanner pre-fetch (GET) does NOT burn a fresh link", await (async () => {
  const x = new Client(); const r = await x.post("/api/auth/email", { email: `scan+${Date.now()}@example.com` });
  const tk = new URL(r.data.devLink).searchParams.get("token");
  const g = await fetch(`${BASE}/api/auth/verify?token=${tk}`, { redirect: "manual" });
  return g.status === 307 && g.headers.get("location")?.includes("/auth/confirm") && (await x.post("/api/auth/verify", { token: tk })).status === 200;
})());
const me = (await a.get("/api/bootstrap")).data;
t("bootstrap returns the signed-in user", me.user?.email === emailA && Array.isArray(me.campaigns));
t("open-redirect via next= is neutralised", await (async () => {
  const x = new Client(); const r = await x.post("/api/auth/email", { email: `redir+${Date.now()}@example.com`, next: "//evil.com" });
  const v = await x.post("/api/auth/verify", { token: new URL(r.data.devLink).searchParams.get("token") }); return v.status === 200 && v.data.next === "/dashboard";
})());
t("Google sign-in answers 501 until keys are added", (await anon.get("/api/auth/google")).status === 501);
t("logout clears the session", await (async () => { const x = new Client(); await x.signIn(`out+${Date.now()}@example.com`); const r = await x.post("/api/auth/logout"); return r.status === 200 && (await x.get("/api/bootstrap")).data.user === null; })());

section("Auth: rate limiting + CSRF");
t("cross-site POST is blocked", (await a.post("/api/campaigns", { name: "x" }, { origin: "https://evil.com" })).status === 403);
{ const x = new Client(); const em = `spam+${Date.now()}@example.com`; let last = 0; for (let i = 0; i < 7; i++) last = (await x.post("/api/auth/email", { email: em })).status; t("6th magic-link request for one address gets 429", last === 429, `last=${last}`); }
t("anonymous cannot create campaigns", (await anon.post("/api/campaigns", { name: "x" })).status === 401);

section("Campaigns");
const cid = uuid();
const created = await a.post("/api/campaigns", { id: cid, name: "Gaming outreach", purpose: "Cafes", features: ["googlemaps:scrape", "whatsapp:outreach"], team: [emailB] });
t("create campaign returns it with owner role", created.status === 201 && created.data.campaign.myRole === "owner" && created.data.campaign.id === cid, JSON.stringify(created.data));
t("creating the same id again conflicts", (await a.post("/api/campaigns", { id: cid, name: "dup" })).status === 409);
t("invitee shows as pending team member", created.data.campaign.invites.length === 1 && created.data.campaign.team[0] === emailB);
t("validation rejects empty name", (await a.post("/api/campaigns", { name: "  " })).status === 400);

section("Team: invites, notifications, acceptance");
await b.signIn(emailB);
let bb = (await b.get("/api/bootstrap")).data;
t("invitee has NOT been auto-added", bb.campaigns.length === 0);
t("invitee sees the incoming invite", bb.incomingInvites.length === 1 && bb.incomingInvites[0].campaign === "Gaming outreach", JSON.stringify(bb.incomingInvites));
let nb = (await b.get("/api/notifications")).data;
t("invitee got an in-app notification", nb.unread === 1 && nb.items[0].type === "invite_received", JSON.stringify(nb));
t("non-member cannot see the campaign (404)", (await b.get(`/api/campaigns/${cid}/domains/${uuid()}/places/${uuid()}/sheet`)).status === 404);
t("non-member cannot edit it (404)", (await b.patch(`/api/campaigns/${cid}`, { name: "hax" })).status === 404);
const acc = await b.post(`/api/invites/by-id/${bb.incomingInvites[0].id}/accept`);
t("invitee accepts from the bell", acc.status === 200 && acc.data.campaignId === cid, JSON.stringify(acc));
t("accepting twice is harmless (idempotent)", (await b.post(`/api/invites/by-id/${bb.incomingInvites[0].id}/accept`)).status === 200);
bb = (await b.get("/api/bootstrap")).data;
t("invitee is now a member with role member", bb.campaigns[0]?.myRole === "member" && bb.campaigns[0].members.length === 2);
let na = (await a.get("/api/notifications")).data;
t("owner was notified that the invite was accepted", na.items.some((n) => n.type === "invite_accepted"), JSON.stringify(na.items.map((n) => n.type)));
t("member cannot invite (admin only)", (await b.post(`/api/campaigns/${cid}/invites`, { email: emailC })).status === 403);
t("member cannot change roles", (await b.patch(`/api/campaigns/${cid}/members/${me.user.id}`, { role: "member" })).status === 403);
t("member cannot delete the campaign", (await b.del(`/api/campaigns/${cid}`)).status === 403);
t("owner can't be removed", (await a.del(`/api/campaigns/${cid}/members/${me.user.id}`)).status === 403);

section("Team: email-link invite for someone with no account yet");
const inv = await a.post(`/api/campaigns/${cid}/invites`, { email: emailC, role: "admin" });
t("owner invites by email and gets a dev link", inv.status === 201 && inv.data.devLink?.includes("/invite/"), JSON.stringify(inv));
const token = inv.data.devLink.split("/invite/")[1];
const again = await a.post(`/api/campaigns/${cid}/invites`, { email: emailC, role: "admin" });
t("re-inviting refreshes instead of duplicating", again.data.resent === true && (await a.get("/api/bootstrap")).data.campaigns[0].invites.filter((i) => i.email === emailC).length === 1);
t("the superseded link no longer works", (await anon.get(`/api/invites/${token}`)).status === 404);
const token2 = again.data.devLink.split("/invite/")[1];
const peek = await anon.get(`/api/invites/${token2}`);
t("invite preview is public but masks the address", peek.status === 200 && peek.data.campaign === "Gaming outreach" && peek.data.email.includes("•••"), JSON.stringify(peek.data));
t("anonymous cannot accept", (await anon.post(`/api/invites/${token2}`)).status === 401);
await b.get("/api/bootstrap");
t("wrong account cannot accept someone else's invite", (await b.post(`/api/invites/${token2}`)).status === 403);
const oldLink = inv.data.devLink;
await c.signIn(emailC);
t("new user accepts via the emailed link token", (await c.post(`/api/invites/${token2}`)).status === 200);
const cc = (await c.get("/api/bootstrap")).data;
t("they joined as admin", cc.campaigns[0]?.myRole === "admin");
t("admin can invite", (await c.post(`/api/campaigns/${cid}/invites`, { email: `dave+${Date.now()}@example.com` })).status === 201);
const rev = (await a.get("/api/bootstrap")).data.campaigns[0].invites;
t("pending invite visible to the team", rev.length >= 1);
const zed = await a.post(`/api/campaigns/${cid}/invites`, { email: "zed@example.com" });
t("a revoked invite link stops working", (await anon.get(`/api/invites/${zed.data.devLink.split("/invite/")[1]}`)).status === 200 && (await a.del(`/api/campaigns/${cid}/invites/${zed.data.invite.id}`)).status === 200 && (await anon.get(`/api/invites/${zed.data.devLink.split("/invite/")[1]}`)).status === 404);
t("owner promotes then demotes a member", (await a.patch(`/api/campaigns/${cid}/members/${bb.user.id}`, { role: "admin" })).status === 200 && (await a.patch(`/api/campaigns/${cid}/members/${bb.user.id}`, { role: "member" })).status === 200);
t("member gets a role-changed notification", (await b.get("/api/notifications")).data.items.some((n) => n.type === "role_changed"));

section("Domains, places, sheets");
const did = uuid(), pid = uuid();
t("member adds a domain with an image link", (await b.post(`/api/campaigns/${cid}/domains`, { id: did, name: "Gaming Cafes", image: "https://example.com/x.jpg" })).status === 201);
t("rejects a javascript: image link", (await b.post(`/api/campaigns/${cid}/domains`, { name: "bad", image: "javascript:alert(1)" })).status === 400);
t("adds a place", (await b.post(`/api/campaigns/${cid}/domains/${did}/places`, { id: pid, name: "Delhi NCR" })).status === 201);
const S = `/api/campaigns/${cid}/domains/${did}/places/${pid}/sheet`;
const w1 = await b.patch(S, { changes: [{ row: 0, cells: { name: "Level Up Arena", phone: "+91 90000 11111" }, label: "interested" }, { row: 1, cells: { name: "Pixel Hub" }, label: "converted" }, { row: 3, cells: { name: "Neon Zone" }, label: null }] });
t("writes only changed rows", w1.status === 200 && w1.data.applied === 3, JSON.stringify(w1));
const g1 = (await b.get(S)).data;
t("reads rows back with gaps filled", g1.rows.length === 4 && g1.rows[2] && Object.keys(g1.rows[2]).length === 0 && g1.rows[0].name === "Level Up Arena", JSON.stringify(g1));
t("labels come back keyed by row", g1.labels["0"] === "interested" && g1.labels["1"] === "converted");
t("place stats were updated by delta", g1.stats.leads === 3 && g1.stats.outreached === 2 && g1.stats.converted === 1, JSON.stringify(g1.stats));
await b.patch(S, { changes: [{ row: 0, cells: { name: "Level Up Arena" }, label: null }, { row: 3, cells: null, label: null }] });
const g2 = (await b.get(S)).data;
t("clearing a label / deleting a row adjusts stats", g2.stats.leads === 2 && g2.stats.outreached === 1 && g2.stats.converted === 1 && g2.rows.length === 2, JSON.stringify(g2));
t("sheet rejects absurd rows", (await b.patch(S, { changes: [{ row: 9_999_999, cells: {}, label: null }] })).status === 400);
t("admin sees campaign totals + per-member stats", await (async () => {
  const x = (await a.get("/api/bootstrap")).data.campaigns[0];
  return x.stats.totals.leads === 2 && x.stats.totals.outreached === 1 && x.stats.perMember[bb.user.id]?.outreached >= 1 && x.stats.perDay[bb.user.id].length === 14 && x.stats.perDay[bb.user.id].at(-1) >= 1;
})());
t("member can't delete a domain (admin only)", (await b.del(`/api/campaigns/${cid}/domains/${did}`)).status === 403);

section("Scraper access: API tokens, ingest, jobs");
const tok = await a.post("/api/tokens", { name: "My laptop" });
t("creates a scraper token (shown once)", tok.status === 201 && tok.data.token.startsWith("swk_"));
t("token list never reveals the secret", !JSON.stringify((await a.get("/api/tokens")).data).includes(tok.data.token));
const bearer = { authorization: `Bearer ${tok.data.token}` };
const scraper = new Client();
const items = [1, 2, 3].map((i) => ({ sourceId: `place-${i}`, cells: { name: `Scraped ${i}`, rating: "4.5" } }));
const mapsInput = (q) => ({ location: "Delhi", config: { queries: [q], limit: "all", fields: ["name", "rating"], filters: { minRating: 0, minReviews: 0, website: "any", mustHavePhone: false, skipClosed: true, skipScraped: true, exclude: [] } } });
t("token can't ingest without a job", (await scraper.post("/api/ingest", { campaignId: cid, placeId: pid, source: "googlemaps", items }, bearer)).status === 403);
t("bad token is rejected", (await new Client().post("/api/ingest", { jobId: crypto.randomUUID(), source: "googlemaps", items }, { authorization: "Bearer swk_nope" })).status === 401);
t("token can't manage the account", (await scraper.get("/api/tokens", bearer)).status === 403);
const bad = await a.post("/api/jobs", { campaignId: cid, placeId: pid, tool: "googlemaps", input: { queries: ["x"] } });
t("a malformed scrape config is refused", bad.status === 400, JSON.stringify(bad.data));
const job = await a.post("/api/jobs", { campaignId: cid, placeId: pid, tool: "googlemaps", input: mapsInput("gaming cafe") });
t("owner queues a scrape job", job.status === 201);
t("a second job for the same sheet is refused", (await b.post("/api/jobs", { campaignId: cid, placeId: pid, tool: "googlemaps", input: mapsInput("again") })).status === 409);
const bTok = (await b.post("/api/tokens", { name: "bee" })).data.token;
t("a teammate's scraper never claims my job", (await scraper.post("/api/jobs/claim", {}, { authorization: `Bearer ${bTok}` })).data.job === null);
const jid = job.data.id;
t("ingest is refused until the job is claimed", (await scraper.post("/api/ingest", { jobId: jid, source: "googlemaps", items }, bearer)).status === 404);
const claim = await scraper.post("/api/jobs/claim", {}, bearer);
t("worker claims it atomically", claim.data.job?.id === jid && claim.data.job.tool === "googlemaps");
t("a second claim finds nothing", (await scraper.post("/api/jobs/claim", {}, bearer)).data.job === null);
const i1 = await scraper.post("/api/ingest", { jobId: jid, source: "googlemaps", items }, bearer);
t("token ingests leads through its job", i1.status === 200 && i1.data.added === 3, JSON.stringify(i1));
const i2 = await scraper.post("/api/ingest", { jobId: jid, source: "googlemaps", items: [...items, { sourceId: "place-4", cells: { name: "New" } }] }, bearer);
t("re-scrape dedupes: 1 new, 3 updated", i2.data.added === 1 && i2.data.updated === 3, JSON.stringify(i2.data));
t("ingested rows land after existing rows", (await b.get(S)).data.rows.length === 2 + 4 && (await b.get(S)).data.stats.leads === 6, JSON.stringify((await b.get(S)).data.stats));
t("a body pointing at another sheet is refused", (await scraper.post("/api/ingest", { jobId: jid, campaignId: cid, placeId: crypto.randomUUID(), source: "googlemaps", items }, bearer)).status === 403);
t("an outsider's token can't use my job", await (async () => { const z = new Client(); await z.signIn(`zoe+${Date.now()}@example.com`); const tk = (await z.post("/api/tokens", { name: "z" })).data.token; return (await new Client().post("/api/ingest", { jobId: jid, source: "googlemaps", items }, { authorization: `Bearer ${tk}` })).status === 404; })());
t("a teammate's token can't use my job either", (await scraper.post("/api/ingest", { jobId: jid, source: "googlemaps", items }, { authorization: `Bearer ${bTok}` })).status === 404);
t("known ids list what's already on the sheet", (await scraper.get(`/api/ingest/known?jobId=${jid}`, bearer)).data.ids.length === 4);
const SY = `/api/campaigns/${cid}/domains/${did}/places/${pid}/sync`;
const sy = await b.get(`${SY}?since=0`);
t("a member sees the job and its rows live", sy.status === 200 && sy.data.job?.status === "running" && sy.data.rows.length >= 4 && typeof sy.data.now === "number", JSON.stringify(sy.data.job));
t("sync only returns what changed since the cursor", (await b.get(`${SY}?since=${sy.data.now + 60000}`)).data.rows.length === 0);
t("sync with another campaign's sheet id is a 404", (await b.get(`/api/campaigns/${cid}/domains/${did}/places/${crypto.randomUUID()}/sync`)).status === 404);
t("an outsider can't sync my sheet", (await new Client().get(SY)).status === 401 && await (async () => { const z = new Client(); await z.signIn(`zed+${Date.now()}@example.com`); return (await z.get(SY)).status === 404; })());
t("the dashboard can stop a running job", (await a.patch(`/api/jobs/${jid}`, { status: "cancelled" })).data.status === "cancelled");
t("the worker learns it was stopped", (await scraper.patch(`/api/jobs/${jid}`, { progress: 0.5 }, bearer)).data.status === "cancelled");
t("a stopped job can't be revived or written to", (await scraper.patch(`/api/jobs/${jid}`, { status: "running" }, bearer)).data.status === "cancelled" && (await scraper.post("/api/ingest", { jobId: jid, source: "googlemaps", items }, bearer)).status === 403);
const job2 = await a.post("/api/jobs", { campaignId: cid, placeId: pid, tool: "googlemaps", input: mapsInput("second") });
await scraper.post("/api/jobs/claim", {}, bearer);
t("worker reports done", (await scraper.patch(`/api/jobs/${job2.data.id}`, { status: "done", progress: 1, leadsFound: 4 }, bearer)).status === 200);
t("creator is notified when the job finishes", (await a.get("/api/notifications")).data.items.some((n) => n.type === "job_done"));
t("a finished job takes no more rows", (await scraper.post("/api/ingest", { jobId: job2.data.id, source: "googlemaps", items }, bearer)).status === 403);
t("owner revokes the token", (await a.del(`/api/tokens/${tok.data.id}`)).status === 200 && (await scraper.post("/api/jobs/claim", {}, bearer)).status === 401);

section("Deleting data: columns, rows, sheets");
{
  const ccid = uuid(), ddid = uuid(), ppid = uuid();
  await a.post("/api/campaigns", { id: ccid, name: "Delete tests", purpose: "x", features: ["googlemaps:scrape"], team: [] });
  await a.post(`/api/campaigns/${ccid}/domains`, { id: ddid, name: "Dom" });
  await a.post(`/api/campaigns/${ccid}/domains/${ddid}/places`, { id: ppid, name: "City" });
  const SH = `/api/campaigns/${ccid}/domains/${ddid}/places/${ppid}/sheet`, PL = `/api/campaigns/${ccid}/domains/${ddid}/places/${ppid}`;
  await a.patch(SH, { changes: [
    { row: 0, cells: { name: "Alpha", phone: "1", website: "a.com" }, label: null },
    { row: 1, cells: { phone: "2" }, label: null },
    { row: 2, cells: { phone: "3" }, label: "interested" },
    { row: 3, cells: { name: "Delta", phone: "4" }, label: null },
  ] });
  t("clearing every cell of a row deletes the lead from the database", (await a.patch(SH, { changes: [{ row: 3, cells: {}, label: null }] })).status === 200 && (await db.collection("leads").countDocuments({ placeId: ppid, row: 3 })) === 0);
  t("clearing one cell removes only that value from the database", (await a.patch(SH, { changes: [{ row: 0, cells: { name: "Alpha", website: "a.com" }, label: null }] })).status === 200 && !("phone" in (await db.collection("leads").findOne({ placeId: ppid, row: 0 })).cells));
  const before = await db.collection("leads").countDocuments({ placeId: ppid });
  const noKey = await a.patch(PL, { dropFields: ["a.b"] });
  t("a malformed column key is refused", noKey.status === 400);
  const drop = await a.patch(PL, { scrape: { queries: ["x"], fields: ["name", "website"] }, dropFields: ["phone", "website"] });
  t("deleting columns succeeds and returns fresh counters", drop.status === 200 && drop.data.stats.leads === 1 && drop.data.stats.outreached === 1, JSON.stringify(drop.data));
  const left = await db.collection("leads").find({ placeId: ppid }).toArray();
  t("the column's values are gone from every lead in the database", left.every((l) => !("phone" in l.cells) && !("website" in l.cells)), JSON.stringify(left.map((l) => l.cells)));
  t("leads left with nothing (and no label) are deleted; labelled ones are kept", left.length === 2 && left.some((l) => l.label === "interested") && left.some((l) => l.cells.name === "Alpha"), `${before} -> ${left.length}`);
  t("other columns are untouched", left.find((l) => l.cells.name === "Alpha") !== undefined);
  t("an outsider can't delete columns", (await new Client().patch(PL, { dropFields: ["name"] })).status === 401);
  t("another campaign's member can't either (404)", (await c.patch(PL, { dropFields: ["name"] })).status === 404 || (await c.patch(PL, { dropFields: ["name"] })).status === 401);
  // A running scrape would write the column straight back, so deleting columns is refused until it's stopped.
  const sc = await a.post("/api/jobs", { campaignId: ccid, placeId: ppid, tool: "googlemaps", input: mapsInput("x") });
  t("deleting columns during an active scrape is refused", (await a.patch(PL, { dropFields: ["name"] })).status === 409 && (await db.collection("leads").countDocuments({ placeId: ppid, "cells.name": "Alpha" })) === 1);
  t("deleting the sheet also deletes its scrape jobs", (await a.del(PL)).status === 200 && (await db.collection("jobs").countDocuments({ placeId: ppid })) === 0 && (await db.collection("leads").countDocuments({ placeId: ppid })) === 0 && !!sc.data.id);
  // domain delete
  const p2 = uuid();
  await a.post(`/api/campaigns/${ccid}/domains/${ddid}/places`, { id: p2, name: "City 2" });
  await a.post("/api/jobs", { campaignId: ccid, placeId: p2, tool: "googlemaps", input: mapsInput("y") });
  await a.patch(`/api/campaigns/${ccid}/domains/${ddid}/places/${p2}/sheet`, { changes: [{ row: 0, cells: { name: "Z" }, label: null }] });
  t("deleting a domain removes its sheets, leads and jobs", (await a.del(`/api/campaigns/${ccid}/domains/${ddid}`)).status === 200 && (await db.collection("leads").countDocuments({ placeId: p2 })) === 0 && (await db.collection("jobs").countDocuments({ placeId: p2 })) === 0 && (await db.collection("places").countDocuments({ domainId: ddid })) === 0);
  t("deleting the campaign removes everything under it", (await a.del(`/api/campaigns/${ccid}`)).status === 200 && (await db.collection("leads").countDocuments({ campaignId: ccid })) === 0 && (await db.collection("domains").countDocuments({ campaignId: ccid })) === 0);
}

section("Notifications");
const nl = (await b.get("/api/notifications")).data;
t("unread count is accurate", nl.unread === nl.items.filter((n) => !n.read).length);
await b.post("/api/notifications", { ids: [nl.items[0].id] });
t("mark one read", (await b.get("/api/notifications")).data.unread === nl.unread - 1);
await b.post("/api/notifications", { all: true });
t("mark all read", (await b.get("/api/notifications")).data.unread === 0);
t("pagination returns a cursor", (await b.get("/api/notifications?limit=1")).data.next !== null);
t("can't read someone else's notifications by id", await (async () => { const before = (await a.get("/api/notifications")).data.unread; await b.post("/api/notifications", { ids: (await a.get("/api/notifications")).data.items.map((n) => n.id) }); return (await a.get("/api/notifications")).data.unread === before; })());

section("Cascade delete + leaving");
t("admin removes a domain (and its leads)", (await a.del(`/api/campaigns/${cid}/domains/${did}`)).status === 200 && (await b.get(S)).status === 404);
t("a member can leave", (await b.del(`/api/campaigns/${cid}/members/${bb.user.id}`)).status === 200 && (await b.get("/api/bootstrap")).data.campaigns.length === 0);
t("owner is told", (await a.get("/api/notifications")).data.items.some((n) => n.title.includes("left")));
t("owner deletes the campaign", (await a.del(`/api/campaigns/${cid}`)).status === 200 && (await a.get("/api/bootstrap")).data.campaigns.length === 0);
t("former admin lost access", (await c.get("/api/bootstrap")).data.campaigns.length === 0);

section("Providers and removed features");
t("providers endpoint reports what's configured", await (async () => { const d = (await anon.get("/api/auth/providers")).data; return d.google === false && d.email === true; })());
t("import endpoint is gone (no guest mode)", (await a.post("/api/workspace/import", { campaigns: [] })).status === 404);

section("Database state");
const idx = async (c) => (await db.collection(c).indexes()).map((i) => JSON.stringify(i.key));
t("unique (placeId,row) index exists on leads", (await idx("leads")).includes('{"placeId":1,"row":1}'));
t("unique email index exists on users", (await db.collection("users").indexes()).some((i) => i.unique && JSON.stringify(i.key) === '{"email":1}'));
t("TTL index on sessions", (await db.collection("sessions").indexes()).some((i) => i.expireAfterSeconds === 0));
t("session ids are stored hashed, never the raw cookie", await (async () => { const raw = a.jar.get("sw_session"); return raw && !(await db.collection("sessions").findOne({ _id: raw })) && !!(await db.collection("sessions").findOne({ _id: (await import("node:crypto")).createHash("sha256").update(raw).digest("hex") })); })());
t("invite + sign-in emails were queued and delivered", await (async () => { await new Promise((r) => setTimeout(r, 1500)); const sent = await db.collection("emails").countDocuments({ status: "sent" }); const queued = await db.collection("emails").countDocuments({ status: "queued" }); return sent >= 5 && queued === 0; })());
t("invite email carries the invite link", !!(await db.collection("emails").findOne({ subject: /invited you/, text: /\/invite\// })));
t("no raw invite token is stored", !(await db.collection("invites").findOne({ token: { $exists: true } })));

section("Concurrency");
{
  const cc = uuid(), dd = uuid(), pp = uuid();
  await a.post("/api/campaigns", { id: cc, name: "Concurrent" });
  await a.post(`/api/campaigns/${cc}/domains`, { id: dd, name: "D" });
  await a.post(`/api/campaigns/${cc}/domains/${dd}/places`, { id: pp, name: "P" });
  const SS = `/api/campaigns/${cc}/domains/${dd}/places/${pp}/sheet`;
  const rs = await Promise.all(Array.from({ length: 40 }, (_, i) => a.patch(SS, { changes: [{ row: i, cells: { name: `r${i}` }, label: i % 2 ? "interested" : null }] })));
  t("40 parallel sheet writes all succeed", rs.every((r) => r.status === 200));
  const st = (await a.get(SS)).data;
  t("counters stay exact under concurrent writes", st.stats.leads === 40 && st.stats.outreached === 20 && st.rows.length === 40, JSON.stringify(st.stats));
  const recounted = await db.collection("leads").countDocuments({ placeId: pp });
  t("no duplicate or lost rows in the database", recounted === 40);
  const sameTok = (await a.post("/api/tokens", { name: "c" })).data.token;
  await a.post("/api/jobs", { campaignId: cc, placeId: pp, tool: "googlemaps", input: mapsInput("race") });
  const sameJob = (await scraper.post("/api/jobs/claim", {}, { authorization: `Bearer ${sameTok}` })).data.job;
  const same = await Promise.all(Array.from({ length: 20 }, () => scraper.post("/api/ingest", { jobId: sameJob.id, source: "googlemaps", items: [{ sourceId: "same", cells: { name: "dup" } }] }, { authorization: `Bearer ${sameTok}` })));
  t("20 parallel ingests of one business create exactly one row", (await db.collection("leads").countDocuments({ placeId: pp, sourceId: "same" })) === 1, JSON.stringify(same.map((r) => r.status)));
  const acc2 = await Promise.all(Array.from({ length: 5 }, async () => { const x = new Client(); await x.signIn(`race+${Date.now()}${Math.random()}@example.com`); return x; }));
  const em = `race-target+${Date.now()}@example.com`;
  const ri = await a.post(`/api/campaigns/${cc}/invites`, { email: em });
  const target = new Client(); await target.signIn(em);
  const tk = ri.data.devLink.split("/invite/")[1];
  const dbl = await Promise.all([target.post(`/api/invites/${tk}`), target.post(`/api/invites/${tk}`), target.post(`/api/invites/${tk}`)]);
  t("accepting the same invite 3x at once yields one membership", dbl.every((r) => r.status === 200) && (await db.collection("members").countDocuments({ campaignId: cc, userId: (await target.get("/api/bootstrap")).data.user.id })) === 1);
  t("one accept notification, not three", (await db.collection("notifications").countDocuments({ type: "invite_accepted", "data.campaignId": cc })) === 1);
}

section("Reliability: dead workers, oversized bodies, health");
{
  // Earlier sections delete their campaign, so this one brings its own.
  const cid = (await a.post("/api/campaigns", { name: "Reliability" })).data.campaign.id;
  const did = uuid(), pid2 = uuid();
  const bearer = { authorization: `Bearer ${(await a.post("/api/tokens", { name: "rel" })).data.token}` };
  await a.post(`/api/campaigns/${cid}/domains`, { id: did, name: "Cafes" });
  await a.post(`/api/campaigns/${cid}/domains/${did}/places`, { id: pid2, name: "Mumbai" });
  const j1 = await a.post("/api/jobs", { campaignId: cid, placeId: pid2, tool: "googlemaps", input: mapsInput("cafe") });
  let c1; // older queued jobs from earlier sections may be claimed first
  for (let i = 0; i < 8 && c1?.data.job?.id !== j1.data.id; i++) c1 = await scraper.post("/api/jobs/claim", {}, bearer);
  t("worker claims and the claim records a heartbeat", c1.data.job?.id === j1.data.id && !!(await db.collection("jobs").findOne({ _id: j1.data.id })).heartbeatAt, JSON.stringify({ j1: j1.status, c1: c1.status, d: c1.data }));
  t("a live scrape still blocks a second one", (await a.post("/api/jobs", { campaignId: cid, placeId: pid2, tool: "googlemaps", input: mapsInput("again") })).status === 409);
  await db.collection("jobs").updateOne({ _id: j1.data.id }, { $set: { heartbeatAt: new Date(Date.now() - 10 * 60_000) } });
  const j2 = await a.post("/api/jobs", { campaignId: cid, placeId: pid2, tool: "googlemaps", input: mapsInput("retry") });
  t("a crashed worker's job is failed and the sheet is free again", j2.status === 201 && (await db.collection("jobs").findOne({ _id: j1.data.id })).status === "failed", JSON.stringify(j2.data));
  t("the dead worker learns it was failed", (await scraper.patch(`/api/jobs/${j1.data.id}`, { progress: 0.5 }, bearer)).data.status === "failed");

  // Chunked uploads send no Content-Length, so the size cap has to be enforced while reading.
  const big = JSON.stringify({ name: "x".repeat(1_200_000) });
  const r = await fetch(BASE + "/api/campaigns", { method: "POST", headers: { ...a.headers({ "content-type": "application/json", connection: "close" }) }, body: new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(big)); c.close(); } }), duplex: "half" });
  t("an oversized chunked body is refused with 413", r.status === 413, String(r.status));
  const h = await fetch(BASE + "/api/health?deep=1");
  t("health endpoint pings the database", h.status === 200 && (await h.json()).db === "up");
  t("responses carry a request id", !!(await a.get("/api/bootstrap")).res.headers.get("x-request-id"));
  const idx = await db.collection("leads").indexes();
  t("the unused leads(campaignId,label) index is gone", !idx.some((i) => i.name === "campaignId_1_label_1"));
}

section("Email outbox");
t("outbox drain needs the cron secret", (await anon.post("/api/internal/outbox")).status === 403);
if (process.env.CRON_SECRET) {
  await db.collection("emails").insertOne({ _id: uuid(), to: "retry@example.com", subject: "retry", html: "", text: "hi", status: "queued", attempts: 2, nextAttemptAt: new Date(Date.now() - 1000), lastError: "boom", createdAt: new Date(), sentAt: null });
  const d = await anon.post("/api/internal/outbox", {}, { "x-cron-secret": process.env.CRON_SECRET });
  t("cron drain retries a stuck email", d.status === 200 && d.data.sent >= 1 && (await db.collection("emails").findOne({ to: "retry@example.com" })).status === "sent", JSON.stringify(d.data));
}
await mongo.close();

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
