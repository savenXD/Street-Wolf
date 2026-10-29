// Mirrors apps/web/lib/maps-fields.ts. Copied (not imported) so this folder can be downloaded and run on its own.
export type ScrapeConfig = {
  queries: string[];
  /** Per query: "all" runs until Maps has no more results (Maps itself stops at roughly 120). */
  limit: "all" | number;
  fields: string[];
  filters: {
    minRating: number;
    minReviews: number;
    website: "any" | "has" | "none";
    mustHavePhone: boolean;
    skipClosed: boolean;
    skipScraped: boolean;
    exclude: string[];
  };
};

export const DEFAULT_FIELDS = ["name", "category", "address", "phone", "website", "rating", "reviews"];

export const defaultConfig = (queries: string[]): ScrapeConfig => ({
  queries,
  limit: "all",
  fields: DEFAULT_FIELDS,
  filters: { minRating: 0, minReviews: 0, website: "any", mustHavePhone: false, skipClosed: true, skipScraped: true, exclude: [] },
});

/** One scraped business: a stable id plus the columns the user picked. */
export type Row = { sourceId: string; cells: Record<string, string> };

export type Hooks = {
  onRows(rows: Row[]): Promise<void>;
  onProgress(p: { done: number; total: number; found: number; note?: string }): void;
  log(msg: string, level?: "info" | "warn" | "error"): void;
  signal: AbortSignal;
};

export type Job = { id: string; campaignId: string; placeId: string | null; tool: string; input: unknown };
