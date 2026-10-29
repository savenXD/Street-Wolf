# Street Wolf scraper

A fast, polite Google Maps scraper that runs on your own computer (Windows or Linux) and fills your Street Wolf sheets live.

## Install (a few minutes, once)

**Windows** (PowerShell, no admin needed)

```powershell
irm https://github.com/savenXD/Street-Wolf/releases/latest/download/install.ps1 | iex
```

**Linux** (terminal, no root needed)

```sh
curl -fsSL https://github.com/savenXD/Street-Wolf/releases/latest/download/install.sh | sh
```

Prefer to download first? Get `street-wolf-scraper.zip` (Windows) or `street-wolf-scraper.tar.gz` (Linux) from the releases page, extract it, and run `install.ps1` / `install.sh` inside.

The installer finds Node.js 20+ or installs a private copy inside the folder, installs the dependencies and the browser, creates the launchers, runs a self-check and asks for your token.

**Your token:** in the web app open Settings → Integrations → Scraper access → Create token. Paste it (and the web app's address, for example `http://localhost:3000`) when asked. Change it later with `setup`.

## Run

|  | Windows | Linux |
| --- | --- | --- |
| Background (no window, fastest) | `start.cmd` | `./start.sh` |
| Visible browser window | `start-window.cmd` | `./start-window.sh` |

Leave it running, open a city sheet in the web app and press **Start**. Rows appear as they are found and are saved to your account as they arrive. **Stop** in the web app stops the scraper within a few seconds. Window mode on a machine with no display falls back to background mode.

## Commands

```
street-wolf-scraper setup                      save the web app address and your token
street-wolf-scraper start [--headed] [--fast] [--workers 2]   wait for jobs from the dashboard
street-wolf-scraper doctor                     check Node, token, browser and Google Maps
street-wolf-scraper logout                     delete the saved address and token
street-wolf-scraper scrape "dentists" --location "Austin, TX" --limit 50 --fields name,phone,website
                                               one-off scrape printed as CSV, no account needed.
                                               Nothing is saved; add  > leads.csv  if you want a file
```

(`street-wolf-scraper.cmd` on Windows, `./street-wolf-scraper` on Linux. From a source checkout use `npm start`, `npm run start:window`, `npm run setup`.)

## How it stays fast without getting banned

- **List first, details only when needed.** Name, category, rating, review count, address, coordinates and Maps link come from the search results list (dozens per page load). A business's own page is opened only if you picked phone, website, hours, attributes, photo, price level, review snippets, plus code, or the contact-enrichment fields, or use the website/phone filters. Already-scraped businesses on the sheet are skipped.
- **Click-through by default.** Each tab opens the search once, then clicks through the results list like a person: click a business, read its panel (no page load), close it, click the next, and scroll for more only when it runs out. That is far fewer requests than opening every business as its own page. It ends on Google's "reached the end of the list" marker, after 3 scrolls that load nothing new, at your limit, or at a 20-minute cap, so it can't hang on a list that never finishes. 2 tabs work through the list together when running in the background, 1 in window mode; they share a "taken" list so no business is done twice. Use `--fast` (or `"mode": "tabs"`) for the older mode that opens every business in its own tab, 3 at a time: quicker on big runs, more page loads, easier for Google to spot.
- **Adaptive pacing.** Short random pauses between clicks (about 0.4 to 1 s; 1.2 to 3.2 s between page loads in `--fast` mode). On a CAPTCHA or `/sorry/` page everything pauses (1 min, doubling up to 15), drops to one worker, switches to a fresh browser session, then speeds back up after a clean run. After 4 blocks in a row the job stops cleanly; rows already found stay saved.
- **Lightweight browser.** Images, fonts and media are blocked. A stealth-patched Chromium (Patchright) is used, and the session is recycled every ~150 pages.
- **Email and social links** are read from the business's own website with plain HTTP, never through Google.

Google Maps returns about 120 results per search; use more specific searches to cover a bigger area.

## Settings

`data/config.json` (created by `setup`; environment variables `SW_API_URL`, `SW_TOKEN`, `SW_CONCURRENCY`, `SW_HEADLESS` override it):

| Key | Default | |
| --- | --- | --- |
| `apiUrl` | `http://localhost:3000` | your Street Wolf address |
| `token` | | the `swk_…` token |
| `mode` | `"click"` | `"click"` (one tab per worker, clicks through the list) or `"tabs"` (every business in its own tab) |
| `clickWorkers` | `2` | click mode: tabs working through the list at once (1 to 4). A visible window uses 1 unless you pass `--workers` |
| `concurrency` | `3` | `tabs` mode: pages at once (1 to 8). Higher is faster and riskier |
| `minDelayMs` / `maxDelayMs` | `1200` / `3200` | pause range before each page load |
| `headless` | `true` | `false` = visible window |
| `port` | `4317` | local health port the dashboard pings |
| `freeProxies` | `false` | see below |

## Proxies (optional)

Put your own in `proxies.txt`, one per line: `host:port` or `http://user:pass@host:port`. They are rotated after a block. With `--free-proxies` (or `freeProxies: true`) the scraper fetches public proxy lists and keeps only those that can open a tunnel to Google. Be realistic: most free proxies are dead, slow, or already blocked by Google, so treat them as a fallback after a block, not a speed boost. Paid residential proxies are the dependable option at high volume. Your token and Street Wolf traffic never go through a proxy; only the browser's Google traffic does.

## What is stored on your computer

Scraped data is never written to disk: rows go straight to your Street Wolf account and the scraper keeps only a small in-memory buffer. The browser runs with a throwaway profile (no cookies or history survive a run). The only file the scraper keeps is `data/config.json` with the web app address and your token (readable only by you); `street-wolf-scraper logout` deletes it, or skip it entirely by setting `SW_API_URL` and `SW_TOKEN` as environment variables.

## Your data stays yours

The scraper only runs jobs **you** queued, and only writes into the campaign and city sheet that job was created for; the server decides the destination from the job, not from anything the scraper sends. A teammate's scraper can't pick up your job and yours can't write into anyone else's campaign. Tokens can be revoked in Settings at any time.

## Troubleshooting

- **Job stays “Waiting for your scraper”:** the scraper isn't running, or its token belongs to a different account than the one you are signed in with.
- **“Google keeps blocking this connection”:** wait an hour, switch network (a phone hotspot works), use window mode and solve the CAPTCHA by hand, or add proxies.
- **Linux, browser won't start:** `sudo npx patchright install-deps chromium`, then `street-wolf-scraper doctor`.
- **Port 4317 in use:** another copy is already running.

## Before the GitHub release exists

The one-line commands need the release files. Until then:

- **On the machine with the repo:** `cd apps/scraper`, then `pnpm run setup` (address + token) and `pnpm start` (or `pnpm run start:window`).
- **On another Linux or Windows computer:** run `pnpm scraper:package` in the repo root, copy `dist/street-wolf-scraper.tar.gz` (Linux) or `dist/street-wolf-scraper.zip` (Windows) over, extract it, and run `sh install.sh` / `powershell -ExecutionPolicy Bypass -File install.ps1` inside the folder.

## For maintainers

`node scripts/package-scraper.mjs` (repo root) builds `dist/street-wolf-scraper.tar.gz`, `dist/street-wolf-scraper.zip`, `dist/install.sh` and `dist/install.ps1`. Upload all four to a GitHub release. Set `SW_RELEASES` to point the installers at another location.
