# Reddit (skeleton)

Nothing here runs yet. The folder has the same shape as `platforms/google-maps`, so building a feature means filling in
the matching folder. Part of the **D2C** preset (coming soon). Rules: [../README.md](../README.md).

| Feature | Id | Status | Where |
| --- | --- | --- | --- |
| Scraping | `reddit:scrape` | planned | `scrape/` |
| DMs and comments | `reddit:dm` | planned | `outreach/dm/` |
| Auto posting | `reddit:post` | planned | `post/` |

```
platform.ts             manifest: the three features above
fields.ts               columns Reddit can give (title, body, username, karma, score, comments, ...) and the scrape setup
scrape/
  worker/index.ts       the ScrapeWorker (stub). Real scraping goes in this folder
  server/               (empty) job input checks, like google-maps/scrape/server/job-input.ts
  ui/                   (empty) setup screen, list screen
outreach/dm/channel.ts    the Reddit DM channel: needs username, runs in the local scraper app (planned)
post/publisher.ts       posting: text, link, image
```

When the first feature is built, also add `web.ts` (screens + `Tiles`) and `server.ts`, like Google Maps, and wire them in
(see the table in ../README.md; `pnpm check:platforms` lists what's missing).

## Develop

`pnpm typecheck` and `pnpm lint` in this folder. Use only `@/kit/*`, `@street-wolf/core/*` and `@street-wolf/platform-sdk`;
never another platform.

## Open questions before building

* Before building: the structural items in `docs/ROADMAP.md` ("Before the second platform").
* Leads are grouped niche → city today. Reddit's lists are a subreddit, so the `places` level becomes a general
  list first (see docs/ARCHITECTURE.md, "Adding Instagram, Reddit, LinkedIn…").
* Scraping and DMs need a logged-in Reddit account in the local scraper's browser. How that account is connected and kept
  safe from bans is not decided.
