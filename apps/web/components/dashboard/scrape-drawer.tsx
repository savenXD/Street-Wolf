"use client";

import { Check, Plus, Search, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { allFields, defaultConfig, fieldGroups, type ScrapeConfig } from "@/lib/maps-fields";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

const steps = [
  { label: "Search", title: "What should we search for?", hint: "Add one or more queries. Each is scraped on its own." },
  { label: "Amount", title: "How many leads per query?", hint: "Take everything available, or stop at a number." },
  { label: "Columns", title: "What should we collect?", hint: "Every ticked field becomes a column in your sheet." },
  { label: "Filters", title: "Who should we skip?", hint: "Keep the good leads and drop the rest." },
] as const;

function Seg<T extends string | number>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-full bg-neutral-100 p-1">
      {options.map((o) => (
        <button
          key={String(o.v)}
          onClick={() => onChange(o.v)}
          className={cn("rounded-full px-3 py-1 text-sm transition-colors", value === o.v ? "bg-white font-medium shadow-sm" : "text-neutral-500 hover:text-neutral-950")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ on, onChange, children }: { on: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors", on ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-300 text-neutral-600 hover:border-neutral-950")}
    >
      {on && <Check className="size-3.5" />}
      {children}
    </button>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-neutral-400">{children}</p>;
}

const inputCls = "h-9 rounded-xl border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-950";

export function ScrapeDrawer({
  onClose,
  domain,
  city,
  initial,
  onSet,
  onChange,
}: {
  onClose: () => void;
  domain: string;
  city: string;
  initial?: ScrapeConfig;
  onSet: (c: ScrapeConfig) => void;
  /** Called on every valid edit so closing the drawer never loses changes. */
  onChange?: (c: ScrapeConfig) => void;
}) {
  const suggestions = [`${domain} in ${city}`, `best ${domain} in ${city}`, `${domain} near ${city}`].map((q) => q.toLowerCase());
  const [cfg, setCfg] = useState<ScrapeConfig>(() => initial ?? defaultConfig([suggestions[0]]));
  const [step, setStep] = useState(0);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [fieldSearch, setFieldSearch] = useState("");
  const [count, setCount] = useState(typeof initial?.limit === "number" ? initial.limit : 100);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const start = useRef(cfg);
  useEffect(() => {
    if (cfg === start.current) return;
    if (cfg.queries.length > 0 && cfg.fields.length > 0) onChange?.(cfg);
  }, [cfg]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch: Partial<ScrapeConfig>) => setCfg((c) => ({ ...c, ...patch }));
  const setF = (patch: Partial<ScrapeConfig["filters"]>) => setCfg((c) => ({ ...c, filters: { ...c.filters, ...patch } }));
  const addQuery = (raw: string) => {
    const t = raw.trim();
    if (t && !cfg.queries.some((x) => x.toLowerCase() === t.toLowerCase())) set({ queries: [...cfg.queries, t] });
    setQ("");
  };
  const addTag = () => {
    const t = tag.trim();
    if (t && !cfg.filters.exclude.some((x) => x.toLowerCase() === t.toLowerCase())) setF({ exclude: [...cfg.filters.exclude, t] });
    setTag("");
  };
  const toggleField = (k: string) => set({ fields: cfg.fields.includes(k) ? cfg.fields.filter((x) => x !== k) : [...cfg.fields, k] });
  const needle = fieldSearch.trim().toLowerCase();

  const canNext = step === 0 ? cfg.queries.length > 0 : step === 2 ? cfg.fields.length > 0 : true;
  const last = step === steps.length - 1;

  const panelBody: Record<number, React.ReactNode> = {
    0: (

              <>
                <form className="flex gap-2" onSubmit={(e) => (e.preventDefault(), addQuery(q))}>
                  <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. gaming arena in Modinagar" className={cn(inputCls, "flex-1")} />
                  <Button type="submit" variant="outline" size="sm" className="h-9"><Plus className="size-4" /> Add</Button>
                </form>
                <div className="mt-3 flex flex-wrap gap-2">
                  {cfg.queries.map((x) => (
                    <span key={x} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-950 py-1 pl-3 pr-2 text-sm text-white">
                      {x}
                      <button onClick={() => set({ queries: cfg.queries.filter((y) => y !== x) })} aria-label={`Remove ${x}`} className="text-neutral-400 hover:text-white"><X className="size-3.5" /></button>
                    </span>
                  ))}
                  {suggestions.filter((s) => !cfg.queries.includes(s)).map((s) => (
                    <button key={s} onClick={() => addQuery(s)} className="rounded-full border border-dashed border-neutral-300 px-3 py-1 text-sm text-neutral-500 hover:border-neutral-950 hover:text-neutral-950">+ {s}</button>
                  ))}
                </div>
              </>
    ),
    1: (

              <div className="flex flex-wrap items-center gap-4">
                <Seg value={cfg.limit === "all" ? "all" : "n"} options={[{ v: "all", label: "All available" }, { v: "n", label: "A set amount" }]} onChange={(v) => set({ limit: v === "all" ? "all" : count })} />
                {cfg.limit !== "all" && (
                  <label className="flex items-center gap-2 text-sm text-neutral-600">
                    Up to
                    <input
                      type="number"
                      min={1}
                      value={count}
                      onChange={(e) => {
                        const n = Math.max(1, Number(e.target.value) || 1);
                        setCount(n);
                        set({ limit: n });
                      }}
                      className={cn(inputCls, "w-24")}
                    />
                    leads per query
                  </label>
                )}
                {cfg.limit === "all" && <p className="text-sm text-neutral-500">Each query runs until it has no more results.</p>}
              </div>
    ),
    2: (

              <div className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-5">
                {fieldGroups.map((g) => (
                  <div key={g.id}>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{g.label}</p>
                    <div className="space-y-px">
                      {g.fields
                        .filter((f) => !needle || f.label.toLowerCase().includes(needle))
                        .map((f) => {
                          const on = cfg.fields.includes(f.key);
                          return (
                            <button key={f.key} onClick={() => toggleField(f.key)} aria-pressed={on} className="flex w-full items-center gap-2 py-0.5 text-left text-sm">
                              <span className={cn("flex size-4 shrink-0 items-center justify-center rounded border", on ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-300")}>
                                {on && <Check className="size-3" />}
                              </span>
                              <span className={cn("truncate", !on && "text-neutral-500")}>{f.label}</span>
                              {f.note && <span className="text-[10px] text-neutral-400">web</span>}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
    ),
    3: (

              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label>Min rating</Label>
                    <Seg value={cfg.filters.minRating} options={[0, 3, 4, 4.5].map((v) => ({ v, label: v ? `${v}+` : "Any" }))} onChange={(v) => setF({ minRating: v })} />
                  </div>
                  <div>
                    <Label>Min reviews</Label>
                    <input type="number" min={0} value={cfg.filters.minReviews} onChange={(e) => setF({ minReviews: Math.max(0, Number(e.target.value) || 0) })} className={cn(inputCls, "w-28")} />
                  </div>
                  <div>
                    <Label>Website</Label>
                    <Seg value={cfg.filters.website} options={[{ v: "any", label: "Any" }, { v: "has", label: "Has one" }, { v: "none", label: "None" }]} onChange={(v) => setF({ website: v })} />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Toggle on={cfg.filters.mustHavePhone} onChange={(v) => setF({ mustHavePhone: v })}>Has a phone</Toggle>
                  <Toggle on={cfg.filters.skipClosed} onChange={(v) => setF({ skipClosed: v })}>Skip closed</Toggle>
                  <Toggle on={cfg.filters.skipScraped} onChange={(v) => setF({ skipScraped: v })}>Skip duplicates</Toggle>
                  <span className="mx-1 h-5 w-px bg-neutral-200" />
                  <span className="text-sm text-neutral-500">Skip names containing</span>
                  <form className="flex" onSubmit={(e) => (e.preventDefault(), addTag())}>
                    <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. franchise" className={cn(inputCls, "h-8 w-36")} />
                  </form>
                  {cfg.filters.exclude.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 rounded-full bg-neutral-100 py-0.5 pl-2.5 pr-1.5 text-sm">
                      {t}
                      <button onClick={() => setF({ exclude: cfg.filters.exclude.filter((x) => x !== t) })} aria-label={`Remove ${t}`} className="text-neutral-400 hover:text-neutral-950"><X className="size-3.5" /></button>
                    </span>
                  ))}
                </div>
              </div>
    ),
  };

  return (
    <div className="fixed inset-0 z-50">
      <motion.div
        className="absolute inset-0 bg-neutral-950/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Scrape setup"
        className="absolute inset-x-0 top-0 rounded-b-3xl bg-white shadow-2xl will-change-transform"
        initial={{ y: "-100%" }}
        animate={{ y: 0 }}
        exit={{ y: "-100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 40, mass: 0.9 }}
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col px-6 pb-4 pt-5">
          {/* Stepper: labels over one progress line */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <ol className="flex gap-6 text-sm">
                {steps.map((s, i) => (
                  <li key={s.label}>
                    <button
                      onClick={() => (i <= step || canNext) && setStep(i)}
                      className={cn("transition-colors", i === step ? "font-medium text-neutral-950" : i < step ? "text-neutral-500 hover:text-neutral-950" : "text-neutral-300")}
                    >
                      <span className="mr-1.5 tabular-nums">{i + 1}</span>
                      {s.label}
                    </button>
                  </li>
                ))}
              </ol>
              <div className="mt-3 h-0.5 rounded-full bg-neutral-100">
                <motion.div className="h-full rounded-full bg-neutral-950" initial={false} animate={{ width: `${((step + 1) / steps.length) * 100}%` }} transition={{ duration: 0.35, ease: EASE }} />
              </div>
            </div>
            <button onClick={onClose} aria-label="Close" className="text-neutral-400 hover:text-neutral-950"><X className="size-5" /></button>
          </div>

          {/* Every step sits in the same grid cell, so the card is always as tall as the tallest step and never jumps. */}
          <div className="mt-4 grid">
            {steps.map((s, i) => (
              <motion.div
                key={s.label}
                inert={i !== step}
                aria-hidden={i !== step}
                className="col-start-1 row-start-1 min-w-0"
                initial={false}
                animate={{ opacity: i === step ? 1 : 0, x: i === step ? 0 : i < step ? -28 : 28 }}
                transition={{ duration: 0.28, ease: EASE }}
                style={{ pointerEvents: i === step ? "auto" : "none" }}
              >
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="font-brand text-2xl font-bold tracking-[-0.03em]">{s.title}</h2>
                    <p className="text-sm text-neutral-500">{s.hint}</p>
                  </div>
                  {i === 2 && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
                        <input value={fieldSearch} onChange={(e) => setFieldSearch(e.target.value)} placeholder="Search fields" className={cn(inputCls, "h-8 w-40 pl-8")} />
                      </div>
                      <button onClick={() => set({ fields: allFields.map((f) => f.key) })} className="text-neutral-500 hover:text-neutral-950">All</button>
                      <button onClick={() => set({ fields: [] })} className="text-neutral-500 hover:text-neutral-950">None</button>
                      <span className="text-xs text-neutral-400">{cfg.fields.length}/{allFields.length}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3">{panelBody[i]}</div>
              </motion.div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3">
            {step > 0 ? <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>Back</Button> : <span />}
            <Button size="sm" disabled={!canNext} onClick={() => (last ? onSet(cfg) : setStep(step + 1))}>
              {last ? "Set" : "Next"}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
