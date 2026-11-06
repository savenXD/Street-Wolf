# @street-wolf/core

Pure logic shared by the web app, its server code and every platform. **No React, no database, no Node-only APIs, no
imports from apps or platforms.** That keeps it safe to use anywhere (browser, server, scraper) and trivial to test.

Import a module by name: `import { parsePhone } from "@street-wolf/core/phone"`.

| Module | What it does |
| --- | --- |
| `labels` | the call-outcome label tree (default tree, lookup, layout for the graph) |
| `outreach` | which labels count as outreach (everything except "Didn't pick"); used by server counters and the browser |
| `sheet-merge` | merging teammates' edits per cell, diffing rows for saves |
| `phone` | parsing a phone cell (Indian formats, several numbers per cell) into what to dial (`tel:`) and the WhatsApp number (`wa.me`) |
| `csv` | CSV parse and export |
| `call-summary` | `- point - point` call notes → list |
| `atc` | "asked to call back": date + note in one cell, overdue check |

## Rules

* Something belongs here when two places need it (two platforms, or a platform and the app) and it is pure logic.
* Every module gets a test in `test/` when its rules aren't obvious (merge and phone already have one).
* Changing a rule here changes it everywhere: run `pnpm check` from the repo root.

`pnpm test` runs `test/*.test.ts`; `pnpm typecheck` checks `src/`.
