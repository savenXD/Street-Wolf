# Street Wolf

**Free, open-source, local-first lead generation.** Turn any Google Maps search into a live lead sheet (name, phone, website,
rating, reviews), shortlist the best fits, and run outreach with your team: call, WhatsApp, label every lead and keep call
notes. 100% free, no paywalls, and the scraper runs on your own computer. WhatsApp outreach is next, then ElevenLabs AI calling
and Instagram, Reddit and X.

![Street Wolf landing page](docs/screenshots/landing-hero.png)

## Screenshots

**How it works.** Leads from Instagram, Reddit, X and Google Maps flow into one sheet, a local AI filter (Ollama) keeps the
ones that look like real buyers, and the rest go straight to outreach.

![Sources flowing into one lead sheet, through a local AI filter, into outreach](docs/screenshots/landing-pipeline.png)

**Dashboard.** Per campaign: lead, outreach and conversion totals, outreach per teammate per day, and the team.

![Campaign dashboard with totals, daily outreach and team](docs/screenshots/dashboard.png)

**Lead sheet.** One sheet per niche and city, filled live by the scraper. Every row gets an outcome label and a call summary.

![Lead sheet with labels, call summaries and scraped business details](docs/screenshots/lead-sheet.png)

**Label graph.** Click a row's label cell to pick the call outcome from the tree.

![Call-outcome label graph opened from a sheet row](docs/screenshots/label-graph.png)

<sub>The campaign, people and businesses in these screenshots are made-up demo data.</sub>

## What is in it

| Part | What it does |
| --- | --- |
| **Campaigns and presets** (`/new`) | A campaign starts with **Who do you sell to?** B2B is available today and uses Google Maps (scraping, WhatsApp outreach, AI calling); B2C and D2C (Instagram, Reddit, X) are coming. |
| **Lead sheets** (`/dashboard`) | A spreadsheet per niche and city. Type, paste, drag columns, import and export CSV. Every row has an outcome **label** (a configurable tree such as Called › Picked › Interested › Converted) and a **Call summary** column. |
| **Google Maps scraper** (`platforms/google-maps`, run by `apps/scraper`) | A fast, polite scraper installed on Windows or Linux. It claims jobs from the web app and streams results into the open sheet. Needs no account of its own, only a token from Settings. |
| **Dashboard** (`/dashboard`) | Per campaign: leads, outreached, converted and conversion rate, outreach per day per teammate, and the team. |
| **Teams** | Campaigns with owner, admin and member roles, email invites, in-app notifications, per-person daily outreach counts and charts. Many people can label one sheet at once; edits merge per cell. |
| **Mobile Outreach** (`/m/...`) | A phone layout of any sheet. Open the link from the sheet's **Mobile Outreach** button on a phone and sign in. See below. |
| **Landing site** (`/`) | Marketing page and SEO pages (`/google-maps-scraper`, `/run-locally`, `/open-source-lead-generation`). |

### Mobile Outreach

Same data, different screen, so labels set on the phone appear on the web (and for teammates) within seconds, and the other way round.

* Sign-in required: only people on the campaign can open a sheet's link.
* A top bar with search, a **To do** filter (unlabelled leads) and a column picker. By default only name and phone show; the choice is remembered on that phone.
* Each lead has icon-only buttons: **call** and **WhatsApp**. Both come from the same phone cell and understand Indian formats
  (`+91 98765 43210`, `098765 43210`, `98765-43210`, `0091…`, `020 2612 3456`, several numbers in one cell). Landlines and toll-free
  numbers get a call button only. See `packages/core/src/phone.ts`.
* **Pamphlets:** ready follow-up messages that open WhatsApp with the text filled in, and a shareable image whose business name,
  prices and colour you can change. Stored in the browser for now (`platforms/google-maps/outreach/whatsapp`).
* **Call summary:** write points as `- first point - second point`; it shows as a list in a small dotted window, on web and phone.

### Call-outcome labels

Each campaign has a label tree (edit it with **Edit labels** on any sheet). The default:

```
Called
├─ Picked
│  ├─ Interested → Converted · Busy (interested / not interested) · Client will think
│  └─ Not interested → Already has service · Doesn't see the need
├─ Didn't pick
└─ Irrelevant lead
```

Every label except **Didn't pick** counts as outreach. See `packages/core/src/labels.ts`.

## Stack

Next.js 16 · Node · MongoDB · TypeScript · pnpm + Turborepo. Custom auth (email link and Google), a durable email outbox,
motion and GSAP on the landing page.

```
apps/web                Next.js app (website + API). Hosts the platforms; apps/web/kit is all a platform may use from it
apps/scraper            the app users download (Windows / Linux); a generic engine that runs each platform's scrape worker
platforms/<name>        one folder per platform with everything about it: google-maps (live), instagram, reddit, x (skeletons)
packages/core           pure logic shared everywhere: labels, phone, CSV, sheet merge, call summary
packages/db             MongoDB collections, types and indexes
packages/platform-sdk   the contract every platform follows (types only)
scripts                 e2e and load tests, dev database, scraper packaging, platform wiring check
docs                    architecture, database, decisions, roadmap, deployment
```

New here (or an AI agent)? Start with [AGENTS.md](AGENTS.md): the map, the rules and where new code goes.

## Run it

```bash
pnpm install
pnpm db:dev      # terminal 1: a throwaway local MongoDB (no Docker needed)
pnpm dev         # terminal 2: http://localhost:3000
```

Everything else (email, Google sign-in, cron) is optional until you want it; see the env table in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). To scrape, install the scraper from [apps/scraper](apps/scraper/README.md) and paste a
token from Settings → Integrations.

## Tests

```bash
pnpm check                # platform wiring, typecheck, lint, unit tests in every package (run before you push)
pnpm test                 # unit tests only (how teammates' edits merge, Indian phone parsing)
pnpm e2e                  # API checks      } need a running server on a throwaway database:
pnpm e2e:browser          # browser checks  } see AGENTS.md → Commands
node scripts/load.mjs     # 500-user simulation
```

## Docs

* [AGENTS.md](AGENTS.md): map of the code, rules, where new code goes, commands.
* [platforms/README.md](platforms/README.md): how platforms are built and wired; each platform has its own README.
* [apps/web](apps/web/README.md) · [apps/scraper (developing)](apps/scraper/DEVELOPING.md) · [packages/core](packages/core/README.md) ·
  [packages/db](packages/db/README.md) · [packages/platform-sdk](packages/platform-sdk/README.md)
* [docs/DECISIONS.md](docs/DECISIONS.md): why things are the way they are. [docs/ROADMAP.md](docs/ROADMAP.md): structural work still due.
* [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): product context, backend overview, auth, teams, scaling.
* [docs/DATABASE.md](docs/DATABASE.md): every collection, index, counting rule and endpoint.
* [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): shipping it.
