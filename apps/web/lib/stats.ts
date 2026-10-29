import { countsAsOutreach, nonOutreachIds } from "@/lib/outreach";
import type { Campaign, City } from "@/lib/workspace";

export type Stats = { leads: number; outreached: number; converted: number };

/** Counts come straight from the sheet: a row with data is a lead, a labelled row was contacted. */
export function cityStats(city: City, tree?: unknown): Stats {
  // Account mode: until a sheet is opened its rows aren't downloaded, so use the server's counters.
  if (city.rows === undefined && city.stats) return city.stats;
  const leads = (city.rows ?? []).filter((r) => Object.keys(r).length > 0).length;
  const skip = nonOutreachIds(tree);
  const labels = Object.values(city.labels ?? {});
  return { leads, outreached: labels.filter((l) => countsAsOutreach(l, skip)).length, converted: labels.filter((l) => l === "converted").length };
}

export function campaignStats(campaign: Campaign): Stats {
  return campaign.domains.flatMap((d) => d.cities).reduce<Stats>(
    (a, c) => {
      const s = cityStats(c, campaign.labelTree);
      return { leads: a.leads + s.leads, outreached: a.outreached + s.outreached, converted: a.converted + s.converted };
    },
    { leads: 0, outreached: 0, converted: 0 },
  );
}

export const conversionRate = (s: Stats) => (s.outreached ? `${Math.round((s.converted / s.outreached) * 100)}%` : "—");

const DAYS = 14;
/** Per-person numbers: what the server recorded for that person (zeros until they've done something). */
export function memberStats(campaign: Campaign, userId: string | undefined): Stats {
  return (userId && campaign.serverStats?.perMember[userId]) || { leads: 0, outreached: 0, converted: 0 };
}

/** Outreach per day (oldest first), 14 days. */
export function memberOutreachPerDay(campaign: Campaign, userId: string | undefined): number[] {
  return (userId && campaign.serverStats?.perDay[userId]) || Array<number>(DAYS).fill(0);
}
