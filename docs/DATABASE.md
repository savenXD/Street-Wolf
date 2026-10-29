# Street Wolf: database and backend reference

Everything about how data is stored, counted and served. [ARCHITECTURE.md](./ARCHITECTURE.md) is the overview, [DEPLOYMENT.md](./DEPLOYMENT.md) is how to ship it.

## 1. Stack in one paragraph

Next.js 16 (UI plus API route handlers on Node) → MongoDB (driver `mongodb`, one pooled client per process, `MONGODB_POOL`
default 50). Auth is custom (email link plus Google). Email goes through a durable outbox in Mongo, sent with Resend. The
scraper is a separate local app that talks to the same HTTP API with a Bearer token. Code layout:

| Path | What lives there |
| --- | --- |
| `packages/db/src/types.ts` | Document shape of every collection |
| `packages/db/src/indexes.ts` | Every index, created on boot (`apps/web/instrumentation.ts`) or by `pnpm db:indexes` |
| `apps/web/app/api/**/route.ts` | HTTP endpoints (list in section 6) |
| `apps/web/lib/server/*` | Server-only logic: `sheets.ts` (row writes and counting), `workspace.ts` (dashboard payload), `invites.ts`, `mail.ts`, `session.ts`, `access.ts` (roles), `ratelimit.ts`, `notify.ts`, `jobs.ts` |
| `apps/web/lib/outreach.ts` | The outreach definition, shared by server and browser |
| `apps/web/lib/workspace.tsx` | Browser store: hydrate, optimistic edits, background sync |
| `apps/scraper` | Local scraper worker (claims jobs, pushes rows) |

Environment: `MONGODB_URI`, `MONGODB_DB` (default `streetwolf`), `NEXT_PUBLIC_SITE_URL` (used in email links, must be the real
URL in production), `RESEND_API_KEY`, `EMAIL_FROM`, `GOOGLE_CLIENT_ID/SECRET`, `CRON_SECRET`, `SESSION_DAYS` (30).
Without `RESEND_API_KEY` emails are printed to the server log and, outside production, sign-in/invite links are returned in the API response.

## 2. Collections

All ids are strings. The browser mints UUIDs itself so the screen updates instantly and retries are idempotent. Token-like ids
(`sessions`, `authTokens`, `apiTokens`) are the sha256 of the secret, so a leaked database can't be replayed.

| Collection | Fields that matter | Lifetime |
| --- | --- | --- |
| `users` | `email` (lowercase, unique), `name`, `title`, `avatarUrl`, `googleId`, `welcomed`, `createdAt`, `lastLoginAt`, `tz` (IANA zone, set from the browser when saving sheet changes) | permanent |
| `sessions` | `_id`=sha256(cookie), `userId`, `expiresAt`, `ip`, `userAgent` | TTL on `expiresAt` |
| `authTokens` | one-time sign-in link: `email`, `next`, `usedAt` | TTL 15 min, single use (atomic) |
| `oauthStates` | Google `state`, PKCE `verifier`, `next` | TTL 10 min |
| `apiTokens` | scraper tokens: `userId`, `name`, `prefix`, `lastUsedAt` | until revoked |
| `campaigns` | `ownerId`, `name`, `purpose`, `features[]`, `labelTree` (custom call-outcome tree, null = built-in) | permanent |
| `members` | `campaignId`, `userId`, `role` (owner/admin/member), `addedBy` | unique (campaign, user) |
| `invites` | `campaignId`, `email`, `role`, `tokenHash`, `invitedBy`, `status` (pending/accepted/revoked), `expiresAt` (14 days) | history kept |
| `domains` | a niche in a campaign: `name`, `image`, `position` | permanent |
| `places` | a city in a domain = one sheet: `scrape` config, `view`, `position`, **`stats {leads, outreached, converted}`** | permanent |
| `leads` | one sheet row: `placeId`, `row`, `cells{}`, `label`, `source`, `sourceId`, `updatedBy`, **`outreachedBy`, `outreachedAt`, `outreachedDay`** | permanent |
| `dailyStats` | `_id`=`campaignId:userId:day`; `outreached`, `converted`, `leads` | permanent, one doc per person per campaign per day |
| `notifications` | `userId`, `type`, `title`, `body`, `data{}`, `readAt` | TTL 6 months |
| `emails` | outbox: `to`, `subject`, `html`, `text`, `status`, `attempts`, `nextAttemptAt` | sent rows TTL 30 days |
| `jobs` | scrape requests: `tool`, `input`, `status`, `progress`, `leadsFound`, `claimedBy` | permanent |
| `rateLimits` | fixed-window counters `bucket:key` | TTL |

