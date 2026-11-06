# Developing the local scraper

`README.md` in this folder is for **users** (it ships inside the download). This file is for developers.

## What this app is

A program each user downloads and runs on their own computer (Windows or Linux). It exists because Google, Instagram and
the rest block server IPs: a real browser on a home connection doesn't get blocked, costs nothing, and keeps the data on
the user's side. It has no account of its own. It talks to the web app with a token from Settings → Integrations.

It is a **generic engine**. It knows nothing about Google Maps or Instagram; each platform's scraping lives in
`platforms/<name>/scrape/worker/` and is loaded through `src/platforms.ts`. When outreach and posting run locally (DMs,
posts), they'll run here too, which is why this app will be renamed `apps/agent` (see `docs/ROADMAP.md`).

## Files

```
src/cli.ts         commands: setup, start, doctor, logout, scrape (one-off Google Maps scrape to CSV, for testing)
src/worker.ts      job loop: claim a job (POST /api/jobs/claim), run its platform's worker, heartbeat, finish or fail
src/platforms.ts   registry: job `tool` → platform ScrapeWorker (the only file that names platforms)
src/runner.ts      one run: proxies + pacer + browser session, then worker.run(); always closes the browser
src/browser.ts     Session: one Chromium (patchright), rotates on blocks, optional proxy
src/pacer.ts       human-paced concurrency with cool-downs after blocks
src/proxies.ts     own proxies (proxies.txt) or free ones as a fallback after a block
src/api.ts         web app client (claim, ingest, known ids, patch job)
src/server.ts      localhost:4317/health, so the dashboard can show "Scraper connected"
src/config.ts      settings in data/config.json (address, token, mode, speed)
src/types.ts       Job, plus the platform contract re-exported from packages/platform-sdk (type-only)
```

## Rules

* **The download ships only this folder plus registered platforms' workers.** `scripts/package-scraper.mjs` copies
  `platforms/<name>/scrape/worker/` and `platforms/<name>/fields.ts` into `src/platforms/<name>/` and rewrites the imports.
  So worker code imports nothing else at runtime (checked by `pnpm check:platforms`).
* This app has **no workspace dependencies** (`npm install` runs on the user's machine). Imports from `packages/*` must be
  `import type`.
* Every job's data is bound to the job: the web app decides the campaign and sheet, and this app only sends rows for the job it
  claimed (see `docs/DATABASE.md`).

## Adding a platform's scraper

1. Write `platforms/<name>/scrape/worker/index.ts` exporting a `ScrapeWorker` (see `packages/platform-sdk`).
2. Register it in `src/platforms.ts`.
3. Register the platform's `server.ts` in `apps/web/lib/server/platforms.ts` so the web app accepts its jobs.
4. `pnpm check`, then `pnpm scraper:package` and run the packaged copy once.

## Run from source

```bash
cd apps/scraper
npx tsx src/cli.ts setup      # paste the web app address and a token
npx tsx src/cli.ts start      # picks up jobs started from the dashboard
npx tsx src/cli.ts doctor     # browser + Google Maps reachability check
```
