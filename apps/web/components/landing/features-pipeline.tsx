"use client";

import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AnimatePresence, motion, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { BrandIcon, type BrandName } from "@/components/brand-icon";
import { BrandGlyph, tileStyles } from "@/components/landing/brand-tile";

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

type Kind = "instagram" | "reddit" | "x" | "gbp";
// Four sources, evenly spread across a 1000-wide canvas. Every curve ends at the same hub.
const SOURCES: { kind: Kind; name: string; x: number; color: string }[] = [
  { kind: "instagram", name: "Instagram", x: 125, color: "#d62976" },
  { kind: "reddit", name: "Reddit", x: 375, color: "#ff4500" },
  { kind: "x", name: "X", x: 625, color: "#0a0a0a" },
  { kind: "gbp", name: "Google Maps", x: 875, color: "#2a6ff0" },
];
// Canvas is 1000 x 560 units. Tiles are positioned in the same units as the curves, so lines always start under their logo.
const H = 560;
const TILE = 72;
const LINE_START = 104;
const CARD = { x: 60, y: 290, w: 500, h: 240 };
const HUB_X = CARD.x + CARD.w / 2;
const OUT = { x: 750, y: 320, w: 240, h: 180 };
const MID_Y = CARD.y + CARD.h / 2;
// The AI filter sits on the line between the sheet and outreach; dots that fail it never reach the other side.
const FILTER = { size: 84, cx: (CARD.x + CARD.w + OUT.x) / 2 };
const LINE_END = OUT.x + 8; // tucks under the outreach card so the line visibly joins it
const OUT_LEN = LINE_END - (CARD.x + CARD.w);
const GATE = (FILTER.cx - FILTER.size / 2 - (CARD.x + CARD.w)) / OUT_LEN; // fraction of the line where the filter starts
const path = (x: number) => `M${x} ${LINE_START} C${x} 215, ${HUB_X} 200, ${HUB_X} ${CARD.y}`;
const pct = (v: number) => `${(v / H) * 100}%`;
const pctX = (v: number) => `${v / 10}%`;

const SAMPLE: { kind: Kind; name: string; sub: string }[] = [
  { kind: "gbp", name: "Brew & Bean", sub: "Pune · 4.6 ★" },
  { kind: "instagram", name: "@brewcraft.pune", sub: "12.4k followers" },
  { kind: "reddit", name: "u/agency_owner", sub: "wants a CRM" },
  { kind: "x", name: "@startup_sam", sub: "asked for a lead tool" },
  { kind: "gbp", name: "Latte Lab", sub: "Pune · 4.8 ★" },
  { kind: "instagram", name: "@latte.lab", sub: "8.1k followers" },
  { kind: "reddit", name: "u/growth_dan", sub: "hiring a growth tool" },
  { kind: "x", name: "@maya_builds", sub: "asked for outreach tips" },
];