**Why leads are one document per row:** a sheet can reach tens of thousands of rows. Embedding rows would hit the 16 MB document
limit and rewrite the whole sheet per keystroke. As documents, editing one cell writes one document.

## 3. Indexes

Every query is index-backed. They are all in `packages/db/src/indexes.ts`; the important ones:

* `users.email` unique; `users.googleId` partial-unique.
* `members (campaignId,userId)` unique and `members (userId)` ("which campaigns am I in").
* `invites.tokenHash` unique; `invites (campaignId,email)` partial-unique where `status:"pending"` (one open invite per person); `invites (email,status)`.
* `leads (placeId,row)` unique; `leads (placeId,source,sourceId)` partial-unique (scrape dedupe); `leads (placeId,updatedAt)` (live sync); `leads (campaignId,label)`.
* `dailyStats (campaignId,day)` and `(campaignId,userId,day)`.
* Removed as unused (they only added a write to every row change): `leads (campaignId,label)` and `authTokens (email,createdAt)`. `ensureIndexes` drops them on boot. Campaign delete now removes leads by `placeId`, so no campaign-first index on `leads` is needed.
* TTL indexes on `sessions`, `authTokens`, `oauthStates`, `rateLimits`, `notifications`, sent `emails`: Mongo cleans these itself, no job needed.

## 4. How outreach is counted

**Definition (`lib/outreach.ts`).** A row counts as outreach when it has **any label except "Didn't pick"**. "Didn't pick" is
recognised by the built-in id `no-pick` (always, even in a customised tree) or a label named "Didn't pick" / "Did not pick".
The same function runs on the server (what is stored) and in the browser (what is shown when a sheet is open), so they agree.

**Where the numbers live.**

| Number | Stored in | Meaning |
| --- | --- | --- |
| Place / campaign totals | `places.stats` | current state: rows with data, rows with a counting label, rows labelled `converted` |
| Per person, per day (chart, "today") | `dailyStats` | actions credited to that person on that day |
| Who owns a lead's outreach | `leads.outreachedBy/At/Day` | the person who first made it a real outreach |

