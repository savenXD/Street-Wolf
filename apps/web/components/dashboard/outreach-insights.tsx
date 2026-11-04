"use client";

import { ArrowDown, TrendingDown } from "lucide-react";
import { useState } from "react";
import { breakdown, campaignLabelCounts, type Group, type Stage } from "@/lib/funnel";
import { defaultTree } from "@/lib/labels";
import { campaignStats } from "@/lib/stats";
import { cn } from "@/lib/utils";
import type { Campaign } from "@/lib/workspace";

// One hue, light → dark, so later funnel stages read as "deeper". Validated as an ordinal ramp on the white surface.
const RAMP = ["#fa925a", "#e4722c", "#ca5500", "#aa3c00", "#872900"];
const rampFor = (i: number, n: number) => RAMP[n <= 1 ? RAMP.length - 1 : Math.round((i * (RAMP.length - 1)) / (n - 1))];

const fmt = (n: number) => n.toLocaleString();
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

/** White or near-black, whichever reads on the fill. */
function inkOn(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#0a0a0a" : "#ffffff";
}

/** Funnel and call outcomes for one campaign, side by side. */
export function OutreachInsights({ campaign }: { campaign: Campaign }) {
  const { leads } = campaignStats(campaign);
  const { stages, groups, called } = breakdown(campaignLabelCounts(campaign), leads, campaign.labelTree ?? defaultTree);
  return (
    <div className="grid gap-3 lg:grid-cols-5">
      <Funnel stages={stages} className="lg:col-span-3" />
      <Outcomes groups={groups} called={called} className="lg:col-span-2" />
    </div>
  );
}

