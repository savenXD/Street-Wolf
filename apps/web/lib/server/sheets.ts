import "server-only";
import { after } from "next/server";
import { col, type Lead, type Platform } from "@street-wolf/db";
import { newId } from "./crypto";
import { HttpError } from "./http";
import { countsAsOutreach, nonOutreachIds } from "@/lib/outreach";
import { dayKey } from "./workspace";

/**
 * One row's edit, as the browser sends it. Only what the person actually changed travels:
 *  - `set` / `unset`: the cells they typed or cleared (never the whole row, so two people editing different cells of a row
 *    can't undo each other),
 *  - `label`: present only when they changed the label (undefined = leave whatever is there),
 *  - `isNew`: the browser believed this row was empty. The server then refuses to write into a row somebody else filled
 *    in the meantime (a scrape landing on the same row number) and moves the data to a free row instead.
 */
export type Change = { row: number; set?: Record<string, string>; unset?: string[]; label?: string | null; isNew?: boolean };
export const MAX_ROW = 199_999;

const has = (c: Record<string, string> | null | undefined) => !!c && Object.keys(c).length > 0;
/** Matches a row whose cells object is empty. */
const EMPTY_CELLS = { $eq: [{ $size: { $objectToArray: { $ifNull: ["$cells", {}] } } }, 0] };
type Update = Parameters<Awaited<ReturnType<typeof leadsCol>>["findOneAndUpdate"]>[1];
const leadsCol = () => col("leads");

async function bumpDaily(campaignId: string, userId: string, d: { outreached: number; converted: number; leads: number }, day = dayKey()) {
  if (!d.outreached && !d.converted && !d.leads) return;
  await (await col("dailyStats")).updateOne(
    { _id: `${campaignId}:${userId}:${day}` },
    { $inc: d, $setOnInsert: { campaignId, userId, day } },
    { upsert: true },
  );
}

const isDup = (e: unknown) => (e as { code?: number }).code === 11000;
const anyDup = (e: unknown) => isDup(e) || !!(e as { writeErrors?: { code?: number }[] }).writeErrors?.some((w) => w.code === 11000);

/** Two edits of the same row in one request become one, applied in order. */
function mergeChange(a: Change, b: Change): Change {
  const set = { ...a.set };
  const unset = new Set(a.unset);
  for (const [k, v] of Object.entries(b.set ?? {})) {
    set[k] = v;
    unset.delete(k);
  }
  for (const k of b.unset ?? []) {
    delete set[k];
    unset.add(k);
  }
  return { row: a.row, set, unset: [...unset], label: b.label !== undefined ? b.label : a.label, isNew: a.isNew };
}

/**
 * Applies the rows that changed (the browser diffs before sending), so editing one cell of a 20k-row sheet writes one field.
 *
 * Why five people working the same sheet can't corrupt each other:
 *  1. Edits are per field. A save from a screen that is a little behind only touches what that person changed; it can't put
 *     back an old label or an old value in a cell they never touched.
 *  2. Every row is one atomic findOneAndUpdate that hands back the row exactly as it was just before OUR write. Mongo
 *     serialises writes to one document, so two people touching the same row get two different "befores"; the counters move
 *     by what each write actually changed, never by a stale read.
 *  3. A row counts as outreach (any label except "Didn't pick") for ONE person: whoever first made it so. That is an atomic
 *     claim (`outreachedBy` is set only if it isn't set yet), so a simultaneous label can't credit two people. Relabelling
 *     someone else's row (Interested -> Converted) is not new outreach. If the row goes back to "Didn't pick" or is cleared,
 *     the claim is released and the claimant's day is decremented, so per-person numbers always add up to the place total.
 *  4. New rows are inserted, not upserted: the unique (place,row) index is the lock. If a scrape took that row number first,
 *     the person's data goes to the next free row and the browser is told where it went (`moved`).
 *  5. Each person's day is their own calendar day (their timezone), so "today" resets at their midnight.
 *  6. A row whose last cell and label are cleared stays as an empty row (no cells, no label, no scrape id). Teammates then
 *     learn about the deletion through live sync, and the same row number can be reused.
 */
