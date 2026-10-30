import { chromium, type Browser, type BrowserContext, type Page } from "patchright";
import type { Proxy, ProxyPool } from "./proxies";

/**
 * One browser, one live context at a time. `rotate()` swaps in a fresh context (new cookies, next proxy) after a block or
 * after enough pages that a long-lived session starts to look odd. Pages opened on the old context finish and are discarded.
 */
export class Session {
  private browser: Browser | null = null;
  private ctx: BrowserContext | null = null;
  private pages = 0;
  proxy: Proxy | null = null;
  /** Bumps on every rotation, so several workers hitting the same block only trigger one cooldown. */
  generation = 0;
  constructor(private headless: boolean, private pool: ProxyPool) {}

  private async context() {
    if (this.ctx) return this.ctx;
    this.browser ??= await chromium.launch({ headless: this.headless, args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"], proxy: { server: "per-context" } });
    this.proxy = this.pool.current();
    const ctx = await this.browser.newContext({
      locale: "en-US",
      viewport: { width: 1366, height: 900 },
      ...(this.proxy ? { proxy: this.proxy } : {}),
    });
    // Images, fonts and media are most of the bytes and none of the data.
    await ctx.route("**/*", (r) => (["image", "font", "media"].includes(r.request().resourceType()) ? r.abort() : r.continue()));
    ctx.setDefaultTimeout(20_000);
    return (this.ctx = ctx);
  }

  async page(): Promise<Page> {
    if (this.pages++ > 150) await this.rotate(false);
    return (await this.context()).newPage();
  }

  async rotate(nextProxy: boolean) {
    const old = this.ctx;
    this.ctx = null;
    this.generation++;
    this.pages = 0;
    if (nextProxy) this.pool.rotate();
    await old?.close().catch(() => {});
  }

  async close() {
    await this.ctx?.close().catch(() => {});
    await this.browser?.close().catch(() => {});
    this.ctx = this.browser = null;
  }
}
