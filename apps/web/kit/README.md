# kit

The only part of `apps/web` that platforms (`platforms/<name>`) may import. Lint enforces it.

* `ui.ts`: design system (presentation only)
* `store.ts`: `useWorkspace()`, data shapes, dashboard stats
* `sheet.ts`: widgets every lead sheet shares (labels, call summary, ATC, CSV import, scraper status)
* `server.ts`: auth/role/HTTP helpers for a platform's `server.ts` (server-only)

Each file only re-exports. To give platforms something new, build it in `components/` or `lib/` as usual and add one export
line here. Removing or renaming an export can break a platform: run `pnpm check` from the repo root. More: `../README.md`.