/** The sheet in the middle: new leads drop in at the top, whichever source they came from. */
function Hub({ run }: { run: boolean }) {
  const [n, setN] = useState(3);
  useEffect(() => {
    if (!run) return;
    const id = setInterval(() => setN((v) => v + 1), 800);
    return () => clearInterval(id);
  }, [run]);
  const rows = [n, n - 1, n - 2, n - 3].map((i) => ({ ...SAMPLE[i % SAMPLE.length], i }));
  const leads = 120 + n; // one card in, one lead on the counter
  return (
    <div className="flex h-full flex-col rounded-2xl border border-neutral-200 bg-white p-[3.5%] shadow-[0_24px_48px_-24px_rgba(0,0,0,0.25)] text-[clamp(8px,1.25vw,13px)]">
      <div className="flex items-center justify-between">
        <span className="font-semibold">Cafes in Pune</span>
        <span className="text-neutral-500">
          Leads <b className="font-brand text-[1.4em] tracking-tight text-neutral-950 tabular-nums">{leads}</b>
        </span>
      </div>
      <div className="mt-[3%] flex min-h-0 flex-1 flex-col gap-[4%] overflow-hidden">
        <AnimatePresence initial={false} mode="popLayout">
          {rows.map((r) => (
            <motion.div
              key={r.i}
              layout
              initial={{ opacity: 0, y: -18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 120, damping: 22 }}
              className="flex items-center gap-[3%] rounded-lg bg-neutral-50 px-[3%] py-[2%]"
            >
              <span className="flex aspect-square w-[1.9em] shrink-0 items-center justify-center rounded-md" style={{ background: tileStyles[r.kind] }}>
                <BrandGlyph kind={r.kind} className="size-[60%]" />
              </span>
              <span className="truncate font-medium">{r.name}</span>
              <span className="ml-auto truncate text-neutral-500">{r.sub}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

const CHANNELS: { name: BrandName; bg: string }[] = [
  { name: "whatsapp", bg: "#25D366" },
  { name: "instagram", bg: tileStyles.instagram },
  { name: "x", bg: "#0a0a0a" },
];
const NAMES = ["Priya", "Arjun", "Maya", "Sam", "Dan", "Neha", "Rohan", "Zoya"];

/** The other end of the sheet: messages go out, replies come back. */
function Outreach({ run }: { run: boolean }) {
  const [n, setN] = useState(3);
  useEffect(() => {
    if (!run) return;
    const id = setInterval(() => setN((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, [run]);
  const rows = [n, n - 1, n - 2].map((i) => ({ i, name: NAMES[i % NAMES.length], ch: CHANNELS[i % 3], replied: i % 3 === 0 }));
  return (
    <div className="flex h-full flex-col rounded-2xl bg-neutral-950 p-[5%] text-[clamp(8px,1.2vw,13px)] text-white shadow-[0_24px_48px_-24px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-[0.5em] font-semibold">
          <span className="relative flex size-[0.6em]">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/70" />
            <span className="relative size-full rounded-full bg-emerald-400" />
          </span>
          Outreach
        </span>
        <b className="font-brand text-[1.4em] tracking-tight tabular-nums">{(40 + n).toLocaleString()}</b>
      </div>
      <div className="mt-[5%] flex min-h-0 flex-1 flex-col gap-[4%] overflow-hidden">
        <AnimatePresence initial={false} mode="popLayout">
          {rows.map((r) => (
            <motion.div
              key={r.i}
              layout
              initial={{ opacity: 0, x: -16, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              transition={{ type: "spring", stiffness: 120, damping: 22 }}
              className="flex items-center gap-[4%] rounded-lg bg-white/[0.07] px-[4%] py-[3%]"
            >
              <span className="flex aspect-square w-[1.8em] shrink-0 items-center justify-center rounded-md" style={{ background: r.ch.bg }}>
                <BrandIcon name={r.ch.name} className="size-[58%] text-white" />
              </span>
              <span className="truncate font-medium">{r.name}</span>
              <span className={r.replied ? "ml-auto rounded-full bg-emerald-400/20 px-[0.7em] py-[0.15em] text-emerald-300" : "ml-auto text-white/40"}>
                {r.replied ? "Replied" : "Sent"}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** The Ollama gate: leads that look like real buyers pass, the rest are stopped. Rings flash green or red as dots hit it. */
function Filter() {
  return (
    <div className="relative flex size-full flex-col items-center justify-center">
      <span className="pl-ring-ok pointer-events-none absolute inset-0 rounded-[26%] border-2 border-emerald-500 opacity-0" />
      <span className="pl-ring-bad pointer-events-none absolute inset-0 rounded-[26%] border-2 border-red-500 opacity-0" />
      <span className="relative flex size-full items-center justify-center overflow-hidden rounded-[26%] border border-neutral-200 bg-white">
        <BrandIcon name="ollama" className="size-[54%] text-neutral-950" />
      </span>
      <span className="absolute top-full mt-2 whitespace-nowrap text-[clamp(9px,1.1vw,12px)] font-medium text-neutral-600">Local AI filter</span>
    </div>
  );
}

/** Where every lead ends up: sources on top, one sheet on the left, outreach on the right. Draws itself as you scroll in. */
export function FeaturesPipeline() {
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const q = gsap.utils.selector(el);
      const curves = Array.from(el.querySelectorAll<SVGPathElement>(".pl-curve"));
      const out = el.querySelector<SVGPathElement>(".pl-out")!;
      const outDots = Array.from(el.querySelectorAll<SVGCircleElement>(".pl-odot"));
      curves.forEach((p) => {
        const L = p.getTotalLength();
        gsap.set(p, { strokeDasharray: L, strokeDashoffset: L });
      });
      gsap.set(q(".pl-tile"), { scale: 0, autoAlpha: 0 });
      gsap.set(q(".pl-hub"), { y: 70, autoAlpha: 0, scale: 0.9 });
      gsap.set(q(".pl-pill"), { x: 40, autoAlpha: 0 });
      gsap.set(q(".pl-filter"), { scale: 0.5, autoAlpha: 0 });
      gsap.set(out, { autoAlpha: 0 });

      // Everything draws in once, when scrolled to: tiles pop, curves reach for the hub, the hub rises, the output drops.
      gsap
        .timeline({ scrollTrigger: { trigger: el, start: "top 75%", once: true } })
        .to(q(".pl-tile"), { scale: 1, autoAlpha: 1, stagger: 0.12, ease: "back.out(2.4)" })
        .to(curves, { strokeDashoffset: 0, stagger: 0.12, ease: "none" }, ">-0.2")
        .to(q(".pl-hub"), { y: 0, autoAlpha: 1, scale: 1, ease: "power3.out" }, ">-0.1")
        .to(q(".pl-pill"), { x: 0, autoAlpha: 1, ease: "power3.out" }, "<")
        .to(out, { autoAlpha: 1, duration: 0.5 }, "<")
        .to(q(".pl-filter"), { scale: 1, autoAlpha: 1, ease: "back.out(2.2)", duration: 0.6 }, "<+0.3");


      // Leads travel along the curves into the sheet, forever, while it is on screen.
      const flows = [
        ...Array.from(el.querySelectorAll<SVGCircleElement>(".pl-dot")).map((dot) => {
          const src = Number(dot.dataset.src);
          const k = Number(dot.dataset.k);
          return gsap
            .timeline({ repeat: -1, paused: true, delay: k * 0.5 + src * 0.12 })
            .fromTo(dot, { opacity: 0 }, { opacity: 1, duration: 0.25 }, 0)
            .to(dot, { motionPath: { path: curves[src], align: curves[src], alignOrigin: [0.5, 0.5] }, duration: 2, ease: "sine.inOut" }, 0)
            .to(dot, { opacity: 0, scale: 0.4, transformOrigin: "50% 50%", duration: 0.3 }, 1.7)
            .to({}, { duration: 0.4 });
        }),
        // Every other dot is stopped at the filter: it turns red, drops and fades. The rest pass through (hidden under the block) and come out green.
        ...outDots.map((dot, k) => {
          const stopped = k % 2 === 1;
          const tl = gsap.timeline({ repeat: -1, paused: true, delay: k * 0.7 });
          tl.set(dot, { fill: "#a3a3a3", scale: 1, opacity: 0 }, 0).to(dot, { opacity: 1, duration: 0.2 }, 0);
          if (stopped) {
            tl.to(dot, { motionPath: { path: out, align: out, alignOrigin: [0.5, 0.5], start: 0, end: GATE }, duration: 0.6, ease: "none" }, 0)
              .to(dot, { fill: "#ef4444", duration: 0.12 }, 0.5)
              .fromTo(q(".pl-ring-bad"), { autoAlpha: 0.9, scale: 1 }, { autoAlpha: 0, scale: 1.25, duration: 0.5, ease: "power2.out" }, 0.6)
              .to(dot, { y: "+=18", scale: 0.3, opacity: 0, duration: 0.4, ease: "power2.in" }, 0.6)
              .to({}, { duration: 0.5 });
          } else {
            tl.to(dot, { motionPath: { path: out, align: out, alignOrigin: [0.5, 0.5], start: 0, end: 1 }, duration: 1.9, ease: "none" }, 0)
              .fromTo(q(".pl-ring-ok"), { autoAlpha: 0.9, scale: 1 }, { autoAlpha: 0, scale: 1.25, duration: 0.5, ease: "power2.out" }, 0.55)
              .set(dot, { fill: "#10b981" }, 0.9)
              .to(dot, { opacity: 0, duration: 0.2 }, 1.7)
              .to({}, { duration: 0.3 });
          }
          return tl;
        }),
      ];
      const hold = ScrollTrigger.create({
        trigger: el,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => flows.forEach((f) => (self.isActive ? f.play() : f.pause())),
      });
      return () => {
        flows.forEach((f) => f.kill());
        hold.kill();
      };
    });
    return () => mm.revert();
  }, []);

  return (
    <div
      ref={root}
      className="relative mx-auto mt-14 w-full max-w-5xl"
      style={{ aspectRatio: `1000 / ${H}` }}
      aria-label="Instagram, Reddit, X and Google Maps leads flow into one sheet, then into outreach"
    >
      <svg viewBox={`0 0 1000 ${H}`} className="absolute inset-0 size-full" fill="none" aria-hidden>
        {SOURCES.map((s) => (
          <path key={s.kind} d={path(s.x)} className="pl-curve" stroke="#d4d4d4" strokeWidth="2" strokeLinecap="round" />
        ))}
        <path d={`M${CARD.x + CARD.w} ${MID_Y} H${LINE_END}`} className="pl-out" stroke="#d4d4d4" strokeWidth="2" strokeLinecap="round" />
        {SOURCES.map((s, j) =>
          [0, 1, 2, 3, 4].map((k) => <circle key={`${j}${k}`} className="pl-dot" data-src={j} data-k={k} r="5.5" fill={s.color} opacity="0" cx="0" cy="0" />),
        )}
        {[0, 1, 2, 3, 4].map((k) => (
          <circle key={`o${k}`} className="pl-odot" r="5" fill="#a3a3a3" opacity="0" cx="0" cy="0" />
        ))}
      </svg>

      {SOURCES.map((s) => (
        <a
          key={s.kind}
          href={`#feature-${s.kind}`}
          className="pl-tile absolute top-0 -translate-x-1/2 transition-transform duration-200 hover:-translate-y-1"
          style={{ left: pctX(s.x), width: pctX(TILE) }}
        >
          <span className="flex aspect-square w-full items-center justify-center rounded-[22%] shadow-md" style={{ background: tileStyles[s.kind] }}>
            <BrandGlyph kind={s.kind} className="size-[56%]" />
          </span>
          <span className="absolute left-1/2 hidden -translate-x-1/2 whitespace-nowrap text-xs font-medium text-neutral-600 sm:block" style={{ top: "calc(100% + 6px)" }}>
            {s.name}
          </span>
        </a>
      ))}

      <div className="pl-hub absolute" style={{ left: pctX(CARD.x), width: pctX(CARD.w), top: pct(CARD.y), height: pct(CARD.h) }}>
        <Hub run={inView} />
      </div>

      <div className="pl-filter absolute" style={{ left: pctX(FILTER.cx - FILTER.size / 2), width: pctX(FILTER.size), top: pct(MID_Y - FILTER.size / 2), height: pct(FILTER.size) }}>
        <Filter />
      </div>

      <div className="pl-pill absolute" style={{ left: pctX(OUT.x), width: pctX(OUT.w), top: pct(OUT.y), height: pct(OUT.h) }}>
        <Outreach run={inView} />
      </div>
    </div>
  );
}
