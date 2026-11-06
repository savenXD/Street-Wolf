# apps/web

The Street Wolf website and its API: one Next.js 16 app, deployed to a server. It is the **host**. It owns accounts, teams,
campaigns, the lead store and the design system, and it shows each platform's screens (from `platforms/<name>`).

> Next.js 16 differs from older versions. Read `node_modules/next/dist/docs/` before using a Next API (see `AGENTS.md` here).

## Folders

```
app/                        routes (pages + API). Thin: real logic lives in lib/, components/ or a platform
  (auth)/ auth/ invite/     sign-in, email confirm, invite acceptance
  dashboard/                the signed-in app; dashboard/maps/... renders Google Maps screens (platform shells)
  m/[id]/[domain]/[city]/   phone page (Google Maps mobile outreach, platform shell)
  new/                      "create a campaign" flow (steps in components/new-campaign)
  api/                      route handlers; see docs/DATABASE.md for every endpoint
  page.tsx + SEO pages      landing site
components/
  ui/                       design system: button, dialog, input, bottom sheet, avatar, skeleton, spinner, load bar
  dashboard/                app shell, campaign page, team, settings pieces, and shared sheet widgets (labels, call summary, ATC, CSV)
  new-campaign/             one component per step: name, purpose, preset, features, team
  landing/ seo/             marketing pages
lib/
  workspace.tsx             the client store: hydrates from /api/bootstrap, optimistic edits, background sync
  platforms.ts              registry of platform manifests (+ validation at load)
  presets.ts                B2B / B2C / D2C (+ validation at load)
  stats.ts presence.ts      dashboard numbers, "today" per person
  server/                   server-only: session, access (roles), http helpers, sheets, jobs, mail, invites, migrations
  server/platforms.ts       registry of platform server modules (job input checks)
kit/                        the only part of this app a platform may import (see below)
instrumentation*.ts         boot: indexes, one-time migrations, graceful shutdown
proxy.ts                    route guard (signed-out → /signup), noindex for private routes
```

Pure logic shared with platforms and tests (labels, phone parsing, CSV, sheet merging, call summary, ATC, the outreach rule)
lives in `packages/core`, imported as `@street-wolf/core/<name>`.

## The kit (`kit/`)

Platforms are compiled as part of this app but must not depend on its internals. They import only:

| Import | What it gives |
| --- | --- |
| `@/kit/ui` | design system: `Button`, `Dialog`, `Input`, `BottomSheet`, `LiveTile`/`SoftTile`, `BrandIcon`, `cn`, … |
| `@/kit/store` | `useWorkspace()` and the data shapes (`Campaign`, `Domain`, `City`, …), dashboard stats |
| `@/kit/sheet` | shared sheet widgets: `LabelChip`/`LabelEditor`/`LabelGraph`, `CallSummaryDialog`, `AtcDialog`, `CsvImport`, `useScraperStatus` |
| `@/kit/server` | for a platform's `server.ts`: `requireBrowserUser`, `requireRole`, `api`, `ok`, `bad`, `rateLimit`, … |

Lint (`platforms/eslint.base.mjs`) rejects any other `@/…` import from a platform. Exporting something new from the kit is a
deliberate API decision: keep it small, and don't break what platforms already use.

## How platforms are plugged in

| File | Role |
| --- | --- |
| `package.json` | depends on each `@street-wolf/<platform>` (workspace) |
| `next.config.ts` | lists them in `transpilePackages` |
| `app/globals.css` | `@source "../../../platforms"` so Tailwind sees platform classes |
| `lib/platforms.ts` | manifests (features, statuses, old ids) |
| `lib/presets.ts` | which preset offers which platform |
| `components/dashboard/platform-tiles.tsx` | each platform's campaign-page tiles |
| `lib/server/platforms.ts` | each platform's server module (validates its scrape jobs) |
| `app/...` | thin route files rendering `@street-wolf/<platform>/web` screens |

`pnpm check:platforms` (repo root) fails if a platform is missing from any of these.

## Develop

From the repo root: `pnpm db:dev` and `pnpm dev`. Env vars and keys: `docs/ARCHITECTURE.md`. Before finishing: `pnpm check`.
Scripts here: `dev`, `build`, `start`, `lint`, `typecheck` (`next typegen && tsc`).
