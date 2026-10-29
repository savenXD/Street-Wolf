import Link from "next/link";
import { cn } from "@/lib/utils";
import { site } from "@/lib/site";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn("shrink-0 font-brand text-xl font-bold tracking-[-0.04em] text-neutral-950", className)}
    >
      {site.name}
    </Link>
  );
}
