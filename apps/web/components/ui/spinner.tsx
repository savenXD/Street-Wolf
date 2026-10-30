"use client";

import { Loader2 } from "lucide-react";
import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 aria-hidden className={cn("size-4 animate-spin", className)} />;
}

/**
 * Put inside a <Link>: shows feedback from the click until the next page is ready.
 * "inline" is a small spinner in the flow; "overlay" dims the (relatively positioned) link and centres a spinner on it.
 */
export function LinkPending({ overlay, className }: { overlay?: boolean; className?: string }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return overlay ? (
    <span role="status" aria-label="Opening" className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-white/70">
      <Spinner className={className} />
    </span>
  ) : (
    <Spinner className={cn("size-3.5", className)} />
  );
}
