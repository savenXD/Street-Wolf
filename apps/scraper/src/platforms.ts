// Every platform this scraper can run, keyed by job `tool`. Each lives in platforms/<name>/scrape/worker at the repo root;
// scripts/package-scraper.mjs copies those folders into the download and rewrites the paths below to ./platforms/.
import type { Page } from "patchright";
import type { ScrapeWorker } from "./types";
import { googleMapsWorker } from "../../../platforms/google-maps/scrape/worker/index";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- each worker has its own input type
export const workers: Record<string, ScrapeWorker<any, Page>> = {
  [googleMapsWorker.tool]: googleMapsWorker,
};
