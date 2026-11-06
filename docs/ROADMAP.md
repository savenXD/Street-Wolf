# Structural roadmap

Changes the codebase needs as it grows, in the order they become necessary. Product features are not listed here, only the
structure that has to exist before them. Tick an item off by moving it to `docs/DECISIONS.md` with what was decided.

## Before WhatsApp outreach
- [ ] **Decide how messages are sent** (see DECISIONS #9). That sets the channel's `runsIn` and where its code goes:
  `platforms/google-maps/outreach/whatsapp/` (+ `server/` if it uses an API, + a worker if the local app sends).
- [ ] **Outreach runtime:** if sending happens outside the browser, jobs need a `kind` (`scrape` | `outreach` | `post`) next to
  `tool`, so the web app can queue sends and the local app can claim them. Add it to `Job` (`packages/db`), the jobs API and
  the scraper's registry (a `kind` → worker map), with per-account rate limits.

## Before the second platform (Instagram)
- [ ] **Lists instead of cities.** Leads are grouped niche (`domains`) → city (`places`). Instagram's lists are hashtags or niches,
  Reddit's are subreddits. Turn `places` into general lists with a `platform` field and that platform's setup; Google Maps keeps
  "city" as its label. Needs a migration (`apps/web/lib/server/migrations.ts`) and the sheet routes' names reviewed.
- [ ] **Take Google Maps out of the store.** `apps/web/lib/workspace.tsx` has Google Maps actions (`setScrape`, queueing a
  `googlemaps` job) and imports its `ScrapeConfig`. Make them platform-neutral (`setListSetup(listId, setup)`, `startJob(tool, …)`).
- [ ] **Split the store** (~730 lines) by area: campaigns, niches/lists, sheets, team. Same `useWorkspace()` surface.
- [ ] **Move shared sheet columns out of Google Maps:** `callSummary` and `atc` are defined in `platforms/google-maps/fields.ts`
  but every sheet has them; move their keys to `packages/core`.
- [ ] **A generic lead sheet.** `platforms/google-maps/sheet/maps-sheet.tsx` is mostly platform-neutral; extract the grid into the
  kit (`@/kit/sheet`) and keep only Maps-specific columns and the scrape bar in the platform.

## Before the first public release
- [ ] **Rename `apps/scraper` to `apps/agent`** (and the product wording "scraper" → "Street Wolf app") once it also sends DMs and
  posts. Update installers, release asset names, docs and the dashboard's guide in the same change.
- [ ] Set the real GitHub repo in `apps/web/lib/site.ts` (installers download from its releases).
- [ ] Test `install.ps1` on a real Windows machine.

## When a second app needs platform screens
- [ ] Move `apps/web/kit` UI into `packages/ui` and the store into `packages/store`, so platforms stop depending on `apps/web`
  (DECISIONS #5).