export async function applyChanges(p: { campaignId: string; placeId: string; userId: string; tz?: string; changes: Change[] }) {
  const leads = await leadsCol();
  const dailyStats = await col("dailyStats");
  const campaign = await (await col("campaigns")).findOne({ _id: p.campaignId }, { projection: { labelTree: 1 } });
  const skip = nonOutreachIds(campaign?.labelTree);
  const skipList = [...skip];
  const counts = (label: string | null | undefined) => countsAsOutreach(label, skip);
  const today = dayKey(new Date(), p.tz);

  const stat = { leads: 0, outreached: 0, converted: 0 };
  const daily = { leads: 0, outreached: 0, converted: 0 };
  const released = new Map<string, number>(); // `${userId}|${day}` -> claims taken back
  let applied = 0;
  let claimed = 0;
  const release = (by: string | undefined, day: string | undefined) => {
    if (by && day) released.set(`${by}|${day}`, (released.get(`${by}|${day}`) ?? 0) + 1);
  };

  /** Writes one row's edit. "conflict" only happens for an insert whose row number is already in use by someone else's data. */
  const write = async (ch: Change, row: number, insert: boolean): Promise<"ok" | "conflict"> => {
    const set = ch.set ?? {};
    const setKeys = Object.keys(set);
    const unsetKeys = (ch.unset ?? []).filter((k) => !(k in set));
    const hasLabel = ch.label !== undefined;
    const filter = { placeId: p.placeId, row };
    const edited = [...setKeys, ...unsetKeys];

    const patch = (): Update => {
      const $set: Record<string, unknown> = { updatedBy: p.userId, updatedAt: new Date() };
      for (const k of setKeys) $set[`cells.${k}`] = set[k];
      if (hasLabel) $set.label = ch.label;
      const u: Record<string, unknown> = { $set };
      if (unsetKeys.length) u.$unset = Object.fromEntries(unsetKeys.map((k) => [`cells.${k}`, ""]));
      if (edited.length) u.$addToSet = { edited: { $each: edited } };
      return u as Update;
    };

    let old: Lead | null = null;
    if (insert) {
      const now = new Date();
      try {
        await leads.insertOne({ _id: newId(), campaignId: p.campaignId, placeId: p.placeId, row, cells: set, label: hasLabel ? (ch.label ?? null) : null, source: "manual", sourceId: null, updatedBy: p.userId, ...(edited.length ? { edited } : {}), createdAt: now, updatedAt: now } as Lead);
      } catch (e) {
        if (!isDup(e)) throw e;
        // The number is taken. An emptied row is free to reuse; anything with data in it belongs to someone else.
        old = await leads.findOneAndUpdate({ ...filter, label: null, $expr: EMPTY_CELLS } as never, patch(), { returnDocument: "before" });
        if (!old) {
          // A retry of a save whose answer got lost: the row is already exactly what this person wrote. Not a collision.
          const mine = await leads.findOne(filter);
          const same = !!mine && mine.source === "manual" && mine.updatedBy === p.userId && Object.entries(set).every(([k, v]) => mine.cells?.[k] === v) && (!hasLabel || (mine.label ?? null) === (ch.label ?? null));
          return same ? "ok" : "conflict";
        }
      }
    } else {
      // Brand-new rows need cells (a label alone is allowed too); an unset-only edit of a row that no longer exists is a no-op.
      const upsert = setKeys.length > 0 || (hasLabel && ch.label !== null && unsetKeys.length === 0);
      const base = patch();
      const update = upsert
        ? ({ ...base, $setOnInsert: { _id: newId(), campaignId: p.campaignId, placeId: p.placeId, row, source: "manual", sourceId: null, createdAt: new Date(), ...(setKeys.length ? {} : { cells: {} }), ...(hasLabel ? {} : { label: null }) } } as Update)
        : base;
      for (let attempt = 0; ; attempt++) {
        try {
          // Two people creating the same brand-new row race on the unique (place,row) index; the loser retries as an update.
          old = await leads.findOneAndUpdate(filter, update, { upsert, returnDocument: "before" });
          break;
        } catch (e) {
          if (!isDup(e) || attempt >= 3) throw e;
        }
      }
      if (!old && !upsert) {
        // The cells they were clearing are gone already; a label they set still has to land.
        if (hasLabel && ch.label !== null) return write({ ...ch, unset: undefined }, row, false);
        return "ok";
      }
    }
    applied++;

    const afterCells = { ...(old?.cells ?? {}), ...set };
    for (const k of unsetKeys) delete afterCells[k];
    const afterLabel = hasLabel ? (ch.label ?? null) : (old?.label ?? null);
    const nowHas = has(afterCells);
    const oldOut = counts(old?.label);
    const newOut = counts(afterLabel);

    stat.leads += +nowHas - +has(old?.cells);
    stat.outreached += +newOut - +oldOut;
    stat.converted += +(afterLabel === "converted") - +(old?.label === "converted");
    daily.leads += +(nowHas && !has(old?.cells));
    daily.converted += +(afterLabel === "converted" && old?.label !== "converted");

    if (newOut) {
      // Rows labelled before claims existed (outreach label, no claim) were already counted once; leave them be.
      const alreadyCounted = !!old?.outreachedBy || oldOut;
      if (!alreadyCounted) {
        // Only wins if nobody claimed it meanwhile AND the row still carries a counting label right now.
        const r = await leads.updateOne({ ...filter, outreachedBy: { $exists: false }, label: { $nin: [null, ...skipList] } } as never, { $set: { outreachedBy: p.userId, outreachedAt: new Date(), outreachedDay: today } });
        if (r.modifiedCount) {
          daily.outreached++;
          claimed++;
        }
      }
    } else if (old?.outreachedBy) {
      // The row no longer counts: take back its claim (only if it still carries a non-counting label).
      const gone = await leads.findOneAndUpdate(
        { ...filter, outreachedBy: { $exists: true }, label: { $in: [null, ...skipList] } } as never,
        { $unset: { outreachedBy: "", outreachedAt: "", outreachedDay: "" } },
        { returnDocument: "before" },
      );
      if (gone) release(gone.outreachedBy, gone.outreachedDay);
    }

    // Emptied out: it is no lead any more, so a re-scrape may add that business again and the edit history goes.
    if (!nowHas && afterLabel === null && old && (old.sourceId != null || old.source !== "manual" || old.edited?.length)) {
      await leads.updateOne({ ...filter, label: null, $expr: EMPTY_CELLS } as never, { $set: { source: "manual", sourceId: null }, $unset: { edited: "" } });
    }
    return "ok";
  };

  const byRow = new Map<number, Change>();
  for (const c of p.changes) byRow.set(c.row, byRow.has(c.row) ? mergeChange(byRow.get(c.row)!, c) : c);
  const changes = [...byRow.values()];
  const conflicts: Change[] = [];
  const moved: { from: number; to: number }[] = [];

  try {
    // Bounded parallelism: a paste of thousands of rows must not open thousands of simultaneous writes.
    for (let i = 0; i < changes.length; i += 50) {
      await Promise.all(changes.slice(i, i + 50).map(async (ch) => {
        if ((await write(ch, ch.row, !!ch.isNew)) === "conflict") conflicts.push(ch);
      }));
    }

    // Rows whose number a scrape (or a teammate) took first: their data moves to free rows below the sheet, one at a time.
    if (conflicts.length) {
      const lastRow = async () => ((await leads.find({ placeId: p.placeId }, { projection: { row: 1 } }).sort({ row: -1 }).limit(1).next())?.row ?? -1) + 1;
      let next = await lastRow();
      for (const ch of conflicts.sort((a, b) => a.row - b.row)) {
        for (let tries = 0; ; tries++) {
          if (next > MAX_ROW) throw new HttpError(409, "This sheet is full", "sheet_full");
          if ((await write(ch, next, true)) === "ok") {
            moved.push({ from: ch.row, to: next++ });
            break;
          }
          if (tries >= 8) throw new HttpError(409, "The sheet is changing too fast. Try again.", "conflict");
          next = await lastRow();
        }
      }
    }
  } finally {
    // Counters move even if the request dies halfway, for the rows that were really written. If that write itself fails,
    // the place is rebuilt from its rows in the background so the numbers can't stay wrong.
    try {
      if (stat.leads || stat.outreached || stat.converted) {
        await (await col("places")).updateOne({ _id: p.placeId }, { $inc: { "stats.leads": stat.leads, "stats.outreached": stat.outreached, "stats.converted": stat.converted }, $set: { updatedAt: new Date() } });
      }
      await bumpDaily(p.campaignId, p.userId, daily, today);
    } catch {
      repairLater(p.placeId);
    }
  }

  let takenBack = 0;
  for (const [key, n] of released) {
    const [by, day] = key.split("|");
    takenBack += n;
    // Never below zero, even if the day's row was lost or predates claims.
    await dailyStats.updateOne({ _id: `${p.campaignId}:${by}:${day}`, outreached: { $gte: n } }, { $inc: { outreached: -n } });
  }
  // The caller's count for today, so their screen updates immediately.
  const todayCount = claimed || takenBack ? ((await dailyStats.findOne({ _id: `${p.campaignId}:${p.userId}:${today}` }))?.outreached ?? 0) : null;
  return { applied, today: todayCount, moved };
}

