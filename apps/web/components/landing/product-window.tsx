"use client";

import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef } from "react";
import { HeroDemo } from "@/components/landing/hero-demo";

/** The live demo, tipped back in 3D; it flattens to face the viewer as it scrolls into place. */
export function ProductWindow() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.35"] });
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });
  const rotateX = useTransform(p, [0, 1], [24, 0]);
  const scale = useTransform(p, [0, 1], [0.9, 1]);
  const y = useTransform(p, [0, 1], [40, 0]);

  return (
    <div ref={ref} className="relative mx-auto max-w-5xl [perspective:1400px]">
      <div className="absolute inset-x-10 -top-6 -bottom-6 rounded-[2rem] bg-gradient-to-b from-neutral-100 to-transparent" aria-hidden />
      <motion.div style={{ rotateX, scale, y, transformOrigin: "50% 0%" }} className="relative">
        <HeroDemo />
      </motion.div>
    </div>
  );
}
