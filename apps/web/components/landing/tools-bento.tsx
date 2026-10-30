"use client";

import { AnimatePresence, motion, useInView, useScroll, useSpring, useTransform } from "motion/react";
import { ArrowRight, Check, Star } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BrandGlyph, tileStyles } from "@/components/landing/brand-tile";
import { githubUrl } from "@/lib/site";

/** A looping counter that only runs while its element is on screen. Every mini-demo is a pure function of `t`. */
function useTick(ms: number, loop: number) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-60px" });
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const id = setInterval(() => setT((v) => (v + 1) % loop), ms);
    return () => clearInterval(id);
  }, [inView, ms, loop]);
  return [ref, t] as const;
}

const typed = (text: string, t: number, start: number, speed = 2) => text.slice(0, Math.max(0, (t - start) * speed));
const pop = { type: "spring", stiffness: 460, damping: 22 } as const;

/** Deals the card in as it scrolls into view: tipped back and low, then flat; `lag` staggers neighbours. */
function Card({ children, className = "", lag = 0 }: { children: ReactNode; className?: string; lag?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", `start ${0.62 - lag * 0.06}`] });
  const p = useSpring(scrollYProgress, { stiffness: 110, damping: 24 });
  const rotateX = useTransform(p, [0, 1], [26, 0]);
  const y = useTransform(p, [0, 1], [90 + lag * 30, 0]);
  const scale = useTransform(p, [0, 1], [0.9, 1]);
  const opacity = useTransform(p, [0, 0.5], [0, 1]);

  return (
    <div ref={ref} className={`[perspective:1200px] ${className}`}>
      <motion.div style={{ rotateX, y, scale, opacity, transformOrigin: "50% 0%" }} className="h-full">
        <div
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
            e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
          }}
          className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white p-6 transition-shadow duration-300 hover:shadow-[0_28px_56px_-28px_rgba(0,0,0,0.28)]"
        >
          {/* Cursor spotlight */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ background: "radial-gradient(320px circle at var(--mx,50%) var(--my,50%), rgba(0,0,0,0.045), transparent 70%)" }}
          />
          <div className="relative flex h-full flex-col">{children}</div>
        </div>
      </motion.div>
    </div>
  );
}

