"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { addChild, defaultTree, type LabelNode, layout, mapNode, palette, removeNode } from "@/lib/labels";
import { cn } from "@/lib/utils";

export function LabelEditor({ tree, onSave, onClose }: { tree: LabelNode; onSave: (t: LabelNode | null) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(tree);
  const [picking, setPicking] = useState<string | null>(null);
  const { nodes } = layout(draft);
  // Pre-order list with depth, in the order the tree reads top to bottom.
  const rows: { n: LabelNode; depth: number }[] = [];
  const walk = (n: LabelNode, depth: number) => {
    rows.push({ n, depth });
    n.children?.forEach((c) => walk(c, depth + 1));
  };
  walk(draft, 0);

  return (
    <Dialog open onClose={onClose} title="Edit labels" description="Rename, recolour, add or remove the outcomes a lead can have. Changes apply to this whole campaign." className="max-w-2xl">
      <div>
        {rows.map(({ n, depth }) => (
          <div key={n.id}>
            <div className="flex items-center gap-2 py-1" style={{ paddingLeft: depth * 22 }}>
              {depth > 0 && <span className="h-px w-3 shrink-0 bg-neutral-300" />}
              <button
                onClick={() => setPicking(picking === n.id ? null : n.id)}
                aria-label={`Colour of ${n.name}`}
                className="size-6 shrink-0 rounded-full ring-2 ring-white ring-offset-1 ring-offset-neutral-200"
                style={{ background: n.color }}
              />
              <input
                value={n.name}
                onChange={(e) => setDraft(mapNode(draft, n.id, (x) => ({ ...x, name: e.target.value })))}
                className="h-9 min-w-0 flex-1 rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-950"
              />
              <button onClick={() => setDraft(addChild(draft, n.id))} aria-label={`Add under ${n.name}`} title="Add a label under this one" className="flex size-8 items-center justify-center rounded-full border border-dashed border-neutral-400 text-neutral-500 hover:border-neutral-950 hover:text-neutral-950">
                <Plus className="size-4" />
              </button>
              {depth > 0 ? (
                <button onClick={() => setDraft(removeNode(draft, n.id))} aria-label={`Remove ${n.name}`} title="Remove (and everything under it)" className="flex size-8 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-red-600">
                  <Trash2 className="size-4" />
                </button>
              ) : (
                <span className="size-8" />
              )}
            </div>
            {picking === n.id && (
              <div className="flex gap-1.5 py-1" style={{ paddingLeft: depth * 22 + (depth > 0 ? 20 : 0) }}>
                {palette.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setDraft(mapNode(draft, n.id, (x) => ({ ...x, color: c })));
                      setPicking(null);
                    }}
                    aria-label={c}
                    className={cn("size-6 rounded-full", n.color === c && "ring-2 ring-neutral-950 ring-offset-1")}
                    style={{ background: c }}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-4">
        <button onClick={() => setDraft(defaultTree)} className="text-sm text-neutral-500 hover:text-neutral-950">Reset to default</button>
        <div className="flex items-center gap-2">
          <span className="mr-2 text-xs text-neutral-400">{nodes.length} labels</span>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            onClick={() => {
              onSave(draft === defaultTree ? null : draft);
              onClose();
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
