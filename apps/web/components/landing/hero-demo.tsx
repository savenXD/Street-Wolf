"use client";

import { AnimatePresence, motion, useInView } from "motion/react";
import { CalendarClock, Check, MessageCircle, Repeat2, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BrandGlyph, tileStyles } from "@/components/landing/brand-tile";

type Kind = Exclude<keyof typeof tileStyles, "voice">;

const PLATFORMS: { kind: Kind; name: string; total: number }[] = [
  { kind: "gbp", name: "Google Business", total: 412 },
  { kind: "instagram", name: "Instagram", total: 538 },
  { kind: "reddit", name: "Reddit", total: 197 },
  { kind: "x", name: "X", total: 137 },
];
const TOTAL_LEADS = PLATFORMS.reduce((n, p) => n + p.total, 0);
const TOTAL_REPLIES = 163;

// Made-up sample rows; purely decorative.
const LEADS: { kind: Kind; name: string; sub: string; msg: string; reply?: string }[] = [
  { kind: "gbp", name: "Blue Tokai Coffee", sub: "Pune · 4.6 ★", msg: "Hi! Loved your cold brew. Quick idea…", reply: "Sure, send details!" },
  { kind: "instagram", name: "@brewcraft.pune", sub: "12.4k followers", msg: "Hey! Your latte art is wild ☕" },
  { kind: "reddit", name: "u/agency_owner", sub: "r/smallbusiness · wants a CRM", msg: "Saw your thread, we built this…", reply: "Interesting, how much?" },
  { kind: "x", name: "@startup_sam", sub: "asked for a lead tool", msg: "Hey Sam, this might help…" },
  { kind: "gbp", name: "Roastery & Co.", sub: "Mumbai · 4.8 ★", msg: "Hi team, noticed your 4.8 rating…" },
  { kind: "instagram", name: "@latte.lab", sub: "8.1k followers", msg: "Love your feed! Can we chat?", reply: "Yes! DM me pricing" },
  { kind: "reddit", name: "u/growth_dan", sub: "r/saas · hiring a growth tool", msg: "Dan, built exactly for this…" },
  { kind: "x", name: "@maya_builds", sub: "asked for outreach tips", msg: "Hey Maya, a free one for you…" },
];

const PHASES = [
  { label: "Scrape", caption: "Scraping every platform at once" },
  { label: "Outreach", caption: "Texting every lead, automatically" },
  { label: "Follow-ups", caption: "Follow-ups send themselves" },
  { label: "Auto-post", caption: "Posting to every platform" },
];
const TICKS = 8;
const TICK_MS = 650;

function Tile({ kind, size = "size-7" }: { kind: Kind; size?: string }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-lg ${size}`} style={{ background: tileStyles[kind] }}>
      <BrandGlyph kind={kind} className="size-[58%]" />
    </span>
  );
}

function Status({ phase, i, tick, hasReply }: { phase: number; i: number; tick: number; hasReply: boolean }) {
  const done = tick >= i;
  let key = "new";
  if (phase === 1 && done) key = "sent";
  if (phase >= 2) key = phase === 2 && !done ? "sent" : hasReply ? "replied" : "follow";
  const look = {
    new: { cls: "bg-neutral-100 text-neutral-600", icon: null, text: "New" },
    sent: { cls: "bg-neutral-950 text-white", icon: <Check className="size-3" />, text: "Messaged" },
    follow: { cls: "border border-neutral-300 text-neutral-700", icon: <Repeat2 className="size-3" />, text: "Follow-up sent" },
    replied: { cls: "bg-emerald-50 text-emerald-700", icon: <MessageCircle className="size-3" />, text: "Replied" },
  }[key]!;
  return (
    <motion.span
      key={key}
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 16 }}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap ${look.cls}`}
    >
      {look.icon}
      {look.text}
    </motion.span>
  );
}

function LeadList({ phase, tick }: { phase: number; tick: number }) {
  const shown = phase === 0 ? tick + 1 : LEADS.length;
  return (
    <div>
      {LEADS.slice(0, shown).map((l, i) => {
        const sub =
          phase === 1 && tick >= i
            ? `“${l.msg}”`
            : phase === 2 && tick >= i
              ? l.reply
                ? `“${l.reply}”`
                : "Auto follow-up · day 3"
              : l.sub;
        return (
          <motion.div
            key={l.name}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="flex h-11 items-center gap-3 border-b border-neutral-100 px-4"
          >
            <Tile kind={l.kind} />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-sm font-medium">{l.name}</div>
              <div className="truncate text-xs text-neutral-500">{sub}</div>
            </div>
            <Status phase={phase} i={i} tick={tick} hasReply={!!l.reply} />
          </motion.div>
        );
      })}
    </div>
  );
}

