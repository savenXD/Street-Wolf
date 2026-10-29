import { z } from "zod";

export const MAX_RESULTS = 500;

export const googleMapsInput = z.object({
  keywords: z.array(z.string().trim().min(1)).min(1).max(10),
  location: z.string().trim().min(2),
  maxResults: z.number().int().min(1).max(MAX_RESULTS).default(100),
  fields: z
    .object({
      phone: z.boolean().default(true),
      website: z.boolean().default(true),
      rating: z.boolean().default(true),
      reviews: z.boolean().default(true),
      hours: z.boolean().default(false),
    })
    .default({}),
  findEmails: z.boolean().default(false),
  // Headed opens a visible browser window; only meaningful on a machine with a display.
  headless: z.boolean().default(true),
});

export type GoogleMapsInput = z.infer<typeof googleMapsInput>;
