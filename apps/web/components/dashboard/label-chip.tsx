import { type LabelNode, labelById, pathTo } from "@/lib/labels";

/** The path's dots, joined by a line: more dots means the outcome is more specific. */
function Trail({ depth, color }: { depth: number; color: string }) {
  const n = depth + 1;
  const w = n * 9 + 2;
  return (
    <svg width={w} height="10" viewBox={`0 0 ${w} 10`} aria-hidden className="shrink-0">
      <line x1="4" x2={w - 5} y1="5" y2="5" stroke={color} strokeOpacity="0.5" strokeWidth="1.5" />
      {Array.from({ length: n }, (_, i) => (
        <circle key={i} cx={4 + i * 9} cy="5" r="3" fill={i === n - 1 ? color : "#fff"} stroke={color} strokeWidth="1.5" />
      ))}
    </svg>
  );
}

export function LabelChip({ tree, id }: { tree: LabelNode; id?: string }) {
  const node = labelById(tree, id);
  if (!node) {
    return <span className="inline-flex items-center rounded-full border border-dashed border-neutral-300 px-2.5 py-0.5 text-xs text-neutral-400">+ Label</span>;
  }
  const trail = pathTo(tree, node.id)
    .map((p) => labelById(tree, p)?.name)
    .join(" › ");
  return (
    <span
      title={trail}
      className="inline-flex items-center gap-2 whitespace-nowrap rounded-full py-0.5 pl-2 pr-3 text-xs font-medium text-neutral-900"
      style={{ background: `${node.color}1f`, boxShadow: `inset 0 0 0 1px ${node.color}55` }}
    >
      <Trail depth={node.depth} color={node.color} />
      {node.name}
    </span>
  );
}
