# Decisions

Why the codebase is shaped the way it is. Each entry: the decision, why, and what would make us revisit it. Add an entry
when you make a choice someone could reasonably undo by accident. Newest last.

### 1. MongoDB + Next.js with custom auth (2026-10-29)
Supabase/Postgres were removed. One Next.js app serves the UI and API; MongoDB holds everything (sessions, rate limits and the
email outbox too), so web instances are stateless. Sheet rows are separate documents (one per lead), so a sheet can grow to tens
of thousands of rows and one edit writes one document. *Revisit if:* we need relational reporting across campaigns.

### 2. Scraping runs on the user's computer, not our servers
Sites block server IPs. A real browser on a home connection is free, isn't blocked, and keeps data on the user's side. The local
app has no account; it uses a token and can only claim jobs its owner created, and a job (not the request) decides which
campaign and sheet the rows go to. *Revisit if:* we offer paid hosted scraping.

### 3. One folder per platform, everything inside (2026-11-07)
The user chose per-platform bundles over splitting by role (sources / channels / publishers): `platforms/google-maps` holds its
scraper, WhatsApp outreach, AI calling, screens and API logic; Instagram, Reddit and X get the same shape. Reason: anyone
(human or AI) can find all of a platform's code in one place. Cost: an outreach method used by several platforms (email,
WhatsApp) could be written twice. Mitigation: the *sending* goes in shared code (`packages/core` or a future
`packages/channels`); a platform decides when and to whom. *Revisit if:* several platforms share most of their outreach.

### 4. Platforms are independent, enforced by tools (2026-11-07)
No platform imports another; platforms reach the web app only through `apps/web/kit`; pure shared logic lives in
`packages/core`. Lint enforces the first two, `scripts/check-platforms.mjs` checks wiring and worker self-containment, and the
registries validate themselves at load. Reason: as platforms multiply, a change in one must not break another, and the
allowed surface between them must be small and visible.

### 5. Platforms are compiled by the web app (not prebuilt packages)
Each platform is a workspace package, but its screens import `@/kit/*` (resolved to `apps/web`), so it builds only inside the web
app. That keeps one Tailwind setup, one React and zero build steps. *Revisit if:* a second app (e.g. a mobile app) needs platform
screens: then move the kit's UI and store into `packages/ui` / `packages/store`.

### 6. Worker code ships alone in the download
`platforms/<name>/scrape/worker/` and `fields.ts` are copied into the scraper download. They may import only their own folder,
`../../fields`, `node:` and type-only modules, so the download needs no workspace packages and installs with plain `npm`.

### 7. Feature ids are permanent
Campaigns store feature ids (`googlemaps:whatsapp`). Renames go through `legacyFeatureIds`: mapped on read, migrated on boot.
(Done once: `whatsapp:outreach` → `googlemaps:whatsapp`, `elevenlabs:outreach` → `googlemaps:call`.)

### 8. Presets: B2B only for now; no Custom (2026-11-07)
B2B = Google Maps. B2C and D2C show as "coming soon" (D2C = Instagram, Reddit, X). A Custom preset was dropped until there are
several platforms to mix. Campaigns without a preset are treated as B2B (they all predate presets and use Google Maps).

### 9. Undecided, on purpose
* **How WhatsApp messages are sent:** click-to-chat (browser, free, safe), automation in the local app (free, ban risk) or the
  official Cloud API (paid, templates). Ask before building it. Its channel says `runsIn: "undecided"`.
* **How B2C differs from D2C.**
* **Connecting Instagram/Reddit/X accounts** to the local app safely (needed for DMs and posting).
