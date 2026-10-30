// Load simulation: N users, each signs in, creates a campaign with a domain/place, writes a sheet, reads their workspace
// and notifications, and invites a teammate. Run against a production build:
//   N=500 CONCURRENCY=100 BASE=http://localhost:3100 node scripts/load.mjs
import { createRequire } from "node:module";
const BASE = process.env.BASE ?? "http://localhost:3100";
const N = Number(process.env.N ?? 500), CONC = Number(process.env.CONCURRENCY ?? 100);
const { MongoClient } = createRequire(new URL("../packages/db/package.json", import.meta.url))("mongodb");
const mongo = await new MongoClient(process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27099").connect();
const db = mongo.db(process.env.MONGODB_DB ?? "e2e");
const lat = [], errs = [];
const uuid = () => crypto.randomUUID();

async function timed(name, fn) {
  const t0 = performance.now();
  try { const r = await fn(); lat.push([name, performance.now() - t0]); return r; } catch (e) { errs.push(`${name}: ${e.message}`); lat.push([name, performance.now() - t0]); throw e; }
}

async function user(i) {
  const jar = new Map(); const ip = `10.${i >> 8 & 255}.${i & 255}.${(i * 7) & 255}`;
  const hdr = (h = {}) => ({ "x-forwarded-for": ip, cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "), ...h });
  const call = async (name, method, path, body) => timed(name, async () => {
    const r = await fetch(BASE + path, { method, redirect: "manual", headers: hdr(body ? { "content-type": "application/json" } : {}), body: body ? JSON.stringify(body) : undefined });
    for (const c of r.headers.getSetCookie?.() ?? []) { const [kv] = c.split(";"); const j = kv.indexOf("="); jar.set(kv.slice(0, j), kv.slice(j + 1)); }
    if (r.status >= 400) throw new Error(`${r.status} ${path}`);
    return r;
  });
  const email = `load${i}+${Date.now()}@example.com`;
  await call("auth.email", "POST", "/api/auth/email", { email });
  const m = await db.collection("emails").find({ to: email }).sort({ createdAt: -1 }).limit(1).next();
  const link = m.text.match(/https?:\/\/\S+\/auth\/confirm\?token=[\w-]+/)[0];
  await call("auth.verify", "POST", "/api/auth/verify", { token: new URL(link).searchParams.get("token") });
  const cid = uuid(), did = uuid(), pid = uuid();
  await call("campaign.create", "POST", "/api/campaigns", { id: cid, name: `Load ${i}`, features: ["googlemaps:scrape"] });
  await call("domain.create", "POST", `/api/campaigns/${cid}/domains`, { id: did, name: "Gyms" });
  await call("place.create", "POST", `/api/campaigns/${cid}/domains/${did}/places`, { id: pid, name: "Jaipur" });
  const changes = Array.from({ length: 50 }, (_, r) => ({ row: r, set: { name: `Biz ${r}`, phone: `+91 ${r}` }, label: r % 3 ? "interested" : null }));
  await call("sheet.write", "PATCH", `/api/campaigns/${cid}/domains/${did}/places/${pid}/sheet`, { changes });
  await call("bootstrap", "GET", "/api/bootstrap");
  await call("sheet.read", "GET", `/api/campaigns/${cid}/domains/${did}/places/${pid}/sheet`);
  await call("notifications", "GET", "/api/notifications");
  await call("invite", "POST", `/api/campaigns/${cid}/invites`, { email: `friend${i}+${Date.now()}@example.com` });
}

const t0 = performance.now();
let next = 0, done = 0, failed = 0;
await Promise.all(Array.from({ length: CONC }, async () => {
  while (next < N) { const i = next++; try { await user(i); done++; } catch { failed++; } }
}));
const secs = (performance.now() - t0) / 1000;
const by = {}; for (const [n, ms] of lat) (by[n] ??= []).push(ms);
const p = (a, q) => a.sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * q))];
console.log(`\n${N} users, ${CONC} at a time: ${done} completed, ${failed} failed, ${secs.toFixed(1)}s total, ${(lat.length / secs).toFixed(0)} req/s`);
console.log("endpoint            n     p50     p95     max (ms)");
for (const [n, a] of Object.entries(by)) console.log(n.padEnd(18), String(a.length).padStart(4), p(a, 0.5).toFixed(0).padStart(7), p(a, 0.95).toFixed(0).padStart(7), Math.max(...a).toFixed(0).padStart(7));
if (errs.length) console.log("\nerrors:", [...new Set(errs)].slice(0, 8), `(${errs.length})`);
await mongo.close();
process.exit(failed ? 1 : 0);
