"use client";

import { useEffect, useRef } from "react";

/** Grid of dots that drift away from the cursor and spring back. Static under reduced motion. */
export function DotField() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gap = 26;
    const mouse = { x: -999, y: -999 };
    let dots: { hx: number; hy: number; x: number; y: number }[] = [];
    let raf = 0;
    let w = 0;
    let h = 0;

    function resize() {
      const r = el!.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      w = r.width;
      h = r.height;
      el!.width = w * dpr;
      el!.height = h * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = [];
      for (let x = gap / 2; x < w; x += gap)
        for (let y = gap / 2; y < h; y += gap) dots.push({ hx: x, hy: y, x, y });
      draw();
    }

    function draw() {
      ctx!.clearRect(0, 0, w, h);
      ctx!.fillStyle = "#0a0a0a";
      for (const d of dots) {
        ctx!.globalAlpha = 0.18;
        ctx!.beginPath();
        ctx!.arc(d.x, d.y, 1.4, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function tick() {
      for (const d of dots) {
        const dx = d.x - mouse.x;
        const dy = d.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        const push = dist < 110 ? (110 - dist) / 110 : 0;
        const tx = d.hx + (dist ? (dx / dist) * push * 28 : 0);
        const ty = d.hy + (dist ? (dy / dist) * push * 28 : 0);
        d.x += (tx - d.x) * 0.12;
        d.y += (ty - d.y) * 0.12;
      }
      draw();
      raf = requestAnimationFrame(tick);
    }

    function move(e: PointerEvent) {
      const r = el!.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    }

    resize();
    window.addEventListener("resize", resize);
    if (!reduce) {
      window.addEventListener("pointermove", move);
      raf = requestAnimationFrame(tick);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", move);
    };
  }, []);

  return (
    <canvas
      ref={canvas}
      aria-hidden
      className="absolute inset-0 size-full [mask-image:radial-gradient(ellipse_at_center,transparent_20%,#000_80%)]"
    />
  );
}
