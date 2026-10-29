import "server-only";
import { col, type Lead, type Platform } from "@street-wolf/db";
import { newId } from "./crypto";
import { countsAsOutreach, nonOutreachIds } from "@/lib/outreach";
import { dayKey } from "./workspace";

export type Change = { row: number; cells: Record<string, string> | null; label: string | null };
const has = (c: Record<string, string> | null | undefined) => !!c && Object.keys(c).length > 0;

async function bumpDaily(campaignId: string, userId: string, d: { outreached: number; converted: number; leads: number }, day = dayKey()) {
  if (!d.outreached && !d.converted && !d.leads) return;
  await (await col("dailyStats")).updateOne(
    { _id: `${campaignId}:${userId}:${day}` },
    { $inc: d, $setOnInsert: { campaignId, userId, day } },
    { upsert: true },
  );
}

const isDup = (e: unknown) => (e as { code?: number }).code === 11000;

/**
 * Applies only the rows that changed (the browser diffs before sending), so editing one cell of a 20k-row sheet
 * writes one document.
 *
 * Why five people labelling the same sheet can't corrupt each other's numbers:
 *  1. Every row is one atomic findOneAndUpdate that hands back the row exactly as it was just before OUR write.
 *     Mongo serialises writes to one document, so two people touching the same row get two different "befores";
 *     the counters move by what each write actually changed, never by a stale read.
 *  2. A row counts as outreach (any label except "Didn't pick") for ONE person: whoever first made it so. That is
 *     an atomic claim (`outreachedBy` is set only if it isn't set yet), so a simultaneous label can't credit two people.
 *     Relabelling someone else's row (Interested -> Converted) is not new outreach. If the row goes back to
 *     "Didn't pick" or is cleared, the claim is released and the claimant's day is decremented, so per-person
 *     numbers always add up to the place total.
 *  3. Each person's day is their own calendar day (their timezone), so "today" resets at their midnight.
 */
export async function applyChanges(p: { campaignId: string; placeId: string; userId: string; tz?: string; changes: Change[] }) {
  const leads = await col("leads");
  const dailyStats = await col("dailyStats");
  const campaign = await (await col("campaigns")).findOne({ _id: p.campaignId }, { projection: { labelTree: 1 } });
  const skip = nonOutreachIds(campaign?.labelTree);
  const skipList = [...skip];
  const counts = (label: string | null | undefined) => countsAsOutreach(label, skip);
  const now = new Date();
  const today = dayKey(now, p.tz);

  const stat = { leads: 0, outreached: 0, converted: 0 };
  const daily = { leads: 0, outreached: 0, converted: 0 };
  const released = new Map<string, number>(); // `${userId}|${day}` -> claims taken back
  let applied = 0;
  let claimed = 0;
  const release = (by: string | undefined, day: string | undefined) => {
    if (by && day) released.set(`${by}|${day}`, (released.get(`${by}|${day}`) ?? 0) + 1);
  };

  const one = async (ch: Change) => {
    const filter = { placeId: p.placeId, row: ch.row };
    const nowHas = has(ch.cells);
    let old: Lead | null;
    if (!nowHas && !ch.label) {
      old = await leads.findOneAndDelete(filter);
      if (!old) return;
      release(old.outreachedBy, old.outreachedDay); // the row is gone, so is its claim
    } else {
      for (let attempt = 0; ; attempt++) {
        try {
          // Two people creating the same brand-new row race on the unique (place,row) index; the loser retries as an update.
          old = await leads.findOneAndUpdate(
            filter,
            {
              $set: { cells: ch.cells ?? {}, label: ch.label, updatedBy: p.userId, updatedAt: now },
              $setOnInsert: { _id: newId(), campaignId: p.campaignId, placeId: p.placeId, row: ch.row, source: "manual", sourceId: null, createdAt: now },
            },
            { upsert: true, returnDocument: "before" },
          );
          break;
        } catch (e) {
          if (!isDup(e) || attempt >= 3) throw e;
        }
      }
    }
    applied++;

    const oldOut = counts(old?.label);
    const newOut = counts(ch.label);
    stat.leads += +nowHas - +has(old?.cells);
    stat.outreached += +newOut - +oldOut;
    stat.converted += +(ch.label === "converted") - +(old?.label === "converted");
    daily.leads += +(nowHas && !has(old?.cells));
    daily.converted += +(ch.label === "converted" && old?.label !== "converted");

    if (newOut) {
      // Rows labelled before claims existed (outreach label, no claim) were already counted once; leave them be.
      const alreadyCounted = !!old?.outreachedBy || oldOut;
      if (!alreadyCounted) {
        // Only wins if nobody claimed it meanwhile AND the row still carries a counting label right now.
        const r = await leads.updateOne(
          { ...filter, outreachedBy: { $exists: false }, label: { $nin: [null, ...skipList] } },
          { $set: { outreachedBy: p.userId, outreachedAt: now, outreachedDay: today } },
        );
        if (r.modifiedCount) {
          daily.outreached++;
          claimed++;
        }
      }
    } else if (nowHas || ch.label) {
      // Row stays but no longer counts: take back whatever claim exists (only if it still carries a non-counting label).
      const gone = await leads.findOneAndUpdate(
        { ...filter, outreachedBy: { $exists: true }, label: { $in: [null, ...skipList] } },
        { $unset: { outreachedBy: "", outreachedAt: "", outreachedDay: "" } },
        { returnDocument: "before" },
      );
      if (gone) release(gone.outreachedBy, gone.outreachedDay);
    }
  };

  // Bounded parallelism: a paste of thousands of rows must not open thousands of simultaneous writes.
  for (let i = 0; i < p.changes.length; i += 50) await Promise.all(p.changes.slice(i, i + 50).map(one));

  if (stat.leads || stat.outreached || stat.converted) {
    await (await col("places")).updateOne({ _id: p.placeId }, { $inc: { "stats.leads": stat.leads, "stats.outreached": stat.outreached, "stats.converted": stat.converted }, $set: { updatedAt: now } });
  }
  await bumpDaily(p.campaignId, p.userId, daily, today);
  let takenBack = 0;
  for (const [key, n] of released) {
    const [by, day] = key.split("|");
    takenBack += n;
    // Never below zero, even if the day's row was lost or predates claims.
    await dailyStats.updateOne({ _id: `${p.campaignId}:${by}:${day}`, outreached: { $gte: n } }, { $inc: { outreached: -n } });
  }
  // The caller's count for today, so their screen updates immediately.
  const todayCount = claimed || takenBack ? ((await dailyStats.findOne({ _id: `${p.campaignId}:${p.userId}:${today}` }))?.outreached ?? 0) : null;
  return { applied, today: todayCount };
}

