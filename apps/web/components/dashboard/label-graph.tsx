"use client";

import { type LabelNode, layout, pathTo } from "@/lib/labels";
import { cn } from "@/lib/utils";

const NODE_H = 28;
const GAP_X = 26;
const PITCH = 34;
const PAD = 16;
const HEAD = 38;

const py = (y: number) => HEAD + PAD + y * PITCH;

export function LabelGraph({
  tree,
  selected,
  anchor,
  onPick,
  onClear,
}: {
  tree: LabelNode;
  selected?: string;
  anchor: DOMRect;
  onPick: (id: string) => void;
  onClear: () => void;
}) {
  const { nodes, leaves, maxDepth } = layout(tree);
  // Each column is only as wide as its longest label (dot + padding + ~6.4px per character at text-xs).
  const colW = Array.from({ length: maxDepth + 1 }, (_, d) =>
    Math.max(76, Math.ceil(Math.max(...nodes.filter((n) => n.depth === d).map((n) => n.name.length)) * 6.4) + 38),
  );
  const px = (d: number) => PAD + colW.slice(0, d).reduce((a, w) => a + w + GAP_X, 0);
  const W = PAD * 2 + colW.reduce((a, w) => a + w, 0) + maxDepth * GAP_X;
  const H = HEAD + PAD * 2 + (leaves - 1) * PITCH + NODE_H;
  const active = new Set(selected ? pathTo(tree, selected) : []);
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

  // Never scroll: if the graph is bigger than the screen, shrink it to fit. Then open under the cell, kept inside the viewport.
  const scale = Math.min(1, (window.innerWidth - 16) / W, (window.innerHeight - 16) / H);
  const w = W * scale;
  const h = H * scale;
  const left = Math.max(8, Math.min(anchor.left, window.innerWidth - w - 8));
  const top = Math.max(8, Math.min(anchor.bottom + 6, window.innerHeight - h - 8));

  return (
    <div
      role="dialog"
      aria-label="Label this lead"
      className="fixed z-50 overflow-hidden rounded-2xl border border-neutral-300 bg-neutral-50 shadow-2xl"
      style={{ left, top, width: w, height: h }}
    >
      <div
        className="relative origin-top-left"
        style={{ width: W, height: H, transform: `scale(${scale})`, backgroundImage: "radial-gradient(#d4d4d4 1px, transparent 1px)", backgroundSize: "14px 14px" }}
      >
      <div className="absolute inset-x-0 top-0 z-10 flex h-[38px] items-center justify-between border-b border-neutral-200 bg-white/80 px-3 backdrop-blur">
        <p className="text-xs">
          <span className="font-semibold">Call outcome</span>
          <span className="ml-2 text-neutral-500">Pick a node to label</span>
        </p>
        {selected && <button onClick={onClear} className="text-xs text-neutral-500 hover:text-neutral-950">Clear</button>}
      </div>

      <svg className="pointer-events-none absolute inset-0" width={W} height={H} aria-hidden>
        {nodes
          .filter((n) => n.parent)
          .map((n) => {
            const p = byId[n.parent!];
            const x1 = px(p.depth) + colW[p.depth];
            const y1 = py(p.y) + NODE_H / 2;
            const x2 = px(n.depth);
            const y2 = py(n.y) + NODE_H / 2;
            const mx = (x1 + x2) / 2;
            const on = active.has(n.id);
            return (
              <path
                key={n.id}
                d={`M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke={on ? n.color : "#d4d4d4"}
                strokeWidth={on ? 2.5 : 1.5}
                strokeLinecap="round"
              />
            );
          })}
      </svg>

      {nodes.map((n) => {
        const isSel = n.id === selected;
        return (
          <button
            key={n.id}
            onClick={() => onPick(n.id)}
            title={n.name}
            className={cn(
              "absolute flex items-center gap-1.5 rounded-lg border px-2.5 text-left text-xs font-medium shadow-sm transition-all hover:-translate-y-px hover:shadow-md",
              isSel ? "text-white" : "bg-white text-neutral-900",
            )}
            style={{
              left: px(n.depth),
              top: py(n.y),
              width: colW[n.depth],
              height: NODE_H,
              background: isSel ? n.color : undefined,
              borderColor: active.has(n.id) ? n.color : "#e5e5e5",
            }}
          >
            {!isSel && <span className="size-1.5 shrink-0 rounded-full" style={{ background: n.color }} />}
            <span className="truncate">{n.name}</span>
          </button>
        );
      })}
      </div>
    </div>
  );
}
