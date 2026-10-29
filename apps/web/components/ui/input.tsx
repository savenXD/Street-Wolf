import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-neutral-300 bg-white px-3.5 text-sm text-neutral-950 placeholder:text-neutral-400 outline-none focus:border-neutral-950",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-3 text-sm text-neutral-950 placeholder:text-neutral-400 outline-none focus:border-neutral-950",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("mb-1.5 block text-sm font-medium text-neutral-950", className)} {...props} />;
}
