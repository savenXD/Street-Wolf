// Server side of every platform, keyed by platform id (= job `tool` = lead `source`). Add a line when a platform can scrape.
import "server-only";
import * as googlemaps from "@street-wolf/google-maps/server";

export const scrapers = { googlemaps } satisfies Record<string, { parseJobInput: (input: unknown, placeId: string | null) => { input: unknown } | { error: string } }>;
