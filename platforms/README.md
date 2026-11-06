# Platforms

One folder per platform. **Everything** about a platform lives in its folder: scraping, outreach, posting, its screens,
its API logic and the code that runs inside the downloadable scraper. To learn how Google Maps works, open
`platforms/google-maps/` and nothing else.

```
platforms/
  google-maps/        live: scraping · WhatsApp outreach (in progress) · AI calling via ElevenLabs (planned)   → B2B
  instagram/          skeleton: scraping · DMs · posting                                                       → D2C
  reddit/             skeleton: scraping · DMs and comments · posting                                          → D2C
  x/                  skeleton: scraping · replies and DMs · posting                                           → D2C
  eslint.base.mjs     lint rules for every platform, including the boundary rules below
  tsconfig.base.json  TypeScript settings for every platform
```

## The rules (each one is checked by `pnpm check`)

| # | Rule | Checked by |
| --- | --- | --- |
| 1 | **A platform never imports another platform.** Deleting a folder removes that platform and nothing else breaks. | lint (`eslint.base.mjs`) |
| 2 | **A platform uses the web app only through the kit:** `@/kit/ui`, `@/kit/store`, `@/kit/sheet`, `@/kit/server` (see `apps/web/kit`). Never `@/components/…` or `@/lib/…`. | lint |
| 3 | **Shared pure logic comes from `packages/core`** (`@street-wolf/core/<name>`). If two platforms need it, it goes there, not copied. | review |
| 4 | **Worker code is self-contained.** `scrape/worker/` ships alone in the scraper download with `fields.ts`: runtime imports only from `./`, `../../fields`, `node:`; everything else `import type`. | `check-platforms` |
| 5 | **Feature ids are forever** (`googlemaps:scrape`). Renames go through `legacyFeatureIds` in `platform.ts` (mapped on read, migrated on boot). Ids must start with the platform id. | load-time validation |
| 6 | **The apps wire a platform in**, in the files listed below. A platform never registers itself. | `check-platforms` |
| 7 | **Every platform typechecks and lints on its own** (`pnpm typecheck`, `pnpm lint` inside the folder). | turbo |

## Shape of a platform folder

Each platform is a workspace package (`@street-wolf/<name>`); `package.json` `exports` are its only public entry points.

```
<name>/
  README.md            how this platform works, end to end (features, files, flows, open questions)
  package.json         entry points: ./platform ./fields ./web ./mobile ./server ./worker (only the ones it has)
  tsconfig.json        extends ../tsconfig.base.json
  eslint.config.mjs    platformConfig("<name>") from ../eslint.base.mjs
  platform.ts          manifest: id, name, logo, features (scrape / outreach / post) and their status. Plain data.
  fields.ts            the columns it can collect and its scrape setup (read by web, server and worker). No imports.
  web.ts               browser entry: screens and Tiles (campaign-page tiles)
  server.ts            server entry: what API routes call (job input checks, history, ...). Starts with import "server-only".
  tiles.tsx            one tile per switched-on feature
  scrape/
    worker/index.ts    ScrapeWorker, run by the local scraper app
    server/            API logic for scraping (job input validation, history)
    ui/                setup drawer, progress bar, list screens
  sheet/               its lead sheet, if it has its own
  outreach/
    <channel>/         one folder per way of reaching leads: whatsapp/, calling/, dm/, email/ ...
      channel.ts       OutreachChannel: feature, lead columns it needs, where it runs
  post/
    publisher.ts       Publisher: feature, formats, where it runs
```

The contract (types only) is `packages/platform-sdk`. Outreach and posting are declared but have no runtime yet; each says where
it will run (`browser`, `server`, `local-worker`, `undecided`). See `docs/ROADMAP.md`.

**Skeletons** (Instagram, Reddit, X) have `platform.ts`, `fields.ts`, a stub worker, `outreach/dm/channel.ts`,
`post/publisher.ts` and empty `scrape/ui`, `scrape/server`. Their manifests are registered in the web app (so presets know
them); they have no screens, no server module and no scraper registration until built, and they're not in the download.

## Where the apps plug platforms in

| File | What to add |
| --- | --- |
| `pnpm-workspace.yaml` | nothing: `platforms/*` is already a workspace |
| `apps/web/package.json` | `"@street-wolf/<name>": "workspace:*"`, then `pnpm install` |
| `apps/web/next.config.ts` | the package in `transpilePackages` |
| `apps/web/lib/platforms.ts` | the manifest (and its `legacyFeatureIds`) |
| `apps/web/lib/presets.ts` | the platform id in each preset that offers it |
| `apps/web/components/dashboard/platform-tiles.tsx` | its `Tiles`, once it has `web.ts` |
| `apps/web/lib/server/platforms.ts` | its `server.ts`, once it scrapes (job input checks) |
| `apps/web/app/...` | route files: 1–3 lines rendering a screen from `@street-wolf/<name>/web` |
| `apps/scraper/src/platforms.ts` | its `ScrapeWorker`, once it scrapes (packaging picks it up) |
| `packages/db/src/types.ts` + `apps/web/app/api/ingest/route.ts` | its id in `Platform` and the ingest `source` enum |
| `platforms/eslint.base.mjs` | its folder name in `ALL` |

Run `pnpm check:platforms` after any of these: it names whatever is missing.

## Adding a platform

1. Copy a skeleton (e.g. `instagram/`) to `platforms/<name>/`, rename the package, ids and texts.
2. Wire it in (table above) and run `pnpm install && pnpm check`.
3. Build a feature at a time inside its folder. For scraping: the worker, then `server.ts` (job input), then screens in
   `scrape/ui` exported from `web.ts`, then register worker + server.
4. Set the feature's `status` to `live`, update the platform README, and add it to a preset (set `available: true`).

Before the second platform is built, leads must be grouped by general lists instead of cities: `docs/ROADMAP.md`.
