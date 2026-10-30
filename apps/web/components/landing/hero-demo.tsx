"use client";

import { AnimatePresence, motion, useInView } from "motion/react";
import { Bell, Camera, Check, CheckCheck, ChevronRight, GripVertical, MoreVertical, PartyPopper, Play, Search, Square } from "lucide-react";
import { memo, useEffect, useRef, useState, type RefObject } from "react";
import { BrandIcon } from "@/components/brand-icon";
import { LabelChip } from "@/components/dashboard/label-chip";
import type { LabelNode } from "@/lib/labels";

// Made-up sample data; purely decorative. One new lead lands every GAP seconds and then plays out the same short story on its own
// timeline: scraped, WhatsApp sent (one grey tick), delivered (two grey), read (two blue), and then most answer: some interested,
// some not, and a few go on to pay. Every row, chat, counter and toast is a formula of one clock (in seconds), so nothing is stored
// and only the handful of rows on screen are ever drawn. Leads with a negative index are the ones already in the sheet at t = 0.
const TICK = 10; // React hears about the clock this many times a second; the sheet scroll runs every frame
const SPEED = 1.6; // demo clock runs this many times faster than real time
const WRAP = 900; // seconds, then the clock quietly starts over
const ROW_H = 36;

const LEADS = [
  { name: "Brew & Bean", cat: "Cafe", phone: "+91 98••• 41820", rating: "4.6", reviews: "812", site: "brewandbean.in", reply: "Yes please, send the menu" },
  { name: "The Daily Grind", cat: "Coffee shop", phone: "+91 90••• 17734", rating: "4.4", reviews: "391", site: "dailygrind.co", reply: "What's the price per kg?" },
  { name: "Latte Lab", cat: "Cafe", phone: "+91 97••• 20468", rating: "4.8", reviews: "1,204", site: "lattelab.in", reply: "Interested! Call me" },
  { name: "Chai & Chill", cat: "Tea house", phone: "+91 88••• 90312", rating: "4.3", reviews: "266", site: "chaichill.in", reply: "Sure 👍 send details" },
  { name: "Roastery & Co.", cat: "Roaster", phone: "+91 98••• 66051", rating: "4.7", reviews: "540", site: "roastery.co.in", reply: "Can we start with 3 kg?" },
  { name: "Brew Theory", cat: "Cafe", phone: "+91 99••• 38275", rating: "4.5", reviews: "703", site: "brewtheory.com", reply: "Yes, how do we order?" },
  { name: "Mocha Mornings", cat: "Cafe", phone: "+91 96••• 52019", rating: "4.2", reviews: "148", site: "mochamornings.in", reply: "Send samples first" },
  { name: "Bean Street", cat: "Coffee shop", phone: "+91 91••• 77643", rating: "4.6", reviews: "425", site: "beanstreet.cafe", reply: "Great timing, we're out!" },
  { name: "Crema Corner", cat: "Cafe", phone: "+91 98••• 10596", rating: "4.4", reviews: "219", site: "cremacorner.in", reply: "Interested, what's the MOQ?" },
  { name: "Espresso Hub", cat: "Cafe", phone: "+91 93••• 84127", rating: "4.1", reviews: "97", site: "espressohub.in", reply: "Yes, let's talk 🙌" },
  { name: "Third Cup", cat: "Cafe", phone: "+91 98••• 23380", rating: "4.7", reviews: "632", site: "thirdcup.in", reply: "Can you share a price list?" },
  { name: "Filter Kaapi Co.", cat: "Cafe", phone: "+91 89••• 45901", rating: "4.5", reviews: "388", site: "filterkaapi.co", reply: "Looks good, call us tomorrow" },
];
const NO_REPLIES = ["Not right now, thanks", "We already have a supplier", "No thanks, not interested"];
const N = LEADS.length;
const AREAS = ["Koregaon Park", "Baner", "Kothrud", "Viman Nagar", "Aundh", "Hadapsar", "Camp", "Wakad", "Kalyani Nagar", "Deccan"];
const COLORS = ["#2a6ff0", "#d62976", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];
const n0 = (n: number) => n.toLocaleString("en-IN");
const rupees = (n: number) => `₹${n0(n)}`;

