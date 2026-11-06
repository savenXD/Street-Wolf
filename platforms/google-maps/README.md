# Google Maps

Find local businesses by niche and city, then reach them. The **B2B** preset uses this platform.

| Feature | Id | Status | Where |
| --- | --- | --- | --- |
| Scraping | `googlemaps:scrape` | live | `scrape/` |
| WhatsApp outreach | `googlemaps:whatsapp` | in progress | `outreach/whatsapp/` (today: pamphlets and click-to-chat from the phone page) |
| AI calling (ElevenLabs) | `googlemaps:call` | planned | `outreach/calling/` |

## Files

```
platform.ts                 manifest: features, statuses, old feature ids
fields.ts                   every column a listing can give, the scrape setup (ScrapeConfig) and its defaults
web.ts                      what apps/web renders: MapsHome, MapsSheet, Tiles
server.ts                   what API routes call: parseJobInput, scrapeHistory
tiles.tsx                   campaign-page tiles (one per switched-on feature)
package.json                entry points: ./platform ./fields ./web ./mobile ./server ./worker

scrape/
  worker/                   runs in the downloadable scraper (apps/scraper)
    index.ts                the ScrapeWorker: parses job input, decides whether to skip known ids, runs maps.ts
    maps.ts                 the scraper itself: search list, detail pages, blocks and cool-downs
    read-detail.js          code evaluated inside a business's Maps page
    enrich.ts               reads a business's own website for email and social links
    util.ts                 small helpers (copy of apps/scraper's, see platforms/README.md rule 3)
  server/
    job-input.ts            which scrape setups the API accepts
    history.ts              past searches and setups of a sheet, from its finished jobs
  ui/
    maps-home.tsx           niches (domains) and their cities
    scrape-drawer.tsx       the scrape setup: queries, columns, filters, past runs
    scrape-bar.tsx          live progress while a job runs
    tile.tsx                "Google Maps" tile

sheet/
  maps-sheet.tsx            the lead sheet for one niche + city

outreach/
  mobile/mobile-outreach.tsx  phone page (/m/...): call and WhatsApp buttons, labels, call summary, ATC
  whatsapp/                 channel.ts (needs: phone · runs in: undecided), pamphlets (ready messages and a price image),
                            tile. Next: the sender, once DECISIONS #9 is settled
  calling/                  channel.ts (needs: phone · runs in: server), tile. Next: the ElevenLabs voice agent
```

## How a scrape flows

1. `scrape-drawer.tsx` saves a `ScrapeConfig` on the sheet; Start queues a job (`POST /api/jobs`, `tool: "googlemaps"`).
   `server.ts → parseJobInput` checks it.
2. The scraper app claims it and calls `scrape/worker/index.ts` with a browser session, a pacer and hooks.
3. `maps.ts` streams rows; the scraper app posts them to `/api/ingest` and they appear live in `maps-sheet.tsx`.

Routes that render this platform (thin shells): `apps/web/app/dashboard/maps/[id]/…` and `apps/web/app/m/[id]/[domain]/[city]`.
API routes that are Google Maps shaped: `app/api/campaigns/[id]/domains/…/places/[pid]/queries` (uses `scrapeHistory`).

## Depends on

* `@/kit/ui`, `@/kit/store`, `@/kit/sheet` (web app pieces) and `@street-wolf/core/*` (labels, call summary, ATC, CSV, phone,
  outreach rule). Nothing else from the web app; never another platform.
* Worker: only its own folder, `../../fields`, `node:` and type-only imports (it ships alone in the scraper download).

## Known couplings (listed in docs/ROADMAP.md)

* The store (`apps/web/lib/workspace.tsx`) still has Google Maps actions and imports `ScrapeConfig` from `./fields`.
* `fields.ts` also defines the core sheet columns `callSummary` and `atc`.
* `sheet/maps-sheet.tsx` holds the generic sheet grid; it moves to the kit when a second platform needs a sheet.

## Develop

`pnpm typecheck` and `pnpm lint` in this folder; `pnpm check` from the root runs everything. Browser e2e
(`pnpm e2e:browser`) drives this platform's sheet.
