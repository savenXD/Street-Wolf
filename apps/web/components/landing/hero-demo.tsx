"use client";

import { AnimatePresence, motion, useInView } from "motion/react";
import { Bell, Camera, Check, CheckCheck, ChevronRight, GripVertical, MoreVertical, Play, Search, ShoppingBag, Square } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { BrandIcon } from "@/components/brand-icon";
import { LabelChip } from "@/components/dashboard/label-chip";
import type { LabelNode } from "@/lib/labels";

// Made-up sample data; purely decorative. The demo shows a campaign that is already well under way and simply keeps working:
// the scraper adds leads, WhatsApp messages go out to them a little behind, replies come in behind the messages and, every few
// seconds, a payment or an order lands. It never "finishes". Everything is a formula of one clock (in seconds), and only the
// handful of rows on screen are ever drawn, so it stays smooth however many leads the counters say.
const TICK = 10; // React hears about the clock this many times a second; the sheet and its scroll run every frame
const WRAP = 3000; // seconds, then the clock quietly starts over
const ROW_H = 36;

const LEADS = [
  { name: "Brew & Bean", cat: "Cafe", phone: "+91 98••• 41820", rating: "4.6", reviews: "812", site: "brewandbean.in", reply: "Yes please, send the menu" },
  { name: "The Daily Grind", cat: "Coffee shop", phone: "+91 90••• 17734", rating: "4.4", reviews: "391", site: "dailygrind.co", reply: "What's the price per kg?" },
  { name: "Latte Lab", cat: "Cafe", phone: "+91 97••• 20468", rating: "4.8", reviews: "1,204", site: "lattelab.in", reply: "Interested! Call me" },
  { name: "Chai & Chill", cat: "Tea house", phone: "+91 88••• 90312", rating: "4.3", reviews: "266", site: "chaichill.in", reply: "Sure 👍 send details" },
  { name: "Roastery & Co.", cat: "Roaster", phone: "+91 98••• 66051", rating: "4.7", reviews: "540", site: "roastery.co.in", reply: "Can we start with 3 kg?" },
  { name: "Brew Theory", cat: "Cafe", phone: "+91 99••• 38275", rating: "4.5", reviews: "703", site: "brewtheory.com", reply: "Yes, how do we order?" },
  { name: "Mocha Mornings", cat: "Cafe", phone: "+91 96••• 52019", rating: "4.2", reviews: "148", site: "mochamornings.in" },
  { name: "Bean Street", cat: "Coffee shop", phone: "+91 91••• 77643", rating: "4.6", reviews: "425", site: "beanstreet.cafe", reply: "Send samples first" },
  { name: "Crema Corner", cat: "Cafe", phone: "+91 98••• 10596", rating: "4.4", reviews: "219", site: "cremacorner.in", reply: "Great timing, we're out!" },
  { name: "Espresso Hub", cat: "Cafe", phone: "+91 93••• 84127", rating: "4.1", reviews: "97", site: "espressohub.in" },
  { name: "Third Cup", cat: "Cafe", phone: "+91 98••• 23380", rating: "4.7", reviews: "632", site: "thirdcup.in", reply: "Interested, what's the MOQ?" },
  { name: "Filter Kaapi Co.", cat: "Cafe", phone: "+91 89••• 45901", rating: "4.5", reviews: "388", site: "filterkaapi.co", reply: "Yes, let's talk 🙌" },
];
const N = LEADS.length;
const AREAS = ["Koregaon Park", "Baner", "Kothrud", "Viman Nagar", "Aundh", "Hadapsar", "Camp", "Wakad", "Kalyani Nagar", "Deccan"];
const COLORS = ["#2a6ff0", "#d62976", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];
const n0 = (n: number) => n.toLocaleString("en-IN");
const rupees = (n: number) => `₹${n0(n)}`;

/** Row k: the first 12 are the hand-written samples, every later row is the same shops in another area. */
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

