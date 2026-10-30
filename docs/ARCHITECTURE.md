# Street Wolf: architecture

## What the product is

Street Wolf is a free, open-source, **local-first** lead-generation workspace. Someone searches Google Maps for a keyword in a city,
a scraper running on their own computer fills a sheet with every matching business, and a team works the list: call, WhatsApp,
label the outcome, write a call summary. The scraper has no account of its own; it talks to the web app with a token.

How a lead moves through it:

1. **Scrape.** A person sets up a sheet (queries, which fields, filters) and presses Start. A job is queued; the local scraper claims
   it (`/api/jobs/claim`) and pushes rows (`/api/ingest`), which appear live in the open sheet.
2. **Shortlist and work.** Rows are edited per cell; each row carries one **label** from the campaign's outcome tree. Giving a row a
   label other than "Didn't pick" counts as outreach, credited once to the person who did it (see DATABASE.md section 4).
3. **Follow up on a phone.** The sheet's **Mobile Outreach** link opens `/m/<campaign>/<domain>/<city>`, a phone layout of the same
   sheet using the same store and sync (`apps/web/components/mobile`). Icon buttons call or open WhatsApp from the phone column
   (`lib/phone.ts` normalises Indian formats), labels sync back, and **Pamphlets** (`lib/pamphlets.ts`) send ready messages or a
   price image. Access is by normal sign-in; the route is protected in `proxy.ts` and blocked from search engines.
4. **Call summary.** Every sheet has a `callSummary` column (the 2nd column by default, not part of the scrape setup). It is a normal
   cell, so it is saved, synced and merged like any other. Points are written `- one - two` and shown by `lib/call-summary.ts` in a
   dotted window (`components/dashboard/call-summary-dialog.tsx`). Limit: 5,000 characters per cell.

What is not built yet: Instagram, Reddit and X scrapers and outreach (the schema is ready, see the end of this file), editing the
pamphlet messages in settings (they are fixed defaults, and the pamphlet itself is stored per browser), and a hosted scraper.

Repository map: `apps/web` (UI + API) · `apps/scraper` (local worker) · `packages/db` (types, indexes) · `tools/google-maps` ·
`packages/tool-sdk` · `scripts` (tests) · `docs`.

# Street Wolf: backend architecture

**Stack:** Next.js 16 (UI + API route handlers on Node) · MongoDB · custom auth (email link + Google) · a durable email outbox.
The scrapers run separately (the local scraper app today, hosted workers later) and talk to the same API.

```
 Browser ──► Next.js (stateless, N instances) ──► MongoDB
 Scraper app ─┘  (Bearer API token)                  ▲
 Cron ──► POST /api/internal/outbox ──► Resend ───────┘ (email outbox lives in Mongo)
```

## Running it

```bash
pnpm install
pnpm db:dev            # terminal 1: a throwaway local MongoDB (no Docker). Nothing is kept on disk unless PERSIST=1
cp apps/web/.env.example apps/web/.env.local   # already done for you
pnpm dev               # terminal 2: http://localhost:3000
```

Production: set `MONGODB_URI` (Atlas), `NEXT_PUBLIC_SITE_URL`, then add the keys below. Indexes are created on boot
(`apps/web/instrumentation.ts`), or run `pnpm db:indexes` from CI.

### The only things left for you (all optional until you want them)

| Env var | What it unlocks |
| --- | --- |
| `RESEND_API_KEY`, `EMAIL_FROM` | Real invite and sign-in emails. Without it they print in the server log and (dev only) the link is returned to the page. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | "Continue with Google". Redirect URI: `{NEXT_PUBLIC_SITE_URL}/api/auth/google/callback`. Until set, the button explains and falls back to the email link. |
| `CRON_SECRET` | Lets a cron call `POST /api/internal/outbox` (header `x-cron-secret`) every minute to retry failed emails. |
| Scraper integration | The local scraper app should call `POST /api/jobs/claim`, then `POST /api/ingest`, then `PATCH /api/jobs/:id` with a token from Settings → Integrations. |

## Data model (`packages/db/src/types.ts`)

Ids are strings (UUIDs) minted by the browser, so the UI updates instantly and retries are idempotent.

