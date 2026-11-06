"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { BrandIcon, type BrandName } from "@/components/brand-icon";
import { LinkPending } from "@/components/ui/spinner";

type TileProps = { title: string; brand: BrandName; sub: string; art: React.ReactNode; icon?: React.ReactNode };

function Body({ title, brand, sub, icon }: Omit<TileProps, "art">) {
  return (
    <>
      <span className="absolute left-1/2 top-[34%] flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-black/5 transition-transform duration-300 group-hover:-translate-y-[60%] group-hover:scale-105">
        {icon ?? <BrandIcon name={brand} colored className="size-8" />}
      </span>
      <span className="relative">
        <span className="flex items-center gap-2 font-brand text-2xl font-bold leading-tight tracking-[-0.03em]">
          <BrandIcon name={brand} colored className="size-6 shrink-0" />
          {title}
        </span>
        <span className="block text-sm text-neutral-500">{sub}</span>
      </span>
    </>
  );
}

/** A module tile that opens the module's workspace. */
export function LiveTile({ href, ...p }: TileProps & { href: string }) {
  return (
    <Link
      href={href}
      className="group relative flex aspect-[2.6/1] w-full flex-col justify-end overflow-hidden rounded-3xl border border-neutral-200 p-5 transition-all hover:-translate-y-0.5 hover:border-neutral-950 hover:shadow-lg"
    >
      <LinkPending overlay />
      {p.art}
      <ArrowRight className="absolute right-4 top-4 size-5 text-neutral-500 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-950" />
      <Body {...p} />
    </Link>
  );
}

/** A module tile that isn't available yet: same look as the live ones, but inert. */
export function SoftTile(p: TileProps) {
  return (
    <div
      aria-disabled
      className="group relative flex aspect-[2.6/1] w-full cursor-default select-none flex-col justify-end overflow-hidden rounded-3xl border border-neutral-200 p-5 opacity-80 grayscale-[35%] transition-all duration-300 hover:-translate-y-0.5 hover:border-neutral-400 hover:opacity-100 hover:shadow-lg hover:grayscale-0"
    >
      <span className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-110">{p.art}</span>
      <Body {...p} />
    </div>
  );
}

/** Bottom fade every tile's art ends with, so the title stays readable. */
export function Fade({ id }: { id: string }) {
  return (
    <>
      <rect y="96" width="160" height="64" fill={`url(#${id})`} />
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity=".95" />
        </linearGradient>
      </defs>
    </>
  );
}
