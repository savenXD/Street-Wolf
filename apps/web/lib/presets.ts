// "Who do you sell to?": the first choice when creating a campaign. A preset decides which platforms the setup offers
// and which of their features start switched on. Stored on the campaign as `preset`.
import type { CampaignPreset } from "@street-wolf/db";
import { featureById, platformById } from "@/lib/platforms";

export type PresetDef = {
  id: CampaignPreset;
  name: string;
  /** One line: who you sell to. */
  tagline: string;
  examples: string;
  /** Platform ids offered, in order. */
  platforms: string[];
  /** Feature ids switched on when the preset is picked. */
  defaults: string[];
  /** Shown greyed out as "coming soon" until its platforms exist. */
  available: boolean;
};

export const presets: PresetDef[] = [
  {
    id: "b2b",
    name: "B2B",
    tagline: "You sell to businesses.",
    examples: "Agencies, SaaS, services for clinics, shops and firms.",
    platforms: ["googlemaps"],
    defaults: ["googlemaps:scrape", "googlemaps:whatsapp"],
    available: true,
  },
  {
    id: "b2c",
    name: "B2C",
    tagline: "You sell to people.",
    examples: "Coaching, courses, local services for consumers.",
    platforms: [],
    defaults: [],
    available: false,
  },
  {
    id: "d2c",
    name: "D2C",
    tagline: "Your brand sells its own products online.",
    examples: "Clothing, skincare, food and gadget brands.",
    platforms: ["instagram", "reddit", "x"],
    defaults: [],
    available: false,
  },
];

/** Campaigns made before presets existed have none: they are all Google Maps campaigns, so B2B. */
export const presetById = (id: string | undefined) => presets.find((p) => p.id === id) ?? presets[0];

// Presets may only name platforms and features that exist (see lib/platforms.ts). Fails at load, so at build time too.
{
  const problems: string[] = [];
  for (const p of presets) {
    for (const id of p.platforms) if (!platformById(id)) problems.push(`${p.id}: unknown platform "${id}"`);
    for (const id of p.defaults) {
      const f = featureById(id);
      if (!f) problems.push(`${p.id}: unknown feature "${id}"`);
      else if (!p.platforms.includes(f.platform.id)) problems.push(`${p.id}: default "${id}" is not on one of its platforms`);
    }
    if (p.available && !p.platforms.length) problems.push(`${p.id}: available but has no platforms`);
  }
  if (problems.length) throw new Error(`apps/web/lib/presets.ts: ${problems.join("; ")}`);
}