/** Rebuild a place's counters in the background (after the response when we're inside a request). */
function repairLater(placeId: string) {
  const run = () => recount(placeId).catch(() => undefined);
  try {
    after(run);
  } catch {
    void run();
  }
}

/** Rebuild a place's counters from its rows. The repair path if counters ever drift, and used after bulk imports. */
export async function recount(placeId: string) {
  const place = await (await col("places")).findOne({ _id: placeId }, { projection: { campaignId: 1 } });
  const campaign = place && (await (await col("campaigns")).findOne({ _id: place.campaignId }, { projection: { labelTree: 1 } }));
  const skip = [...nonOutreachIds(campaign?.labelTree)];
  const [r] = await (await leadsCol()).aggregate<{ leads: number; outreached: number; converted: number }>([
    { $match: { placeId } },
    { $group: { _id: null, leads: { $sum: { $cond: [{ $gt: [{ $size: { $objectToArray: "$cells" } }, 0] }, 1, 0] } }, outreached: { $sum: { $cond: [{ $and: [{ $ne: [{ $ifNull: ["$label", null] }, null] }, { $not: [{ $in: ["$label", skip] }] }] }, 1, 0] } }, converted: { $sum: { $cond: [{ $eq: ["$label", "converted"] }, 1, 0] } } } },
  ]).toArray();
  const stats = { leads: r?.leads ?? 0, outreached: r?.outreached ?? 0, converted: r?.converted ?? 0 };
  await (await col("places")).updateOne({ _id: placeId }, { $set: { stats } });
  return stats;
}

