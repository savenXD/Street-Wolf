"use client";

import { ArrowRight, ArrowUpRight, Plus } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { BrandIcon, type BrandName } from "@/components/brand-icon";
import { Avatar } from "@/components/ui/avatar";
import { featureById } from "@/lib/features";
import { useToday } from "@/lib/presence";
import { campaignStats, conversionRate, memberOutreachPerDay } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { type Campaign, useWorkspace } from "@/lib/workspace";

export function Metric({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 p-5">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-3 font-brand text-4xl font-bold tracking-[-0.04em] tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-neutral-400">{hint}</p>
    </div>
  );
}

export const DAYS = 14;
// Zeroed outreach per day for people with no data (real counts drop straight in).
export const outreachPerDay: number[] = Array<number>(DAYS).fill(0);

// Each teammate gets the next colour in order: you are orange, the next person green, and so on.
export const memberColors = ["#f97316", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4", "#eab308", "#ef4444"];
export const memberColor = (i: number) => memberColors[i % memberColors.length];

export type Member = { userId?: string; /** Outreach done today (the person's own day). */ today: number; label: string; src: string | null; role: string; status: string; color: string };

const roleLabel = { owner: "Owner", admin: "Admin", member: "Member" } as const;

/** Account campaigns list the real members; guest ones show you, then invitees. Invited people always come last. */
export function useMembers(campaign: Campaign): Member[] {
  const { name, email, avatarUrl, userId } = useWorkspace();
  const today = useToday();
  // Today's count: the live number from the heartbeat/save when we have one, else the last value the server sent.
  const todayOf = (uid: string) => today[`${campaign.id}:${uid}`] ?? campaign.serverStats?.perDay[uid]?.at(-1) ?? 0;
  const people: Omit<Member, "color">[] = campaign.members
    ? [...campaign.members]
        .sort((a, b) => (a.userId === userId ? -1 : b.userId === userId ? 1 : 0))
        .map((m) => ({ userId: m.userId, today: todayOf(m.userId), label: m.name || m.email, src: m.avatarUrl, role: roleLabel[m.role], status: roleLabel[m.role] }))
    : [{ today: 0, label: name || email || "You", src: avatarUrl, role: "Owner", status: "Owner" }];
  const invited = campaign.team.map((t) => ({ today: 0, label: t, src: null, role: "Invited", status: "Invited · not joined yet" }));
  return [...people, ...invited].map((m, i) => ({ ...m, color: memberColor(i) }));
}

export type Series = { id: string; label: string; color: string; data: number[] };

/** Smooth path through points using horizontal-tangent cubic segments. */
function smooth(pts: [number, number][]) {
  return pts.reduce((d, [x, y], i) => {
    if (i === 0) return `M${x} ${y}`;
    const [px, py] = pts[i - 1];
    const cx = (px + x) / 2;
    return `${d} C${cx} ${py}, ${cx} ${y}, ${x} ${y}`;
  }, "");
}

/** One smooth line (with a soft gradient underneath) per series. */
export function OutreachChart({ series, className, title = "Outreach per day" }: { series: Series[]; className?: string; title?: string }) {
  const uid = useId();
  const W = 600;
  const H = 200;
  const n = series[0]?.data.length ?? DAYS;
  const all = series.flatMap((s) => s.data);
  const max = Math.max(5, Math.ceil(Math.max(0, ...all) / 5) * 5);
  const total = all.reduce((a, b) => a + b, 0);
  const labelFor = (i: number) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <section className={cn("rounded-2xl border border-neutral-200 p-5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold tracking-tight">{title}</h3>
          <p className="text-xs text-neutral-400">Last {n} days</p>
        </div>
        <p className="font-brand text-2xl font-bold tracking-[-0.03em] tabular-nums">{total}</p>
      </div>
      {series.length > 1 && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {series.map((s) => (
            <li key={s.id} className="flex items-center gap-1.5 text-xs text-neutral-600">
              <span className="size-2 rounded-full" style={{ background: s.color }} />
              <span className="max-w-40 truncate">{s.label}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="relative mt-4">
        <span className="absolute left-0 top-0 text-[10px] text-neutral-400">{max}</span>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-52 w-full overflow-visible" role="img" aria-label={title}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.id} id={`${uid}-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={series.length > 1 ? 0.18 : 0.35} />
                <stop offset="100%" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1="0" x2={W} y1={8 + (i * (H - 24)) / 3} y2={8 + (i * (H - 24)) / 3} stroke="#e5e5e5" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
          ))}
          {series.map((s, i) => {
            const pts = s.data.map((v, j): [number, number] => [(j / (n - 1)) * W, H - 8 - (v / max) * (H - 24)]);
            const line = smooth(pts);
            return (
              <g key={s.id}>
                <path d={`${line} L${W} ${H} L0 ${H} Z`} fill={`url(#${uid}-${i})`} />
                <path d={line} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              </g>
            );
          })}
        </svg>
        <div className="mt-2 flex justify-between text-[10px] text-neutral-400">
          {[0, Math.floor(n / 3), Math.floor((2 * n) / 3), n - 1].map((i) => (
            <span key={i}>{labelFor(i)}</span>
          ))}
        </div>
        {total === 0 && <p className="absolute inset-x-0 top-1/3 text-center text-sm text-neutral-400">No outreach yet</p>}
      </div>
    </section>
  );
}

export function CampaignView({ campaign }: { campaign: Campaign }) {
  const { addTeamMember } = useWorkspace();
  const members = useMembers(campaign);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const { leads, outreached, converted } = campaignStats(campaign);
  const rate = conversionRate({ leads, outreached, converted });

  // One logo per brand powering the chosen features (Google Maps, ElevenLabs, WhatsApp, ...).
  const brands = new Map<BrandName, string>();
  for (const f of campaign.features.map(featureById)) if (f) brands.set(f.brand, f.platform);

  return (
    <article className="space-y-6 rounded-3xl border border-neutral-200 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 max-w-full rounded-2xl border-2 border-dotted border-neutral-300 px-6 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Campaign name:</p>
          <h2 className="truncate font-brand text-4xl font-bold tracking-[-0.04em]">{campaign.name}</h2>
        </div>
        <div className="flex gap-2">
          {[...brands].map(([b, platform]) => (
            <span key={b} title={platform} className="flex size-10 items-center justify-center rounded-xl border border-neutral-200">
              <BrandIcon name={b} colored className="size-5" />
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Total leads" value={leads} hint="Found by scrapers" />
        <Metric label="Outreached" value={outreached} hint="Calls, DMs and messages sent" />
        <Metric label="Converted" value={converted} hint="Replied or booked" />
        <Metric label="Conversion rate" value={rate} hint="Converted / outreached" />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
      <OutreachChart
          series={members.map((m) => ({ id: m.label, label: m.label, color: m.color, data: memberOutreachPerDay(campaign, m.userId) }))}
          className="lg:col-span-2"
        />
      <section className="rounded-2xl border border-neutral-200 p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold tracking-tight">Team</h3>
          <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/team/${campaign.id}`}
            className="flex items-center gap-1 rounded-full border border-neutral-300 px-2.5 py-1 text-xs text-neutral-600 hover:border-neutral-950 hover:text-neutral-950"
          >
            Detailed view
            <ArrowUpRight className="size-3.5" />
          </Link>
          {campaign.myRole !== "member" && (
          <button
            onClick={() => setAdding((a) => !a)}
            aria-label="Add friend"
            className="flex size-7 items-center justify-center rounded-full border border-dashed border-neutral-400 text-neutral-500 hover:border-neutral-950 hover:text-neutral-950"
          >
            <Plus className="size-3.5" />
          </button>
          )}
          </div>
        </div>
        {adding && (
          <form
            className="mt-3"
            onSubmit={(e) => {
              e.preventDefault();
              const v = draft.trim().toLowerCase();
              if (/\S+@\S+\.\S+/.test(v)) addTeamMember(campaign.id, v);
              setDraft("");
              setAdding(false);
            }}
          >
            <input
              autoFocus
              type="email"
              required
              placeholder="friend@company.com"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setAdding(false)}
              className="h-10 w-full rounded-xl border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-950"
            />
          </form>
        )}
        <ul className="mt-3 divide-y divide-neutral-100">
          {members.map((m) => (
            <li key={m.label} className="flex items-center gap-3 py-3">
              <span className="relative">
                <Avatar
                  name={m.label}
                  src={m.src}
                  className={cn("size-10 ring-2", !m.src && "bg-neutral-500")}
                  style={{ "--tw-ring-color": m.color } as React.CSSProperties}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{m.label}</span>
                <span className="block text-xs text-neutral-500">{m.status}</span>
              </span>
              {m.userId && (
                <span className="shrink-0 text-right" title="Outreach done today">
                  <span className="block font-brand text-xl font-bold leading-none tracking-[-0.03em] tabular-nums">{m.today}</span>
                  <span className="mt-1 block text-[10px] text-neutral-400">today</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
      </div>

      <section>
        <h3 className="font-semibold tracking-tight">Features</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {campaign.features.includes("googlemaps:scrape") && (
          <Link
            href={`/dashboard/maps/${campaign.id}`}
            className="group relative flex aspect-[2.6/1] w-full flex-col justify-end overflow-hidden rounded-3xl border border-neutral-200 p-5 transition-all hover:-translate-y-0.5 hover:border-neutral-950 hover:shadow-lg"
          >
            {/* Map-style illustration */}
            <svg aria-hidden viewBox="0 0 160 160" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 -z-0 h-full w-full">
              <rect width="160" height="160" fill="#f2efe9" />
              <rect x="-10" y="92" width="86" height="78" rx="10" fill="#cfe8c4" />
              <path d="M104 -10 C 96 40, 130 70, 112 110 S 120 150, 128 172 L 172 172 L 172 -10 Z" fill="#b9d9f2" />
              <g fill="none" strokeLinecap="round">
                <path d="M-10 60 L 170 40" stroke="#fff" strokeWidth="9" />
                <path d="M40 -10 L 58 170" stroke="#fff" strokeWidth="9" />
                <path d="M-10 120 L 100 150" stroke="#fff" strokeWidth="6" />
                <path d="M-10 20 C 40 30, 70 10, 110 24" stroke="#fff" strokeWidth="5" />
                <path d="M-10 84 L 170 98" stroke="#fbd986" strokeWidth="7" />
                <path d="M-10 84 L 170 98" stroke="#f4c04e" strokeWidth="1" />
              </g>
              <rect x="64" y="52" width="22" height="16" rx="3" fill="#e4dfd5" />
              <rect x="10" y="30" width="18" height="14" rx="3" fill="#e4dfd5" />
              <rect x="72" y="118" width="20" height="14" rx="3" fill="#e4dfd5" />
              <rect y="96" width="160" height="64" fill="url(#maps-fade)" />
              <defs>
                <linearGradient id="maps-fade" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#fff" stopOpacity="0" />
                  <stop offset="1" stopColor="#fff" stopOpacity=".95" />
                </linearGradient>
              </defs>
            </svg>
            {/* Pin */}
            <span className="absolute left-1/2 top-[34%] flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-black/5 transition-transform group-hover:-translate-y-[60%]">
              <BrandIcon name="googlemaps" colored className="size-8" />
            </span>
            <ArrowRight className="absolute right-4 top-4 size-5 text-neutral-500 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-950" />
            <span className="relative">
              <span className="flex items-center gap-2 font-brand text-2xl font-bold leading-tight tracking-[-0.03em]"><BrandIcon name="googlemaps" colored className="size-6 shrink-0" />Google Maps</span>
              <span className="block text-sm text-neutral-500">
                {campaign.domains.length} {campaign.domains.length === 1 ? "domain" : "domains"} ·{" "}
                {campaign.domains.reduce((n, d) => n + d.cities.length, 0)} places
              </span>
            </span>
          </Link>
          )}
          <SoftTile
            title="ElevenLabs"
            brand="elevenlabs"
            sub="AI calling · coming soon"
            art={
              <svg aria-hidden viewBox="0 0 160 160" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
                <rect width="160" height="160" fill="#f5f5f4" />
                {/* Voice orb: ripple rings that spread on hover */}
                <g fill="none" stroke="#0a0a0a">
                  {[16, 30, 46, 64, 84].map((r, k) => (
                    <circle
                      key={r}
                      cx="80"
                      cy="54"
                      r={r}
                      strokeWidth={k === 0 ? 0 : 1.2}
                      opacity={0.5 - k * 0.08}
                      strokeDasharray={k % 2 ? "2 5" : undefined}
                      className="origin-[80px_54px] transition-transform duration-700 ease-out group-hover:scale-[1.12]"
                      style={{ transitionDelay: `${k * 40}ms` }}
                    />
                  ))}
                  <circle cx="80" cy="54" r="16" fill="#e5e5e5" stroke="none" />
                </g>
                <g fill="#0a0a0a" className="transition-opacity duration-300">
                  <circle cx="26" cy="30" r="3" opacity=".5" />
                  <circle cx="138" cy="40" r="2.5" opacity=".4" />
                  <circle cx="122" cy="76" r="2" opacity=".3" />
                  <circle cx="34" cy="74" r="2" opacity=".3" />
                </g>
                <rect y="96" width="160" height="64" fill="url(#el-fade)" />
                <defs>
                  <linearGradient id="el-fade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#fff" stopOpacity="0" />
                    <stop offset="1" stopColor="#fff" stopOpacity=".95" />
                  </linearGradient>
                </defs>
              </svg>
            }
            icon={<BrandIcon name="elevenlabs" className="size-8" />}
          />
          <SoftTile
            title="WhatsApp"
            brand="whatsapp"
            sub="Outreach · coming soon"
            art={
              <svg aria-hidden viewBox="0 0 160 160" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
                <rect width="160" height="160" fill="#e7f5ea" />
                <g fill="#cfe9d5">
                  {Array.from({ length: 6 }, (_, r) => Array.from({ length: 6 }, (_, c) => <circle key={`${r}-${c}`} cx={14 + c * 28 + (r % 2) * 14} cy={10 + r * 24} r="3" />))}
                </g>
                <rect x="16" y="22" width="70" height="26" rx="10" fill="#fff" />
                <rect x="26" y="31" width="40" height="4" rx="2" fill="#d4d4d4" />
                <rect x="26" y="38" width="26" height="4" rx="2" fill="#e5e5e5" />
                <rect x="70" y="58" width="74" height="26" rx="10" fill="#d9fdd3" />
                <rect x="80" y="67" width="44" height="4" rx="2" fill="#a7d9a0" />
                <rect x="80" y="74" width="28" height="4" rx="2" fill="#bfe6b9" />
                <rect x="16" y="92" width="56" height="22" rx="10" fill="#fff" />
                <rect x="26" y="100" width="34" height="4" rx="2" fill="#d4d4d4" />
                <rect y="96" width="160" height="64" fill="url(#wa-fade)" />
                <defs>
                  <linearGradient id="wa-fade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#fff" stopOpacity="0" />
                    <stop offset="1" stopColor="#fff" stopOpacity=".95" />
                  </linearGradient>
                </defs>
              </svg>
            }
            icon={<BrandIcon name="whatsapp" colored className="size-8" />}
          />
        </div>
      </section>
    </article>
  );
}

/** A feature tile that isn't available yet: same look as the live ones, but inert. */
function SoftTile({ title, sub, art, icon, brand }: { title: string; sub: string; art: React.ReactNode; icon: React.ReactNode; brand: BrandName }) {
  return (
    <div
      aria-disabled
      className="group relative flex aspect-[2.6/1] w-full cursor-default select-none flex-col justify-end overflow-hidden rounded-3xl border border-neutral-200 p-5 opacity-80 grayscale-[35%] transition-all duration-300 hover:-translate-y-0.5 hover:border-neutral-400 hover:opacity-100 hover:shadow-lg hover:grayscale-0"
    >
      <span className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-110">{art}</span>
      <span className="absolute left-1/2 top-[34%] flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-black/5 transition-transform duration-300 group-hover:-translate-y-[60%] group-hover:scale-105">{icon}</span>
      <span className="relative">
        <span className="flex items-center gap-2 font-brand text-2xl font-bold leading-tight tracking-[-0.03em]"><BrandIcon name={brand} colored className="size-6 shrink-0" />{title}</span>
        <span className="block text-sm text-neutral-500">{sub}</span>
      </span>
    </div>
  );
}