/** Row k (0-based): the first 12 are the hand-written samples, every later row is the same shops in another area. */
function rowData(k: number) {
  const b = LEADS[k % N];
  const round = Math.floor(k / N);
  return {
    name: k < N ? b.name : `${b.name} · ${AREAS[round % AREAS.length]}`,
    cat: b.cat,
    phone: k < N ? b.phone : `+91 ${9 - (k % 2)}${k % 10}••• ${10000 + ((k * 7919) % 90000)}`,
    rating: k < N ? b.rating : (4 + ((k * 37) % 10) / 10).toFixed(1),
    reviews: k < N ? b.reviews : String(40 + ((k * 173) % 1500)),
    site: k < N ? b.site : b.site.replace(".", `${round}.`),
  };
}

// The sheet starts with FIRST rows; lead m (m >= 0 arrives later, m < 0 is already there) is row FIRST + m, 1-based.
const FIRST = 633;
const GAP = 2.6; // seconds between new leads
const arrival = (m: number) => 1 + m * GAP;
// Seconds after a lead arrives.
const SENT = 1.2; // WhatsApp message goes out (one grey tick)
const DELIVERED = 2.2; // two grey ticks
const READ = 4.2; // two blue ticks
const REPLY = 6.4; // their answer lands
const LABELLED = 0.8; // the sheet label follows the answer this much later
const PAID = 11; // a converted lead pays
const LIFE = 4.6; // seconds a payment toast stays up

type Outcome = "none" | "interested" | "no" | "converted";
// A repeating mix (13 is prime, so it never looks like a pattern): ~15% pay, ~30% interested, ~25% decline, the rest never answer.
const MIX: Outcome[] = ["converted", "none", "interested", "no", "interested", "none", "no", "interested", "converted", "no", "interested", "none", "no"];
const outcome = (m: number): Outcome => MIX[(((m + 2) % 13) + 13) % 13];
const replies = (m: number) => outcome(m) !== "none";
const AMOUNTS = [5000, 12500, 2500, 8000, 20000, 3200, 6400, 9500, 4200];
const amount = (m: number) => AMOUNTS[(((m + 2) % 13) + 13) % AMOUNTS.length];
const replyText = (m: number) => (outcome(m) === "no" ? NO_REPLIES[(((m % 3) + 3) % 3)] : LEADS[(FIRST - 1 + m) % N].reply);

// Counters: how many leads have passed a milestone by time t, from a prefix table over m = MIN..MAX.
const MIN = -40;
const MAX = Math.ceil(WRAP / GAP);
const prefix = (f: (m: number) => boolean) => {
  const a = new Uint32Array(MAX - MIN + 2);
  for (let m = MIN; m <= MAX; m++) a[m - MIN + 1] = a[m - MIN] + (f(m) ? 1 : 0);
  return a;
};
const REPLIED_UPTO = prefix(replies);
const PAID_UPTO = (() => {
  const a = new Uint32Array(MAX - MIN + 2);
  for (let m = MIN; m <= MAX; m++) a[m - MIN + 1] = a[m - MIN] + (outcome(m) === "converted" ? amount(m) : 0);
  return a;
})();
/** How many leads (m >= MIN) have reached a milestone `off` seconds after arriving. */
const reached = (t: number, off: number) => Math.max(0, Math.min(MAX - MIN + 1, Math.floor((t - 1 - off) / GAP) - MIN + 1));
const since0 = (f: (t: number) => number) => (t: number) => f(t) - f(0); // counters begin at their starting value
const arrived = (t: number) => Math.max(0, Math.floor((t - 1) / GAP) + 1); // new leads (m >= 0) so far
const sentSince = since0((t) => Math.floor((t - 1 - SENT) / GAP));
const repliesSince = since0((t) => REPLIED_UPTO[reached(t, REPLY)]);
const revenueSince = since0((t) => PAID_UPTO[reached(t, PAID)]);
const leadsAt = (t: number) => FIRST - 1 + arrived(t);
const outreachedAt = (t: number) => 580 + sentSince(t);
const repliedAt = (t: number) => 264 + repliesSince(t);
const revenueAt = (t: number) => 41000 + revenueSince(t);

// Same chip as the real sheet, with the outreach outcomes as its label tree.
const TREE: LabelNode = {
  id: "messaged",
  name: "Messaged",
  color: "#525252",
  children: [
    { id: "interested", name: "Interested", color: "#14b8a6", children: [{ id: "converted", name: "Converted", color: "#16a34a" }] },
    { id: "no", name: "Not interested", color: "#ef4444" },
  ],
};

