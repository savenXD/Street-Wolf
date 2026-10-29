#!/usr/bin/env tsx
import { rmSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { Api } from "./api";
import { DATA_DIR, loadSettings, saveSettings } from "./config";
import { run } from "./runner";
import { startServer } from "./server";
import { defaultConfig, type Row } from "./types";
import { workLoop } from "./worker";

const HELP = `Street Wolf scraper

  setup                         Save your web app address and access token
  start                         Run the scraper. It picks up jobs started from the dashboard
  doctor                        Check that the browser launches and Google Maps loads
  logout                        Delete the saved address and token from this computer
  scrape "<query>" [options]    One-off scrape printed to the terminal (CSV). Nothing is saved to disk;
                                redirect it yourself if you want a file: ... > leads.csv
      --location "Austin, TX"   Where to search
      --limit 50                Max results per query (default: all Maps will give)
      --fields name,phone,...   Columns (default: name,category,address,phone,website,rating,reviews)
      --headed                  Show the browser window
      --fast                    Open each business in its own tab (faster, more page loads)
      --workers 2               Tabs clicking through the list at once (1 to 4)
      --free-proxies            Also use tested free proxies after a block (unreliable)

Options for start: --headed (show the browser window), --fast, --workers 2, --free-proxies, --concurrency 3
Window mode is also: npm run start:window`;

function flags(argv: string[]) {
  const out: Record<string, string | true> = {};
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) rest.push(a);
    else if (argv[i + 1] && !argv[i + 1].startsWith("--")) out[a.slice(2)] = argv[++i];
    else out[a.slice(2)] = true;
  }
  return { f: out, rest };
}

async function setup() {
  // Reads lines through one iterator so it also works when the answers are piped in.
  const rl = createInterface({ input: process.stdin });
  const lines = rl[Symbol.asyncIterator]();
  const ask = async (q: string) => {
    process.stdout.write(q);
    const r = await lines.next();
    return r.done ? "" : r.value.trim();
  };
  const cur = loadSettings();
  const apiUrl = ((await ask(`Street Wolf address [${cur.apiUrl}]: `)) || cur.apiUrl).replace(/\/+$/, "");
  const token = (await ask("Access token (Settings > Integrations in the web app): ")) || cur.token;
  rl.close();
  const status = await new Api(apiUrl, token).check();
  if (status === "unreachable") return console.error(`Can't reach ${apiUrl}. Check the address and that the web app is running.`), process.exit(1);
  if (status === "bad-token") return console.error("That token was rejected. Create a new one in Settings > Integrations."), process.exit(1);
  saveSettings({ apiUrl, token });
  console.log("Saved. Run: npm start");
}

async function start(f: Record<string, string | true>) {
  if (f.headed) process.env.SW_HEADLESS = "false";
  if (f["free-proxies"]) process.env.SW_FREE_PROXIES = "true";
  if (typeof f.concurrency === "string") process.env.SW_CONCURRENCY = f.concurrency;
  if (f.fast) process.env.SW_MODE = "tabs";
  if (typeof f.workers === "string") process.env.SW_WORKERS = f.workers;
  const s = loadSettings();
  if (!s.token) return console.error("No access token yet. Run: npm run setup"), process.exit(1);
  startServer();
  console.log(`Street Wolf scraper running (health: http://127.0.0.1:${s.port}/health). Waiting for jobs from ${s.apiUrl}. Ctrl+C to quit.`);
  const ctl = new AbortController();
  process.on("SIGINT", () => process.exit(0));
  await workLoop(ctl.signal);
}

async function doctor() {
  const ok = (m: string) => console.log(`  ok   ${m}`);
  const no = (m: string) => console.log(`  FAIL ${m}`);
  const s = loadSettings();
  console.log(`Node ${process.version} on ${process.platform}/${process.arch}`);
  Number(process.versions.node.split(".")[0]) >= 20 ? ok("Node 20 or newer") : no("Node is too old (need 20+)");
  if (s.token) {
    const r = await new Api(s.apiUrl, s.token).check();
    r === "ok" ? ok(`Connected to ${s.apiUrl}`) : no(r === "bad-token" ? "The saved token was rejected. Run: npm run setup" : `Can't reach ${s.apiUrl}`);
  } else no("No access token yet. Run: npm run setup");
  try {
    const { chromium } = await import("patchright");
    const b = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
    ok("Browser launches");
    const page = await b.newPage();
    await page.goto("https://www.google.com/maps?hl=en", { waitUntil: "domcontentloaded", timeout: 20000 });
    ok(page.url().includes("/sorry/") ? "Google Maps loads (but asked for a CAPTCHA: this network is flagged)" : "Google Maps loads");
    await b.close();
  } catch (e) {
    no(`Browser: ${(e as Error).message.split("\n")[0]}`);
    console.log("\n  Fix: run  npx patchright install chromium" + (process.platform === "linux" ? "\n  and, if libraries are missing:  sudo npx patchright install-deps chromium" : ""));
  }
}

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

async function scrape(rest: string[], f: Record<string, string | true>) {
  const queries = rest.filter(Boolean);
  if (!queries.length) return console.log(HELP);
  const cfg = defaultConfig(queries);
  if (typeof f.limit === "string") cfg.limit = Math.max(1, Number(f.limit) || 1);
  if (typeof f.fields === "string") cfg.fields = f.fields.split(",").map((x) => x.trim()).filter(Boolean);
  if (f.fast) process.env.SW_MODE = "tabs";
  if (typeof f.workers === "string") process.env.SW_WORKERS = f.workers;
  const s = loadSettings();
  if (f.headed) s.headless = false;
  if (f["free-proxies"]) s.freeProxies = true;
  const ctl = new AbortController();
  process.on("SIGINT", () => ctl.abort());
  const t0 = Date.now();
  let n = 0;
  // Results go to stdout (CSV), progress and messages to stderr, so `> leads.csv` captures clean data and nothing touches the disk by default.
  console.log(cfg.fields.join(","));
  await run(
    cfg,
    typeof f.location === "string" ? f.location : "",
    {
      signal: ctl.signal,
      log: (m, l) => console.error(l === "warn" ? `! ${m}` : m),
      onProgress: (p) => process.stderr.write(`\r${p.note ?? ""}  (${p.found} found)      `),
      async onRows(rows: Row[]) {
        for (const r of rows) console.log(cfg.fields.map((k) => csvCell(r.cells[k] ?? "")).join(","));
        n += rows.length;
      },
    },
    s,
  ).catch((e) => console.error(`\nStopped: ${(e as Error).message}`));
  const secs = (Date.now() - t0) / 1000;
  console.error(`\n${n} businesses in ${secs.toFixed(0)}s (${((n / Math.max(1, secs)) * 60).toFixed(0)}/min)`);
}

function logout() {
  rmSync(DATA_DIR, { recursive: true, force: true });
  console.log("Removed the saved address and token. Nothing else was stored on this computer.");
}

const [cmd, ...args] = process.argv.slice(2);
const { f, rest } = flags(args);
if (cmd === "setup") await setup();
else if (cmd === "start") await start(f);
else if (cmd === "doctor") await doctor();
else if (cmd === "logout") logout();
else if (cmd === "scrape") await scrape(rest, f);
else console.log(HELP);
