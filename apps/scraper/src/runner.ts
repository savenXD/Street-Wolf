import { loadSettings, type Settings } from "./config";
import { Pacer } from "./pacer";
import { fetchFreeProxies, loadOwnProxies, ProxyPool, type Proxy } from "./proxies";
import { Session } from "./browser";
import { scrapeMaps } from "./maps";
import type { Hooks, ScrapeConfig } from "./types";

/** Wires proxies, pacing and the browser together for one run, and always cleans the browser up. */
export async function run(cfg: ScrapeConfig, location: string, hooks: Hooks, settings: Settings = loadSettings(), seenIds: Set<string> = new Set()) {
  const own = loadOwnProxies();
  let list: (Proxy | null)[] = own;
  if (!own.length && settings.freeProxies) {
    const free = await fetchFreeProxies(15, (m) => hooks.log(m));
    hooks.log(`${free.length} free proxies passed the tunnel test. Direct connection is used first; proxies only after a block.`);
    list = [null, ...free];
  } else if (own.length) {
    hooks.log(`Using ${own.length} proxies from proxies.txt`);
  }
  const pool = new ProxyPool(list);
  let headless = settings.headless;
  if (!headless && process.platform === "linux" && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
    hooks.log("No display found, so the window can't open. Running in the background instead.", "warn");
    headless = true;
  }
  // Click mode only clicks inside an already-open page (no page loads), so its pauses are shorter. One tab when you're watching a window.
  const click = settings.mode === "click";
  const workers = click ? (headless || settings.explicitWorkers ? settings.clickWorkers : 1) : settings.concurrency;
  const scale = click ? 0.3 : 1;
  const pacer = new Pacer(workers, Math.round(settings.minDelayMs * scale), Math.round(settings.maxDelayMs * scale), hooks.signal, (ms, n) =>
    hooks.log(`Pausing ${Math.round(ms / 1000)}s (block #${n}), then continuing slowly`, "warn"),
  );
  hooks.log(`${headless ? "Browser: background (no window)" : "Browser: visible window"}, ${click ? `click-through, ${workers} tab${workers > 1 ? "s" : ""}` : `fast mode, ${workers} tabs at once`}`);
  const session = new Session(headless, pool);
  try {
    return await scrapeMaps(cfg, location, { session, pacer, hooks, seenIds, mode: settings.mode });
  } finally {
    if (process.env.SW_DEBUG) hooks.log("  [closing browser]");
    await session.close();
    if (process.env.SW_DEBUG) hooks.log("  [browser closed]");
  }
}