/**
 * Takes the outreach credit back from rows that are going away (or no longer count) and subtracts it from the people's days,
 * so the per-person numbers keep adding up to the totals. `unset` also clears the claim on rows that stay.
 */
async function dropClaims(campaignId: string, match: Record<string, unknown>, unset: boolean) {
  const leads = await leadsCol();
  const dailyStats = await col("dailyStats");
  const filter = { ...match, outreachedBy: { $exists: true } } as never;
  const groups = await leads.aggregate<{ _id: { by: string; day: string }; n: number }>([{ $match: filter }, { $group: { _id: { by: "$outreachedBy", day: "$outreachedDay" }, n: { $sum: 1 } } }]).toArray();
  for (const g of groups) await dailyStats.updateOne({ _id: `${campaignId}:${g._id.by}:${g._id.day}`, outreached: { $gte: g.n } }, { $inc: { outreached: -g.n } });
  if (unset) await leads.updateMany(filter, { $unset: { outreachedBy: "", outreachedAt: "", outreachedDay: "" } });
}

/**
 * Deletes every lead on these sheets in slices of 5,000, so no single operation is huge (no long write lock, no replication spike)
 * and a request that is cut off can simply be repeated: it carries on where it stopped.
 */
export async function purgeLeads(placeIds: string[]) {
  if (!placeIds.length) return;
  const leads = await leadsCol();
  for (;;) {
    const ids = (await leads.find({ placeId: { $in: placeIds } }, { projection: { _id: 1 } }).limit(5000).toArray()).map((d) => d._id);
    if (!ids.length) return;
    await leads.deleteMany({ _id: { $in: ids } });
  }
}

/** Call before deleting places/domains/campaign leads. */
export const releasePlaces = (campaignId: string, placeIds: string[]) => (placeIds.length ? dropClaims(campaignId, { placeId: { $in: placeIds } }, false) : Promise.resolve());

/**
 * After the label tree changed what counts as outreach: rows that no longer count lose their claim (and the person's day goes
 * down), then every sheet's counters are rebuilt from its rows.
 */
export async function repairCampaign(campaignId: string) {
  const campaign = await (await col("campaigns")).findOne({ _id: campaignId }, { projection: { labelTree: 1 } });
  const skipList = [...nonOutreachIds(campaign?.labelTree)];
  const places = await (await col("places")).find({ campaignId }, { projection: { _id: 1 } }).toArray();
  for (const pl of places) {
    await dropClaims(campaignId, { placeId: pl._id, $or: [{ label: null }, { label: { $in: skipList } }] }, true);
    await recount(pl._id);
  }
  return places.length;
}

/** Everything on the sheet in one pass, plus the true counters computed from those same rows (so they can self-heal). */
export async function readSheet(placeId: string, skip: Set<string> = new Set(["no-pick"])) {
  const LIMIT = 200_000;
  const docs = await (await leadsCol()).find({ placeId }, { projection: { row: 1, cells: 1, label: 1 } }).sort({ row: 1 }).limit(LIMIT).toArray();
  const rows: Record<string, string>[] = [];
  const labels: Record<string, string> = {};
  const counts = { leads: 0, outreached: 0, converted: 0 };
  for (const l of docs) {
    const filled = has(l.cells);
    if (!filled && !l.label) continue; // an emptied row
    while (rows.length < l.row) rows.push({});
    rows[l.row] = l.cells;
    if (filled) counts.leads++;
    if (l.label) {
      labels[String(l.row)] = l.label;
      if (!skip.has(l.label)) counts.outreached++;
      if (l.label === "converted") counts.converted++;
    }
  }
  return { rows, labels, counts, complete: docs.length < LIMIT };
}

