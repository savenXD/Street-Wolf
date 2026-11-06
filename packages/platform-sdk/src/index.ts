// The contract every platform folder (platforms/<name>) follows. Types only: nothing here runs, so platform code that
// imports it still works inside the downloadable scraper, where this package is not shipped.
//
// A platform is one place leads come from and everything done with them there: Google Maps (scraping + WhatsApp +
// AI calling), later Instagram (scraping + DMs + posting), Reddit, X. Apps (apps/web, apps/scraper) list the platforms
// they load in one registry file each; platforms never import each other.

/** What a feature does. Outreach and posting are optional parts of a platform, not separate platforms. */
export type Category = "scrape" | "outreach" | "post";

/** live = usable today · building = in progress · planned = on the roadmap. Only changes badges and tiles. */
export type Status = "live" | "building" | "planned";

export type FeatureDef = {
  /** Stored on campaigns, so never rename one. Format `<platform>:<feature>`, e.g. `googlemaps:whatsapp`. */
  id: string;
  category: Category;
  title: string;
  desc: string;
  status: Status;
  /** The service behind it when it isn't the platform itself. `brand` is a logo key in apps/web/components/brand-icon. */
  via?: { name: string; brand: string };
};

export type PlatformManifest = {
  /** Also the `tool` of its scrape jobs and the `source` of its leads. */
  id: string;
  name: string;
  /** Logo key in apps/web/components/brand-icon.tsx. */
  brand: string;
  desc: string;
  status: Status;
  features: FeatureDef[];
};

// ---- Scrape workers (run inside apps/scraper) ----------------------------------------------------------------------

/** One scraped item: a stable id (dedupes re-scrapes) plus its columns. */
export type ScrapedRow = { sourceId: string; cells: Record<string, string> };

export type WorkerHooks = {
  onRows(rows: ScrapedRow[]): Promise<void>;
  onProgress(p: { done: number; total: number; found: number; note?: string }): void;
  log(msg: string, level?: "info" | "warn" | "error"): void;
  signal: AbortSignal;
};

/** The browser the scraper app hands to a worker. Pages come from one shared, proxy-aware session. */
export interface BrowserSession<Page = unknown> {
  /** Bumps every time the session is replaced, so a worker can tell its page is stale. */
  readonly generation: number;
  page(): Promise<Page>;
  /** Throw the session away (after a block) and open a fresh one, optionally on the next proxy. */
  rotate(nextProxy: boolean): Promise<void>;
}

/** Human-paced concurrency: wait for a slot, then report how it went so the pace adapts. */
export interface Pacer {
  readonly max: number;
  gate(slot: number): Promise<void>;
  ok(): void;
  /** Report a block; returns how many blocks in a row. */
  blocked(): number;
}

export type WorkerContext<Page = unknown> = {
  session: BrowserSession<Page>;
  pacer: Pacer;
  hooks: WorkerHooks;
  /** Ids already in the sheet, so they are skipped. */
  seenIds: Set<string>;
  mode: "click" | "tabs";
};

/**
 * A platform's scrape entry point, loaded by apps/scraper (src/platforms.ts). Worker code may only import files inside its
 * own worker folder (plus type-only imports), because that folder is copied into the downloadable scraper on its own.
 */
export type ScrapeWorker<Input = unknown, Page = unknown> = {
  /** The platform id; jobs with this `tool` are sent here. */
  tool: string;
  /** Turn a queued job's input into what run() takes. Throw an Error with a readable message if it can't run. */
  parseInput(input: unknown): Input;
  /** Whether the scraper should first fetch the ids already in this niche so run() can skip them. */
  skipKnown(input: Input): boolean;
  run(input: Input, ctx: WorkerContext<Page>): Promise<unknown>;
};

// ---- Outreach and posting (draft) -----------------------------------------------------------------------------------
// Declared now so every platform folder has the same shape; how each one actually sends is decided when it is built.

/**
 * Where a channel or publisher does its work:
 * browser = in the person's own browser (e.g. click-to-chat) · server = from the web app's API (e.g. an official API)
 * local-worker = inside the downloadable scraper app, driving a real browser · undecided = not chosen yet.
 */
export type RunsIn = "browser" | "server" | "local-worker" | "undecided";

/** One way a platform reaches its leads: WhatsApp, an AI call, an Instagram DM, a Reddit DM, an X reply... */
export type OutreachChannel = {
  /** The feature id it powers, e.g. `instagram:dm`. */
  feature: string;
  name: string;
  /** Lead columns it needs to work, e.g. ["phone"] or ["username"]. A lead without them is skipped. */
  needs: string[];
  runsIn: RunsIn;
  status: Status;
};

/** Publishing content on a platform (posts, reels, threads). Not tied to leads. */
export type Publisher = {
  /** The feature id it powers, e.g. `reddit:post`. */
  feature: string;
  name: string;
  formats: ("text" | "image" | "video" | "link")[];
  runsIn: RunsIn;
  status: Status;
};
