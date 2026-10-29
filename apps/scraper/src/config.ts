import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const DATA_DIR = process.env.SW_DATA_DIR ?? join(ROOT, "data");
const FILE = join(DATA_DIR, "config.json");

export type Settings = {
  /** Street Wolf web app, e.g. http://localhost:3000 */
  apiUrl: string;
  /** Token from Settings > Integrations in the web app (swk_...). */
  token: string;
  /**
   * "click": one tab per worker, click through the results list like a person (default: gentlest on Google, no page loads).
   * "tabs": open every business in its own tab, several at once (faster, more page loads, easier to spot).
   */
  mode: "click" | "tabs";
  /** Click mode: browser tabs working through the list at once (1 when the window is visible unless you say otherwise). */
  clickWorkers: number;
  /** Tabs mode: pages scraped at once. The pacer lowers this by itself when Google pushes back. */
  concurrency: number;
  /** Delay between page loads per worker, milliseconds. */
  minDelayMs: number;
  maxDelayMs: number;
  headless: boolean;
  port: number;
  /** Use public free proxies (slow and unreliable; see README). Your own proxies.txt is always used if present. */
  freeProxies: boolean;
  /** Not saved: true when --workers / SW_WORKERS was given, so a visible window may use more than one tab. */
  explicitWorkers?: boolean;
};

export const DEFAULTS: Settings = {
  apiUrl: "http://localhost:3000",
  token: "",
  mode: "click",
  clickWorkers: 2,
  concurrency: 3,
  minDelayMs: 1200,
  maxDelayMs: 3200,
  headless: true,
  port: 4317,
  freeProxies: false,
};

export function loadSettings(): Settings {
  let saved: Partial<Settings> = {};
  try {
    saved = JSON.parse(readFileSync(FILE, "utf8"));
  } catch {}
  const env = process.env;
  const s: Settings = { ...DEFAULTS, ...saved };
  if (env.SW_API_URL) s.apiUrl = env.SW_API_URL;
  if (env.SW_TOKEN) s.token = env.SW_TOKEN;
  if (env.SW_CONCURRENCY) s.concurrency = Number(env.SW_CONCURRENCY);
  if (env.SW_WORKERS) {
    s.clickWorkers = Number(env.SW_WORKERS);
    s.explicitWorkers = true;
  }
  if (env.SW_MODE === "click" || env.SW_MODE === "tabs") s.mode = env.SW_MODE;
  if (env.SW_HEADLESS) s.headless = env.SW_HEADLESS !== "false";
  if (env.SW_FREE_PROXIES) s.freeProxies = env.SW_FREE_PROXIES === "true";
  s.apiUrl = s.apiUrl.replace(/\/+$/, "");
  s.concurrency = Math.min(8, Math.max(1, Math.round(s.concurrency) || 1));
  s.clickWorkers = Math.min(4, Math.max(1, Math.round(s.clickWorkers) || 1));
  if (s.mode !== "tabs") s.mode = "click";
  return s;
}

export function saveSettings(patch: Partial<Settings>) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  let saved: Partial<Settings> = {};
  try {
    saved = JSON.parse(readFileSync(FILE, "utf8"));
  } catch {}
  writeFileSync(FILE, JSON.stringify({ ...saved, ...patch }, null, 2));
  try {
    chmodSync(FILE, 0o600); // holds the token; no-op on Windows
  } catch {}
}

export const PROXY_FILE = join(ROOT, "proxies.txt");
