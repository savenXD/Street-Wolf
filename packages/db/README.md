# @street-wolf/db

MongoDB access for the web app: document types for every collection, indexes, and the shared client.

```
src/types.ts     one exported type per collection (User, Campaign, Domain, Place, Lead, Job, ...) + Platform, CampaignPreset
src/indexes.ts   ensureIndexes(): every index; runs on boot (apps/web/instrumentation-node.ts) or via `pnpm db:indexes`
src/index.ts     col("<name>") typed collection access, client lifecycle
scripts/         indexes.ts (CI/serverless index creation)
```

## Rules

* Ids are strings minted by the browser (UUIDs), so the UI updates before the server answers and retries are idempotent.
* Every query must be index-backed; add the index in `indexes.ts` in the same change.
* Adding or changing a field: update `types.ts`, then document it in `docs/DATABASE.md`. Data migrations that must run once go
  in `apps/web/lib/server/migrations.ts` (idempotent, run on boot).
* `Platform` lists every platform id (also a job's `tool` and a lead's `source`). `pnpm check:platforms` checks it.
* Nothing here is Mongo-specific in the types, so the browser can import them too.

Full reference (every field, index, counting rule): [docs/DATABASE.md](../../docs/DATABASE.md).
