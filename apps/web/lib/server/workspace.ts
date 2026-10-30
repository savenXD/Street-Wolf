import "server-only";
import { col, type Role } from "@street-wolf/db";
import { inviteUrl } from "./invites";

export const DAYS = 14;
export type Counts = { leads: number; outreached: number; converted: number };
const zero = (): Counts => ({ leads: 0, outreached: 0, converted: 0 });
const fmts = new Map<string, Intl.DateTimeFormat>();
/** YYYY-MM-DD of an instant in the given IANA zone (UTC when unknown or invalid). */
export function dayKey(d = new Date(), tz = "UTC") {
  try {
    let f = fmts.get(tz);
    if (!f) fmts.set(tz, (f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" })));
    return f.format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}
export const validTz = (tz: unknown): tz is string => {
  if (typeof tz !== "string" || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};
/** The last `n` calendar days ending today in `tz`, oldest first. Calendar arithmetic, so DST can't skip or repeat a day. */
export function lastDays(n: number, tz = "UTC") {
  const [y, m, d] = dayKey(new Date(), tz).split("-").map(Number);
  const base = Date.UTC(y, m - 1, d);
  return Array.from({ length: n }, (_, i) => new Date(base - (n - 1 - i) * 86400_000).toISOString().slice(0, 10));
}

/**
 * Everything the dashboard needs, in a fixed number of indexed queries (not one per campaign), no matter how many
 * campaigns the user has. Sheet rows are NOT included; they're fetched per place when a sheet opens.
 */
export async function loadWorkspace(userId: string, only?: string[]) {
  const [members, users, campaigns, invites, domains, places, daily] = [
    await col("members"),
    await col("users"),
    await col("campaigns"),
    await col("invites"),
    await col("domains"),
    await col("places"),
    await col("dailyStats"),
  ];
  const mine = await members.find({ userId, ...(only ? { campaignId: { $in: only } } : {}) }).toArray();
  const ids = mine.map((m) => m.campaignId);
  if (!ids.length) return [];
  const myRole = new Map<string, Role>(mine.map((m) => [m.campaignId, m.role]));

  const since = dayKey(new Date(Date.now() - (DAYS + 1) * 86400_000)); // one spare day: members in other zones start earlier
  const [cs, allMembers, pending, ds, ps, totals, recent] = await Promise.all([
    campaigns.find({ _id: { $in: ids } }).toArray(),
    members.find({ campaignId: { $in: ids } }).toArray(),
    invites.find({ campaignId: { $in: ids }, status: "pending", expiresAt: { $gt: new Date() } }).toArray(),
    domains.find({ campaignId: { $in: ids } }).sort({ position: 1 }).toArray(),
    places.find({ campaignId: { $in: ids } }).sort({ position: 1 }).toArray(),
    daily.aggregate<{ _id: { c: string; u: string } } & Counts>([
      { $match: { campaignId: { $in: ids } } },
      { $group: { _id: { c: "$campaignId", u: "$userId" }, leads: { $sum: "$leads" }, outreached: { $sum: "$outreached" }, converted: { $sum: "$converted" } } },
    ]).toArray(),
    daily.find({ campaignId: { $in: ids }, day: { $gte: since } }).toArray(),
  ]);
  const people = await users.find({ _id: { $in: [...new Set(allMembers.map((m) => m.userId))] } }, { projection: { name: 1, email: 1, avatarUrl: 1, tz: 1 } }).toArray();
  const person = new Map(people.map((u) => [u._id, u]));

  const by = <T extends { campaignId: string }>(rows: T[]) => {
    const m = new Map<string, T[]>();
    for (const r of rows) (m.get(r.campaignId) ?? m.set(r.campaignId, []).get(r.campaignId)!).push(r);
    return m;
  };
  const mMembers = by(allMembers), mPending = by(pending), mDomains = by(ds), mPlaces = by(ps), mRecent = by(recent);
  // Each person's chart runs on their own calendar days (their timezone), so "today" is today for them.
  const dayCache = new Map<string, string[]>();
  const daysFor = (uid: string) => {
    const tz = person.get(uid)?.tz ?? "UTC";
    return dayCache.get(tz) ?? dayCache.set(tz, lastDays(DAYS, tz)).get(tz)!;
  };

  return cs
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((c) => {
      const cp = mPlaces.get(c._id) ?? [];
      const perMember: Record<string, Counts> = {};
      for (const t of totals) if (t._id.c === c._id) perMember[t._id.u] = { leads: t.leads, outreached: t.outreached, converted: t.converted };
      const perDay: Record<string, number[]> = {};
      for (const m of mMembers.get(c._id) ?? []) perDay[m.userId] = Array<number>(DAYS).fill(0);
      for (const r of mRecent.get(c._id) ?? []) {
        const row = (perDay[r.userId] ??= Array<number>(DAYS).fill(0));
        const i = daysFor(r.userId).indexOf(r.day);
        if (i >= 0) row[i] += Math.max(0, r.outreached);
      }
      return {
        id: c._id,
        name: c.name,
        purpose: c.purpose,
        features: c.features,
        labelTree: c.labelTree ?? undefined,
        createdAt: c.createdAt.getTime(),
        myRole: myRole.get(c._id)!,
        ownerId: c.ownerId,
        members: (mMembers.get(c._id) ?? []).map((m) => {
          const u = person.get(m.userId);
          return { userId: m.userId, role: m.role, name: u?.name ?? "", email: u?.email ?? "", avatarUrl: u?.avatarUrl ?? null };
        }),
        invites: (mPending.get(c._id) ?? []).map((i) => ({
          id: i._id, email: i.email, role: i.role, at: i.createdAt.getTime(),
          // Only people who can invite get to copy the link.
          ...(i.token && myRole.get(c._id) !== "member" ? { link: inviteUrl(i.token) } : {}),
        })),
        team: (mPending.get(c._id) ?? []).map((i) => i.email),
        domains: (mDomains.get(c._id) ?? []).map((d) => ({
          id: d._id,
          name: d.name,
          image: d.image ?? undefined,
          cities: cp
            .filter((p) => p.domainId === d._id)
            .map((p) => ({ id: p._id, name: p.name, scrape: p.scrape ?? undefined, view: p.view ?? undefined, stats: p.stats })),
        })),
        stats: {
          totals: cp.reduce<Counts>((a, p) => ({ leads: a.leads + p.stats.leads, outreached: a.outreached + p.stats.outreached, converted: a.converted + p.stats.converted }), zero()),
          perMember,
          perDay,
        },
      };
    });
}

export async function unreadCount(userId: string) {
  return (await col("notifications")).countDocuments({ userId, readAt: null });
}
