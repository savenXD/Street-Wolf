// Call-outcome labels for a lead, as a tree: the call, whether they picked up, then how it went.
export type LabelNode = { id: string; name: string; color: string; children?: LabelNode[] };

export const palette = ["#525252", "#10b981", "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444", "#f97316", "#f59e0b", "#a3a3a3"];

export const defaultTree: LabelNode = {
  id: "called",
  name: "Called",
  color: "#525252",
  children: [
    {
      id: "picked",
      name: "Picked",
      color: "#10b981",
      children: [
        {
          id: "interested",
          name: "Interested",
          color: "#14b8a6",
          children: [
            { id: "converted", name: "Converted", color: "#16a34a" },
            {
              id: "busy",
              name: "Busy",
              color: "#f97316",
              children: [
                { id: "busy-not-interested", name: "Busy (not interested)", color: "#f87171" },
                { id: "busy-interested", name: "Busy (interested)", color: "#2dd4bf" },
              ],
            },
            { id: "will-think", name: "Client will think", color: "#8b5cf6" },
          ],
        },
        { id: "not-sure", name: "Not sure", color: "#3b82f6", children: [{ id: "follow-up", name: "Follow up needed", color: "#60a5fa" }] },
        { id: "not-interested", name: "Not interested", color: "#ef4444" },
      ],
    },
    { id: "no-pick", name: "Didn't pick", color: "#f59e0b" },
  ],
};

export type Placed = LabelNode & { depth: number; y: number; parent?: string };
type Layout = { nodes: Placed[]; leaves: number; maxDepth: number };

const cache = new WeakMap<LabelNode, Layout>();

/** Left-to-right layout: leaves get consecutive rows, parents sit at the middle of their children. */
export function layout(tree: LabelNode): Layout {
  const hit = cache.get(tree);
  if (hit) return hit;
  const nodes: Placed[] = [];
  let leaf = 0;
  const place = (n: LabelNode, depth: number, parent?: string): number => {
    const idx = nodes.length;
    nodes.push({ ...n, depth, y: 0, parent });
    let y: number;
    if (n.children?.length) {
      const ys = n.children.map((c) => place(c, depth + 1, n.id));
      y = (ys[0] + ys[ys.length - 1]) / 2;
    } else {
      y = leaf++;
    }
    nodes[idx].y = y;
    return y;
  };
  place(tree, 0);
  const out = { nodes, leaves: leaf, maxDepth: Math.max(...nodes.map((n) => n.depth)) };
  cache.set(tree, out);
  return out;
}

export const labelById = (tree: LabelNode, id?: string) => (id ? layout(tree).nodes.find((n) => n.id === id) : undefined);

/** Ids from the root down to `id`. */
export function pathTo(tree: LabelNode, id: string): string[] {
  const out: string[] = [];
  let cur = labelById(tree, id);
  while (cur) {
    out.unshift(cur.id);
    cur = cur.parent ? labelById(tree, cur.parent) : undefined;
  }
  return out;
}

// Immutable edits used by the label editor.
export const mapNode = (n: LabelNode, id: string, fn: (n: LabelNode) => LabelNode): LabelNode =>
  n.id === id ? fn(n) : { ...n, children: n.children?.map((c) => mapNode(c, id, fn)) };

export const addChild = (tree: LabelNode, parentId: string): LabelNode =>
  mapNode(tree, parentId, (n) => ({
    ...n,
    children: [...(n.children ?? []), { id: crypto.randomUUID(), name: "New label", color: palette[(n.children?.length ?? 0) % palette.length] }],
  }));

export const removeNode = (n: LabelNode, id: string): LabelNode => {
  const children = n.children?.filter((c) => c.id !== id).map((c) => removeNode(c, id));
  return { ...n, children: children?.length ? children : undefined };
};
