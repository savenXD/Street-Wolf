"use client";

import { Check, Copy } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SCRAPER_HEALTH_URL } from "@/lib/scraper";
import { cn } from "@/lib/utils";

export type Status = "checking" | "connected" | "offline";

/** Pings the local scraper app; it stays "offline" until something answers on its port. */
export function useScraperStatus() {
  const [status, setStatus] = useState<Status>("checking");
  const check = useCallback(async () => {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 1500);
    try {
      const res = await fetch(SCRAPER_HEALTH_URL, { signal: ctl.signal, cache: "no-store" });
      setStatus(res.ok ? "connected" : "offline");
    } catch {
      setStatus("offline");
    } finally {
      clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(check, 0);
    const t = setInterval(check, 5000);
    window.addEventListener("focus", check);
    return () => {
      clearTimeout(first);
      clearInterval(t);
      window.removeEventListener("focus", check);
    };
  }, [check]);

  return { status, check };
}

export function CodeBlock({ title, lines }: { title: string; lines: string[] }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200">
      <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-500">
        {title}
        <button
          onClick={() => {
            navigator.clipboard?.writeText(lines.join("\n"));
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="flex items-center gap-1 hover:text-neutral-950"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto bg-neutral-950 p-3 font-mono text-xs leading-relaxed text-neutral-100">
        {lines.map((l) => (
          <div key={l}>
            <span className="select-none text-neutral-500">$ </span>
            {l}
          </div>
        ))}
      </pre>
    </div>
  );
}

/** A small pill for pages that scrape: green when the scraper app answers, otherwise a link to the guide. */
export function ScraperStatus() {
  const { status } = useScraperStatus();
  const connected = status === "connected";

  return (
    <div
      className={cn(
        "inline-flex w-fit max-w-full items-center gap-2 rounded-full border py-1 pl-2.5 text-xs font-medium",
        status === "offline" ? "pr-1" : "pr-3",
        connected ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-neutral-200 bg-neutral-50 text-neutral-700",
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", status === "checking" ? "animate-pulse bg-neutral-300" : connected ? "bg-emerald-500" : "bg-amber-400")} />
      <span>{status === "checking" ? "Checking scraper…" : connected ? "Scraper connected" : "Scraper not connected"}</span>
      {status === "offline" && (
        <Link href="/dashboard/scraper-guide" className="inline-flex h-6 items-center rounded-full bg-neutral-950 px-2.5 text-xs font-medium text-white hover:bg-neutral-800">
          Guide
        </Link>
      )}
    </div>
  );
}
