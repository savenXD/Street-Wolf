// Creates every index. Safe to run any time (idempotent). The web app does this on boot too; run it
// from CI/CD before a deploy if you'd rather not do it at startup.
//   MONGODB_URI=... pnpm db:indexes
import { closeClient, ensureIndexes } from "../src/index";

await ensureIndexes();
console.log("indexes ready");
await closeClient();