/** What lead m looks like at time t. */
function leadState(m: number, t: number) {
  const ta = t - arrival(m);
  const o = outcome(m);
  const sent = ta >= SENT;
  const replied = o !== "none" && ta >= REPLY;
  const paid = o === "converted" && ta >= PAID; // the label turns Converted at the same moment the payment notification lands
  const label = paid ? "converted" : replied && ta >= REPLY + LABELLED ? (o === "no" ? "no" : "interested") : sent ? "messaged" : undefined;
  const ticks = ta >= READ ? 3 : ta >= DELIVERED ? 2 : 1; // 1 grey tick, 2 grey ticks, 2 blue ticks
  const lastAt = paid ? arrival(m) + PAID : replied ? arrival(m) + REPLY : arrival(m) + SENT;
  return { appeared: ta >= 0, sent, replied, paid, label, ticks, lastAt };
}

/** The scroll target: the newest row sits a few rows from the top, leaving two blank rows beneath it. */
const topAt = (t: number) => FIRST - 1 + arrived(t) - 1 - 4;

const COLS = [
  { label: "Label", w: 168 },
  { label: "Business name", w: 190 },
  { label: "Category", w: 120 },
  { label: "Phone", w: 150 },
  { label: "Rating", w: 80 },
  { label: "Review count", w: 110 },
  { label: "Website", w: 160 },
];
const ROW_W = 48 + COLS.reduce((n, c) => n + c.w, 0);
const letter = (i: number) => String.fromCharCode(65 + i);
const head = "h-8 shrink-0 border-b border-r border-neutral-200 bg-neutral-50 text-center text-xs leading-8 font-medium text-neutral-400 select-none";
const VISIBLE = 9; // rows drawn: 7 on screen plus one above and one below while the layer glides
const ROWS_SHOWN = 7;
const BASE = FIRST - 1; // row index (0-based) of lead m = BASE + m

const SheetRow = memo(function SheetRow({ k, appeared, label }: { k: number; appeared: boolean; label?: string }) {
  const d = rowData(k);
  const cells = [null, d.name, d.cat, d.phone, d.rating, d.reviews, d.site];
  return (
    <div className="flex" style={{ width: ROW_W, height: ROW_H }}>
      <div className="flex shrink-0 items-center justify-center border-b border-r border-neutral-200 bg-neutral-50 text-xs text-neutral-400" style={{ width: 48 }}>{k + 1}</div>
      {cells.map((c, j) => (
        <div key={j} style={{ width: COLS[j].w }} className="flex shrink-0 items-center overflow-hidden border-b border-r border-neutral-100 px-3 text-sm whitespace-nowrap">
          {appeared && (
            <span className="min-w-0 animate-rowin">{j === 0 ? <LabelChip tree={TREE} id={label} /> : <span className="block truncate">{c}</span>}</span>
          )}
        </div>
      ))}
    </div>
  );
});

/**
 * A virtual sheet: only a screenful of rows exist. The scroll is driven every animation frame (a transform, no React work),
 * easing toward topAt() so each new lead nudges the sheet up one row; the row contents refresh with the 10-per-second tick.
 */