/** Rebuild a place's counters from its rows. The repair path if counters ever drift, and used after bulk imports. */
export async function recount(placeId: string) {
  const place = await (await col("places")).findOne({ _id: placeId }, { projection: { campaignId: 1 } });
  const campaign = place && (await (await col("campaigns")).findOne({ _id: place.campaignId }, { projection: { labelTree: 1 } }));
  const skip = [...nonOutreachIds(campaign?.labelTree)];
  const [r] = await (await col("leads")).aggregate<{ leads: number; outreached: number; converted: number }>([
    { $match: { placeId } },
    { $group: { _id: null, leads: { $sum: { $cond: [{ $gt: [{ $size: { $objectToArray: "$cells" } }, 0] }, 1, 0] } }, outreached: { $sum: { $cond: [{ $and: [{ $ne: [{ $ifNull: ["$label", null] }, null] }, { $not: [{ $in: ["$label", skip] }] }] }, 1, 0] } }, converted: { $sum: { $cond: [{ $eq: ["$label", "converted"] }, 1, 0] } } } },
  ]).toArray();
  const stats = { leads: r?.leads ?? 0, outreached: r?.outreached ?? 0, converted: r?.converted ?? 0 };
  await (await col("places")).updateOne({ _id: placeId }, { $set: { stats } });
  return stats;
}

export async function readSheet(placeId: string) {
  const docs = await (await col("leads")).find({ placeId }, { projection: { row: 1, cells: 1, label: 1 } }).sort({ row: 1 }).limit(200_000).toArray();
  const rows: Record<string, string>[] = [];
  const labels: Record<string, string> = {};
  for (const l of docs) {
    while (rows.length < l.row) rows.push({});
    rows[l.row] = l.cells;
    if (l.label) labels[String(l.row)] = l.label;
  }
  return { rows, labels };
}

/**
 * Append scraped leads (from the local scraper or a future Instagram/Reddit tool). Deduped on (source, sourceId),
 * so re-running a scrape updates rows instead of duplicating them. Returns how many were new.
 */
export async function ingestLeads(p: { campaignId: string; placeId: string; userId: string; source: Platform; items: { sourceId: string; cells: Record<string, string> }[] }) {
  // A person typing into the row just below the data can claim the row number we were about to use (the unique
  // (place, row) index refuses the second writer). Retry with fresh row numbers; rows that already landed then count as updates,
  // so the counters are rebuilt from the rows afterwards.
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await ingestOnce(p);
      if (attempt) await recount(p.placeId);
      return r;
    } catch (e) {
      const dup = (e as { code?: number; writeErrors?: { code?: number }[] }).code === 11000 || (e as { writeErrors?: { code?: number }[] }).writeErrors?.some((w) => w.code === 11000);
      if (!dup || attempt >= 4) throw e;
    }
  }
}

async function ingestOnce(p: { campaignId: string; placeId: string; userId: string; source: Platform; items: { sourceId: string; cells: Record<string, string> }[] }) {
  const leads = await col("leads");
  const known = new Set((await leads.find({ placeId: p.placeId, source: p.source, sourceId: { $in: p.items.map((i) => i.sourceId) } }, { projection: { sourceId: 1 } }).toArray()).map((l) => l.sourceId));
  const last = await leads.find({ placeId: p.placeId }, { projection: { row: 1 } }).sort({ row: -1 }).limit(1).next();
  let next = (last?.row ?? -1) + 1;
  const now = new Date();
  const ops: Parameters<typeof leads.bulkWrite>[0][number][] = [];
  let added = 0;
  const seen = new Set<string>();
  for (const it of p.items) {
    if (seen.has(it.sourceId)) continue; // duplicate inside the same batch
    seen.add(it.sourceId);
    if (known.has(it.sourceId)) {
      ops.push({ updateOne: { filter: { placeId: p.placeId, source: p.source, sourceId: it.sourceId }, update: { $set: { cells: it.cells, updatedAt: now } } } });
    } else {
      ops.push({ insertOne: { document: { _id: newId(), campaignId: p.campaignId, placeId: p.placeId, row: next++, cells: it.cells, label: null, source: p.source, sourceId: it.sourceId, updatedBy: p.userId, createdAt: now, updatedAt: now } as Lead } });
      added++;
    }
  }
  if (ops.length) await leads.bulkWrite(ops, { ordered: false });
  if (added) {
    await (await col("places")).updateOne({ _id: p.placeId }, { $inc: { "stats.leads": added }, $set: { updatedAt: now } });
    await bumpDaily(p.campaignId, p.userId, { leads: added, outreached: 0, converted: 0 });
  }
  return { added, updated: ops.length - added };
}
