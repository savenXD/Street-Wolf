// Google Maps scrape worker. apps/scraper loads this (src/platforms.ts) and hands it a browser session, a pacer and hooks.
// Runs on the user's computer inside the downloadable scraper, so it may only import this folder and ../../fields.ts
// (plus type-only imports); scripts/package-scraper.mjs copies exactly those.
import type { Page } from "patchright";
import type { ScrapeWorker } from "@street-wolf/platform-sdk";
import { defaultConfig, type ScrapeConfig } from "../../fields";
import { scrapeMaps } from "./maps";

export type MapsInput = { cfg: ScrapeConfig; location: string };

export const googleMapsWorker: ScrapeWorker<MapsInput, Page> = {
  tool: "googlemaps",
  parseInput(input) {
    const i = (input ?? {}) as { config?: Partial<ScrapeConfig>; location?: string };
    const base = defaultConfig([]);
    const c = i.config ?? {};
    const cfg: ScrapeConfig = { ...base, ...c, filters: { ...base.filters, ...(c.filters ?? {}) }, queries: (c.queries ?? []).filter(Boolean) };
    if (!cfg.queries.length) throw new Error("This job has no search queries");
    if (!cfg.fields?.length) cfg.fields = base.fields;
    return { cfg, location: i.location ?? "" };
  },
  skipKnown: ({ cfg }) => cfg.filters.skipScraped,
  run: ({ cfg, location }, ctx) => scrapeMaps(cfg, location, ctx),
};

export { defaultConfig };
