"use client";

import { ReactLenis } from "lenis/react";
import { useSyncExternalStore } from "react";

const query = "(prefers-reduced-motion: reduce)";
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(query);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

/** Lenis smooth scrolling for the whole page, skipped under reduced motion. Also smooths #anchor jumps. */
export function SmoothScroll() {
  const reduce = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => true,
  );
  if (reduce) return null;
  return <ReactLenis root options={{ anchors: true, lerp: 0.1 }} />;
}
