"use client";

import { LinkPending } from "@/components/ui/spinner";
import { ArrowUpRight, Plus } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { BrandIcon, type BrandName } from "@/components/brand-icon";
import { Avatar } from "@/components/ui/avatar";
import { PlatformTiles } from "@/components/dashboard/platform-tiles";
import { campaignPlatforms } from "@/lib/platforms";
import { presetById } from "@/lib/presets";
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

export type Member = { userId?: string; /** Outreach done today (the person's own day). */ today: number; label: string; src: string | null; role: string; status: string; color: string; inviteLink?: string };

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
  const invited = campaign.team.map((t) => ({
    today: 0, label: t, src: null, role: "Invited", status: "Invited · not joined yet",
    inviteLink: campaign.pendingInvites?.find((i) => i.email === t)?.link,
  }));
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

/** "Invite" tag with a small "Copy" button that puts the working share link on the clipboard. */
function InviteLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-xs">
      <span className="rounded-md border border-neutral-200 px-2 py-1 text-neutral-500">Invite</span>
      <button
        type="button"
        title="Copy invite link. It only works for the invited email."
        onClick={() => navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}
        className="rounded-md bg-neutral-950 px-2 py-1 font-medium text-white hover:bg-neutral-800"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </span>
  );
}

export function CampaignView({ campaign }: { campaign: Campaign }) {
  const { addTeamMember, removeInvite } = useWorkspace();
  const members = useMembers(campaign);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const { leads, outreached, converted } = campaignStats(campaign);
  const rate = conversionRate({ leads, outreached, converted });

  // The platforms this campaign uses (one logo each); the tiles come from each platform, one per switched-on feature.
  const used = campaignPlatforms(campaign.features);
  const preset = presetById(campaign.preset);

  return (
    <article className="space-y-6 rounded-3xl border border-neutral-200 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 max-w-full rounded-2xl border-2 border-dotted border-neutral-300 px-6 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Campaign name:</p>
          <h2 className="truncate font-brand text-4xl font-bold tracking-[-0.04em]">{campaign.name}</h2>
        </div>
        <div className="flex gap-2">
          <span title={preset.tagline} className="flex h-10 items-center rounded-xl border border-neutral-200 px-3 text-sm font-semibold">
            {preset.name}
          </span>
          {used.map((m) => (
            <span key={m.id} title={m.name} className="flex size-10 items-center justify-center rounded-xl border border-neutral-200">
              <BrandIcon name={m.brand as BrandName} colored className="size-5" />
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
            <LinkPending />
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
              {m.inviteLink && <InviteLink link={m.inviteLink} />}
              {!m.userId && (
                <button
                  type="button"
                  title="Revoke this invite"
                  onClick={() => removeInvite(m.label, campaign.id)}
                  className="shrink-0 rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-500 hover:border-neutral-950 hover:text-neutral-950"
                >
                  Revoke
                </button>
              )}
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
          <PlatformTiles campaign={campaign} platformIds={used.map((m) => m.id)} />
        </div>
        {used.length === 0 && <p className="mt-2 text-sm text-neutral-500">No features switched on for this campaign.</p>}
      </section>
    </article>
  );
}

