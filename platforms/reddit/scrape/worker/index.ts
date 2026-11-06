// Reddit scrape worker (skeleton). Runs inside the downloadable scraper like platforms/google-maps/scrape/worker:
// it gets a browser session, a pacer and hooks, and must only import this folder, ../../fields and type-only modules.
// To build: write the scraping in this folder, push rows with a stable sourceId (the post or comment id (t3_…, t1_…)), then register
// `redditWorker` in apps/scraper/src/platforms.ts and add parseJobInput to ../../server.ts (see platforms/README.md).
import type { Page } from "patchright";
import type { ScrapeWorker } from "@street-wolf/platform-sdk";
import { defaultConfig, type ScrapeConfig } from "../../fields";

export type RedditInput = { cfg: ScrapeConfig };

export const redditWorker: ScrapeWorker<RedditInput, Page> = {
  tool: "reddit",
  parseInput(input) {
    const c = ((input ?? {}) as { config?: Partial<ScrapeConfig> }).config ?? {};
    const cfg = { ...defaultConfig([]), ...c };
    if (!cfg.queries.length) throw new Error("This job has nothing to search for");
    return { cfg };
  },
  skipKnown: () => true,
  async run() {
    throw new Error("The Reddit scraper isn't built yet");
  },
};
