import { z } from "zod";

/** What the web app may queue for the Google Maps worker. Mirrors ScrapeConfig in ../../fields.ts. */
export const mapsJobInput = z.object({
  location: z.string().trim().max(120).default(""),
  config: z.object({
    queries: z.array(z.string().trim().min(1).max(200)).min(1).max(20),
    limit: z.union([z.literal("all"), z.number().int().min(1).max(5000)]),
    fields: z.array(z.string().regex(/^[A-Za-z0-9_-]{1,60}$/)).min(1).max(40),
    filters: z.object({
      minRating: z.number().min(0).max(5),
      minReviews: z.number().int().min(0),
      website: z.enum(["any", "has", "none"]),
      mustHavePhone: z.boolean(),
      skipClosed: z.boolean(),
      skipScraped: z.boolean(),
      exclude: z.array(z.string().max(100)).max(100),
    }),
  }),
});

/** Returns the cleaned input, or an error message for the person who queued it. */
export function parseJobInput(input: unknown, placeId: string | null): { input: unknown } | { error: string } {
  if (!placeId) return { error: "Pick a city sheet to scrape into" };
  const parsed = mapsJobInput.safeParse(input);
  return parsed.success ? { input: parsed.data } : { error: "That scrape setup isn't valid. Open Edit setup and save it again" };
}
