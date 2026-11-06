# Street Wolf: guide for AI agents and new contributors

Read this first. It says where everything lives, the rules that keep the codebase independent and bug-free, and how to
check your work. Deeper docs are linked at the end.

## What the product is

Free, open-source lead generation. A campaign picks a preset (**B2B** today; B2C and D2C coming), which decides its
**platforms**. A platform finds leads (scraping), reaches them (outreach) and posts content (posting). Google Maps is live:
a scraper on the user's own computer fills a lead sheet, and the team calls, WhatsApps and labels every lead.

## Map

```
apps/                     programs that run
  web/                    Next.js website + API (deployed). Hosts the platforms' screens and API logic.
    app/                  routes only. Platform routes are 1–3 line shells that render from @street-wolf/<platform>/web
    components/           the web app's own UI (landing, dashboard shell, campaign page, new-campaign steps, ui kit)
    lib/                  client store (workspace.tsx), registries (platforms.ts, presets.ts), small helpers
    lib/server/           server-only: auth, roles, sheets, jobs, mail, migrations, server registry (platforms.ts)
    kit/                  THE ONLY part of apps/web a platform may import (@/kit/ui, store, sheet, server)
  scraper/                the downloadable local app (Windows/Linux). Generic engine: browser, proxies, pacing, job loop.
                          It runs each platform's scrape/worker. (Its name will become "agent" once it also sends DMs/posts.)
platforms/                one folder per platform, EVERYTHING about it inside (scrape/, outreach/, post/, screens, API logic)
  google-maps/            live: scraping · WhatsApp outreach (in progress) · AI calling via ElevenLabs (planned)
  instagram/ reddit/ x/   skeletons: scraping · DMs · posting (all planned)
packages/                 shared building blocks, no app or platform code
  core/                   pure logic (no React, no DB): labels, phone, CSV, sheet merge, call summary, ATC, outreach rule
  db/                     MongoDB collection types, indexes, client
  platform-sdk/           the contract every platform follows (types only)
scripts/                  e2e and load tests, dev database, scraper packaging, platform wiring check
docs/                     architecture, database, deployment, decisions, roadmap
```

**Dependency direction (never reversed):**
`apps/web` → `platforms/*` → (`apps/web/kit`, `packages/*`) and `apps/scraper` → `platforms/*/scrape/worker` → (`packages/platform-sdk` types).
Packages depend on nothing in this repo except other packages.

## The rules (enforced by tools; `pnpm check` fails if you break one)

1. **A platform never imports another platform.** Lint error (`platforms/eslint.base.mjs`).
2. **A platform uses the web app only through `@/kit/ui`, `@/kit/store`, `@/kit/sheet`, `@/kit/server`.** Lint error otherwise.
   Need more? Export it from `apps/web/kit/*` on purpose.
3. **Pure logic goes in `packages/core`**, not in a platform or in `apps/web/lib`, when more than one place needs it.
4. **Worker code is self-contained.** `platforms/<name>/scrape/worker/` ships alone in the scraper download: runtime imports only
   from `./`, `../../fields` and `node:`; everything else must be `import type`. Checked by `scripts/check-platforms.mjs`.
5. **Feature ids are forever** (`googlemaps:scrape`). Campaigns store them. To rename, add the old id to `legacyFeatureIds` in the
   platform's `platform.ts`; reads map it and boot migrates it (`apps/web/lib/server/migrations.ts`).
6. **Every platform is wired in the same places** (registries listed in `platforms/README.md`). `pnpm check:platforms` names
   anything missing. Registries also validate themselves at load (`lib/platforms.ts`, `lib/presets.ts`), so the build fails.
7. **Tailwind classes in platforms work** because `apps/web/app/globals.css` has `@source "../../../platforms"`. Don't remove it.
8. **Every change to campaign data (campaigns, niches, sheets, leads, scrape jobs) goes through the store** (`useWorkspace()`,
   from `@/kit/store` in a platform), which owns optimistic updates, merging and sync. A platform may `fetch` only read-only
   data from its own API routes (e.g. Google Maps' scrape history). Account screens (tokens, notifications, sign-in) call their
   own endpoints directly.
9. **Every campaign API handler** calls `requireBrowserUser` (or `requireUser` for scraper tokens) then `requireRole` before
   touching data. Non-members get 404, never 403.

## Where does new code go?

| You are adding… | Put it in |
| --- | --- |
| a feature of one platform (a scraper column, a DM sender, a posting screen) | `platforms/<name>/scrape|outreach/<channel>|post/` |
| a new platform | copy a skeleton folder; follow `platforms/README.md` |
| logic two platforms need (parsing, rules, formatting) | `packages/core/src/<name>.ts` + a test in `packages/core/test/` |
| a UI piece a platform needs from the app | build it in `apps/web/components/...`, export it from `apps/web/kit/*` |
| a page | `apps/web/app/...` (platform pages: a thin route that renders from `@street-wolf/<name>/web`) |
| an API endpoint | `apps/web/app/api/...`; platform-specific logic lives in `platforms/<name>/server.ts` |
| a collection or field | `packages/db/src/types.ts` (+ index in `indexes.ts`) and document it in `docs/DATABASE.md` |
| a preset | `apps/web/lib/presets.ts` (+ `CampaignPreset` in `packages/db`, enum in `apps/web/lib/server/schemas.ts`) |

## Commands

```bash
pnpm install
pnpm db:dev          # throwaway local MongoDB (port 27017; nothing kept unless PERSIST=1)
pnpm dev             # http://localhost:3000
pnpm check           # platform wiring + typecheck + lint + unit tests, for every package. Run before you finish.
pnpm e2e             # API suite        } need a running server on a THROWAWAY database:
pnpm e2e:browser     # browser suite    } EPHEMERAL=1 PORT=27099 node scripts/dev-db.mjs, then
                     #                    MONGODB_URI=mongodb://127.0.0.1:27099 MONGODB_DB=e2e NEXT_DIST_DIR=.next-e2e npx next dev -p 3100 (in apps/web)
pnpm scraper:package # builds the downloadable scraper into dist/
```

Never point tests at the database in `apps/web/.env.local` (it may be the real one). CI (`.github/workflows/ci.yml`) runs all of
the above on every push.

## Gotchas

* This is Next.js 16: APIs differ from older versions. Read `apps/web/node_modules/next/dist/docs/` before using a Next API
  (see `apps/web/AGENTS.md`).
* Next only compiles workspace packages it can resolve: a new platform needs `"@street-wolf/<name>": "workspace:*"` in
  `apps/web/package.json` and `pnpm install`.
* Sheet columns are found by key, not position. Call summary and ATC are columns 2 and 3; tests look columns up by header text.
* The scraper download contains only platforms registered in `apps/scraper/src/platforms.ts`.

## Docs

* [platforms/README.md](platforms/README.md): how platforms are built and wired. Each platform has its own README.
* [apps/web/README.md](apps/web/README.md) · [apps/scraper/DEVELOPING.md](apps/scraper/DEVELOPING.md) ·
  [packages/core](packages/core/README.md) · [packages/db](packages/db/README.md) · [packages/platform-sdk](packages/platform-sdk/README.md)
* [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): product flow, backend, auth, teams, scaling.
* [docs/DATABASE.md](docs/DATABASE.md): every collection, index, counting rule and endpoint.
* [docs/DECISIONS.md](docs/DECISIONS.md): why things are the way they are. Read before changing a rule above.
* [docs/ROADMAP.md](docs/ROADMAP.md): structural work planned before the next platforms.
* [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): shipping it.
