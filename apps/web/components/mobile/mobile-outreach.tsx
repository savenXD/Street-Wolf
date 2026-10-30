"use client";

import { ChevronLeft, ChevronRight, FileText, Phone, Search, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrandIcon } from "@/components/brand-icon";
import { LabelChip } from "@/components/dashboard/label-chip";
import { PamphletsSheet } from "@/components/mobile/pamphlets-sheet";
import { Sheet } from "@/components/mobile/sheet";
import { LoadBar } from "@/components/ui/load-bar";
import { defaultTree, labelById, type LabelNode } from "@/lib/labels";
import { ATC_KEY, fieldByKey, SUMMARY_KEY, sheetKeys } from "@/lib/maps-fields";
import { CallSummaryDialog } from "@/components/dashboard/call-summary-dialog";
import { previewSummary } from "@/lib/call-summary";
import { AtcDialog } from "@/components/dashboard/atc-dialog";
import { isOverdue, previewAtc } from "@/lib/atc";
import { parsePhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { useSaveState, useWorkspace } from "@/lib/workspace";

const PAGE = 40; // leads drawn at a time; more are added as you scroll
const blankKeys = ["c1", "c2", "c3", "c4", "c5"];
/** What a phone shows until you pick more. */
const DEFAULT_SHOWN = ["name", "phone"];
const shownKey = (pid: string) => `sw-mobile-cols:${pid}`;

export function MobileOutreach({ id, domainId, cityId }: { id: string; domainId: string; cityId: string }) {
  const router = useRouter();
  const { ready, signedIn, account, campaigns, loadSheet } = useWorkspace();
  const campaign = campaigns.find((c) => c.id === id);
  const domain = campaign?.domains.find((d) => d.id === domainId);
  const city = domain?.cities.find((c) => c.id === cityId);

  useEffect(() => {
    if (ready && !signedIn) router.replace(`/signup?next=${encodeURIComponent(window.location.pathname)}`);
  }, [ready, signedIn, router]);
  useEffect(() => {
    if (ready && account && city && !city.loaded) void loadSheet(id, domainId, cityId);
  }, [ready, account, city, id, domainId, cityId, loadSheet]);

  if (!ready || !signedIn) return <LoadBar fullscreen />;
  if (!campaign || !domain || !city) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-neutral-500">This sheet doesn&apos;t exist, or your account isn&apos;t on this campaign.</p>
        <Link href="/dashboard" className="text-sm font-medium underline underline-offset-4">Go to dashboard</Link>
      </main>
    );
  }
  if (!city.loaded) return <LoadBar fullscreen />;
  return <Leads id={id} domainId={domainId} cityId={cityId} tree={campaign.labelTree ?? defaultTree} title={`${domain.name} in ${city.name}`} />;
}

