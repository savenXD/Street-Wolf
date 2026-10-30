"use client";

import { Pencil, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { parseSummary } from "@/lib/call-summary";

const MAX = 5000; // the server's limit for one cell

/**
 * One lead's call summary in a small window with a dotted background. Written as points ("- first - second"), shown as a list.
 * Opens to read when there is a summary and to write when there isn't; Edit switches, Save keeps it.
 */
export function CallSummaryDialog({ name, value, onSave, onClose }: { name: string; value: string; onSave: (v: string) => void; onClose: () => void }) {
  const [editing, setEditing] = useState(!value.trim());
  const [draft, setDraft] = useState(value);
  const area = useRef<HTMLTextAreaElement>(null);
  const points = parseSummary(value);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  useEffect(() => {
    if (editing) {
      const el = area.current;
      el?.focus();
      el?.setSelectionRange(el.value.length, el.value.length);
    }
  }, [editing]);

  const save = () => {
    if (draft !== value) onSave(draft.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-neutral-950/40" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Call summary" className="relative flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-neutral-200 bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-widest text-neutral-400 uppercase">Call summary</p>
            <h2 className="mt-0.5 truncate text-lg font-semibold tracking-tight">{name || "Lead"}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 flex size-10 shrink-0 items-center justify-center rounded-full text-neutral-500 active:bg-neutral-100">
            <X className="size-5" />
          </button>
        </div>

        {/* Dotted board the points sit on. */}
        <div className="mx-4 mt-4 min-h-40 flex-1 overflow-y-auto rounded-2xl border border-neutral-200 bg-neutral-50 p-4 [background-image:radial-gradient(#d4d4d4_1px,transparent_1px)] [background-size:16px_16px]">
          {editing ? (
            <textarea
              ref={area}
              value={draft}
              maxLength={MAX}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="- spoke to the owner&#10;- wants pricing on WhatsApp&#10;- call back Friday"
              className="min-h-40 w-full resize-none rounded-xl border border-neutral-200 bg-white/90 p-3 text-base leading-relaxed outline-none focus:border-neutral-950"
            />
          ) : (
            <ul className="space-y-2.5">
              {points.map((p, i) => (
                <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-neutral-900">
                  <span aria-hidden className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-neutral-950" />
                  <span className="min-w-0 whitespace-pre-wrap break-words">{p}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-2 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {editing ? (
            <>
              <p className="min-w-0 flex-1 text-xs text-neutral-400">Start each point with “-”.</p>
              <Button variant="outline" size="sm" onClick={value ? () => (setDraft(value), setEditing(false)) : onClose}>Cancel</Button>
              <Button size="sm" onClick={save}>Save</Button>
            </>
          ) : (
            <>
              <p className="min-w-0 flex-1 text-xs text-neutral-400">{points.length} {points.length === 1 ? "point" : "points"}</p>
              <Button variant="outline" size="sm" onClick={() => (setDraft(value), setEditing(true))}>
                <Pencil className="size-3.5" /> Edit
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
