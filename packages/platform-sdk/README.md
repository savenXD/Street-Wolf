# @street-wolf/platform-sdk

The contract every platform (`platforms/<name>`) follows. **Types only**: nothing here runs, so worker code can import it with
`import type` and still work inside the scraper download, where this package isn't shipped.

| Type | Used for |
| --- | --- |
| `PlatformManifest`, `FeatureDef`, `Status`, `Category` | `platform.ts`: what a platform offers and how far along each feature is |
| `ScrapeWorker`, `WorkerContext`, `WorkerHooks`, `ScrapedRow`, `BrowserSession`, `Pacer` | `scrape/worker/index.ts`: what the scraper app hands a worker and expects back |
| `OutreachChannel`, `RunsIn` | `outreach/<channel>/channel.ts`: which lead columns a channel needs and where it runs |
| `Publisher` | `post/publisher.ts`: what a platform can post |

`OutreachChannel` and `Publisher` are declarations only so far: no runtime sends or posts yet. Their runtime (a job queue with
kinds, see `docs/ROADMAP.md`) is designed together with the first real channel.

Changing a type here can break every platform: run `pnpm check` from the repo root.