function Leads({ id, domainId, cityId, tree, title }: { id: string; domainId: string; cityId: string; tree: LabelNode; title: string }) {
  const { campaigns, setSheet, syncSheet } = useWorkspace();
  const city = campaigns.find((c) => c.id === id)!.domains.find((d) => d.id === domainId)!.cities.find((c) => c.id === cityId)!;
  const save = useSaveState(cityId);
  const [query, setQuery] = useState("");
  const [todo, setTodo] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [colsOpen, setColsOpen] = useState(false);
  const [pick, setPick] = useState<number | null>(null);
  // Pamphlets: opened for one lead (r), or as the plain library from the top bar (-1).
  const [pam, setPam] = useState<number | null>(null);
  const [note, setNote] = useState<number | null>(null);
  const [atc, setAtc] = useState<number | null>(null);

  const rows = useMemo(() => city.rows ?? [], [city.rows]);
  const labels = useMemo(() => city.labels ?? {}, [city.labels]);

  // Same column set and order as the web sheet. Which of them this phone shows is its own choice, remembered per sheet.
  const cfg = city.scrape;
  const keys = sheetKeys(cfg, blankKeys, city.view?.order);
  const labelOf = (k: string) => (cfg || k === SUMMARY_KEY || k === ATC_KEY ? (fieldByKey(k)?.label ?? k) : k.toUpperCase());

  // Only ever rendered after the workspace has loaded in the browser, so reading localStorage here is safe.
  // null = never chosen, so the defaults apply; an empty list is a real choice (show only the name).
  const [chosen, setChosen] = useState<string[] | null>(() => {
    try {
      const raw = localStorage.getItem(shownKey(cityId));
      return raw ? (JSON.parse(raw) as string[]) : null;
    } catch {
      return null;
    }
  });
  const defaults = keys.filter((k) => DEFAULT_SHOWN.includes(k));
  const shown = chosen ? keys.filter((k) => chosen.includes(k)) : defaults.length ? defaults : keys.slice(0, 2);
  const setShown = (next: string[]) => {
    setChosen(next);
    try {
      localStorage.setItem(shownKey(cityId), JSON.stringify(next));
    } catch {}
  };

  // Teammates' edits and labels arrive every few seconds, the same as on the web sheet.
  useEffect(() => {
    const pull = () => document.visibilityState === "visible" && void syncSheet(id, domainId, cityId).catch(() => undefined);
    const t = setInterval(pull, 5000);
    document.addEventListener("visibilitychange", pull);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", pull);
    };
  }, [syncSheet, id, domainId, cityId]);

  // Only rows with something in them; `r` stays the real sheet row, which is what labels are saved against.
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out: number[] = [];
    rows.forEach((row, r) => {
      if (!Object.keys(row).length) return;
      if (todo && labels[r]) return;
      if (q && !Object.values(row).some((v) => v.toLowerCase().includes(q))) return;
      out.push(r);
    });
    return out;
  }, [rows, labels, query, todo]);

  const more = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = more.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && setLimit((n) => n + PAGE), { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [list.length, limit]);

  const setLabel = useCallback(
    (r: number, l: string | null) => {
      const next = { ...labels };
      if (l) next[r] = l;
      else delete next[r];
      setSheet(id, domainId, cityId, { labels: next });
    },
    [labels, setSheet, id, domainId, cityId],
  );

  const saveCell = (r: number, key: string, v: string) => {
    const next = rows.slice();
    const cell = { ...next[r] };
    if (v) cell[key] = v;
    else delete cell[key];
    next[r] = cell;
    setSheet(id, domainId, cityId, { rows: next });
  };

  const done = Object.keys(labels).length;
  const phoneKey = keys.includes("phone") ? "phone" : null;
  const nameKey = keys.includes("name") ? "name" : null;
  const bodyKeys = shown.filter((k) => k !== nameKey && k !== SUMMARY_KEY && k !== ATC_KEY);
  const showNote = shown.includes(SUMMARY_KEY);
  const showAtc = shown.includes(ATC_KEY);

  return (
    <div className="min-h-dvh bg-neutral-50 pb-[env(safe-area-inset-bottom)]">
      {/* Top bar: back, sheet, save state, and the columns switch. */}
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="flex h-14 items-center gap-1 px-2">
          <Link href={`/dashboard/maps/${id}/${domainId}/${cityId}`} aria-label="Back to the web sheet" className="flex size-11 items-center justify-center rounded-full text-neutral-600 active:bg-neutral-100">
            <ChevronLeft className="size-6" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] leading-tight font-semibold">{title}</h1>
            <p className="flex items-center gap-1.5 text-xs text-neutral-500 tabular-nums">
              <span
                aria-label={save}
                className={cn("size-1.5 rounded-full", save === "saved" ? "bg-emerald-500" : save === "saving" ? "animate-pulse bg-amber-400" : "bg-red-500")}
              />
              {list.length} leads · {done} labelled
            </p>
          </div>
          <button type="button" onClick={() => setPam(-1)} aria-label="Pamphlets" className="flex size-11 items-center justify-center rounded-full text-neutral-700 active:bg-neutral-100">
            <FileText className="size-5" />
          </button>
          <button type="button" onClick={() => setColsOpen(true)} aria-label="Choose columns" className="flex size-11 items-center justify-center rounded-full text-neutral-700 active:bg-neutral-100">
            <SlidersHorizontal className="size-5" />
          </button>
        </div>
        <div className="flex items-center gap-2 px-3 pb-3">
          <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-neutral-100 px-3.5">
            <Search className="size-4 shrink-0 text-neutral-400" />
            <input
              value={query}
              onChange={(e) => (setQuery(e.target.value), setLimit(PAGE))}
              placeholder="Search leads"
              inputMode="search"
              enterKeyHint="search"
              className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-neutral-400"
            />
            {query && (
              <button type="button" aria-label="Clear search" onClick={() => (setQuery(""), setLimit(PAGE))} className="text-neutral-400">
                <X className="size-4" />
              </button>
            )}
          </label>
          <button
            type="button"
            aria-pressed={todo}
            onClick={() => (setTodo((v) => !v), setLimit(PAGE))}
            className={cn("h-10 shrink-0 rounded-full px-4 text-sm font-medium transition-colors", todo ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-700")}
          >
            To do
          </button>
        </div>
      </header>

      <main className="space-y-2.5 px-3 py-3">
        {list.slice(0, limit).map((r) => {
          const row = rows[r];
          const ph = phoneKey ? parsePhone(row[phoneKey] ?? "") : null;
          return (
            <article key={r} className="rounded-2xl border border-neutral-200 bg-white p-3.5">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base leading-snug font-semibold">{(nameKey && row[nameKey]) || `Lead ${r + 1}`}</h2>
                  {bodyKeys.length > 0 && (
                    <dl className="mt-1 space-y-0.5 text-sm">
                      {bodyKeys.map((k) =>
                        row[k] ? (
                          <div key={k} className="flex gap-2">
                            {k !== "phone" && <dt className="w-20 shrink-0 truncate text-neutral-400">{labelOf(k)}</dt>}
                            <dd className={cn("min-w-0 flex-1 break-words text-neutral-700", k === "phone" && "font-medium tabular-nums text-neutral-950")}>{row[k]}</dd>
                          </div>
                        ) : null,
                      )}
                    </dl>
                  )}
                </div>
                {ph?.tel && (
                  <div className="flex shrink-0 items-center gap-2">
                    <button type="button" onClick={() => setPam(r)} aria-label="Send a pamphlet or message" className="flex size-11 items-center justify-center rounded-full border border-neutral-200 text-neutral-700 active:scale-95">
                      <FileText className="size-5" />
                    </button>
                    <a href={`tel:${ph.tel}`} aria-label={`Call ${row[nameKey ?? ""] ?? "lead"}`} className="flex size-11 items-center justify-center rounded-full bg-neutral-950 text-white active:scale-95">
                      <Phone className="size-5" />
                    </a>
                    {ph.wa && (
                    <a
                      href={`https://wa.me/${ph.wa}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`WhatsApp ${row[nameKey ?? ""] ?? "lead"}`}
                      className="flex size-11 items-center justify-center rounded-full bg-[#25D366] text-white active:scale-95"
                    >
                      <BrandIcon name="whatsapp" className="size-5" />
                    </a>
                    )}
                  </div>
                )}
              </div>
              {showNote && (
                <button type="button" onClick={() => setNote(r)} className="mt-3 block w-full rounded-xl border border-dashed border-neutral-300 px-3 py-2 text-left active:bg-neutral-50">
                  {row[SUMMARY_KEY] ? (
                    <span className="line-clamp-3 text-sm leading-relaxed text-neutral-700">{previewSummary(row[SUMMARY_KEY])}</span>
                  ) : (
                    <span className="text-sm text-neutral-400">Add call summary</span>
                  )}
                </button>
              )}
              {showAtc && (
                <button type="button" onClick={() => setAtc(r)} className="mt-2 block w-full rounded-xl border border-dashed border-neutral-300 px-3 py-2 text-left active:bg-neutral-50">
                  {row[ATC_KEY] ? (
                    <span className={cn("line-clamp-2 text-sm leading-relaxed", isOverdue(row[ATC_KEY]) ? "font-medium text-red-600" : "text-neutral-700")}>Call back: {previewAtc(row[ATC_KEY])}</span>
                  ) : (
                    <span className="text-sm text-neutral-400">Add callback date (ATC)</span>
                  )}
                </button>
              )}
              <button type="button" onClick={() => setPick(r)} className="mt-2 flex h-10 w-full items-center justify-between rounded-xl bg-neutral-50 px-3 text-left active:bg-neutral-100">
                <LabelChip tree={tree} id={labels[r]} />
                <ChevronRight className="size-4 text-neutral-400" />
              </button>
            </article>
          );
        })}
        {list.length === 0 && <p className="py-16 text-center text-neutral-400">{rows.length ? "Nothing matches." : "No leads on this sheet yet."}</p>}
        <div ref={more} className="h-px" />
      </main>

      {colsOpen && (
        <Sheet title="Columns" onClose={() => setColsOpen(false)}>
          <p className="px-5 text-sm text-neutral-500">Pick what each lead card shows on this phone. The name is always the title.</p>
          <ul className="mt-3 pb-3">
            {keys.map((k) => {
              const on = shown.includes(k);
              return (
                <li key={k}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    onClick={() => setShown(on ? shown.filter((x) => x !== k) : keys.filter((x) => x === k || shown.includes(x)))}
                    className="flex h-14 w-full items-center justify-between px-5 text-left active:bg-neutral-50"
                  >
                    <span className="text-base">{labelOf(k)}</span>
                    <span className={cn("flex h-7 w-12 items-center rounded-full px-0.5 transition-colors", on ? "justify-end bg-neutral-950" : "justify-start bg-neutral-200")}>
                      <span className="size-6 rounded-full bg-white shadow" />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Sheet>
      )}

      {note !== null && (
        <CallSummaryDialog
          name={(nameKey && rows[note]?.[nameKey]) || `Lead ${note + 1}`}
          value={rows[note]?.[SUMMARY_KEY] ?? ""}
          onSave={(v) => saveCell(note, SUMMARY_KEY, v)}
          onClose={() => setNote(null)}
        />
      )}

      {atc !== null && (
        <AtcDialog
          name={(nameKey && rows[atc]?.[nameKey]) || `Lead ${atc + 1}`}
          value={rows[atc]?.[ATC_KEY] ?? ""}
          onSave={(v) => saveCell(atc, ATC_KEY, v)}
          onClose={() => setAtc(null)}
        />
      )}

      {pam !== null && (
        <PamphletsSheet
          campaignId={id}
          lead={pam < 0 ? null : { name: (nameKey && rows[pam]?.[nameKey]) || "", phone: phoneKey ? parsePhone(rows[pam]?.[phoneKey] ?? "").wa : null }}
          onClose={() => setPam(null)}
        />
      )}

      {pick !== null && (
        <LabelSheet
          tree={tree}
          selected={labels[pick]}
          title={(nameKey && rows[pick]?.[nameKey]) || `Lead ${pick + 1}`}
          onPick={(l) => {
            setLabel(pick, l);
            setPick(null);
          }}
          onClose={() => setPick(null)}
        />
      )}
    </div>
  );
}

/** Pick an outcome. Tap a row to set it; the arrow opens that row's more specific outcomes. */
function LabelSheet({ tree, selected, title, onPick, onClose }: { tree: LabelNode; selected?: string; title: string; onPick: (l: string | null) => void; onClose: () => void }) {
  const [trail, setTrail] = useState<LabelNode[]>([tree]);
  const here = trail[trail.length - 1];
  const options = here.children ?? [];
  // The top of the tree ("Called") is itself a valid outcome.
  const rows = trail.length === 1 ? [tree, ...options] : options;
  return (
    <Sheet title={title} onClose={onClose}>
      <div className="flex flex-wrap items-center gap-1 px-5 pb-2 text-sm text-neutral-500">
        {trail.length > 1 ? (
          trail.map((n, i) => (
            <span key={n.id} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3.5" />}
              <button type="button" onClick={() => setTrail(trail.slice(0, i + 1))} className={cn(i === trail.length - 1 && "font-medium text-neutral-950")}>
                {n.name}
              </button>
            </span>
          ))
        ) : (
          <span>How did it go?</span>
        )}
      </div>
      <ul>
        {rows.map((n) => {
          const kids = n.id !== tree.id && !!n.children?.length;
          return (
            <li key={n.id} className="flex items-stretch border-t border-neutral-100">
              <button type="button" onClick={() => onPick(n.id)} className="flex min-h-14 flex-1 items-center gap-3 px-5 text-left active:bg-neutral-50">
                <span className="size-3 shrink-0 rounded-full" style={{ background: n.color }} />
                <span className={cn("text-base", selected === n.id && "font-semibold")}>{n.name}</span>
                {selected === n.id && <span className="ml-auto text-xs text-neutral-400">Current</span>}
              </button>
              {kids && (
                <button type="button" aria-label={`More under ${n.name}`} onClick={() => setTrail([...trail, labelById(tree, n.id) ?? n])} className="flex w-14 items-center justify-center border-l border-neutral-100 text-neutral-500 active:bg-neutral-50">
                  <ChevronRight className="size-5" />
                </button>
              )}
            </li>
          );
        })}
        {selected && (
          <li className="border-t border-neutral-100">
            <button type="button" onClick={() => onPick(null)} className="flex min-h-14 w-full items-center px-5 text-left text-base text-red-600 active:bg-neutral-50">
              Clear label
            </button>
          </li>
        )}
      </ul>
    </Sheet>
  );
}
