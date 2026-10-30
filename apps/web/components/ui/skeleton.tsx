import { cn } from "@/lib/utils";

/** A pulsing grey block that stands in for content that is still loading. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-lg bg-neutral-100", className)} />;
}
