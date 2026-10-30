import { cn } from "@/lib/utils";

/** A slim indeterminate bar, centred in whatever space it is given (use `fullscreen` to centre it in the viewport). No text. */
export function LoadBar({ fullscreen, className }: { fullscreen?: boolean; className?: string }) {
  return (
    <div role="progressbar" aria-label="Loading" className={cn("flex flex-1 items-center justify-center", fullscreen && "fixed inset-0 z-50 bg-white", className)}>
      <div className="h-1 w-56 overflow-hidden rounded-full bg-neutral-200">
        <div className="h-full w-2/5 animate-loadbar rounded-full bg-neutral-950" />
      </div>
    </div>
  );
}
