import { z } from "zod";

export const featureIds = z.array(z.string().max(60)).max(40);

/** Column keys become Mongo field names, so keep them to plain identifiers (no dots or leading $). */
export const cellKey = z.string().regex(/^[A-Za-z0-9_-]{1,60}$/, "Invalid column key");