// Where each stage's front is (a row number) at time t. Messages trail the scrape, replies trail the messages.
const S0 = 624, S_RATE = 2.2; // leads scraped
const M0 = 571, M_RATE = 1.7; // leads messaged
const R_LAG = 4; // a reply lands this many rows behind the message front
const scrapedFront = (t: number) => Math.floor(S0 + S_RATE * t);
const messagedFront = (t: number) => Math.floor(M0 + M_RATE * t);
const repliedFront = (t: number) => messagedFront(t) - R_LAG;
const hasReply = (k: number) => !!LEADS[k % N].reply && (k < N || ((k * 2654435761) >>> 0) % 100 < 55);
const REPLIES_UPTO = (() => {
  const a = new Uint32Array(messagedFront(WRAP) + 2);
  for (let k = 0; k < a.length - 1; k++) a[k + 1] = a[k] + (hasReply(k) ? 1 : 0);
  return a; // REPLIES_UPTO[r] = how many of rows 0..r-1 have replied
})();
const timeMessaged = (k: number) => (k + 1 - M0) / M_RATE;
const timeReplied = (k: number) => (k + 1 + R_LAG - M0) / M_RATE;

// A payment or an order every GAP seconds, round and round. Each is tied to a shop that has already replied.
const T0 = 2;
const GAP = 5;
const LIFE = 4;
const KINDS = ["upi", "order", "upi", "upi", "order", "upi", "order", "upi", "upi"] as const;
const AMOUNTS = [5000, 12500, 2500, 8000, 20000, 3200, 6400, 9500, 4200];
const ORDERS = ["40 cups", "3 kg beans", "monthly plan"];
const PAID0 = 6; // already collected before the demo starts
const REVENUE0 = 36000;
const eventAt = (j: number) => T0 + GAP * j;
const eventNow = (t: number) => Math.floor((t - T0) / GAP);
function eventLead(j: number) {
  let k = repliedFront(eventAt(j)) - 8 - (j % 5);
  while (k > 0 && !hasReply(k)) k--;
  return k;
}
function eventInfo(j: number) {
  const kind = KINDS[j % KINDS.length];
  const name = rowData(eventLead(j)).name;
  return kind === "upi"
    ? { j, kind, at: eventAt(j), lead: eventLead(j), amount: AMOUNTS[j % AMOUNTS.length], title: `${rupees(AMOUNTS[j % AMOUNTS.length])} received`, sub: `from ${name} · UPI` }
    : { j, kind, at: eventAt(j), lead: eventLead(j), amount: 0, title: `Order placed · #${1042 + j}`, sub: `${name} · ${ORDERS[j % ORDERS.length]}` };
}
const paidAt = (k: number, t: number) => {
  for (let j = Math.max(0, eventNow(t) - 14); j <= eventNow(t); j++) if (KINDS[j % KINDS.length] === "upi" && eventLead(j) === k) return eventAt(j);
  return Infinity;
};
function totals(t: number) {
  let paid = PAID0;
  let revenue = REVENUE0;
  for (let j = 0; j <= eventNow(t); j++) {
    if (KINDS[j % KINDS.length] !== "upi") continue;
    paid++;
    revenue += AMOUNTS[j % AMOUNTS.length];
  }
  return { paid, revenue };
}

// Same chip as the real sheet, with the outreach outcomes as its label tree.
const TREE: LabelNode = {
  id: "messaged",
  name: "Messaged",
  color: "#525252",
  children: [{ id: "interested", name: "Interested", color: "#14b8a6", children: [{ id: "converted", name: "Converted", color: "#16a34a" }] }],
};

function leadState(k: number, t: number) {
  const pa = paidAt(k, t);
  const sent = k < messagedFront(t);
  const replied = hasReply(k) && k < repliedFront(t);
  return {
    appeared: k < scrapedFront(t),
    sent,
    read: k < messagedFront(t) - 2,
    replied,
    paid: t >= pa,
    label: t >= pa ? "converted" : replied ? "interested" : sent ? "messaged" : undefined,
    lastAt: Math.max(t >= pa ? pa : 0, replied ? timeReplied(k) : 0, sent ? timeMessaged(k) : 0),
  };
}