function Funnel({ stages, className }: { stages: Stage[]; className?: string }) {
  const [hover, setHover] = useState<string>();
  const top = Math.max(1, stages[0]?.value ?? 0);
  const steps = stages.slice(1).map((s, i) => ({ s, prev: stages[i], keep: stages[i].value ? s.value / stages[i].value : 1 }));
  // The step that loses the biggest share of the people who reached it: that's where to look first. Leads → Called
  // isn't a drop-off (those leads just haven't been rung yet), so it never counts.
  const worst = steps.slice(1).filter((x) => x.prev.value > 0).sort((a, b) => a.keep - b.keep)[0];
  const end = stages.at(-1);

  return (
    <section className={cn("relative flex flex-col overflow-hidden rounded-2xl border border-neutral-200 p-5", className)}>
      {/* Soft warm glow in the corner, the same hue as the bars. */}
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-[radial-gradient(circle,rgba(250,146,90,0.16),transparent_70%)]" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold tracking-tight">Outreach funnel</h3>
          <p className="text-xs text-neutral-400">Where leads drop off, from scraped to converted</p>
        </div>
        <div className="text-right">
          <p className="font-brand text-3xl font-bold tracking-[-0.04em]">{end ? `${pct(end.value, top)}%` : "—"}</p>
          <p className="text-[11px] text-neutral-400">of leads {end?.name.toLowerCase() ?? "converted"}</p>
        </div>
      </div>

      <ol className="relative mb-5 mt-5" onMouseLeave={() => setHover(undefined)}>
        {stages.map((s, i) => {
          const step = i > 0 ? steps[i - 1] : undefined;
          const w = (s.value / top) * 100;
          const dim = hover && hover !== s.id;
          return (
            <li key={s.id}>
              {step && (
                <div className="flex h-7 items-center pl-[7.75rem]">
                  <span
                    className={cn(
                      "-ml-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] tabular-nums",
                      step === worst && step.keep < 1 ? "bg-orange-50 font-medium text-orange-800 ring-1 ring-orange-200" : "text-neutral-500",
                    )}
                  >
                    <ArrowDown className="size-3" />
                    {!step.prev.value ? "—" : i === 1 ? `${Math.round(step.keep * 100)}% called so far` : `${Math.round(step.keep * 100)}% moved on`}
                  </span>
                </div>
              )}
              <div
                onMouseEnter={() => setHover(s.id)}
                onFocus={() => setHover(s.id)}
                tabIndex={0}
                aria-label={`${s.name}: ${fmt(s.value)}, ${pct(s.value, top)}% of leads${step?.prev.value ? `, ${Math.round(step.keep * 100)}% of ${step.prev.name.toLowerCase()}` : ""}`}
                className={cn("group flex items-center gap-3 rounded-lg outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-neutral-950", dim && "opacity-40")}
              >
                <span className="w-28 shrink-0 truncate text-sm text-neutral-600">{s.name}</span>
                <span className="relative flex h-6 min-w-0 flex-1 items-center">
                  <span className="absolute inset-y-0 left-0 w-full rounded-r-[4px] bg-neutral-100/70" />
                  <span
                    className="relative h-full rounded-r-[4px] transition-[width] duration-700 ease-out"
                    style={{ width: `${Math.max(w, s.value ? 1.5 : 0)}%`, background: rampFor(i, stages.length) }}
                  />
                  <span className="relative ml-2 shrink-0 whitespace-nowrap text-sm">
                    <span className="font-semibold tabular-nums text-neutral-950">{fmt(s.value)}</span>
                    {i > 0 && <span className="ml-1.5 text-xs tabular-nums text-neutral-400">{pct(s.value, top)}%</span>}
                  </span>
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      {worst && worst.keep < 1 && (
        <p className="relative mt-auto flex items-center gap-2 rounded-xl bg-neutral-50 px-3 py-2.5 text-xs text-neutral-600">
          <TrendingDown className="size-4 shrink-0 text-orange-700" />
          <span>
            Biggest drop is <b className="font-semibold text-neutral-950">{worst.prev.name} → {worst.s.name}</b>: {fmt(worst.prev.value - worst.s.value)} of{" "}
            {fmt(worst.prev.value)} stopped there.
          </span>
        </p>
      )}
    </section>
  );
}

function Outcomes({ groups, called, className }: { groups: Group[]; called: number; className?: string }) {
  const [hover, setHover] = useState<string>();
  const shown = groups.filter((g) => g.value > 0);

  return (
    <section className={cn("rounded-2xl border border-neutral-200 p-5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold tracking-tight">Call outcomes</h3>
          <p className="text-xs text-neutral-400">How every labelled call ended</p>
        </div>
        <div className="text-right">
          <p className="font-brand text-3xl font-bold tracking-[-0.04em]">{fmt(called)}</p>
          <p className="text-[11px] text-neutral-400">calls labelled</p>
        </div>
      </div>

      {/* Tall segmented bar: one whole, split into outcomes. */}
      <div
        role="img"
        aria-label={shown.length ? shown.map((g) => `${g.name} ${fmt(g.value)} (${pct(g.value, called)}%)`).join(", ") : "No calls labelled yet"}
        className="mt-5 flex h-7 gap-0.5"
        onMouseLeave={() => setHover(undefined)}
      >
        {shown.length ? (
          shown.map((g) => {
            const share = pct(g.value, called);
            return (
              <span
                key={g.id}
                onMouseEnter={() => setHover(g.id)}
                title={`${g.name}: ${fmt(g.value)} (${share}%)`}
                className={cn("flex min-w-[3px] items-center overflow-hidden rounded-[4px] px-2 text-[11px] font-semibold tabular-nums transition-opacity", hover && hover !== g.id && "opacity-35")}
                style={{ flexGrow: g.value, flexBasis: 0, background: g.color, color: inkOn(g.color) }}
              >
                {share >= 12 && `${share}%`}
              </span>
            );
          })
        ) : (
          <span className="flex flex-1 items-center justify-center rounded-[4px] border border-dashed border-neutral-300 text-[11px] text-neutral-400">Label a call to see outcomes</span>
        )}
      </div>

      <ul className="mt-4 space-y-1" onMouseLeave={() => setHover(undefined)}>
        {groups.map((g) => (
          <li
            key={g.id}
            onMouseEnter={() => setHover(g.value ? g.id : undefined)}
            className={cn("rounded-xl px-2 py-2 transition-colors", hover === g.id && "bg-neutral-50", !g.value && "opacity-50")}
          >
            <div className="flex items-center gap-2.5 text-sm">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: g.color }} />
              <span className="min-w-0 flex-1 truncate font-medium text-neutral-800">{g.name}</span>
              <span className="font-semibold tabular-nums text-neutral-950">{fmt(g.value)}</span>
              <span className="w-10 text-right text-xs tabular-nums text-neutral-400">{pct(g.value, called)}%</span>
            </div>
            {g.value > 0 && g.parts.some((p) => p.value > 0) && (
              <ul className="ml-1 mt-2 space-y-1.5 border-l border-neutral-200 pl-3">
                {g.parts.map((p) => (
                  <li key={p.id} className="grid grid-cols-[minmax(0,1fr)_5rem_2rem] items-center gap-2 text-xs">
                    <span className="truncate text-neutral-600">{p.name}</span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
                      <span className="block h-full rounded-full" style={{ width: `${pct(p.value, g.value)}%`, background: p.color }} />
                    </span>
                    <span className="text-right tabular-nums text-neutral-500">{fmt(p.value)}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
