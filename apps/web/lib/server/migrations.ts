import "server-only";
import { col } from "@street-wolf/db";
import { legacyFeatureIds } from "@/lib/platforms";

/**
 * Renames feature ids that moved (e.g. `whatsapp:outreach` → `googlemaps:whatsapp` when outreach became part of the
 * Google Maps platform). Idempotent: one updateMany per old id, a no-op once done. Reads also
 * map old ids (normalizeFeatures), so nothing breaks if this hasn't run yet.
 */
export async function migrateFeatureIds() {
  const campaigns = await col("campaigns");
  for (const [from, to] of Object.entries(legacyFeatureIds)) {
    await campaigns.updateMany({ features: from }, [
      { $set: { features: { $setUnion: [{ $filter: { input: "$features", cond: { $ne: ["$$this", from] } } }, [to]] } } },
    ]);
  }
}
