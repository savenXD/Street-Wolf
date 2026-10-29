"use client";

import { AnimatePresence, motion, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { githubUrl } from "@/lib/site";

const lines = [
  { t: `$ git clone ${githubUrl}.git`, dim: false },
  { t: "$ docker compose up", dim: false },
  { t: "✓ database ready", dim: true },
  { t: "✓ migrations applied", dim: true },
  { t: "✓ tools loaded: google-maps", dim: true },
  { t: "✓ Street Wolf running on :3000", dim: false },
];

/** Types out the self-host flow line by line once it scrolls into view. */
export function Terminal() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const id = setInterval(() => setN((v) => Math.min(v + 1, lines.length)), 650);
    return () => clearInterval(id);
  }, [inView]);

  return (
    <div ref={ref} className="overflow-hidden rounded-2xl border border-neutral-800 bg-black">
      <div className="flex items-center gap-1.5 border-b border-neutral-800 px-4 py-3">
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-2.5 rounded-full bg-neutral-700" />
        ))}
        <span className="ml-3 font-mono text-xs text-neutral-500">~/street-wolf</span>
      </div>
      <div className="min-h-52 space-y-1.5 p-4 font-mono text-xs sm:text-sm">
        <AnimatePresence>
          {lines.slice(0, n).map((l) => (
            <motion.div
              key={l.t}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className={`truncate ${l.dim ? "text-neutral-500" : "text-white"}`}
            >
              {l.t}
            </motion.div>
          ))}
        </AnimatePresence>
        <span className="inline-block h-4 w-2 animate-blink bg-white" />
      </div>
    </div>
  );
}
