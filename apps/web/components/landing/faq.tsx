"use client";

import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import { useState } from "react";

const items = [
  { q: "Is it really free?", a: "Yes. Street Wolf is MIT licensed. Self-host it for free, or use the hosted version with no per-lead pricing." },
  { q: "Where does the data come from?", a: "From public business listings on Google Maps. You only get what anyone could see by searching, organised into a sheet." },
  { q: "Self-hosted or hosted?", a: "Both run the same code. Self-hosting is a git clone and docker compose up; your data never leaves your server." },
  { q: "How do I add a new channel?", a: "Write a tool: one file with a name, an input schema and a run function. The SDK handles saving leads, logs and progress." },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mx-auto mt-10 max-w-2xl divide-y divide-neutral-200 rounded-3xl border border-neutral-200">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={it.q}>
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left font-medium"
            >
              {it.q}
              <motion.span animate={{ rotate: isOpen ? 45 : 0 }} className="shrink-0">
                <Plus className="size-5" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <p className="px-6 pb-5 leading-relaxed text-neutral-600">{it.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
