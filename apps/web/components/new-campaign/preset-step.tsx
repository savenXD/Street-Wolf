import { Check } from "lucide-react";
import type { CampaignPreset } from "@street-wolf/db";
import { BrandIcon, type BrandName } from "@/components/brand-icon";
import { platformById } from "@/lib/platforms";
import { presets } from "@/lib/presets";
import { cn } from "@/lib/utils";
import { Heading } from "./heading";

export function PresetStep({ preset, choose }: { preset: CampaignPreset | null; choose: (id: CampaignPreset) => void }) {
  return (
    <>
      <Heading title="Who do you sell to?" hint="We'll suggest the right tools. You can change them on the next step." />
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {presets.map((p) => {
          const on = preset === p.id;
          return (
            <button
              key={p.id}
              onClick={() => p.available && choose(p.id)}
              disabled={!p.available}
              aria-pressed={on}
              className={cn(
                "relative flex flex-col rounded-3xl border p-5 text-left transition-colors",
                on ? "border-neutral-950 bg-neutral-50" : "border-neutral-200",
                p.available ? "hover:border-neutral-400" : "cursor-not-allowed opacity-50",
              )}
            >
              <span className="flex items-center justify-between">
                <span className="font-brand text-3xl font-bold tracking-[-0.04em]">{p.name}</span>
                {p.available ? (
                  <span className={cn("flex size-5 items-center justify-center rounded-full border", on ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-300")}>
                    {on && <Check className="size-3" />}
                  </span>
                ) : (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500">Coming soon</span>
                )}
              </span>
              <span className="mt-1 font-medium">{p.tagline}</span>
              <span className="mt-0.5 text-sm text-neutral-500">{p.examples}</span>
              {p.platforms.length > 0 && (
                <span className="mt-4 flex flex-wrap gap-1.5">
                  {p.platforms.map((id) => {
                    const m = platformById(id);
                    if (!m) return null;
                    // The platform's logo, then the services its features run on (WhatsApp, ElevenLabs).
                    const logos = [{ brand: m.brand, name: m.name }, ...m.features.flatMap((f) => (f.via ? [{ brand: f.via.brand, name: f.via.name }] : []))];
                    return logos.map((l) => (
                      <span key={l.brand} title={l.name} className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-white">
                        <BrandIcon name={l.brand as BrandName} colored className="size-4" />
                      </span>
                    ));
                  })}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
