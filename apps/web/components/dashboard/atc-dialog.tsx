"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { buildAtc, dayLabel, fromIso, isoDay, parseAtc } from "@/lib/atc";
import { cn } from "@/lib/utils";

const MAX_NOTE = 500;
const WEEK = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * ATC (asked to callback): a short month calendar plus a note. Pick the day the client said to call back, jot why, Save.
 * Tapping the chosen day again unpicks it; Clear removes the whole entry.
 */
export function AtcDialog({ name, value, onSave, onClose }: { name: string; value: string; onSave: (v: string) => void; onClose: () => void }) {
  const initial = parseAtc(value);
  const [date, setDate] = useState(initial.date);
  const [note, setNote] = useState(initial.note);
  const [month, setMonth] = useState(() => {
    const d = initial.date ? fromIso(initial.date) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const today = isoDay(new Date());
  const lead = (month.getDay() + 6) % 7; // Monday first
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => isoDay(new Date(month.getFullYear(), month.getMonth(), i + 1)))];
  const step = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));

  const save = () => {
    const next = buildAtc({ date, note });
    if (next !== value) onSave(next);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-neutral-950/40" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Asked to callback" className="relative flex max-h-[92dvh] w-full max-w-sm flex-col overflow-hidden rounded-t-3xl border border-neutral-200 bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-widest text-neutral-400 uppercase">Asked to callback</p>
            <h2 className="mt-0.5 truncate text-lg font-semibold tracking-tight">{name || "Lead"}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 flex size-10 shrink-0 items-center justify-center rounded-full text-neutral-500 active:bg-neutral-100">
            <X className="size-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-4 pt-4">
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => step(-1)} aria-label="Previous month" className="flex size-9 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-200/60 active:bg-neutral-200">
                <ChevronLeft className="size-5" />
              </button>
              <span className="text-sm font-semibold">{month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</span>
              <button type="button" onClick={() => step(1)} aria-label="Next month" className="flex size-9 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-200/60 active:bg-neutral-200">
                <ChevronRight className="size-5" />
              </button>
            </div>
            <div className="mt-2 grid grid-cols-7 text-center text-[11px] font-medium text-neutral-400">
              {WEEK.map((d, i) => <span key={i} className="py-1">{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
              {cells.map((iso, i) =>
                iso ? (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setDate(iso === date ? "" : iso)}
                    aria-pressed={iso === date}
                    className={cn(
                      "mx-auto flex size-9 items-center justify-center rounded-full text-sm tabular-nums",
                      iso === date ? "bg-neutral-950 font-semibold text-white" : "text-neutral-800 hover:bg-neutral-200/60 active:bg-neutral-200",
                      iso === today && iso !== date && "ring-1 ring-neutral-400",
                    )}
                  >
                    {+iso.slice(8)}
                  </button>
                ) : (
                  <span key={`b${i}`} />
                ),
              )}
            </div>
          </div>

          <p className="mt-3 text-sm font-medium">{date ? dayLabel(date) : <span className="text-neutral-400">No date picked</span>}</p>
          <textarea
            value={note}
            maxLength={MAX_NOTE}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Note, e.g. owner said call after Diwali"
            className="mt-2 w-full resize-none rounded-xl border border-neutral-200 bg-white p-3 text-base leading-relaxed outline-none focus:border-neutral-950"
          />
        </div>

        <div className="flex items-center gap-2 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {value ? (
            <Button variant="outline" size="sm" onClick={() => (onSave(""), onClose())}>Clear</Button>
          ) : null}
          <span className="flex-1" />
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={save}>Save</Button>
        </div>
      </div>
    </div>
  );
}