/** The first visible row: a little behind the message front, so you see sent and answered rows together; it cuts to a shop whenever it pays. */
function topAt(t: number) {
  const j = eventNow(t);
  if (j >= 0 && t < eventAt(j) + LIFE - 0.5) return Math.max(0, eventLead(j) - 3);
  return Math.max(0, messagedFront(t) - 5);
}

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
const VISIBLE = 9;

const SheetRow = memo(function SheetRow({ k, appeared, label }: { k: number; appeared: boolean; label?: string }) {
  const d = rowData(k);
  const cells = [null, d.name, d.cat, d.phone, d.rating, d.reviews, d.site];
  return (
    <div className="flex" style={{ width: ROW_W, height: ROW_H }}>
      <div className="flex shrink-0 items-center justify-center border-b border-r border-neutral-200 bg-neutral-50 text-xs text-neutral-400" style={{ width: 48 }}>{k + 1}</div>
      {cells.map((c, j) => (
        <div key={j} style={{ width: COLS[j].w }} className="flex shrink-0 items-center overflow-hidden border-b border-r border-neutral-100 px-3 text-sm whitespace-nowrap">
          {appeared && (j === 0 ? <LabelChip tree={TREE} id={label} /> : <span className="truncate">{c}</span>)}
        </div>
      ))}
    </div>
  );
});

/**
 * A virtual sheet: only a screenful of rows exist. The scroll is driven every animation frame (a transform, no React work),
 * easing toward topAt(), so it glides at any speed; the row contents refresh with the 10-per-second tick.
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
      top.current = t < prev ? target : top.current + (target - top.current) * (1 - Math.exp(-dt * 2.5));
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
      <div className="relative h-[292px] overflow-hidden">
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
              const st = leadState(k, t);
              return <SheetRow key={k} k={k} appeared={st.appeared} label={st.label} />;
            })}
          </div>
        </div>
      </div>
      <div className="flex h-8 items-center justify-between border-t border-neutral-200 bg-neutral-50 px-3 text-xs text-neutral-500">
        <span className="truncate">cafes in Pune · coffee shops in Pune</span>
        <span className="shrink-0 tabular-nums">{n0(scrapedFront(t))} rows · {COLS.length - 1} columns</span>
      </div>
    </div>
  );
}

/** The seven chats with the latest activity (a message sent, a reply, a payment). Refreshed every ~1.2s so the list stays readable. */
function recentChats(t: number) {
  const front = messagedFront(t);
  const all: { k: number; at: number }[] = [];
  for (let k = Math.max(0, front - 40); k < front; k++) all.push({ k, at: leadState(k, t).lastAt });
  return all.sort((a, b) => b.at - a.at).slice(0, 7).map((x) => x.k);
}

