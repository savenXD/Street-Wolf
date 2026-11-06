// Every platform apps/web loads, as plain data (safe on server and client). Each platform lives in platforms/<name>;
// its screens come from "@street-wolf/<name>/web", its API logic from ".../server". Add a platform here and in
// components/dashboard/platform-tiles.tsx (and lib/server/platforms.ts if it scrapes).
import type { FeatureDef, PlatformManifest } from "@street-wolf/platform-sdk";
import { googleMaps, legacyFeatureIds as mapsLegacy } from "@street-wolf/google-maps/platform";
import { instagram } from "@street-wolf/instagram/platform";
import { reddit } from "@street-wolf/reddit/platform";
import { x } from "@street-wolf/x/platform";

// Skeletons (status "planned") are listed so presets and feature ids know them; they have no screens yet.
export const platforms: PlatformManifest[] = [googleMaps, instagram, reddit, x];

export const platformById = (id: string) => platforms.find((p) => p.id === id);

export type Feature = FeatureDef & { platform: PlatformManifest };
export const features: Feature[] = platforms.flatMap((p) => p.features.map((f) => ({ ...f, platform: p })));
export const featureById = (id: string) => features.find((f) => f.id === id);

/** Old feature ids still stored on some campaigns → their current ids. */
export const legacyFeatureIds: Record<string, string> = { ...mapsLegacy };
export const normalizeFeatures = (ids: string[]) => [...new Set(ids.map((id) => legacyFeatureIds[id] ?? id))];

/** The platforms a campaign uses, in registry order, from its stored feature ids. */
export function campaignPlatforms(featureIds: string[]): PlatformManifest[] {
  const used = new Set(featureIds.map((id) => featureById(id)?.platform.id));
  return platforms.filter((p) => used.has(p.id));
}

/**
 * Catches wiring mistakes the moment the app loads (and so at build time): duplicate or badly named feature ids, and old
 * ids that point nowhere. Presets are checked in lib/presets.ts. Throwing here is deliberate: a broken registry must never ship.
 */
function validate() {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const p of platforms) {
    if (platforms.filter((q) => q.id === p.id).length > 1) problems.push(`platform id "${p.id}" is used twice`);
    for (const f of p.features) {
      if (ids.has(f.id)) problems.push(`feature id "${f.id}" is used twice`);
      ids.add(f.id);
      if (!f.id.startsWith(`${p.id}:`)) problems.push(`feature "${f.id}" must start with "${p.id}:"`);
    }
  }
  for (const [from, to] of Object.entries(legacyFeatureIds)) {
    if (ids.has(from)) problems.push(`old feature id "${from}" is still a current id`);
    if (!ids.has(to)) problems.push(`old feature id "${from}" points to unknown "${to}"`);
  }
  if (problems.length) throw new Error(`apps/web/lib/platforms.ts: ${problems.join("; ")}`);
}
validate();
