import { Check } from "lucide-react";
import type { Status } from "@street-wolf/platform-sdk";
import { BrandIcon, type BrandName } from "@/components/brand-icon";
import { platformById } from "@/lib/platforms";
import { presetById } from "@/lib/presets";
import { cn } from "@/lib/utils";
import type { CampaignPreset } from "@street-wolf/db";
import { Heading } from "./heading";

const statusLabel: Record<Status, string | null> = { live: null, building: "In progress", planned: "Coming soon" };

/** The preset's platforms, each with its features (scraping, outreach, posting) to switch on. */
export function FeaturesStep({ preset, picked, toggle }: { preset: CampaignPreset; picked: string[]; toggle: (id: string) => void }) {
  const p = presetById(preset);
  const shown = p.platforms.map(platformById).filter((x) => !!x);

  return (
    <>
      <Heading title="Add features" hint={`Suggested for ${p.name}. Switch on what this campaign should do.`} />
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {shown.map((m) => {
          const count = m.features.filter((f) => picked.includes(f.id)).length;
          return (
            <section key={m.id} className={cn("rounded-3xl border p-5 transition-colors", count ? "border-neutral-950" : "border-neutral-200")}>
              <div className="flex items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-2xl border border-neutral-200 bg-white">
                  <BrandIcon name={m.brand as BrandName} colored className="size-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-brand text-xl font-bold leading-tight tracking-[-0.02em]">{m.name}</h2>
                  <p className="truncate text-sm text-neutral-500">{m.desc}</p>
                </div>
                {count > 0 && <span className="rounded-full bg-neutral-950 px-2 py-0.5 text-xs text-white">{count}</span>}
              </div>
              <div className="mt-4 space-y-2">
                {m.features.map((f) => {
                  const on = picked.includes(f.id);
                  const badge = statusLabel[f.status];
                  return (
                    <button
                      key={f.id}
                      onClick={() => toggle(f.id)}
                      aria-pressed={on}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                        on ? "border-neutral-950 bg-neutral-50" : "border-neutral-200 hover:border-neutral-400",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-sm font-medium">
                          {f.via && <BrandIcon name={f.via.brand as BrandName} colored className="size-3.5" />}
                          {f.title}
                          {badge && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500">{badge}</span>}
                        </span>
                        <span className="mt-0.5 block text-xs text-neutral-500">{f.desc}</span>
                      </span>
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-full border",
                          on ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-300",
                        )}
                      >
                        {on && <Check className="size-3" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
