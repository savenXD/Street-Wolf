"use client";

import { Check, ChevronRight, Copy, Download, GripVertical, Smartphone, Upload, SlidersHorizontal, Tags } from "lucide-react";
import Link from "next/link";
import { AnimatePresence } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { BrandIcon } from "@/components/brand-icon";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { defaultTree, labelById, layout } from "@/lib/labels";
import { fieldByKey, fieldGroups, type ScrapeConfig } from "@/lib/maps-fields";
import { nonOutreachIds } from "@/lib/outreach";
import { cn } from "@/lib/utils";
import { LoadBar } from "@/components/ui/load-bar";
import { type Campaign, type City, type Domain, useWorkspace } from "@/lib/workspace";
import { parseCsv, toCsv } from "@/lib/csv";
import { CsvImport, type ImportMode, type ImportRecord } from "./csv-import";
import { LabelChip } from "./label-chip";
import { LabelEditor } from "./label-editor";
import { LabelGraph } from "./label-graph";
import { ScrapeBar } from "./scrape-bar";
import { ScrapeDrawer } from "./scrape-drawer";

const MIN_ROWS = 40;
/** The server's limits (apps/web/lib/server/sheets.ts, the sheet route): longer cells or later rows are refused. */
const MAX_CELL = 5000;
const MAX_ROW = 199_999;
/** Only the rows on screen (plus a margin) are in the page; a 1,500-row sheet is ~60 rows of DOM, not 1,500. */
const OVERSCAN = 12;
const ROW_H = 36;
const HEAD_H = 72;
const ROW_NUM_W = 48;
const MIN_W = 64;
const blankKeys = ["c1", "c2", "c3", "c4", "c5"];
const catalogOrder = fieldGroups.flatMap((g) => g.fields.map((f) => f.key));

type Row = Record<string, string>;
type Pos = [number, number];
/** What undo/redo restores: the cells, the labels and the column order. */
type Snap = { rows: Row[]; labels: Record<string, string>; order: string[] };

const letter = (i: number) => (i < 26 ? String.fromCharCode(65 + i) : String.fromCharCode(64 + Math.floor(i / 26)) + String.fromCharCode(65 + (i % 26)));
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function MapsSheet({ id, domainId, cityId }: { id: string; domainId: string; cityId: string }) {
  const { ready, campaigns, account, loadSheet } = useWorkspace();
  const campaign = campaigns.find((c) => c.id === id);
  const domain = campaign?.domains.find((d) => d.id === domainId);
  const city = domain?.cities.find((c) => c.id === cityId);

  // Account mode: rows live on the server and are fetched when a sheet opens.
  useEffect(() => {
    if (ready && account && city && !city.loaded) void loadSheet(id, domainId, cityId);
  }, [ready, account, city, id, domainId, cityId, loadSheet]);

  if (!ready) return <LoadBar />;
  if (!campaign || !domain || !city) {
    return (
      <div className="px-6 py-10">
        <Link href={`/dashboard/maps/${id}`} className="text-sm text-neutral-500 hover:text-neutral-950">← Back to Google Maps</Link>
        <p className="mt-6 text-neutral-500">This sheet no longer exists.</p>
      </div>
    );
  }
  // The page frame is real from the first moment; only the leads are placeholders until they arrive.
  if (account && !city.loaded) {
    return (
      <div className="flex w-full flex-1 flex-col px-6 pb-6">
        <nav className="mt-4 flex flex-wrap items-center gap-1.5 text-sm text-neutral-500">
          <Link href={`/dashboard/maps/${id}`} className="flex items-center gap-1.5 hover:text-neutral-950">
            <BrandIcon name="googlemaps" colored className="size-4" /> Google Maps
          </Link>
          <ChevronRight className="size-3.5" />
          <span>{domain.name}</span>
          <ChevronRight className="size-3.5" />
          <span className="font-medium text-neutral-950">{city.name}</span>
        </nav>
        <h1 className="mt-4 font-brand text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
          {domain.name} <span className="text-neutral-400">in</span> {city.name}
        </h1>
        <LoadBar />
      </div>
    );
  }
  return <SheetView id={id} domainId={domainId} cityId={cityId} campaign={campaign} domain={domain} city={city} />;
}