function Composer({ tick }: { tick: number }) {
  return (
    <div className="grid gap-4 p-4 sm:grid-cols-[1.2fr_1fr]">
      <div className="rounded-2xl border border-neutral-200 p-4 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <Send className="size-3.5" /> New post
        </div>
        <p className="mt-3 text-sm leading-relaxed">Our spring menu is live 🌸 Come say hi and get a free cookie with any latte.</p>
        <div className="mt-3 h-24 rounded-xl bg-gradient-to-br from-amber-100 via-rose-100 to-sky-100" />
        <div className="mt-3 flex items-center gap-1.5 text-xs text-neutral-500">
          <CalendarClock className="size-3.5" /> Auto-scheduled · every day 10:00
        </div>
      </div>
      <div className="space-y-2">
        {PLATFORMS.map((p, i) => {
          const posted = tick >= i * 2;
          return (
            <div key={p.kind} className="flex items-center gap-3 rounded-xl border border-neutral-200 px-3 py-2.5">
              <Tile kind={p.kind} />
              <span className="flex-1 text-sm font-medium">{p.name}</span>
              <motion.span
                key={String(posted)}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 16 }}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  posted ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-500"
                }`}
              >
                {posted && <Check className="size-3" />}
                {posted ? "Posted" : "Queued"}
              </motion.span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Looping product story: scrape every platform, message every lead, follow up, then auto-post. */
export function HeroDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-100px" });
  const [t, setT] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const id = setInterval(() => setT((v) => (v + 1) % (PHASES.length * TICKS)), TICK_MS);
    return () => clearInterval(id);
  }, [inView]);

  const phase = Math.floor(t / TICKS);
  const tick = t % TICKS;
  const frac = (tick + 1) / TICKS;
  const ramp = (target: number, startPhase: number) =>
    phase < startPhase ? 0 : phase === startPhase ? Math.round(target * frac) : target;
  const leads = (p: number) => Math.round(PLATFORMS[p].total * (phase === 0 ? frac : 1));
  const total = phase === 0 ? Math.round(TOTAL_LEADS * frac) : TOTAL_LEADS;

  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left shadow-[0_1px_0_#e5e5e5,0_24px_48px_-24px_rgba(0,0,0,0.18)]"
    >
      {/* Stage stepper */}
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2 border-b border-neutral-200 px-3 py-3 sm:px-4">
        <span className="mr-2 hidden items-center gap-1.5 sm:flex">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-2.5 rounded-full bg-neutral-200" />
          ))}
        </span>
        {PHASES.map((p, i) => (
          <button
            key={p.label}
            onClick={() => setT(i * TICKS)}
            className={`relative overflow-hidden rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              i === phase ? "bg-neutral-950 text-white" : i < phase ? "text-neutral-950" : "text-neutral-400 hover:text-neutral-700"
            }`}
          >
            <span className="relative z-10 flex items-center gap-1.5">
              {i < phase && <Check className="size-3" />}
              {p.label}
            </span>
          </button>
        ))}
        <span className="ml-auto hidden items-center gap-1.5 text-xs text-neutral-500 md:flex">
          <span className="size-1.5 animate-pulse rounded-full bg-neutral-950" />
          {PHASES[phase].caption}
        </span>
      </div>

      <div className="grid md:grid-cols-[230px_1fr]">
        {/* Totals */}
        <div className="grid grid-cols-2 gap-px border-b border-neutral-200 bg-neutral-200 md:grid-cols-1 md:border-r md:border-b-0">
          <div className="col-span-2 bg-neutral-50 p-4 md:col-span-1">
            <div className="text-xs text-neutral-500">Leads collected</div>
            <div className="text-3xl font-semibold tracking-tight tabular-nums">{total.toLocaleString()}</div>
          </div>
          {PLATFORMS.map((p, i) => (
            <div key={p.kind} className="flex items-center gap-2.5 bg-white px-4 py-2.5">
              <Tile kind={p.kind} size="size-6" />
              <div className="leading-tight">
                <div className="text-sm font-semibold tabular-nums">{leads(i)}</div>
                <div className="text-[11px] text-neutral-500">{p.name}</div>
              </div>
            </div>
          ))}
          <div className="bg-white px-4 py-2.5">
            <div className="text-sm font-semibold tabular-nums">{ramp(TOTAL_LEADS, 1).toLocaleString()}</div>
            <div className="text-[11px] text-neutral-500">Messages sent</div>
          </div>
          <div className="bg-white px-4 py-2.5">
            <div className="text-sm font-semibold tabular-nums">{ramp(TOTAL_REPLIES, 2)}</div>
            <div className="text-[11px] text-neutral-500">Replies</div>
          </div>
        </div>

        {/* Stage view */}
        <div className="min-h-[24rem]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={phase === 3 ? "post" : "leads"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {phase === 3 ? <Composer tick={tick} /> : <LeadList phase={phase} tick={tick} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
