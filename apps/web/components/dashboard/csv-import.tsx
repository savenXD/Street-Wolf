"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type Target = { key: string; name: string };
export type ImportRecord = { values: Record<string, string>; label?: string };
export type ImportMode = "add" | "replace";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function CsvImport({
  fileName,
  data,
  targets,
  existing,
  onClose,
  onImport,
}: {
  fileName: string;
  data: string[][];
  targets: Target[];
  existing: number;
  onClose: () => void;
  onImport: (records: ImportRecord[], mode: ImportMode) => void;
}) {
  const [header, setHeader] = useState(true);
  const [mode, setMode] = useState<ImportMode>("add");
  const width = Math.max(...data.map((r) => r.length));

  // Match each CSV column to a sheet column by header name; every target is used at most once.
  const [map, setMap] = useState<string[]>(() => {
    const used = new Set<string>();
    return Array.from({ length: width }, (_, i) => {
      const h = norm(data[0]?.[i] ?? "");
      const hit = h ? targets.find((t) => !used.has(t.key) && (norm(t.name) === h || norm(t.key) === h)) : undefined;
      if (hit) used.add(hit.key);
      return hit?.key ?? "";
    });
  });

  const body = header ? data.slice(1) : data;
  const mapped = map.filter(Boolean).length;
  const pick = (i: number, key: string) => setMap((m) => m.map((v, j) => (j === i ? key : key && v === key ? "" : v)));

  const run = () => {
    const records: ImportRecord[] = body.map((cells) => {
      const rec: ImportRecord = { values: {} };
      map.forEach((key, i) => {
        const v = (cells[i] ?? "").trim();
        if (!key || !v) return;
        if (key === "label") rec.label = v;
        else rec.values[key] = v;
      });
      return rec;
    });
    onImport(records, mode);
  };

  return (
    <Dialog open onClose={onClose} title="Import CSV" description={`${fileName} · ${body.length} rows · ${width} columns`} className="max-w-2xl">
      <div className="space-y-5">
        <label className="flex cursor-pointer items-center justify-between text-sm">
          <span className="font-medium">First row is a header</span>
          <input type="checkbox" checked={header} onChange={(e) => setHeader(e.target.checked)} className="size-4 accent-neutral-950" />
        </label>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">Match columns</p>
          <div className="max-h-[28vh] divide-y divide-neutral-100 overflow-y-auto rounded-xl border border-neutral-200">
            {Array.from({ length: width }, (_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{header ? data[0]?.[i] || `Column ${i + 1}` : `Column ${i + 1}`}</span>
                  <span className="block truncate text-xs text-neutral-400">{body[0]?.[i] || "—"}</span>
                </span>
                <span className="text-neutral-300">→</span>
                <select
                  value={map[i]}
                  onChange={(e) => pick(i, e.target.value)}
                  className={cn("h-9 w-44 rounded-lg border bg-white px-2 text-sm outline-none focus:border-neutral-950", map[i] ? "border-neutral-300" : "border-neutral-200 text-neutral-400")}
                >
                  <option value="">Skip</option>
                  {targets.map((t) => (
                    <option key={t.key} value={t.key}>{t.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">What to do with your current leads</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {([
              ["add", "Add to existing", `Keep your ${existing} current ${existing === 1 ? "lead" : "leads"} and put these after them.`],
              ["replace", "Replace existing", `Remove the ${existing} current ${existing === 1 ? "lead" : "leads"} and use only these. You can undo it with Ctrl+Z.`],
            ] as const).map(([v, title, hint]) => (
              <button
                key={v}
                onClick={() => setMode(v)}
                role="radio"
                aria-checked={mode === v}
                className={cn("rounded-xl border p-3 text-left transition-colors", mode === v ? "border-neutral-950 bg-neutral-50" : "border-neutral-200 hover:border-neutral-400")}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span className={cn("flex size-4 items-center justify-center rounded-full border", mode === v ? "border-neutral-950" : "border-neutral-300")}>
                    {mode === v && <span className="size-2 rounded-full bg-neutral-950" />}
                  </span>
                  {title}
                </span>
                <span className="mt-1 block text-xs text-neutral-500">{hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-100 pt-4">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!mapped || !body.length} onClick={run}>
            Import {body.length} {body.length === 1 ? "lead" : "leads"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
