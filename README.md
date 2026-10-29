# Street Wolf

Lead-generation workspace: scrape leads (Google Maps today; Instagram and Reddit next), organise them in sheets, and
run outreach with a team.

**Stack:** Next.js 16 · Node · MongoDB · TypeScript · pnpm + Turborepo.

```bash
pnpm install
pnpm db:dev      # terminal 1: local MongoDB (no Docker needed)
pnpm dev         # terminal 2: http://localhost:3000
```

Everything about the backend (data model, auth, teams, scaling, what's left to plug in) is in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
