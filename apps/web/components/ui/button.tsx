import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ComponentProps } from "react";

const variants = {
  primary: "bg-neutral-950 text-white hover:bg-neutral-800",
  outline: "border border-neutral-300 bg-white text-neutral-950 hover:border-neutral-950",
  ghost: "text-neutral-600 hover:text-neutral-950",
};
const sizes = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

type Style = { variant?: keyof typeof variants; size?: keyof typeof sizes };

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950";

export function Button({ variant = "primary", size = "md", className, ...props }: ComponentProps<"button"> & Style) {
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}

export function ButtonLink({ variant = "primary", size = "md", className, ...props }: ComponentProps<typeof Link> & Style) {
  return <Link className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}
