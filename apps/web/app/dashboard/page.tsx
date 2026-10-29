"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { CampaignView } from "@/components/dashboard/campaign-view";
import { useShellActions } from "@/components/dashboard/shell-actions";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace";

export default function DashboardHome() {
  const { firstName, campaigns } = useWorkspace();
  const { newCampaign, editProfile } = useShellActions();
  const [selected, setSelected] = useState<string>();
  const current = campaigns.find((c) => c.id === selected) ?? campaigns[0];

  return (
    <div className="w-full px-6">
      <section className="flex flex-wrap items-start justify-between gap-6 py-8">
        <h1 className="font-brand text-4xl font-bold leading-[1.05] tracking-[-0.04em] sm:text-6xl">
          Hello there
          {firstName && (
            <>
              ,{" "}
              <button onClick={editProfile} className="relative inline-block text-left">
                {firstName}
                <svg viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden className="pointer-events-none absolute -bottom-2.5 left-0 h-[0.2em] w-full overflow-visible">
                  <defs>
                    {/* Pencil lead: rough edge plus graphite speckle punched out of the stroke. */}
                    <filter id="pencil" x="-5%" y="-150%" width="110%" height="400%">
                      <feTurbulence type="fractalNoise" baseFrequency="0.08 0.9" numOctaves="2" seed="4" result="wobble" />
                      <feDisplacementMap in="SourceGraphic" in2="wobble" scale="2" result="rough" />
                      <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="9" result="grain" />
                      <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.5 2.3" result="speckle" />
                      <feComposite in="rough" in2="speckle" operator="in" />
                    </filter>
                  </defs>
                  <path d="M3 8 C 55 3.5, 125 3, 197 6.5" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" vectorEffect="non-scaling-stroke" filter="url(#pencil)" />
                </svg>
              </button>
            </>
          )}
        </h1>

        {current && (
          <div className="flex flex-col items-end gap-3">
            <p className="text-sm text-neutral-500">
              <span className="font-brand text-2xl font-bold tracking-[-0.03em] text-neutral-950 tabular-nums">{campaigns.length}</span>{" "}
              {campaigns.length === 1 ? "campaign" : "campaigns"}
            </p>
            <div className="flex max-w-md flex-wrap justify-end gap-2">
              {campaigns.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                    c.id === current.id ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-300 text-neutral-600 hover:border-neutral-950",
                  )}
                >
                  {c.name}
                </button>
              ))}
              <button
                onClick={newCampaign}
                aria-label="New campaign"
                className="flex size-9 items-center justify-center rounded-full border border-dashed border-neutral-400 text-neutral-500 hover:border-neutral-950 hover:text-neutral-950"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="pb-8">
        {current ? (
          <CampaignView campaign={current} />
        ) : (
          <>
          <button
            onClick={newCampaign}
            className="flex min-h-64 w-full flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dotted border-neutral-300 p-10 text-center transition-colors hover:border-neutral-950"
          >
            <svg viewBox="0 0 64 64" className="mb-2 size-16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              <circle cx="32" cy="32" r="28" strokeDasharray="2 7" className="text-neutral-400" />
              <path d="M32 20v24M20 32h24" />
            </svg>
            <span className="font-brand text-4xl font-bold tracking-[-0.03em]">Create a campaign</span>
            <span className="text-sm text-neutral-500">No active campaign</span>
          </button>
          </>
        )}
      </section>
    </div>
  );
}