**Rules.**
1. Outreach is credited to one person per lead: whoever first gives it a counting label. This is an atomic claim
   (`outreachedBy` is set only if it doesn't exist and the row still has a counting label at that instant).
2. Relabelling someone else's lead (Interested → Converted) is not new outreach.
3. If a lead goes back to "Didn't pick" or the label is cleared (or the row is deleted), the claim is released and the claimant's
   day is decremented (never below zero). If someone else then reaches the lead, it counts for them.
4. Repeating or toggling labels can't inflate a number: it is one claim per lead.
5. Invariant (verified by test): sum of everyone's `dailyStats.outreached` = `places.stats.outreached` = rows with a claim = rows with a counting label.
6. "Didn't pick" rows are never counted. "Converted" counts when a row becomes `converted`.

**"Today" and days.** A person's day is their own calendar day: the browser's IANA timezone is sent with sheet saves and stored
in `users.tz`; `dailyStats.day` is computed in that zone (UTC if unknown). The chart for each member runs on that member's own
14 days (DST-safe calendar arithmetic in `lastDays`). The Team card's "today" is the last element of that member's series.

## 5. Concurrency: five people labelling one sheet

`applyChanges` in `lib/server/sheets.ts` handles every sheet save.

* The browser sends only changed rows (debounced 700 ms, flushed when the tab is hidden), at most 5,000 per request.
* Each row is **one atomic `findOneAndUpdate`** (upsert) that returns the row exactly as it was just before *that* write. Mongo
  serialises writes to one document, so two people on the same row get different "before" values and the counters move by what each write
  really changed. There is no read-then-write gap.
* Two people creating the same brand-new row race on the unique `(placeId,row)` index; the loser retries as an update (up to 3 times).
* Outreach credit is the atomic claim in section 4. Releases only apply if the row still carries a non-counting label.
* Rows are processed 50 at a time in parallel, so pasting thousands of rows doesn't open thousands of simultaneous writes.
* Afterwards: one `$inc` on `places.stats`, one `$inc` on the caller's `dailyStats` doc, and a read of the caller's "today" which is returned to the
  browser so their number moves immediately.
* Scraper ingest (`ingestLeads`) dedupes on `(source, sourceId)`, appends at `max(row)+1`, retries on a row-number clash and rebuilds counters with `recount()` if it had to.
* `recount(placeId)` rebuilds a place's counters from its rows using the same outreach definition. Use it if counters ever drift.
* Tested: 5 users writing at once to one sheet (own rows, one shared row, relabelling, clearing, toggling, timezones); all counts exact.

Cost per saved row is about 3–4 Mongo operations. 50 people labelling a row every 5 seconds is roughly 40 operations/second.

## 6. HTTP API

All mutating requests are checked for `Origin` (CSRF) on top of SameSite=Lax cookies. Campaign endpoints go through
`requireRole()`; non-members get **404** so ids can't be probed. Scraper Bearer tokens (`swk_…`) may claim jobs and ingest but
cannot manage the account.

| Endpoint | Purpose |
| --- | --- |
| `POST /api/auth/email`, `POST /api/auth/verify`, `GET /api/auth/google` (+`/callback`), `POST /api/auth/logout`, `GET /api/auth/providers` | sign in / out |
| `GET /api/bootstrap` | hydrates the whole app in a fixed number of queries: user, campaigns (members, invites, domains, places, stats, per-member totals and 14-day series), unread count, incoming invites |
| `POST/GET /api/campaigns`, `PATCH/DELETE /api/campaigns/:id` | campaigns (PATCH also saves `labelTree`) |
| `…/domains`, `…/domains/:did`, `…/places`, `…/places/:pid` | domains and places |
| `GET/PATCH …/places/:pid/sheet` | read a sheet; save changed rows (returns `{applied, today}`) |
| `GET …/places/:pid/sync` | live pull of rows a running scrape has added |
| `POST /api/campaigns/:id/invites`, `DELETE …/invites/:inviteId` | invite / revoke (50 per person per day) |
| `PATCH/DELETE …/members/:userId` | change role / remove / leave |
| `GET/POST /api/invites/:token`, `POST /api/invites/by-id/:id/accept|decline` | invite pages and the bell |
| `GET/PATCH /api/notifications` | in-app bell |
| `GET/PATCH /api/profile`, `GET/POST /api/tokens`, `DELETE /api/tokens/:id` | profile and scraper tokens |
| `POST /api/jobs`, `GET /api/jobs`, `POST /api/jobs/claim`, `PATCH /api/jobs/:id` | scrape jobs (create, list, worker claim (atomic), progress/finish/stop) |
| `POST /api/ingest`, `GET /api/ingest/known` | scraper pushes leads (≤1,000 per call, deduped) |
| `POST /api/internal/outbox` | cron drains the email outbox (`x-cron-secret`) |

**Rate limits (shared across instances, in Mongo):** sign-in email 5 / 15 min per address and 20 / h per IP · verify 60 / 15 min ·
sheet save 600 / min per user · live sync 120 / min · ingest 240 / min · job claim 60 / min · job create 60 / h · campaign create 30 / h · invites 50 / day · invite accept 30 / 15 min.
**Size limits:** ≤200 domains/campaign, ≤500 places/domain, ≤100 campaigns/user, ≤5,000 rows per save, ≤1,000 leads per ingest.

## 6b. Reliability and operations

* **Dead scrapers.** Workers ping `PATCH /api/jobs/:id` every 3 s; claim, ping and ingest all stamp `jobs.heartbeatAt`. A `running` job silent for 3 minutes is failed
  automatically (`reapStaleJobs`, run when a sheet's sync is read or a new job is created), so a crashed scraper can't block a sheet forever.
* **Health.** `GET /api/health` is liveness (no database call). `GET /api/health?deep=1` pings MongoDB (readiness, 503 if down). Point the load balancer at the first and uptime monitoring at the second.
* **Failure mode.** A saturated or unreachable database answers `503` + `Retry-After` (not a generic 500). Pool waits fail after 10 s, queries after 45 s.
* **Logging.** Every API response carries `X-Request-Id`. Errors (5xx) and slow requests (≥1.5 s) log one JSON line with that id, method, path, status and duration.
* **Request bodies** are size-capped while being read, so a chunked upload without `Content-Length` can't exhaust memory.
* **Email secrets.** Once a real provider (Resend) accepts a message, its html/text (which contain sign-in and invite links) are blanked; dead-lettered (`failed`) emails expire after 30 days.
* **API tokens.** `lastUsedAt` is refreshed at most every 5 minutes, instead of a write on every scraper request.
* **Shutdown.** SIGTERM closes the Mongo client before exit. `ENSURE_INDEXES=false` skips the boot-time index pass (serverless; run `pnpm db:indexes` in CI instead).
* **Boot warnings.** In production the server logs what is missing (`MONGODB_URI`, a non-localhost `NEXT_PUBLIC_SITE_URL`, `RESEND_API_KEY`, `CRON_SECRET`).
* **Headers.** HSTS (production), COOP, no `X-Powered-By`.

## 7. Teams, invites, notifications, email

* Roles: owner (everything, deletes the campaign) · admin (invite/revoke/remove/configure) · member.
* Invite: admin posts an email → `invites` row (re-inviting refreshes the link, one pending per person) → email in the outbox →
  in-app notification if the person already has an account. Signing up **never** auto-joins: the invite waits as a notification
  and on `/invite/:token` until accepted, and the signed-in email must match the invited one. Accepting is idempotent; the inviter and
  existing members are notified.
* Email: a request only inserts an `emails` row; sending happens after the response and is retried (exponential backoff, 6 attempts) by the
  cron drain, so a Resend outage never loses an invite. Resend free tier is about 3,000 emails/month and 100/day (check their pricing page);
  `onboarding@resend.dev` only delivers to your own account until you verify a domain and set `EMAIL_FROM`.

## 8. Background load (what hits the database when nobody is typing)

| Source | Frequency | Cost |
| --- | --- | --- |
| Workspace refresh (`/api/bootstrap`) | every 2 min while the tab is visible, on tab focus (≥30 s apart), and ≤ every 10 s after outreach changes | ~10 indexed queries |
| Notification bell | every 30 s while visible | 1 indexed query |
| Scrape bar (`…/sync`) | every 2 s while a scrape runs, 15 s otherwise, per open sheet | a few indexed queries |
| Scraper status check | every 5 s | none (calls the local scraper app, not the database) |

There is deliberately **no presence / "last active" heartbeat**: it was removed to save database load.
Known growth item: the per-member lifetime totals in `/api/bootstrap` aggregate every `dailyStats` row of the campaign (members × days of history). Fine for years at team scale; if it ever shows up in slow logs, keep running totals on `members` instead.
Possible further savings: raise the 700 ms sheet debounce to 2–3 s; slow the idle scrape-bar poll.

## 9. Running and testing

```bash
pnpm db:dev      # throwaway local MongoDB (PERSIST=1 keeps data)
pnpm dev         # http://localhost:3000
node scripts/e2e.mjs   # API checks (needs a running server and MONGODB_URI/MONGODB_DB)
node scripts/load.mjs  # 500-user simulation
```

Known gaps worth remembering: counts recorded before the `outreachedBy` claim existed are not rebuilt (per-person daily history can't be
reconstructed, place totals can via `recount`); the chart updates for teammates within about 2 minutes, not instantly.