| Collection | Purpose | Notes |
| --- | --- | --- |
| `users` | Accounts | unique `email`; partial-unique `googleId` |
| `sessions` | Login sessions | `_id` = sha256(cookie token); TTL on `expiresAt` |
| `authTokens` | One-time sign-in links | sha256, single use (atomic), 15 min TTL |
| `oauthStates` | Google OAuth state + PKCE verifier | single use, 10 min TTL |
| `apiTokens` | Scraper access tokens | stored hashed; secret shown once |
| `campaigns` / `members` | Campaigns and who is on them | role = `owner` / `admin` / `member`; unique (campaign, user) |
| `invites` | Pending/accepted/revoked invites | token stored hashed; one *pending* invite per (campaign, email); 14-day expiry |
| `domains` → `places` | A niche and the cities it is hunted in | `places.stats` holds counters so dashboards never scan leads |
| `leads` | One document per sheet row | unique (place, row); partial-unique (place, source, sourceId) for scrape dedupe |
| `dailyStats` | Per person, per campaign, per day (the person's own calendar day) | powers the outreach chart, per-person stats and the "today" number |
| `notifications` | In-app bell | cursor-paginated; 6-month TTL |
| `emails` | Durable outbox | retried with backoff; delivered rows expire after 30 days |
| `jobs` | Scrape requests for workers | atomic claim; status/progress/leadsFound |
| `rateLimits` | Fixed-window counters | shared across instances; TTL |

**Why rows are separate documents:** a sheet can grow to tens of thousands of rows. Embedding them would hit MongoDB's 16 MB
document limit and rewrite the whole sheet on every keystroke. As documents, editing one cell writes one document.

## Auth

* **Email link:** `POST /api/auth/email` → email with `/auth/confirm?token=…` → that page POSTs `/api/auth/verify`.
  The link opens a page that confirms with a POST (not a GET), because mail scanners pre-fetch links and would burn a
  GET-consumed token. Same response whether or not the account exists. 5 requests / 15 min per address, 20 / hour per IP.
* **Google:** `GET /api/auth/google` (PKCE + one-time `state`) → callback. Unverified Google emails are rejected.
* **Sessions:** opaque random token in an `HttpOnly; SameSite=Lax; Secure` cookie. Only its hash is stored, so a database leak
  can't be replayed. 30 days (`SESSION_DAYS`). Logout deletes the row.
* **CSRF:** SameSite=Lax plus an `Origin` check on every mutating request.
* **Scrapers:** `Authorization: Bearer swk_…`. Tokens can ingest and claim jobs but can't manage the account.
* Signing in never auto-joins a team. An invite waits in the bell until the person accepts it.
* `x-forwarded-for` is used for rate limits; run behind a proxy/CDN that sets it (Vercel, Cloudflare, nginx).

## Teams and invites

Roles: **owner** (everything, deletes the campaign) · **admin** (invite/revoke, remove members, configure) · **member** (use the campaign).
Every campaign-scoped endpoint goes through `requireRole()`; non-members get **404**, so ids can't be probed.

Invite flow: admin invites by email → row + email (outbox) + in-app notification if the person already has an account →
they accept from the email link **or** the bell (the signed-in email must match the invited one) → owner/inviter is
notified and other members are told someone joined. Re-inviting refreshes the link instead of creating a duplicate.
Accepting twice (double click, two tabs) is idempotent.

## Notifications and email

`notifications` rows are created by the server on: invite received, invite accepted, member joined, member removed, role
changed, scrape finished. The bell polls every 30 s while the tab is visible (one indexed query). Swap for Server-Sent
Events when you want true push. Email goes through the **outbox**: a request only inserts a row; delivery happens after the
response and is retried (exponential backoff, 6 attempts) by the cron drain, so a Resend outage never loses an invite.

## Frontend data flow (`apps/web/lib/workspace.tsx`)

* **Accounts only.** There is no guest or developer mode: signed-out visitors are redirected to `/signup` (route guard in
  `proxy.ts` plus the dashboard shell). Old on-device data from earlier versions is deleted on load.
* `GET /api/bootstrap` hydrates the whole app in one call (a fixed number of indexed queries, however many
  campaigns). Edits update the screen immediately and sync in the background; if the server refuses, the store reloads the
  server's truth and shows a toast.
* **Sheets** are fetched when opened and saved as **diffs** (changed rows only, debounced 700 ms, flushed on tab hide).

## Scaling notes

* Next.js instances are **stateless**; sessions, rate limits and the outbox are all in MongoDB, so add instances freely.
* Every query is index-backed (see `packages/db/src/indexes.ts`). The driver pools 50 connections per instance
  (`MONGODB_POOL`). Atlas M10+ comfortably serves thousands of concurrent users.
* Measured locally (single Node process, in-memory Mongo, laptop): 500 simulated users signing in and working at once
  completed with **0 failures at ~190–230 req/s**; latency is queueing on one core, so throughput grows with instances.
  Re-run with `pnpm e2e`-style scripts: `node scripts/load.mjs`.
* Hot paths avoid scans: dashboard counts come from `places.stats` and `dailyStats`, not from counting leads.
  `recount(placeId)` in `lib/server/sheets.ts` repairs counters if they ever drift.
* Limits protect the database: ≤200 domains/campaign, ≤500 places/domain, ≤100 campaigns/user, ≤5,000 changed rows per
  save, ≤1,000 leads per ingest call, request-size caps.

## Adding Instagram, Reddit, LinkedIn…

The schema is already platform-neutral:
1. Add the platform to `Platform` (`packages/db/src/types.ts`) and the `source` enums in `app/api/ingest` and `app/api/jobs`.
2. Add its features in `lib/features.ts` (the UI already lists Instagram and Reddit there).
3. Its scraper claims `jobs` with `tool: "instagram"` and pushes rows to `/api/ingest` with `source: "instagram"` and a stable
   `sourceId` (so re-scrapes dedupe). Columns are free-form (`cells`), so no migration is needed.
4. Outreach platforms (calling, WhatsApp, DMs) record actions the same way the sheet does: labelling a row bumps `dailyStats`.

Full database and backend reference (every field, index, counting rule, concurrency guarantee, polling load): see [DATABASE.md](./DATABASE.md).

## Tests

* `node scripts/e2e.mjs`: 101 API checks (auth, CSRF, rate limits, roles, invites, notifications, sheets, ingest, jobs,
  cascades, concurrency, DB state). Needs a running server and `MONGODB_URI`/`MONGODB_DB`.
* `node scripts/load.mjs`: the 500-user simulation.
* Throwaway database for both: `PORT=27099 node scripts/dev-db.mjs` (it is throwaway by default).