/**
 * Append scraped leads (from the local scraper or a future Instagram/Reddit tool). Deduped on (source, sourceId),
 * so re-running a scrape updates rows instead of duplicating them, and a business already on another city's sheet in the same
 * niche (domain) is skipped. Returns how many were new, updated and skipped.
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
      if (!anyDup(e) || attempt >= 4) throw e;
    }
  }
}

/** The other sheets (cities) in this sheet's niche. A business belongs to one of them, never two. */
export async function siblingPlaceIds(campaignId: string, placeId: string): Promise<string[]> {
  const places = await col("places");
  const me = await places.findOne({ _id: placeId, campaignId }, { projection: { domainId: 1 } });
  if (!me) return [];
  return (await places.find({ campaignId, domainId: me.domainId, _id: { $ne: placeId } }, { projection: { _id: 1 } }).toArray()).map((x) => x._id);
}

async function ingestOnce(p: { campaignId: string; placeId: string; userId: string; source: Platform; items: { sourceId: string; cells: Record<string, string> }[] }) {
  const leads = await leadsCol();
  const known = new Map(
    (await leads.find({ placeId: p.placeId, source: p.source, sourceId: { $in: p.items.map((i) => i.sourceId), $type: "string" } }, { projection: { sourceId: 1, edited: 1 } }).toArray()).map((l) => [l.sourceId as string, new Set(l.edited ?? [])]),
  );
  // Both lookups say `$type: "string"` on purpose: that is what lets MongoDB use the (place, source, sourceId) index, which only holds string ids.
  // Without it the query walks every lead on the sheet(s) for each batch (measured: ~150 ms and 95,000 documents read vs ~3 ms and none).
  // A business already on another city's sheet in this niche is not added again. (Not atomic across two scrapes running at the
  // same moment on different cities; the scrape that reaches the business first wins, the rest see it and skip.)
  const siblings = await siblingPlaceIds(p.campaignId, p.placeId);
  const elsewhere = new Set<string>(
    siblings.length
      ? (await leads.find({ placeId: { $in: siblings }, source: p.source, sourceId: { $in: p.items.map((i) => i.sourceId).filter((id) => !known.has(id)), $type: "string" } }, { projection: { sourceId: 1 } }).toArray()).map((l) => l.sourceId as string)
      : [],
  );
  const last = await leads.find({ placeId: p.placeId }, { projection: { row: 1 } }).sort({ row: -1 }).limit(1).next();
  let next = (last?.row ?? -1) + 1;
  const now = new Date();
  const ops: Parameters<typeof leads.bulkWrite>[0][number][] = [];
  let added = 0;
  let skipped = 0;
  const seen = new Set<string>();
  for (const it of p.items) {
    if (seen.has(it.sourceId)) continue; // duplicate inside the same batch
    seen.add(it.sourceId);
    if (elsewhere.has(it.sourceId)) {
      skipped++;
      continue;
    }
    const edited = known.get(it.sourceId);
    if (edited) {
      // Refresh what the scraper owns. A cell a person typed or cleared by hand stays exactly as they left it.
      const $set: Record<string, unknown> = { updatedAt: now };
      for (const [k, v] of Object.entries(it.cells)) if (!edited.has(k)) $set[`cells.${k}`] = v;
      ops.push({ updateOne: { filter: { placeId: p.placeId, source: p.source, sourceId: it.sourceId }, update: { $set } as never } });
    } else {
      if (next > MAX_ROW) throw new HttpError(409, "This sheet is full", "sheet_full");
      ops.push({ insertOne: { document: { _id: newId(), campaignId: p.campaignId, placeId: p.placeId, row: next++, cells: it.cells, label: null, source: p.source, sourceId: it.sourceId, updatedBy: p.userId, createdAt: now, updatedAt: now } as Lead } });
      added++;
    }
  }
  if (ops.length) await leads.bulkWrite(ops, { ordered: false });
  if (added) {
    await (await col("places")).updateOne({ _id: p.placeId }, { $inc: { "stats.leads": added }, $set: { updatedAt: now } });
    await bumpDaily(p.campaignId, p.userId, { leads: added, outreached: 0, converted: 0 });
  }
  return { added, updated: ops.length - added, skipped };
}