function Phone({ s }: { s: number }) {
  const t = s / TICK;
  const sent = messagedFront(t);
  const replies = REPLIES_UPTO[Math.min(repliedFront(t), REPLIES_UPTO.length - 1)];
  const qs = Math.floor(s / 12) * 12;
  const chats = useMemo(() => recentChats(qs / TICK), [qs]);
  const list = chats.map((k) => ({ k, l: rowData(k), reply: LEADS[k % N].reply ?? "", st: leadState(k, qs / TICK) }));

  return (
    <div className="h-[440px] w-[250px] overflow-hidden rounded-[2.2rem] border-[6px] border-neutral-900 bg-white shadow-[0_30px_60px_-20px_rgba(0,0,0,0.45)]">
      <div className="flex items-center justify-between px-5 pt-2 text-[10px] font-semibold">
        <span>10:42</span>
        <span className="h-3.5 w-14 rounded-full bg-neutral-900" />
        <span>5G</span>
      </div>
      <div className="flex items-center justify-between px-4 pt-2 pb-1">
        <span className="flex items-center gap-1.5 text-xl font-bold tracking-tight text-[#128c7e]">
          <BrandIcon name="whatsapp" colored className="size-[22px]" />
          WhatsApp
        </span>
        <span className="flex items-center gap-3.5 text-neutral-700">
          <Camera className="size-4" />
          <Search className="size-4" />
          <MoreVertical className="size-4" />
        </span>
      </div>
      <div className="flex gap-1.5 px-4 py-1.5 text-[11px]">
        <span className="rounded-full bg-[#d9fdd3] px-2.5 py-1 font-medium text-[#0b6a3f]">All</span>
        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-neutral-600">Unread {n0(replies)}</span>
        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-neutral-600">Leads</span>
      </div>
      <div className="mx-3 mb-1 flex items-center justify-between rounded-lg bg-[#d9fdd3] px-2.5 py-1.5 text-[11px] font-medium text-[#0b6a3f]">
        <span>{`${n0(sent)} sent · ${n0(replies)} replies`}</span>
        <span className="flex items-center gap-1 tabular-nums"><span className="size-1.5 animate-pulse rounded-full bg-[#25d366]" />live</span>
      </div>
      <div>
        {list.map(({ k, l, reply, st }) => {
          const preview = st.paid ? "Payment done ✅" : st.replied ? reply : "Hi! Fresh beans for Pune cafes ☕ Free sample?";
          return (
            <motion.div
              key={k}
              layout="position"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex h-[48px] items-center gap-2.5 px-4"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white" style={{ background: COLORS[k % COLORS.length] }}>
                {l.name[0]}
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13px] font-semibold">{l.name}</span>
                  <span className={`text-[10px] ${st.replied && !st.paid ? "font-semibold text-[#25d366]" : "text-neutral-400"}`}>10:4{k % 10}</span>
                </div>
                <div className="flex items-center justify-between gap-1.5">
                  <span className={`flex min-w-0 items-center gap-1 truncate text-[11.5px] ${st.replied ? "font-medium text-neutral-900" : "text-neutral-500"}`}>
                    {!st.replied &&
                      (st.read ? <CheckCheck className="size-3.5 shrink-0 text-sky-500" /> : <Check className="size-3.5 shrink-0 text-neutral-400" />)}
                    <span className="truncate">{preview}</span>
                  </span>
                  {st.replied && !st.paid && <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#25d366] text-[9px] font-bold text-white">1</span>}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}


function Toasts({ t }: { t: number }) {
  const j = eventNow(t);
  const live = [j - 2, j - 1, j].filter((x) => x >= 0 && t < eventAt(x) + LIFE).map(eventInfo);
  return (
    <div className="pointer-events-none absolute top-3 left-3 z-30 flex w-[270px] flex-col gap-2 sm:left-6">
      <AnimatePresence mode="popLayout" initial={false}>
        {live.map((m) => (
          <motion.div
            key={m.j}
            layout="position"
            initial={{ opacity: 0, y: -14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97, transition: { duration: 0.3, ease: "easeOut" } }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="flex transform-gpu items-center gap-3 rounded-2xl border border-white/60 bg-white/55 px-3 py-2.5 shadow-[0_6px_20px_-10px_rgba(0,0,0,0.22)] backdrop-blur-xl"
          >
            {m.kind === "upi" ? (
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#5f259f]">
                <BrandIcon name="phonepe" className="size-6 text-white" />
              </span>
            ) : (
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-white">
                <ShoppingBag className="size-[18px]" />
              </span>
            )}
            <div className="min-w-0 leading-tight">
              <div className="text-[10px] font-semibold tracking-wide text-neutral-500 uppercase">{m.kind === "upi" ? "PhonePe" : "New order"}</div>
              <div className="truncate text-sm font-semibold text-neutral-950">{m.title}</div>
              <div className="truncate text-xs text-neutral-600">{m.sub}</div>
            </div>
            <span className="ml-auto self-start text-[10px] text-neutral-500">now</span>
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
      clock.current = (clock.current + Math.min(250, now - last) / 1000) % WRAP;
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
  const leads = scrapedFront(t);
  const outreached = messagedFront(t);
  const replies = REPLIES_UPTO[Math.min(repliedFront(t), REPLIES_UPTO.length - 1)];
  const { revenue } = totals(t);

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
                <div className="h-full w-2/5 animate-loadbar rounded-full bg-neutral-950" />
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
