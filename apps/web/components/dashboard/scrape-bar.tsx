"use client";

import { AlertCircle, Check, CloudOff, Loader2, Play, Square, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type SaveState, type ScrapeJob, useSaveState, useWorkspace } from "@/lib/workspace";
import { useScraperStatus } from "./scraper-status";

const SAVE: Record<SaveState, { text: string; icon: typeof Check; cls: string }> = {
  saved: { text: "All changes saved", icon: Check, cls: "text-emerald-700" },
  saving: { text: "Saving…", icon: Loader2, cls: "text-neutral-500" },
  error: { text: "Couldn't save. Retrying on your next edit", icon: CloudOff, cls: "text-red-600" },
};

/**
 * Runs and shows a scrape for one sheet. Rows appear as the scraper saves them (polled every 2s while a scrape is active,
 * every 15s otherwise so a teammate's or another tab's changes still arrive), and the badge says whether your own edits are stored.
 */
export function ScrapeBar({ id, domainId, cityId, queries, resetKey = 0 }: { id: string; domainId: string; cityId: string; queries: number; resetKey?: number }) {
  const { syncSheet, startScrape, stopScrape } = useWorkspace();
  const save = useSaveState(cityId);
  const { status: scraper } = useScraperStatus();
  const [latest, setJob] = useState<ScrapeJob | null>(null);
  // Pressing "Set" in the setup drawer starts a fresh run: a finished/stopped job is hidden so the bar, label and buttons return to "Ready".
  const [cleared, setCleared] = useState<string | null>(null);
  // The X on a finished run hides the whole panel until a new request: a new job has a new id, and "Set" in the setup drawer clears it too.
  const dismissKey = `sw.scrape-dismissed.${cityId}`;
  const [dismissed, setDismissed] = useState<string | null>(() => {
    try {
      return localStorage.getItem(dismissKey);
    } catch {
      return null;
    }
  });
  const dismiss = (jobId: string) => {
    setDismissed(jobId);
    try {
      localStorage.setItem(dismissKey, jobId);
    } catch {}
  };
  const [seenReset, setSeenReset] = useState(resetKey);
  if (seenReset !== resetKey) {
    setSeenReset(resetKey);
    setCleared(latest?.id ?? null);
    setDismissed(null);
    try {
      localStorage.removeItem(dismissKey);
    } catch {}
  }
  const job = latest && latest.id === cleared && latest.status !== "queued" && latest.status !== "running" ? null : latest;
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const active = job?.status === "queued" || job?.status === "running";
  const finished = !!job && !active;
  const hidden = finished && job.id === dismissed;

  const pull = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      setJob(await syncSheet(id, domainId, cityId));
      setErr("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lost connection. Retrying");
    } finally {
      inFlight.current = false;
    }
  }, [syncSheet, id, domainId, cityId]);

  // Initial fetch; setState happens after the await, not synchronously.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => void pull(), [pull]);
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && void pull(), active ? 2000 : 15_000);
    return () => clearInterval(t);
  }, [active, pull]);

  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setErr("");
    try {
      await fn();
      await pull();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const pct = Math.round((job?.progress ?? 0) * 100);
  const S = SAVE[save];
  const label =
    job?.status === "queued" ? "Waiting for your scraper" :
    job?.status === "running" ? (job.leadsFound ? "Scraping, results appear live" : "Scraping, opening Google Maps") :
    job?.status === "done" ? `Finished with ${job.leadsFound} leads` :
    job?.status === "failed" ? "Stopped with an error" :
    job?.status === "cancelled" ? `Stopped${job.leadsFound ? ` with ${job.leadsFound} leads saved` : ""}` :
    "Ready";

  return (
    <>
    <span className={cn("fixed bottom-4 right-4 z-40 flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs shadow-sm", S.cls)} aria-live="polite">
      <S.icon className={cn("size-3.5", save === "saving" && "animate-spin")} /> {S.text}
    </span>
    {!hidden && (
    <div className="relative mt-4 rounded-2xl border border-neutral-200 p-4">
      {finished && (
        <button onClick={() => dismiss(job.id)} className="absolute right-2 top-2 rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-950" aria-label="Dismiss">
          <X className="size-4" />
        </button>
      )}
      <div className={cn("flex flex-wrap items-center gap-x-6 gap-y-3", finished && "pr-6")}>
        <div className="flex items-center gap-1.5">
          <Button size="sm" disabled={active || busy} onClick={() => act(() => startScrape(id, domainId, cityId))}>
            <Play className="size-4" /> {job && !active ? "Run again" : "Start"}
          </Button>
          <Button size="sm" variant="outline" disabled={!active || busy} onClick={() => job && act(() => stopScrape(job.id))}>
            <Square className="size-4" /> Stop
          </Button>
        </div>
        <div className="min-w-48 flex-1">
          <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 font-medium">
              {job?.status === "running" && <span className="size-2 animate-pulse rounded-full bg-emerald-500" aria-hidden />}
              {label}
            </span>
            <span className="tabular-nums text-neutral-500">
              {active ? `${job?.leadsFound ?? 0} leads · ${pct}%` : `${queries} ${queries === 1 ? "query" : "queries"}`}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-neutral-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className={cn("h-full rounded-full transition-all duration-500", job?.status === "failed" ? "bg-red-400" : "bg-neutral-950")} style={{ width: `${job?.status === "done" ? 100 : pct}%` }} />
          </div>
        </div>
      </div>
      {job?.status === "queued" && scraper === "offline" && (
        <p className="mt-3 text-sm text-neutral-500">
          The scraper isn&apos;t running on this computer. Start it (<code className="rounded bg-neutral-100 px-1">npm start</code> in the scraper folder) and this job begins on its own.{" "}
          <Link href="/dashboard/scraper-guide" className="underline hover:text-neutral-950">Setup guide</Link>
        </p>
      )}
      {job?.status === "failed" && job.error && (
        <p className="mt-3 flex items-start gap-1.5 text-sm text-red-600"><AlertCircle className="mt-0.5 size-4 shrink-0" /> {job.error}. What was found is already saved in the sheet.</p>
      )}
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
    </div>
    )}
    </>
  );
}