function Sheet({ s, clock, running }: { s: number; clock: RefObject<number>; running: boolean }) {
  const layer = useRef<HTMLDivElement>(null);
  const top = useRef(topAt(clock.current));
  const k0 = useRef(Math.floor(top.current));

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    let prev = clock.current;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const t = clock.current;
      const target = topAt(t);
      top.current = t < prev ? target : top.current + (target - top.current) * (1 - Math.exp(-dt * 3 * SPEED));
      prev = t;
      if (layer.current) layer.current.style.transform = `translate3d(0, ${-(top.current - k0.current) * ROW_H}px, 0)`;
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [clock, running]);

  const t = s / TICK;
  k0.current = Math.floor(top.current);
  const rows = Array.from({ length: VISIBLE }, (_, i) => k0.current + i);

  return (
    <div className="mt-5 flex flex-col overflow-hidden rounded-2xl border border-neutral-300 bg-white">
      <div className="relative overflow-hidden" style={{ height: 72 + ROWS_SHOWN * ROW_H }}>
        <div className="absolute inset-x-0 top-0 z-10 bg-white" style={{ width: ROW_W }}>
          <div className="flex">
            <div className={head} style={{ width: 48 }} />
            {COLS.map((c, i) => (
              <div key={c.label} className={head} style={{ width: c.w }}>{letter(i)}</div>
            ))}
          </div>
          <div className="flex">
            <div className="h-10 shrink-0 border-b border-r border-neutral-200 bg-white" style={{ width: 48 }} />
            {COLS.map((c, i) => (
              <div key={c.label} className="flex h-10 shrink-0 items-center gap-1 border-b border-r border-neutral-200 bg-white px-3 text-sm font-semibold" style={{ width: c.w }}>
                {i > 0 && <GripVertical className="-ml-1.5 size-3.5 shrink-0 text-neutral-300" />}
                <span className="truncate">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute inset-x-0 top-[72px] bottom-0 overflow-hidden">
          <div ref={layer} className="will-change-transform">
            {rows.map((k) => {
              const st = leadState(k - BASE, t);
              return <SheetRow key={k} k={k} appeared={st.appeared} label={st.label} />;
            })}
          </div>
        </div>
      </div>
      <div className="flex h-8 items-center justify-between border-t border-neutral-200 bg-neutral-50 px-3 text-xs text-neutral-500">
        <span className="truncate">cafes in Pune · coffee shops in Pune</span>
        <span className="shrink-0 tabular-nums">{n0(leadsAt(t))} rows · {COLS.length - 1} columns</span>
      </div>
    </div>
  );
}

// The phone's clock: 8 seconds of the demo is one minute on it.
function clockAt(at: number) {
  const mins = 10 * 60 + 42 + Math.floor(at / 8);
  return `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")}`;
}

const CHATS_SHOWN = 6;
const CHAT_H = 52;
const WA_BLUE = "#53bdeb";

/** The chats with the latest activity (a message sent, an answer, a payment), newest first. */
function recentChats(t: number) {
  const latest = arrived(t) - 1;
  const all: { m: number; at: number }[] = [];
  for (let m = latest - 14; m <= latest; m++) {
    const st = leadState(m, t);
    if (st.sent) all.push({ m, at: st.lastAt });
  }
  return all.sort((a, b) => b.at - a.at).slice(0, CHATS_SHOWN).map((x) => x.m);
}

function Ticks({ n }: { n: number }) {
  return n === 1 ? (
    <Check className="size-[15px] shrink-0 text-neutral-400" strokeWidth={2.4} />
  ) : (
    <CheckCheck className="size-[15px] shrink-0" strokeWidth={2.4} style={{ color: n === 3 ? WA_BLUE : "#a3a3a3" }} />
  );
}

const Chat = memo(function Chat({ m, st }: { m: number; st: ReturnType<typeof leadState> }) {
  const l = rowData(BASE + m);
  const mine = !st.replied || st.paid; // whose message the preview is
  const preview = st.paid ? "Payment received, thank you 🙏" : st.replied ? replyText(m) : "Hi! Fresh beans for Pune cafes ☕ Free sample?";
  const unread = st.replied && !st.paid;
  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center gap-3 px-4"
      style={{ height: CHAT_H }}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold text-white" style={{ background: COLORS[(BASE + m) % COLORS.length] }}>
        {l.name[0]}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[13.5px] leading-5 font-semibold text-neutral-950">{l.name}</span>
          <span className={`shrink-0 text-[11px] leading-5 tabular-nums ${unread ? "font-semibold text-[#1fa855]" : "text-neutral-400"}`}>{clockAt(st.lastAt)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className={`flex min-w-0 items-center gap-1 text-[12.5px] leading-5 ${unread ? "font-medium text-neutral-900" : "text-neutral-500"}`}>
            {mine && <Ticks n={st.paid ? 3 : st.ticks} />}
            <span className="truncate">{preview}</span>
          </span>
          {unread && <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-[#25d366] text-[10px] font-bold text-white">1</span>}
        </div>
      </div>
    </motion.div>
  );
});

function Phone({ s }: { s: number }) {
  const t = s / TICK;
  const list = recentChats(t).map((m) => ({ m, st: leadState(m, t) }));

  return (
    <div className="w-[262px] overflow-hidden rounded-[2.3rem] border-[6px] border-neutral-900 bg-white shadow-[0_30px_60px_-20px_rgba(0,0,0,0.45)]">
      <div className="flex items-center justify-between px-6 pt-2.5 text-[11px] font-semibold">
        <span className="tabular-nums">{clockAt(t)}</span>
        <span className="h-4 w-16 rounded-full bg-neutral-900" />
        <span>5G</span>
      </div>
      <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
        <span className="flex items-center gap-1.5 text-[21px] font-bold tracking-tight text-[#128c7e]">
          <BrandIcon name="whatsapp" colored className="size-[22px]" />
          WhatsApp
        </span>
        <span className="flex items-center gap-3.5 text-neutral-700">
          <Camera className="size-4" />
          <Search className="size-4" />
          <MoreVertical className="size-4" />
        </span>
      </div>
      <div className="flex gap-1.5 px-4 py-2 text-[11.5px]">
        <span className="rounded-full bg-[#d9fdd3] px-3 py-1 font-medium text-[#0b6a3f]">All</span>
        <span className="rounded-full bg-neutral-100 px-3 py-1 text-neutral-600">Unread {n0(repliedAt(t))}</span>
        <span className="rounded-full bg-neutral-100 px-3 py-1 text-neutral-600">Leads</span>
      </div>
      <div className="mx-4 mb-1.5 flex items-center justify-between rounded-lg bg-[#d9fdd3] px-3 py-1.5 text-[11.5px] font-medium text-[#0b6a3f]">
        <span className="tabular-nums">{`${n0(outreachedAt(t))} sent · ${n0(repliedAt(t))} replies`}</span>
        <span className="flex items-center gap-1"><span className="size-1.5 animate-pulse rounded-full bg-[#25d366]" />live</span>
      </div>
      <div className="relative overflow-hidden" style={{ height: CHATS_SHOWN * CHAT_H + 4 }}>
        <AnimatePresence initial={false} mode="popLayout">
          {list.map(({ m, st }) => (
            <Chat key={m} m={m} st={st} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

const CONFETTI = ["#f43f5e", "#f59e0b", "#10b981", "#3b82f6", "#a855f7", "#eab308"];

/** A short pop of confetti off the toast's right edge: a party popper that tips in, and 18 flecks that fly out and fall. Transforms only. */
function PartyPop() {
  return (
    <div aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-0">
      <motion.span
        className="absolute -top-2 left-1 text-amber-500"
        initial={{ scale: 0, rotate: -40, opacity: 0 }}
        animate={{ scale: [0, 1.25, 1], rotate: [-40, 12, 0], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.6, times: [0, 0.3, 0.45, 1], ease: "easeOut" }}
      >
        <PartyPopper className="size-7" />
      </motion.span>
      {Array.from({ length: 18 }, (_, i) => {
        const ang = -Math.PI * 0.3 + (i / 17) * Math.PI * 0.85 + ((i * 37) % 7) * 0.03; // fans out to the right and down (the card clips anything above the toast)
        const dist = 50 + ((i * 53) % 45);
        const x = Math.cos(ang) * dist;
        const y = Math.sin(ang) * dist;
        return (
          <motion.span
            key={i}
            className="absolute rounded-[1px]"
            style={{ width: i % 3 ? 5 : 3, height: i % 3 ? 9 : 3, background: CONFETTI[i % CONFETTI.length] }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
            animate={{ x: [0, x, x * 1.12], y: [0, y, y + 30], opacity: [0, 1, 0], scale: [0.4, 1, 0.9], rotate: [0, 160 + i * 20] }}
            transition={{ duration: 1.3, delay: 0.05 + (i % 4) * 0.03, times: [0, 0.45, 1], ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}

/** PhonePe-style payment notifications, one at a time (a converted lead pays every ~17s). */
function Toasts({ t }: { t: number }) {
  const live: { m: number; at: number }[] = [];
  for (let m = Math.floor((t - 1 - PAID - LIFE) / GAP) - 1; m <= Math.floor((t - 1 - PAID) / GAP) + 1; m++) {
    const at = arrival(m) + PAID;
    if (outcome(m) === "converted" && t >= at && t < at + LIFE) live.push({ m, at });
  }
  return (
    <div className="pointer-events-none absolute top-3 left-3 z-30 flex w-[280px] flex-col gap-2 sm:left-6">
      <AnimatePresence mode="popLayout" initial={false}>
        {live.map(({ m }) => (
          <motion.div
            key={m}
            layout="position"
            initial={{ opacity: 0, y: -14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97, transition: { duration: 0.3, ease: "easeOut" } }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex transform-gpu items-center gap-3 rounded-2xl border border-white/60 bg-white/55 px-3 py-2.5 shadow-[0_6px_20px_-10px_rgba(0,0,0,0.22)] backdrop-blur-xl"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#5f259f]">
              <BrandIcon name="phonepe" className="size-6 text-white" />
            </span>
            <div className="min-w-0 leading-tight">
              <div className="text-[10px] font-semibold tracking-wide text-neutral-500 uppercase">PhonePe</div>
              <div className="truncate text-sm font-semibold text-neutral-950">{rupees(amount(m))} received</div>
              <div className="truncate text-xs text-neutral-600">from {rowData(BASE + m).name} · UPI</div>
            </div>
            <span className="ml-auto self-start text-[10px] text-neutral-500">now</span>
            <PartyPop />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt>{label}</dt>
      <dd className={`font-brand text-xl font-bold tracking-[-0.03em] tabular-nums ${tone ?? "text-neutral-950"}`}>{value}</dd>
    </div>
  );
}

// The progress bar fills toward this many leads, so it only moves when a lead lands.
const BAR_TARGET = 1000;
const STAGES = ["Scraping Google Maps", "WhatsApp outreach", "Replies & orders"];

/** A campaign already in full swing: leads keep arriving, WhatsApp keeps going out, replies and UPI payments keep coming in. */
export function HeroDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-100px" });
  const clock = useRef(0); // seconds
  const [s, setS] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    let last = performance.now();
    let shown = -1;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      clock.current = (clock.current + Math.min(250, now - last) * SPEED / 1000) % WRAP;
      last = now;
      const i = Math.floor(clock.current * TICK);
      if (i !== shown) {
        shown = i;
        setS(i);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [inView]);

  const t = s / TICK;
  const leads = leadsAt(t);
  const outreached = outreachedAt(t);
  const replies = repliedAt(t);
  const revenue = revenueAt(t);

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left shadow-[0_1px_0_#e5e5e5,0_24px_48px_-24px_rgba(0,0,0,0.18)]"
    >
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2 border-b border-neutral-200 px-3 py-3 sm:px-4">
        <span className="mr-2 hidden items-center gap-1.5 sm:flex">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-2.5 rounded-full bg-neutral-200" />
          ))}
        </span>
        {STAGES.map((label) => (
          <span key={label} className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-neutral-950">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            {label}
          </span>
        ))}
        <span className="ml-auto hidden text-xs text-neutral-500 md:block">Running now</span>
      </div>

      <div className="relative">
        <header className="flex h-12 items-center justify-between border-b border-neutral-200 px-6">
          <span className="font-brand text-2xl font-bold tracking-[-0.04em]">Street Wolf</span>
          <span className="flex items-center gap-3 text-neutral-500">
            <Bell className="size-[18px]" />
            <span className="flex size-7 items-center justify-center rounded-full bg-neutral-950 text-xs font-semibold text-white">S</span>
          </span>
        </header>

        <div className="px-6 pb-5">
          <nav className="mt-4 flex items-center gap-1.5 text-sm text-neutral-500">
            <BrandIcon name="googlemaps" colored className="size-4" /> Google Maps
            <ChevronRight className="size-3.5" /> Cafes <ChevronRight className="size-3.5" />
            <span className="font-medium text-neutral-950">Pune</span>
          </nav>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-8 gap-y-2">
            <h3 className="font-brand text-3xl font-bold tracking-[-0.04em]">
              Cafes <span className="text-neutral-400">in</span> Pune
            </h3>
            <dl className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm text-neutral-500">
              <Stat label="Leads" value={n0(leads)} />
              <Stat label="Outreached" value={n0(outreached)} />
              <Stat label="Replies" value={n0(replies)} />
              <Stat label="Revenue" value={rupees(revenue)} tone="text-emerald-600" />
            </dl>
          </div>

          <div className="mt-4 flex items-center gap-x-6 rounded-2xl border border-neutral-200 p-3.5">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex h-8 items-center gap-2 rounded-full bg-neutral-950 px-3.5 text-sm font-medium text-white opacity-40">
                <Play className="size-4" /> Start
              </span>
              <span className="inline-flex h-8 items-center gap-2 rounded-full border border-neutral-300 px-3.5 text-sm font-medium">
                <Square className="size-4" /> Stop
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 font-medium">
                  <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
                  Scraping, results appear live
                </span>
                <span className="tabular-nums text-neutral-500">{n0(leads)} leads · 2 queries</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                <div className="h-full rounded-full bg-neutral-950 transition-[width] duration-700 ease-out" style={{ width: `${(leads / BAR_TARGET) * 100}%` }} />
              </div>
            </div>
          </div>

          <Sheet s={s} clock={clock} running={inView} />
        </div>

        <Toasts t={t} />

        <div className="absolute top-[88px] right-3 z-20 sm:right-6">
          <Phone s={s} />
        </div>
      </div>
    </div>
  );
}
