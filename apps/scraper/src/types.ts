// The platform contract lives in packages/platform-sdk. Type-only re-exports vanish at runtime, so the download doesn't need it.
export type { ScrapedRow as Row, ScrapeWorker, WorkerHooks as Hooks } from "../../../packages/platform-sdk/src/index";

export type Job = { id: string; campaignId: string; placeId: string | null; tool: string; input: unknown };
