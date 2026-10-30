"use client";

import { useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { brandIcon, type BrandName } from "@/components/brand-icon";

/*
 * One continuous SVG scene, drawn in "flow space": x runs along the pipeline (0..1000) and y across it (0..400).
 * `m` maps that onto the screen, either as-is (wide) or turned 90deg and squashed (tall, for phones).
 * All motion is native SVG animation (SMIL), so it costs no JS and loops forever.
 */

const CYCLE = 5; // seconds, every particle repeats on this period

const SOURCES: BrandName[] = ["googlemaps", "instagram", "x", "reddit", "facebook", "tiktok"];
const sourceY = (i: number) => 45 + i * 62;
const CHANNELS: BrandName[] = ["whatsapp", "instagram", "x"];
const channelY = [110, 200, 290];

const ENGINE = { x: 330, y: 200 };
const GATE_X = 560;
const CHANNEL_X = 760;
const PAYOUT = { x: 940, y: 200 };

const REJECT_OFFSETS = [-60, -35, -15, 20, 45, 65, -48, 30, 5, -25, 55, 12, -70, 38];

type Pt = [number, number];
type Seg = [string, ...number[]];

const m = (tall: boolean, x: number, y: number): Pt => (tall ? [y, x * 0.8] : [x, y]);

function pathD(tall: boolean, segs: Seg[]) {
  return segs
    .map(([cmd, ...n]) => {
      const out: number[] = [];
      for (let i = 0; i < n.length; i += 2) out.push(...m(tall, n[i], n[i + 1]));
      return `${cmd}${out.join(" ")}`;
    })
    .join(" ");
}

type Stop = { at: number; color: string };

function Particle({ d, phase, window: w, stops, r = 3.4 }: { d: string; phase: number; window: number; stops: Stop[]; r?: number }) {
  const kt: number[] = [];
  const vals: string[] = [];
  stops.forEach((s, i) => {
    if (i > 0) {
      kt.push(s.at * w - 0.004);
      vals.push(stops[i - 1].color);
    }
    kt.push(i === 0 ? 0 : s.at * w);
    vals.push(s.color);
  });
  kt.push(1);
  vals.push(stops[stops.length - 1].color);

  const begin = `-${phase.toFixed(2)}s`;
  return (
    <g opacity={0}>
      <animateMotion dur={`${CYCLE}s`} begin={begin} repeatCount="indefinite" path={d} keyPoints="0;1;1" keyTimes={`0;${w};1`} calcMode="linear" />
      <animate attributeName="opacity" dur={`${CYCLE}s`} begin={begin} repeatCount="indefinite" values="0;1;1;0;0" keyTimes={`0;0.02;${w - 0.04};${w};1`} />
      <circle r={r * 2.6} opacity={0.22}>
        <animate attributeName="fill" dur={`${CYCLE}s`} begin={begin} repeatCount="indefinite" values={vals.join(";")} keyTimes={kt.join(";")} />
      </circle>
      <circle r={r}>
        <animate attributeName="fill" dur={`${CYCLE}s`} begin={begin} repeatCount="indefinite" values={vals.join(";")} keyTimes={kt.join(";")} />
      </circle>
    </g>
  );
}

function Tile({ tall, x, y, name, size = 38 }: { tall: boolean; x: number; y: number; name: BrandName; size?: number }) {
  const [cx, cy] = m(tall, x, y);
  const { path, color } = brandIcon(name);
  const s = (size * 0.52) / 24;
  return (
    <g>
      <rect x={cx - size / 2} y={cy - size / 2} width={size} height={size} rx={size * 0.3} fill="#fff" />
      <g transform={`translate(${cx - 12 * s} ${cy - 12 * s}) scale(${s})`}>
        <path d={path} fill={color} />
      </g>
    </g>
  );
}

function Crab({ tall }: { tall: boolean }) {
  const [cx, cy] = m(tall, ENGINE.x, ENGINE.y);
  const u = 5.5;
  const body = "#F26B5B";
  const r = (x: number, y: number, w: number, h: number, fill = body) => (
    <rect x={x * u} y={y * u} width={w * u} height={h * u} fill={fill} />
  );
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <rect x={-42} y={-42} width={84} height={84} rx={24} fill="#141414" stroke="#ffffff" strokeOpacity={0.14} />
      <g transform={`translate(${(-9 * u) / 2} ${(-6 * u) / 2})`}>
        <animateTransform attributeName="transform" type="translate" additive="sum" values="0 0;0 -2.5;0 0" dur="0.9s" repeatCount="indefinite" />
        {r(1, 0, 7, 4)}
        {r(0, 2, 1, 1)}
        {r(8, 2, 1, 1)}
        {[1, 3, 5, 7].map((x) => r(x, 4, 1, 2))}
        {r(2, 1, 1, 1, "#0a0a0a")}
        {r(6, 1, 1, 1, "#0a0a0a")}
      </g>
    </g>
  );
}

