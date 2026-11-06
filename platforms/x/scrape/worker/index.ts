// X scrape worker (skeleton). Runs inside the downloadable scraper like platforms/google-maps/scrape/worker:
// it gets a browser session, a pacer and hooks, and must only import this folder, ../../fields and type-only modules.
// To build: write the scraping in this folder, push rows with a stable sourceId (the post id), then register
// `xWorker` in apps/scraper/src/platforms.ts and add parseJobInput to ../../server.ts (see platforms/README.md).
import type { Page } from "patchright";
import type { ScrapeWorker } from "@street-wolf/platform-sdk";
import { defaultConfig, type ScrapeConfig } from "../../fields";

export type XInput = { cfg: ScrapeConfig };

export const xWorker: ScrapeWorker<XInput, Page> = {
  tool: "x",
  parseInput(input) {
    const c = ((input ?? {}) as { config?: Partial<ScrapeConfig> }).config ?? {};
    const cfg = { ...defaultConfig([]), ...c };
    if (!cfg.queries.length) throw new Error("This job has nothing to search for");
    return { cfg };
  },
  skipKnown: () => true,
  async run() {
    throw new Error("The X scraper isn't built yet");
  },
};
