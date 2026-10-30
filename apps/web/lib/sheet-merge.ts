// Pure helpers for keeping an open sheet in step with the server, cell by cell. No React, no network: easy to test.

export type Row = Record<string, string>;
/** One row's edit as the server takes it: only the cells and label the person changed (see lib/server/sheets.ts). */
export type Change = { row: number; set?: Row; unset?: string[]; label?: string | null; isNew?: boolean };
/** What the server is known to hold for one sheet. */
export type SheetBase = { baseRows: Row[]; baseLabels: Record<string, string> };

export const EMPTY: Row = {};
export const isEmpty = (r?: Row) => !r || Object.keys(r).length === 0;
export const sameRow = (a: Row | undefined, b: Row | undefined) => {
  if (a === b) return true;
  const x = a ?? EMPTY, y = b ?? EMPTY;
  const kx = Object.keys(x);
  return kx.length === Object.keys(y).length && kx.every((k) => x[k] === y[k]);
};
/** Cell-level difference of the screen's row against the server's. */
export function diffRow(cur: Row, base: Row): { set?: Row; unset?: string[] } {
  const set: Row = {};
  const unset: string[] = [];
  for (const k in cur) if (cur[k] !== base[k]) set[k] = cur[k];
  for (const k in base) if (!(k in cur)) unset.push(k);
  return { ...(Object.keys(set).length ? { set } : {}), ...(unset.length ? { unset } : {}) };
}
/**
 * Merges rows from the server into the open sheet. Cells and the label are merged one by one: what the person hasn't touched
 * takes the server's value; what they have typed and not yet saved stays theirs. If a teammate or a scrape filled a row the
 * person was typing into as a brand-new row, their data moves to a free row at the bottom instead of mixing with it.
 */
export function mergeRows(sh: SheetBase, city: { rows?: Row[]; labels?: Record<string, string> }, incoming: { row: number; cells: Row; label: string | null }[]) {
  const rows = [...(city.rows ?? [])];
  const labels = { ...(city.labels ?? {}) };
  let changed = false;
  const displaced: { cells: Row; label: string | null }[] = [];
  for (const x of incoming) {
    const i = x.row;
    const cur = rows[i] ?? EMPTY;
    const base = sh.baseRows[i] ?? EMPTY;
    const curLabel = labels[i] ?? null;
    const baseLabel = sh.baseLabels[i] ?? null;
    const cellsDirty = !sameRow(cur, base);
    const labelDirty = curLabel !== baseLabel;
    // A row the person is filling in as new (the server has nothing there as far as they know), now taken by someone else's data.
    const wasNew = isEmpty(base) && baseLabel === null && (cellsDirty || (labelDirty && curLabel !== null));
    let cells = x.cells;
    let label = x.label;
    if (wasNew && (!isEmpty(x.cells) || x.label !== null)) {
      displaced.push({ cells: cur, label: labelDirty ? curLabel : null });
    } else {
      if (cellsDirty) {
        cells = { ...x.cells };
        for (const k of new Set([...Object.keys(cur), ...Object.keys(base)])) {
          if (cur[k] === base[k]) continue;
          if (k in cur) cells[k] = cur[k];
          else delete cells[k];
        }
      }
      if (labelDirty) label = curLabel;
    }
    while (rows.length <= i) rows.push({});
    if (!sameRow(cells, cur)) {
      rows[i] = cells;
      changed = true;
    }
    if (label !== curLabel) {
      if (label) labels[i] = label;
      else delete labels[i];
      changed = true;
    }
    sh.baseRows[i] = x.cells;
    if (x.label) sh.baseLabels[i] = x.label;
    else delete sh.baseLabels[i];
  }
  if (displaced.length) {
    let last = rows.length - 1;
    while (last >= 0 && isEmpty(rows[last]) && !labels[last]) last--;
    for (const d of displaced) {
      const at = ++last;
      while (rows.length <= at) rows.push({});
      rows[at] = d.cells;
      if (d.label) labels[at] = d.label;
    }
    changed = true;
  }
  return { rows, labels, changed };
}