function Head({ kind, name, live }: { kind: keyof typeof tileStyles; name: string; live?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 items-center justify-center rounded-xl" style={{ background: tileStyles[kind] }}>
        <BrandGlyph kind={kind} className="size-5" />
      </span>
      <h3 className="font-semibold">{name}</h3>
      <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium ${live ? "bg-neutral-950 text-white" : "border border-neutral-200 text-neutral-500"}`}>
        {live ? "Live" : "Soon"}
      </span>
    </div>
  );
}

const Foot = ({ children }: { children: ReactNode }) => <p className="mt-auto pt-4 text-sm text-neutral-500">{children}</p>;

/* ───────────── Google Business Profiles: a search drops pins, results stream into a list ───────────── */
const PINS = [[18, 34], [44, 22], [63, 52], [80, 30], [32, 66], [86, 70]];
const FOUND = [
  { n: "Brew & Bean", r: "4.6", p: "+91 98••• 41820" },
  { n: "The Daily Grind", r: "4.4", p: "+91 90••• 17734" },
  { n: "Latte Lab", r: "4.8", p: "+91 97••• 20468" },
  { n: "Roastery & Co.", r: "4.7", p: "+91 98••• 66051" },
  { n: "Third Cup", r: "4.7", p: "+91 98••• 23380" },
  { n: "Bean Street", r: "4.6", p: "+91 91••• 77643" },
];

function MapDemo() {
  const [ref, t] = useTick(260, 44);
  const pins = Math.min(PINS.length, Math.max(0, Math.floor((t - 4) / 2)));
  const found = Math.min(FOUND.length, Math.max(0, Math.floor((t - 6) / 2.4)));
  const shown = FOUND.slice(Math.max(0, found - 3), found);
  return (
    <div ref={ref} className="relative mt-5 min-h-72 flex-1 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50">
      <svg className="absolute inset-0 size-full text-neutral-200" aria-hidden>
        <defs>
          <pattern id="bento-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M24 0H0V24" fill="none" stroke="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#bento-grid)" />
      </svg>
      {/* Radar sweep */}
      <motion.div
        aria-hidden
        animate={{ rotate: 360 }}
        transition={{ duration: 5, ease: "linear", repeat: Infinity }}
        className="absolute top-[45%] left-[50%] size-[160%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60"
        style={{ background: "conic-gradient(from 0deg, rgba(42,111,240,0.16), transparent 22%)" }}
      />
      {/* Search pill */}
      <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs shadow-sm">
        <span className="size-1.5 animate-pulse rounded-full bg-[#2a6ff0]" />
        <span className="font-medium">{typed("cafes in Pune", t, 0, 1) || " "}</span>
        <span className="text-neutral-400">{pins}/{PINS.length} found</span>
      </div>
      {PINS.slice(0, pins).map(([x, y], i) => (
        <motion.span
          key={i}
          initial={{ y: -40, opacity: 0, scale: 0.4 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={pop}
          className="absolute"
          style={{ left: `${x}%`, top: `${y}%` }}
        >
          <span className="absolute size-3 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-[#2a6ff0]/50" />
          <span className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#2a6ff0] shadow" />
        </motion.span>
      ))}
      {/* Results stream into a sheet-like list */}
      <div className="absolute inset-x-3 bottom-3 space-y-1.5">
        <AnimatePresence initial={false} mode="popLayout">
          {shown.map((f) => (
            <motion.div
              key={f.n}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white/95 px-3 py-2 text-xs shadow-sm backdrop-blur"
            >
              <span className="flex size-6 items-center justify-center rounded-md" style={{ background: tileStyles.gbp }}>
                <BrandGlyph kind="gbp" className="size-3.5" />
              </span>
              <span className="font-semibold">{f.n}</span>
              <span className="text-neutral-500">★ {f.r}</span>
              <span className="ml-auto text-neutral-400 tabular-nums">{f.p}</span>
              <Check className="size-3.5 text-emerald-600" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ───────────── Instagram: a comment becomes a DM that gets a reply ───────────── */
function DmDemo() {
  const [ref, t] = useTick(420, 16);
  const sent = t >= 7;
  return (
    <div ref={ref} className="mt-4 min-h-[8.5rem] space-y-2 text-sm">
      {t >= 1 && (
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={pop} className="w-fit rounded-2xl rounded-bl-sm bg-neutral-100 px-3 py-2">
          Love your latte art ☕
        </motion.div>
      )}
      {t >= 3 && (
        <motion.div layout initial={{ opacity: 0, x: 20, scale: 0.8 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={pop} className="ml-auto w-fit max-w-[90%] rounded-2xl rounded-br-sm bg-neutral-950 px-3 py-2 text-white">
          {sent ? (
            "Hey! Free sample for your cafe?"
          ) : (
            <span className="flex gap-1 py-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className="size-1.5 animate-bounce rounded-full bg-white" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </span>
          )}
        </motion.div>
      )}
      {t >= 10 && (
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={pop} className="flex w-fit items-center gap-1.5 rounded-2xl rounded-bl-sm bg-neutral-100 px-3 py-2">
          Yes please! <span>🙌</span>
        </motion.div>
      )}
    </div>
  );
}

/* ───────────── Reddit: scan a thread, flag buyer intent, save the author ───────────── */
function ThreadDemo() {
  const [ref, t] = useTick(380, 14);
  return (
    <div ref={ref} className="mt-4 min-h-[8.5rem] space-y-2 text-sm">
      <span className="block h-2 w-3/4 rounded bg-neutral-100" />
      <div className="relative overflow-hidden rounded-xl border border-[#ff4500]/40 bg-[#ff4500]/5 p-2.5 text-xs">
        “Anyone know a good CRM for a 5-person agency?”
        {/* Scan line */}
        {t >= 2 && t < 6 && (
          <motion.span
            key={t < 6 ? "scan" : "off"}
            initial={{ x: "-10%" }}
            animate={{ x: "110%" }}
            transition={{ duration: 1.4, ease: "easeInOut" }}
            className="absolute inset-y-0 w-10 bg-gradient-to-r from-transparent via-[#ff4500]/25 to-transparent"
          />
        )}
        <AnimatePresence>
          {t >= 5 && (
            <motion.span initial={{ scale: 0, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={pop} className="mt-1.5 block w-fit rounded-full bg-[#ff4500] px-2 py-0.5 text-[10px] font-medium text-white">
              buyer intent
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      {t >= 8 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
          <Check className="size-3.5" /> u/agency_owner saved to your sheet
        </motion.div>
      )}
    </div>
  );
}

/* ───────────── X: a post types itself, then publishes on schedule ───────────── */
function PostDemo() {
  const [ref, t] = useTick(300, 24);
  const text = "Launching our spring menu 🌸";
  const progress = Math.min(1, Math.max(0, (t - 12) / 8));
  const done = t >= 20;
  return (
    <div ref={ref} className="mt-4 min-h-[8.5rem] rounded-xl border border-neutral-200 p-3 text-xs">
      <div className="min-h-4">
        {typed(text, t, 1, 2)}
        {t < 12 && <span className="ml-px inline-block h-3 w-px translate-y-0.5 animate-pulse bg-neutral-950" />}
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-neutral-100">
        <div className="h-full rounded-full bg-neutral-950 transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="mt-1.5 h-4 text-neutral-400">
        {done ? (
          <motion.span initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1 font-medium text-neutral-950">
            <Check className="size-3.5" /> Posted to X · 1 reply in
          </motion.span>
        ) : t >= 12 ? (
          "Posting…"
        ) : (
          "Scheduled for 10:00"
        )}
      </div>
    </div>
  );
}

/* ───────────── Voice: a live call with captions ───────────── */
const CAPTIONS = ["Calling Brew & Bean…", "“Hi, this is Maya from Street Wolf…”", "“Sounds good, send the details.”"];
function VoiceDemo() {
  const [ref, t] = useTick(900, 6);
  const line = CAPTIONS[Math.min(2, Math.floor(t / 2))];
  return (
    <div ref={ref} className="mt-4 min-h-[8.5rem]">
      <div className="flex h-12 items-center gap-[3px]">
        {Array.from({ length: 22 }, (_, i) => (
          <span
            key={i}
            className="h-full w-1 origin-center animate-wave rounded-full bg-neutral-950"
            style={{ animationDelay: `${(i * 0.09) % 1}s`, animationDuration: `${0.8 + (i % 5) * 0.15}s` }}
          />
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.p key={line} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="mt-3 text-xs text-neutral-600">
          {line}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

/* ───────────── Build your own tool: the file writes itself, then registers ───────────── */
const CODE = [
  `export default defineTool({`,
  `  id: "my-tool",`,
  `  category: "scrape",`,
  `  inputSchema: z.object({ query: z.string() }),`,
  `  async run({ query }, ctx) {`,
  `    await ctx.saveLeads(await find(query));`,
  `  },`,
  `});`,
];
function CodeDemo() {
  const [ref, t] = useTick(300, 20);
  return (
    <div ref={ref} className="relative overflow-x-auto rounded-2xl bg-neutral-950 p-4 font-mono text-xs leading-relaxed text-neutral-300">
      {CODE.map((l, i) => (
        <div key={i} className="min-h-[1.4em] whitespace-pre">
          {typed(l, t, i * 1.2, 3)}
        </div>
      ))}
      <AnimatePresence>
        {t >= 12 && (
          <motion.span initial={{ opacity: 0, scale: 0.8, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }} transition={pop} className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
            <Check className="size-3" /> my-tool registered
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ToolsBento() {
  return (
    <div className="mt-10 grid gap-4 md:grid-cols-4 md:grid-rows-[repeat(2,minmax(0,1fr))]">
      <Card className="md:col-span-2 md:row-span-2">
        <Head kind="gbp" name="Google Business Profiles" live />
        <p className="mt-3 text-sm text-neutral-500">Name, phone, website, address, rating and review count for every business that matches your search.</p>
        <MapDemo />
      </Card>

      <Card lag={1}>
        <Head kind="instagram" name="Instagram" />
        <DmDemo />
        <Foot>Scrape profiles, send DMs.</Foot>
      </Card>

      <Card lag={2}>
        <Head kind="reddit" name="Reddit" />
        <ThreadDemo />
        <Foot>Find buyers in threads.</Foot>
      </Card>

      <Card lag={1}>
        <Head kind="x" name="X & auto-posting" />
        <PostDemo />
        <Foot>Scrape, reply, schedule.</Foot>
      </Card>

      <Card lag={2}>
        <Head kind="voice" name="AI voice caller" />
        <VoiceDemo />
        <Foot>Call leads with an ElevenLabs voice.</Foot>
      </Card>

      <Card className="md:col-span-4">
        <div className="grid items-center gap-6 md:grid-cols-2">
          <div>
            <span className="flex items-center gap-2 font-semibold">
              <Star className="size-4" /> Build your own tool
            </span>
            <p className="mt-2 max-w-sm text-neutral-600">A tool is one file: a name, an input schema and a run function. Save leads, log progress, done.</p>
            <a href={`${githubUrl}#build-a-tool`} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium hover:underline">
              Read the guide <ArrowRight className="size-3.5" />
            </a>
          </div>
          <CodeDemo />
        </div>
      </Card>
    </div>
  );
}
