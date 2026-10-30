"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

/** A panel that slides up from the bottom edge, with a dimmed page behind. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-neutral-950/40" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={title} className="relative max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white px-5 pt-4 pb-3">
          <h2 className="truncate text-lg font-semibold tracking-tight">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 flex size-10 items-center justify-center rounded-full text-neutral-500 active:bg-neutral-100">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
