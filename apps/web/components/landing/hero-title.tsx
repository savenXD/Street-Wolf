"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { LOGO_POOL, logoById } from "@/components/landing/logo-pool";

const INITIAL = ["claude", "instagram", "google"];
const SWAP_EVERY_MS = 6500;
const STAGGER_MS = 2200;

/** Each slot swaps on its own timer, offset from the others, never showing a logo another slot already shows. */
function useRotatingLogos() {
  const [ids, setIds] = useState(INITIAL);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const intervals: ReturnType<typeof setInterval>[] = [];
    INITIAL.forEach((_, slot) => {
      const swap = () =>
        setIds((prev) => {
          const start = LOGO_POOL.findIndex((l) => l.id === prev[slot]);
          for (let step = 1; step < LOGO_POOL.length; step++) {
            const next = LOGO_POOL[(start + step) % LOGO_POOL.length].id;
            if (!prev.includes(next)) return prev.map((id, i) => (i === slot ? next : id));
          }
          return prev;
        });
      timers.push(
        setTimeout(() => {
          swap();
          intervals.push(setInterval(swap, SWAP_EVERY_MS));
        }, 4500 + slot * STAGGER_MS),
      );
    });
    return () => {
      timers.forEach(clearTimeout);
      intervals.forEach(clearInterval);
    };
  }, []);

  return ids;
}

function Tile({ id, delay }: { id: string; delay: number }) {
  const logo = logoById[id];
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className="group relative mx-[0.05em] inline-block align-[-0.1em]"
    >
      <span className="relative block size-[0.9em]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={id}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, transition: { type: "spring", stiffness: 600, damping: 24 } }}
            exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.12, ease: "easeIn" } }}
            className="absolute inset-0 flex items-center justify-center rounded-[0.27em] shadow-[0_1px_0_rgba(255,255,255,0.35)_inset,0_8px_20px_-8px_rgba(0,0,0,0.35)] ring-1 ring-black/10"
            style={{ background: logo.bg }}
          >
            {logo.glyph("size-[0.54em]")}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="pointer-events-none absolute top-full left-1/2 z-10 mt-2 -translate-x-1/2 rounded-full bg-neutral-950 px-3 py-1 text-xs font-medium tracking-normal whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
        {logo.label}
      </span>
    </motion.span>
  );
}

function Word({ children, delay }: { children: ReactNode; delay: number }) {
  return (
    <motion.span
      initial={{ y: "0.4em", opacity: 0, filter: "blur(8px)" }}
      animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className="inline-block"
    >
      {children}
    </motion.span>
  );
}

export function HeroTitle() {
  const [a, b, c] = useRotatingLogos();
  return (
    <h1 className="mx-auto max-w-6xl text-center text-[2.8rem] leading-[1.06] font-semibold tracking-tighter text-balance sm:text-7xl lg:text-[5rem]">
      <Word delay={0}>Automated</Word> <Tile id={a} delay={0.25} /> <Word delay={0.1}>outreach</Word>
      <br />
      <Word delay={0.2}>across</Word> <Tile id={b} delay={0.4} /> <Word delay={0.3}>all</Word> <Tile id={c} delay={0.55} />{" "}
      <Word delay={0.4}>social media.</Word>
    </h1>
  );
}