function Scene({ tall, id, total, animate }: { tall: boolean; id: string; total: number; animate: boolean }) {
  const D = (...segs: Seg[]) => pathD(tall, segs);
  const [ex, ey] = m(tall, ENGINE.x, ENGINE.y);
  const [gx0, gy0] = m(tall, GATE_X, 60);
  const [gx1, gy1] = m(tall, GATE_X, 340);
  const [px, py] = m(tall, PAYOUT.x, PAYOUT.y);

  const sourcePipe = (i: number): Seg[] => [["M", 86, sourceY(i)], ["C", 200, sourceY(i), 220, 200, 288, 200]];
  const channelPipe = (y: number): Seg[] => [["M", GATE_X, 200], ["C", 650, 200, 680, y, 740, y], ["C", 830, y, 860, 200, 912, 200]];

  const white = "#e5e5e5";
  const green = "#34d399";
  const gold = "#fbbf24";
  const red = "#fb7185";

  // Wide: caption sits under the scene. Tall: it sits beside it.
  const cap = (label: string, flowX: number) => {
    if (tall) return null;
    const [x, y] = m(tall, flowX, 392);
    return (
      <text
        x={tall ? 398 : x}
        y={tall ? y : y + 4}
        textAnchor={tall ? "end" : "middle"}
        dominantBaseline="middle"
        className="fill-white/35 text-[11px] font-medium uppercase tracking-[0.22em]"
      >
        {label}
      </text>
    );
  };

  return (
    <svg viewBox={tall ? "0 0 400 830" : "0 0 1000 400"} className="h-auto w-full" role="img" aria-label="Street Wolf scrapes social media, filters leads, reaches out and collects payouts">
      <defs>
        <linearGradient id={`${id}-gate`} x1="0" x2="0" y1="0" y2="1" gradientUnits="objectBoundingBox">
          <stop offset="0" stopColor="#34d399" stopOpacity="0" />
          <stop offset="0.5" stopColor="#34d399" stopOpacity="0.95" />
          <stop offset="1" stopColor="#34d399" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-gateh`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#34d399" stopOpacity="0" />
          <stop offset="0.5" stopColor="#34d399" stopOpacity="0.95" />
          <stop offset="1" stopColor="#34d399" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor="#F26B5B" stopOpacity="0.35" />
          <stop offset="1" stopColor="#F26B5B" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Pipes */}
      <g fill="none" stroke="#fff" strokeOpacity={0.09} strokeWidth={1.5}>
        {SOURCES.map((_, i) => (
          <path key={i} d={D(...sourcePipe(i))} />
        ))}
        <path d={D(["M", 372, 200], ["L", GATE_X, 200])} />
        {channelY.map((y) => (
          <path key={y} d={D(...channelPipe(y))} />
        ))}
      </g>

      {/* Engine glow + pulse */}
      <circle cx={ex} cy={ey} r={90} fill={`url(#${id}-glow)`} />
      {animate && (
        <circle cx={ex} cy={ey} r={46} fill="none" stroke="#F26B5B" strokeWidth={1.5}>
          <animate attributeName="r" values="46;78" dur="2.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.7;0" dur="2.5s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Gate: a vertical beam with a scanner sweeping along it */}
      <rect
        x={tall ? gx0 : gx0 - 1.5}
        y={tall ? gy0 - 1.5 : gy0}
        width={tall ? gx1 - gx0 : 3}
        height={tall ? 3 : gy1 - gy0}
        fill={`url(#${id}-${tall ? "gateh" : "gate"})`}
      />
      {animate && (
        <circle r={5} fill="#a7f3d0">
          <animateMotion dur="2.8s" repeatCount="indefinite" path={`M${gx0} ${gy0} L${gx1} ${gy1} L${gx0} ${gy0}`} />
        </circle>
      )}

      {/* Payout */}
      <circle cx={px} cy={py} r={30} fill="#141414" stroke={gold} strokeOpacity={0.55} />
      <text x={px} y={py + 1} textAnchor="middle" dominantBaseline="middle" className="fill-amber-300 text-[26px] font-semibold">
        $
      </text>
      {animate && (
        <circle cx={px} cy={py} r={30} fill="none" stroke={gold} strokeWidth={1.5}>
          <animate attributeName="r" values="30;56" dur="1.25s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.7;0" dur="1.25s" repeatCount="indefinite" />
        </circle>
      )}
      <text
        x={tall ? px : px}
        y={tall ? py + 52 : py + 62}
        textAnchor="middle"
        className="fill-amber-200 font-mono text-[15px] font-semibold"
      >
        +${total.toLocaleString("en-US")}
      </text>

      {/* Particles */}
      {animate && (
        <>
          {/* 1 · scraped profiles stream into the engine */}
          {SOURCES.flatMap((_, i) =>
            [0, 1].map((k) => (
              <Particle
                key={`s${i}-${k}`}
                d={D(...sourcePipe(i))}
                phase={i * 0.42 + k * (CYCLE / 2)}
                window={0.34}
                stops={[{ at: 0, color: white }]}
                r={3}
              />
            )),
          )}

          {/* 2 · the engine fires a spread of leads at the gate, most bounce off */}
          {REJECT_OFFSETS.map((yo, i) => {
            const y = 200 + yo;
            const dir = yo >= 0 ? 1 : -1;
            return (
              <Particle
                key={`r${i}`}
                d={D(["M", 372, 200], ["C", 450, 200, 480, y, GATE_X - 4, y], ["C", GATE_X + 14, y, GATE_X + 24, y + dir * 14, GATE_X + 34, y + dir * 100])}
                phase={(i * CYCLE) / REJECT_OFFSETS.length + 0.3}
                window={0.3}
                stops={[
                  { at: 0, color: white },
                  { at: 0.7, color: red },
                ]}
                r={3}
              />
            );
          })}

          {/* 3 · the few that fit your customer pass, get contacted, and some convert */}
          {Array.from({ length: 9 }, (_, i) => {
            const y = channelY[i % 3];
            const converts = i % 3 === 0;
            const segs = [
              ["M", 372, 200] as Seg,
              ["C", 450, 200, 490, 200, GATE_X, 200] as Seg,
              ["C", 650, 200, 680, y, 740, y] as Seg,
              ...(converts ? ([["C", 830, y, 860, 200, 912, 200]] as Seg[]) : []),
            ];
            const w = converts ? 0.82 : 0.52;
            return (
              <Particle
                key={`a${i}`}
                d={D(...segs)}
                phase={(i * CYCLE) / 9 + 0.1}
                window={w}
                stops={[
                  { at: 0, color: white },
                  { at: converts ? 0.34 : 0.5, color: green },
                  ...(converts ? [{ at: 0.9, color: gold }] : []),
                ]}
                r={3.8}
              />
            );
          })}
        </>
      )}

      {/* Nodes sit on top of the particles so dots appear to enter and leave them */}
      {SOURCES.map((name, i) => (
        <Tile key={name} tall={tall} x={60} y={sourceY(i)} name={name} />
      ))}
      <Crab tall={tall} />
      {CHANNELS.map((name, i) => (
        <Tile key={`${name}${i}`} tall={tall} x={CHANNEL_X} y={channelY[i]} name={name} size={40} />
      ))}

      {cap("Scrape", 190)}
      {cap("Filter", GATE_X)}
      {cap("Reach out", CHANNEL_X)}
      {cap("Payout", PAYOUT.x)}
    </svg>
  );
}

export function Architecture() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.25 });
  const reduced = useReducedMotion();
  const [total, setTotal] = useState(12480);

  // One payout lands per ring pulse.
  useEffect(() => {
    if (!inView || reduced) return;
    const id = setInterval(() => setTotal((t) => t + 240), 1250);
    return () => clearInterval(id);
  }, [inView, reduced]);

  const animate = !reduced;

  return (
    <div
      ref={ref}
      className="relative mt-12 overflow-hidden rounded-[2rem] bg-neutral-950 px-4 py-8 sm:px-8 sm:py-10"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.09)_1px,transparent_1px)] bg-[size:22px_22px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000,transparent)]"
        aria-hidden
      />
      <div className="relative mx-auto hidden max-w-5xl md:block">
        <Scene tall={false} id="w" total={total} animate={animate} />
      </div>
      <div className="relative mx-auto max-w-sm md:hidden">
        <Scene tall id="t" total={total} animate={animate} />
      </div>
    </div>
  );
}