function SheetView({ id, domainId, cityId, campaign, domain, city }: { id: string; domainId: string; cityId: string; campaign: Campaign; domain: Domain; city: City }) {
  const { setScrape, setSheet, setLabelTree, syncSheet } = useWorkspace();
  const [editingLabels, setEditingLabels] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [setupKey, setSetupKey] = useState(0);
  // Columns the person removed in the setup drawer, waiting for a "yes, delete their data".
  const [dropAsk, setDropAsk] = useState<{ config: ScrapeConfig; dropped: string[]; withData: string[] } | null>(null);
  const openFields = useRef<string[]>([]);
  const [picker, setPicker] = useState<{ row: number; rect: DOMRect } | null>(null);
  // Selection: `a` is the anchor (where typing goes), `f` is the other corner of the range.
  const [sel, setSel] = useState<{ a: Pos; f: Pos }>({ a: [0, 0], f: [0, 0] });
  const [editing, setEditingState] = useState<Pos | null>(null);
  const [draft, setDraft] = useState("");
  const [resize, setResize] = useState<{ key: string; w: number } | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [csv, setCsv] = useState<{ name: string; data: string[][] } | null>(null);
  const editRef = useRef<Pos | null>(null);
  const dragging = useRef(false);
  const keyNav = useRef(false);
  const undo = useRef<Snap[]>([]);
  const redo = useRef<Snap[]>([]);
  // Virtual scrolling: what part of the sheet is on screen, and the real height of a row and of the header (measured, not assumed).
  const [view, setView] = useState({ top: 0, h: 900 });
  const [rowH, setRowH] = useState(ROW_H);
  const [headH, setHeadH] = useState(HEAD_H);
  const frame = useRef(0);

  // Teammates' edits and labels reach this sheet every few seconds. (With a scrape set up, the scrape bar does the polling, faster while it runs.)
  const hasScrape = !!city.scrape;
  useEffect(() => {
    const pull = () => document.visibilityState === "visible" && void syncSheet(id, domainId, cityId).catch(() => undefined);
    const t = hasScrape ? undefined : setInterval(pull, 5000);
    document.addEventListener("visibilitychange", pull);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", pull);
    };
  }, [hasScrape, syncSheet, id, domainId, cityId]);

  // Rows pushed in by a live scrape would be wiped by an old undo snapshot, so history restarts when they arrive.
  useEffect(() => {
    undo.current = [];
    redo.current = [];
  }, [city.syncTick]);

  const cfg = city.scrape;
  // Data columns are whatever was picked in the scrape setup (blank before that), in the user's order. Column A is always Label.
  const base = cfg ? catalogOrder.filter((k) => cfg.fields.includes(k)) : blankKeys;
  const saved = city.view?.order ?? [];
  const keys = [...saved.filter((k) => base.includes(k)), ...base.filter((k) => !saved.includes(k))];
  const cols = [{ key: "label", label: "Label" }, ...keys.map((k) => ({ key: k, label: cfg ? (fieldByKey(k)?.label ?? k) : "" }))];
  const colCount = cols.length;
  const rows = useMemo(() => city.rows ?? [], [city.rows]);
  const labels = useMemo(() => city.labels ?? {}, [city.labels]);
  const tree = campaign.labelTree ?? defaultTree;
  const total = Math.max(MIN_ROWS, rows.length + 5);
  const leadCount = useMemo(() => rows.reduce((n, r) => n + (Object.keys(r).length > 0 ? 1 : 0), 0), [rows]);
  // Same rule as the server: any label except "Didn't pick" is outreach. Counted from the labels on screen, so it moves as you work.
  const outreached = useMemo(() => {
    const skip = nonOutreachIds(tree);
    return Object.values(labels).reduce((n, l) => n + (skip.has(l) ? 0 : 1), 0);
  }, [labels, tree]);
  const widthOf = (k: string) => (resize?.key === k ? resize.w : (city.view?.widths?.[k] ?? (k === "label" ? 224 : 176)));
  const tableW = ROW_NUM_W + cols.reduce((n, c) => n + widthOf(c.key), 0);

  const [r1, r2] = [Math.min(sel.a[0], sel.f[0]), Math.max(sel.a[0], sel.f[0])];
  const [c1, c2] = [Math.min(sel.a[1], sel.f[1]), Math.max(sel.a[1], sel.f[1])];
  const single = r1 === r2 && c1 === c2;

  const setEditing = (p: Pos | null) => {
    editRef.current = p;
    setEditingState(p);
  };
  const cellText = (r: number, c: number) => (c === 0 ? (labelById(tree, labels[r])?.name ?? "") : (rows[r]?.[cols[c].key] ?? ""));

  // Every change goes through here so it can be undone.
  const snap = (): Snap => ({ rows, labels, order: keys });
  const apply = (s: Partial<Snap>) => setSheet(id, domainId, cityId, { rows: s.rows, labels: s.labels, view: s.order ? { order: s.order } : undefined });
  const commit = (s: Partial<Snap>) => {
    undo.current.push(snap());
    if (undo.current.length > 100) undo.current.shift();
    redo.current = [];
    apply(s);
  };
  const stepHistory = (from: Snap[], to: Snap[]) => {
    const s = from.pop();
    if (!s) return;
    to.push(snap());
    apply(s);
    setEditing(null);
  };

  /** Rows with the given cells set ("" clears), trailing empty rows trimmed. */
  const withCells = (edits: { r: number; key: string; v: string }[]) => {
    const next = rows.slice();
    const copied = new Set<number>(); // only the rows that change are copied; the rest keep their identity
    for (const e of edits) {
      if (e.r > MAX_ROW) continue;
      while (next.length <= e.r) next.push({});
      if (!copied.has(e.r)) {
        next[e.r] = { ...next[e.r] };
        copied.add(e.r);
      }
      if (e.v) next[e.r][e.key] = e.v.slice(0, MAX_CELL);
      else delete next[e.r][e.key];
    }
    while (next.length && Object.keys(next[next.length - 1]).length === 0) next.pop();
    return next;
  };

  const clearRange = () => {
    const edits: { r: number; key: string; v: string }[] = [];
    const nextLabels = { ...labels };
    for (let r = r1; r <= r2; r++)
      for (let c = c1; c <= c2; c++) {
        if (c === 0) delete nextLabels[r];
        else edits.push({ r, key: cols[c].key, v: "" });
      }
    commit({ rows: withCells(edits), labels: nextLabels });
  };

  /**
   * The setup drawer saves as you go, so unticking a field only hides its column. Once the drawer is closed, columns that
   * were removed are deleted for real, from every lead and the database, but only after an explicit yes.
   */
  const finishSetup = (c: ScrapeConfig) => {
    const dropped = openFields.current.filter((f) => !c.fields.includes(f));
    openFields.current = c.fields;
    if (!dropped.length) return;
    const withData = dropped.filter((k) => rows.some((r) => r[k]));
    if (withData.length) setDropAsk({ config: c, dropped, withData });
    else setScrape(id, domainId, cityId, c, dropped);
  };

  const keepColumns = () => {
    if (dropAsk) setScrape(id, domainId, cityId, { ...dropAsk.config, fields: [...new Set([...dropAsk.config.fields, ...dropAsk.dropped])] });
    setDropAsk(null);
  };

  const setRowLabel = (r: number, l: string | null) => {
    const next = { ...labels };
    if (l) next[r] = l;
    else delete next[r];
    commit({ labels: next });
  };

  const startEdit = (r: number, c: number, initial?: string) => {
    if (c === 0) return;
    setDraft(initial ?? cellText(r, c));
    setEditing([r, c]);
  };
  const finishEdit = (save: boolean) => {
    const e = editRef.current;
    if (!e) return;
    setEditing(null);
    if (save && draft !== cellText(e[0], e[1])) commit({ rows: withCells([{ r: e[0], key: cols[e[1]].key, v: draft }]) });
  };

  const importRecords = (records: ImportRecord[], mode: ImportMode) => {
    const byName = layout(tree).nodes;
    const nextRows: Row[] = mode === "add" ? rows.slice() : [];
    const nextLabels: Record<string, string> = mode === "add" ? { ...labels } : {};
    const start = nextRows.length;
    records.slice(0, Math.max(0, MAX_ROW + 1 - start)).forEach((rec, i) => {
      nextRows.push({ ...rec.values });
      const hit = rec.label ? byName.find((n) => n.name.toLowerCase() === rec.label!.toLowerCase()) : undefined;
      if (hit) nextLabels[start + i] = hit.id;
    });
    commit({ rows: nextRows, labels: nextLabels });
    setCsv(null);
    setSel({ a: [start, 1], f: [start, 1] });
  };

  const exportCsv = () => {
    const last = Object.keys(labels).reduce((m, k) => Math.max(m, Number(k) + 1), rows.length);
    const table = [cols.map((c, i) => c.label || letter(i))];
    for (let r = 0; r < last; r++) table.push(cols.map((_, c) => cellText(r, c)));
    const url = URL.createObjectURL(new Blob(["\uFEFF" + toCsv(table)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${domain.name} in ${city.name}.csv`.replace(/[\\/:*?"<>|]/g, "-");
    a.click();
    URL.revokeObjectURL(url);
  };

  const closePicker = () => {
    setPicker(null);
    grid.current?.focus();
  };
  const openPicker = (r: number) => {
    const el = grid.current?.querySelector<HTMLElement>(`[data-cell="${r}-0"]`);
    if (el) setPicker({ row: r, rect: el.getBoundingClientRect() });
  };

  const go = (dr: number, dc: number, extend: boolean) => {
    const from = extend ? sel.f : sel.a;
    const to: Pos = [clamp(from[0] + dr, 0, total - 1), clamp(from[1] + dc, 0, colCount - 1)];
    setSel(extend ? { a: sel.a, f: to } : { a: to, f: to });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (editing) return;
    keyNav.current = true;
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    if (mod && k === "a") {
      e.preventDefault();
      setSel({ a: [0, 0], f: [total - 1, colCount - 1] });
    } else if (mod || e.altKey) {
      return; // copy, cut and paste arrive as clipboard events
    } else if (e.key.startsWith("Arrow") || e.key === "Tab") {
      e.preventDefault();
      const d: Record<string, Pos> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1], Tab: [0, e.shiftKey ? -1 : 1] };
      go(d[e.key][0], d[e.key][1], e.shiftKey && e.key !== "Tab");
    } else if (e.key === "Enter" || e.key === "F2") {
      e.preventDefault();
      if (sel.a[1] === 0) openPicker(sel.a[0]);
      else startEdit(sel.a[0], sel.a[1]);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      clearRange();
    } else if (e.key === "Escape") {
      setSel({ a: sel.a, f: sel.a });
    } else if (e.key.length === 1 && sel.a[1] !== 0) {
      e.preventDefault();
      startEdit(sel.a[0], sel.a[1], e.key); // typing replaces the cell, like a spreadsheet
    }
  };

  const onCopy = (e: React.ClipboardEvent) => {
    if (editing) return;
    e.preventDefault();
    const lines: string[] = [];
    for (let r = r1; r <= r2; r++) lines.push(Array.from({ length: c2 - c1 + 1 }, (_, i) => cellText(r, c1 + i)).join("\t"));
    e.clipboardData.setData("text/plain", lines.join("\n"));
  };
  const onCut = (e: React.ClipboardEvent) => {
    if (editing) return;
    onCopy(e);
    clearRange();
  };
  const onPaste = (e: React.ClipboardEvent) => {
    if (editing) return;
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain").replace(/\r/g, "").replace(/\n$/, "");
    if (!text) return;
    let block = text.split("\n").map((l) => l.split("\t"));
    // One value pasted over a bigger selection fills the whole selection.
    if (block.length === 1 && block[0].length === 1 && !single) {
      block = Array.from({ length: r2 - r1 + 1 }, () => Array.from({ length: c2 - c1 + 1 }, () => block[0][0]));
    }
    const edits: { r: number; key: string; v: string }[] = [];
    const nextLabels = { ...labels };
    const byName = layout(tree).nodes;
    block.forEach((line, i) =>
      line.forEach((v, j) => {
        const r = r1 + i;
        const c = c1 + j;
        if (c >= colCount) return;
        if (c === 0) {
          const hit = byName.find((n) => n.name.toLowerCase() === v.trim().toLowerCase());
          if (hit) nextLabels[r] = hit.id;
          else if (!v.trim()) delete nextLabels[r];
        } else edits.push({ r, key: cols[c].key, v });
      }),
    );
    commit({ rows: withCells(edits), labels: nextLabels });
    setSel({ a: [r1, c1], f: [r1 + block.length - 1, Math.min(colCount - 1, c1 + Math.max(...block.map((l) => l.length)) - 1)] });
  };

  // Undo and redo work anywhere on the page (not only while the grid has focus), except while typing in a field or a dialog is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || picker || editingLabels || drawer) return;
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, [contenteditable]")) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) stepHistory(undo.current, redo.current);
      else if ((k === "z" && e.shiftKey) || k === "y") stepHistory(redo.current, undo.current);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Drag across cells to select a range.
  useEffect(() => {
    const up = () => (dragging.current = false);
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);
  useEffect(() => {
    if (!picker) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closePicker();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picker]);
  // Keep the active cell in view while moving with the keyboard. Mouse selections (clicking a row or column
  // header moves `f` to the far corner) must not scroll. Rows are virtual, so the vertical move is done by hand.
  useEffect(() => {
    if (!keyNav.current) return;
    keyNav.current = false;
    const g = grid.current;
    if (!g) return;
    const top = headH + sel.f[0] * rowH;
    if (top < g.scrollTop + headH) g.scrollTop = Math.max(0, top - headH);
    else if (top + rowH > g.scrollTop + g.clientHeight) g.scrollTop = top + rowH - g.clientHeight;
    const cell = `[data-cell="${sel.f[0]}-${sel.f[1]}"]`;
    requestAnimationFrame(() => grid.current?.querySelector(cell)?.scrollIntoView({ block: "nearest", inline: "nearest" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel.f]);

  // Track the scroll position (once per frame) and the size of the scroll area.
  useEffect(() => {
    const g = grid.current;
    if (!g) return;
    const read = () => {
      frame.current = 0;
      setView((v) => (v.top === g.scrollTop && v.h === g.clientHeight ? v : { top: g.scrollTop, h: g.clientHeight }));
    };
    const on = () => {
      if (!frame.current) frame.current = requestAnimationFrame(read);
    };
    read();
    g.addEventListener("scroll", on, { passive: true });
    const ro = new ResizeObserver(on);
    ro.observe(g);
    return () => {
      g.removeEventListener("scroll", on);
      ro.disconnect();
      cancelAnimationFrame(frame.current);
    };
  }, []);

  // The real heights (fonts, zoom) decide where rows sit; measure them instead of trusting the constants.
  useEffect(() => {
    const r = grid.current?.querySelector("tbody tr[data-row]")?.getBoundingClientRect().height;
    const h = grid.current?.querySelector("thead")?.getBoundingClientRect().height;
    if (r && Math.abs(r - rowH) > 0.1) setRowH(r);
    if (h && Math.abs(h - headH) > 0.1) setHeadH(h);
  }, [rowH, headH, view.h, total]);

  const startResize = (key: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const x0 = e.clientX;
    const w0 = widthOf(key);
    let w = w0;
    const move = (ev: MouseEvent) => {
      w = clamp(w0 + ev.clientX - x0, MIN_W, 900);
      setResize({ key, w });
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      setResize(null);
      setSheet(id, domainId, cityId, { view: { widths: { ...city.view?.widths, [key]: w } } });
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const dropOn = (target: string) => {
    if (dragKey && dragKey !== target) {
      const from = keys.indexOf(dragKey);
      const to = keys.indexOf(target);
      const next = keys.filter((k) => k !== dragKey);
      next.splice(to, 0, dragKey);
      if (from !== to) {
        commit({ order: next });
        setSel({ a: [sel.a[0], next.indexOf(dragKey) + 1], f: [sel.a[0], next.indexOf(dragKey) + 1] });
      }
    }
    setDragKey(null);
    setOverKey(null);
  };

  const first = Math.max(0, Math.floor(view.top / rowH) - OVERSCAN);
  const last = Math.min(total, Math.ceil((view.top + view.h) / rowH) + OVERSCAN);
  // A cell being edited that scrolls out of the page is saved, not lost.
  useEffect(() => {
    const e = editRef.current;
    if (e && (e[0] < first || e[0] >= last)) finishEdit(true);
  });

  const head = "h-8 border-b border-r border-neutral-200 bg-neutral-50 text-xs font-medium text-neutral-400 select-none";

  return (
    <div className="flex w-full flex-1 flex-col px-6 pb-6">
      <nav className="mt-4 flex flex-wrap items-center gap-1.5 text-sm text-neutral-500">
        <Link href={`/dashboard/maps/${id}`} className="flex items-center gap-1.5 hover:text-neutral-950">
          <BrandIcon name="googlemaps" colored className="size-4" /> Google Maps
        </Link>
        <ChevronRight className="size-3.5" />
        <span>{domain.name}</span>
        <ChevronRight className="size-3.5" />
        <span className="font-medium text-neutral-950">{city.name}</span>
      </nav>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
          <h1 className="font-brand text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
            {domain.name} <span className="text-neutral-400">in</span> {city.name}
          </h1>
          <dl className="flex items-baseline gap-5 text-sm text-neutral-500">
            <div className="flex items-baseline gap-1.5">
              <dt>Leads</dt>
              <dd className="font-brand text-xl font-bold tracking-[-0.03em] tabular-nums text-neutral-950">{leadCount}</dd>
            </div>
            <div className="flex items-baseline gap-1.5">
              <dt>Outreached</dt>
              <dd className="font-brand text-xl font-bold tracking-[-0.03em] tabular-nums text-neutral-950">{outreached}</dd>
            </div>
          </dl>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              const data = parseCsv(await f.text());
              if (data.length) setCsv({ name: f.name, data });
            }}
          />
          <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
            <Upload className="size-4" /> Import CSV
          </Button>
          <Button variant="outline" size="sm" disabled={leadCount === 0 && Object.keys(labels).length === 0} onClick={exportCsv}>
            <Download className="size-4" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => setMobileOpen(true)}>
            <Smartphone className="size-4" /> Mobile Outreach
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditingLabels(true)}>
            <Tags className="size-4" /> Edit labels
          </Button>
          <Button size="sm" onClick={() => { openFields.current = cfg?.fields ?? []; setDrawer(true); }}>
            <SlidersHorizontal className="size-4" /> {cfg ? "Edit setup" : "Set up scrape"}
          </Button>
        </div>
      </div>

      {cfg && <ScrapeBar id={id} domainId={domainId} cityId={cityId} queries={cfg.queries.length} resetKey={setupKey} />}

      {/* Spreadsheet */}
      <div className="mt-5 flex h-[calc(100dvh-17rem)] min-h-96 flex-none flex-col overflow-hidden rounded-2xl border border-neutral-300 bg-white">
        <div ref={grid} tabIndex={0} onPointerDownCapture={() => (keyNav.current = false)} onKeyDown={onKeyDown} onCopy={onCopy} onCut={onCut} onPaste={onPaste} className="relative flex-1 overflow-auto outline-none">
          <table className="table-fixed border-separate border-spacing-0 text-sm" style={{ width: tableW }}>
            <colgroup>
              <col style={{ width: ROW_NUM_W }} />
              {cols.map((c) => (
                <col key={c.key} style={{ width: widthOf(c.key) }} />
              ))}
            </colgroup>
            <thead className="sticky top-0 z-30">
              <tr>
                <th
                  className={cn(head, "sticky left-0 z-20 cursor-pointer")}
                  onClick={() => (setSel({ a: [0, 0], f: [total - 1, colCount - 1] }), grid.current?.focus())}
                  title="Select all"
                />
                {cols.map((c, i) => (
                  <th
                    key={c.key}
                    onClick={() => (setSel({ a: [0, i], f: [total - 1, i] }), grid.current?.focus())}
                    className={cn(head, "cursor-pointer", i >= c1 && i <= c2 && "text-emerald-700")}
                  >
                    {letter(i)}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="sticky left-0 z-20 h-10 border-b border-r border-neutral-200 bg-white" />
                {cols.map((c, i) => (
                  <th
                    key={c.key}
                    onDragOver={(e) => {
                      if (dragKey && i > 0) {
                        e.preventDefault();
                        setOverKey(c.key);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (i > 0) dropOn(c.key);
                    }}
                    className={cn(
                      "relative h-10 border-b border-r border-neutral-200 bg-white p-0 text-left text-sm font-semibold",
                      overKey === c.key && dragKey !== c.key && "shadow-[inset_3px_0_0_#059669]",
                      dragKey === c.key && "opacity-40",
                    )}
                  >
                    <div
                      draggable={i > 0}
                      onDragStart={(e) => (e.dataTransfer.setData("text/plain", c.key), setDragKey(c.key))}
                      onDragEnd={() => (setDragKey(null), setOverKey(null))}
                      className={cn("flex h-full items-center gap-1 px-3", i > 0 && "cursor-grab active:cursor-grabbing")}
                      title={i > 0 ? "Drag to move this column" : undefined}
                    >
                      {i > 0 && <GripVertical className="-ml-1.5 size-3.5 shrink-0 text-neutral-300" />}
                      <span className="truncate">{c.label}</span>
                    </div>
                    <span
                      onMouseDown={(e) => startResize(c.key, e)}
                      onDoubleClick={() => setSheet(id, domainId, cityId, { view: { widths: { ...city.view?.widths, [c.key]: c.key === "label" ? 224 : 176 } } })}
                      className="absolute -right-1 top-0 z-10 h-full w-2 cursor-col-resize hover:bg-emerald-500/40"
                      title="Drag to resize, double-click to reset"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {first > 0 && (
                <tr aria-hidden>
                  <td colSpan={colCount + 1} style={{ height: first * rowH, padding: 0, border: 0 }} />
                </tr>
              )}
              {Array.from({ length: Math.max(0, last - first) }, (_, k) => first + k).map((r) => (
                <tr key={r} data-row={r}>
                  <td
                    onClick={() => (setSel({ a: [r, 0], f: [r, colCount - 1] }), grid.current?.focus())}
                    className={cn("sticky left-0 z-10 h-9 cursor-pointer select-none border-b border-r border-neutral-200 bg-neutral-50 text-center text-xs text-neutral-400", r >= r1 && r <= r2 && "text-emerald-700")}
                  >
                    {r + 1}
                  </td>
                  {cols.map((c, i) => {
                    const inRange = r >= r1 && r <= r2 && i >= c1 && i <= c2;
                    const isActive = sel.a[0] === r && sel.a[1] === i;
                    const isEditing = editing?.[0] === r && editing?.[1] === i;
                    return (
                      <td
                        key={c.key}
                        data-cell={`${r}-${i}`}
                        onMouseDown={(e) => {
                          if (isEditing) return;
                          if (editRef.current) finishEdit(true);
                          grid.current?.focus();
                          if (e.shiftKey) setSel({ a: sel.a, f: [r, i] });
                          else setSel({ a: [r, i], f: [r, i] });
                          dragging.current = !e.shiftKey;
                        }}
                        onMouseEnter={() => {
                          if (dragging.current) setSel((s) => ({ a: s.a, f: [r, i] }));
                        }}
                        onClick={(e) => i === 0 && single && !e.shiftKey && setPicker({ row: r, rect: e.currentTarget.getBoundingClientRect() })}
                        onDoubleClick={() => i > 0 && startEdit(r, i)}
                        className={cn(
                          "h-9 cursor-cell select-none overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-neutral-100 px-3",
                          inRange && !isActive && "bg-emerald-50",
                          isActive && "outline outline-2 -outline-offset-2 outline-emerald-600",
                          isEditing && "bg-white p-0",
                        )}
                      >
                        {isEditing ? (
                          <input
                            autoFocus
                            value={draft}
                            maxLength={MAX_CELL}
                            onChange={(e) => setDraft(e.target.value)}
                            onBlur={() => finishEdit(true)}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === "Enter") {
                                e.preventDefault();
                                finishEdit(true);
                                setSel({ a: [clamp(r + 1, 0, total - 1), i], f: [clamp(r + 1, 0, total - 1), i] });
                                grid.current?.focus();
                              } else if (e.key === "Tab") {
                                e.preventDefault();
                                finishEdit(true);
                                const n = clamp(i + 1, 0, colCount - 1);
                                setSel({ a: [r, n], f: [r, n] });
                                grid.current?.focus();
                              } else if (e.key === "Escape") {
                                finishEdit(false);
                                grid.current?.focus();
                              }
                            }}
                            className="h-full w-full bg-white px-3 text-sm outline outline-2 -outline-offset-2 outline-emerald-600"
                          />
                        ) : i === 0 ? (
                          <LabelChip tree={tree} id={labels[r]} />
                        ) : (
                          rows[r]?.[c.key]
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {last < total && (
                <tr aria-hidden>
                  <td colSpan={colCount + 1} style={{ height: (total - last) * rowH, padding: 0, border: 0 }} />
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex h-8 items-center justify-between gap-4 border-t border-neutral-200 bg-neutral-50 px-3 text-xs text-neutral-500">
          <span className="truncate">{cfg ? cfg.queries.join("  ·  ") : "Sheet1"}</span>
          <span className="hidden truncate text-neutral-400 lg:inline">Type or double-click to edit · drag headers to reorder · drag edges to resize · Ctrl+Z / C / V / A</span>
          <span className="shrink-0">{leadCount} rows · {keys.length} columns</span>
        </div>
      </div>

      {leadCount === 0 && (
        <p className="mt-3 text-center text-sm text-neutral-400">
          {cfg ? "Waiting for the scraper. You can already type into the sheet." : "Open Scrape to choose what to collect. Your picks become the columns."}
        </p>
      )}

      {picker && <div className="fixed inset-0 z-40" onClick={closePicker} />}
      {picker && (
        <LabelGraph
          tree={tree}
          anchor={picker.rect}
          selected={labels[picker.row]}
          onPick={(l) => {
            setRowLabel(picker.row, l);
            closePicker();
          }}
          onClear={() => {
            setRowLabel(picker.row, null);
            closePicker();
          }}
        />
      )}

      <MobileLink open={mobileOpen} onClose={() => setMobileOpen(false)} path={`/m/${id}/${domainId}/${cityId}`} />

      {csv && (
        <CsvImport
          fileName={csv.name}
          data={csv.data}
          existing={leadCount}
          canReplace={campaign.myRole !== "member"}
          teammates={Math.max(0, (campaign.members?.length ?? 1) - 1)}
          targets={cols.map((c, i) => ({ key: c.key, name: c.label || `Column ${letter(i)}` }))}
          onClose={() => setCsv(null)}
          onImport={importRecords}
        />
      )}

      {editingLabels && <LabelEditor tree={tree} onSave={(t) => setLabelTree(id, t)} onClose={() => setEditingLabels(false)} />}

      <Dialog open={!!dropAsk} onClose={() => keepColumns()} title={dropAsk ? `Delete ${dropAsk.withData.length === 1 ? "this column" : `these ${dropAsk.withData.length} columns`}?` : ""} description="Their values are permanently deleted from every lead in this sheet and from your account's database. This can't be undone.">
        <ul className="list-disc space-y-0.5 pl-5 text-sm">
          {dropAsk?.withData.map((k) => <li key={k}>{fieldByKey(k)?.label ?? k}</li>)}
        </ul>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={keepColumns}>Keep the columns</Button>
          <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={() => { if (dropAsk) setScrape(id, domainId, cityId, dropAsk.config, dropAsk.dropped); setDropAsk(null); }}>Delete columns and data</Button>
        </div>
      </Dialog>

      <AnimatePresence>
        {drawer && (
        <ScrapeDrawer
          onClose={() => {
            setDrawer(false);
            if (cfg) finishSetup(cfg);
          }}
          domain={domain.name}
          city={city.name}
          initial={cfg}
          onChange={(c) => setScrape(id, domainId, cityId, c)}
          onSet={(c) => {
            setDrawer(false);
            setSetupKey((k) => k + 1);
            finishSetup(c);
          }}
        />
        )}
      </AnimatePresence>
    </div>
  );
}

/** The phone version of this sheet: same leads and labels, a layout built for one thumb. Opening it needs a sign-in to an account on this campaign. */
function MobileLink({ open, onClose, path }: { open: boolean; onClose: () => void; path: string }) {
  const [copied, setCopied] = useState(false);
  if (!open) return null;
  const url = `${window.location.origin}${path}`;
  const local = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };
  return (
    <Dialog open onClose={onClose} title="Mobile Outreach" description="Open this link on your phone to call and WhatsApp your leads and set labels. Everything syncs with this sheet.">
      <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-1.5 pl-3">
        <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 bg-transparent text-sm outline-none" aria-label="Mobile link" />
        <Button size="sm" onClick={copy}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <ul className="mt-4 space-y-1.5 text-sm text-neutral-500">
        <li>Sign in on your phone with the same account. Only people on this campaign can open it.</li>
        <li>Shows name and phone by default; pick more columns from the top bar.</li>
        {local && <li className="text-amber-700">This is a local address, so a phone can only open it on the same Wi-Fi as this computer.</li>}
      </ul>
      {typeof navigator !== "undefined" && "share" in navigator && (
        <Button variant="outline" size="sm" className="mt-5 w-full" onClick={() => void navigator.share({ title: "Mobile Outreach", url }).catch(() => undefined)}>
          Share link
        </Button>
      )}
    </Dialog>
  );
}
