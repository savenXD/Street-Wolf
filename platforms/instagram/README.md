# Instagram (skeleton)

Nothing here runs yet. The folder has the same shape as `platforms/google-maps`, so building a feature means filling in
the matching folder. Part of the **D2C** preset (coming soon). Rules: [../README.md](../README.md).

| Feature | Id | Status | Where |
| --- | --- | --- | --- |
| Scraping | `instagram:scrape` | planned | `scrape/` |
| DMs | `instagram:dm` | planned | `outreach/dm/` |
| Auto posting | `instagram:post` | planned | `post/` |

```
platform.ts             manifest: the three features above
fields.ts               columns Instagram can give (username, fullName, followers, following, email, phone, ...) and the scrape setup
scrape/
  worker/index.ts       the ScrapeWorker (stub). Real scraping goes in this folder
  server/               (empty) job input checks, like google-maps/scrape/server/job-input.ts
  ui/                   (empty) setup screen, list screen
outreach/dm/channel.ts    the Instagram DM channel: needs username, runs in the local scraper app (planned)
post/publisher.ts       posting: image, video, text
```

When the first feature is built, also add `web.ts` (screens + `Tiles`) and `server.ts`, like Google Maps, and wire them in
(see the table in ../README.md; `pnpm check:platforms` lists what's missing).

## Develop

`pnpm typecheck` and `pnpm lint` in this folder. Use only `@/kit/*`, `@street-wolf/core/*` and `@street-wolf/platform-sdk`;
never another platform.

## Open questions before building

* Before building: the structural items in `docs/ROADMAP.md` ("Before the second platform").
* Leads are grouped niche → city today. Instagram's lists are a hashtag or niche, so the `places` level becomes a general
  list first (see docs/ARCHITECTURE.md, "Adding Instagram, Reddit, LinkedIn…").
* Scraping and DMs need a logged-in Instagram account in the local scraper's browser. How that account is connected and kept
  safe from bans is not decided.
