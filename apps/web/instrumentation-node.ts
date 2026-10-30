// Node-only boot work (kept out of instrumentation.ts so the Edge analyzer never sees process APIs).
import { closeClient, ensureIndexes } from "@street-wolf/db";
import { sealLegacyInviteTokens } from "./lib/server/invites";

export async function boot() {
  if (!process.env.MONGODB_URI) return;
  // On serverless every cold start would re-run ~16 createIndexes calls. Set ENSURE_INDEXES=false there and run `pnpm db:indexes` from CI.
  if (process.env.ENSURE_INDEXES !== "false") {
    try {
      await ensureIndexes();
      console.log("[db] indexes ready");
      await sealLegacyInviteTokens();
    } catch (e) {
      console.error("[db] could not prepare the database:", e);
    }
  }
  // Rolling deploys send SIGTERM: hand connections back instead of dropping them mid-request.
  let closing = false;
  process.once("SIGTERM", () => {
    if (closing) return;
    closing = true;
    setTimeout(() => process.exit(0), 8000).unref();
    closeClient().finally(() => process.exit(0));
  });
}
