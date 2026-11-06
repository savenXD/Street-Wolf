"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FeaturesStep } from "@/components/new-campaign/features-step";
import { NameStep } from "@/components/new-campaign/name-step";
import { PresetStep } from "@/components/new-campaign/preset-step";
import { PurposeStep } from "@/components/new-campaign/purpose-step";
import { TeamStep } from "@/components/new-campaign/team-step";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace";
import { presetById } from "@/lib/presets";
import type { CampaignPreset } from "@street-wolf/db";

// Steps in order. To add one: a component in components/new-campaign, an entry here, a branch below.
const STEPS = ["name", "purpose", "preset", "features", "team"] as const;
const WIDE = new Set<(typeof STEPS)[number]>(["preset", "features"]);

export default function NewCampaignPage() {
  const router = useRouter();
  const { ready, signedIn, addCampaign } = useWorkspace();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  // B2B is the only preset today, so it starts picked with its suggested features.
  const [preset, setPreset] = useState<CampaignPreset | null>("b2b");
  const [picked, setPicked] = useState<string[]>(() => [...presetById("b2b").defaults]);
  const [team, setTeam] = useState<string[]>([]);

  const current = STEPS[step];
  const canContinue = {
    name: name.trim().length > 0,
    purpose: purpose.trim().length > 0,
    preset: preset !== null,
    features: picked.length > 0,
    team: true,
  }[current];
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  // Picking a (different) preset resets the switches to its suggestions; going back and keeping the same one keeps your edits.
  const choosePreset = (id: CampaignPreset) => {
    if (id !== preset) setPicked([...presetById(id).defaults]);
    setPreset(id);
  };

  function finish() {
    addCampaign({ name: name.trim(), purpose: purpose.trim(), preset: preset ?? "b2b", features: picked, team });
    router.push("/dashboard");
  }

  const next = () => (step === STEPS.length - 1 ? finish() : setStep(step + 1));
  if (!ready || !signedIn) return null;
  const width = WIDE.has(current) ? "max-w-4xl" : "max-w-xl";

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto flex gap-1.5">
        {STEPS.map((s, i) => (
          <span key={s} className={cn("h-1 w-10 rounded-full transition-colors", i <= step ? "bg-neutral-950" : "bg-neutral-200")} />
        ))}
      </div>

      <div className={cn("mx-auto w-full flex-1 px-6 py-14", width)}>
        {current === "name" && <NameStep name={name} setName={setName} onEnter={() => canContinue && next()} />}
        {current === "purpose" && <PurposeStep purpose={purpose} setPurpose={setPurpose} />}
        {current === "preset" && <PresetStep preset={preset} choose={choosePreset} />}
        {current === "features" && <FeaturesStep preset={preset ?? "b2b"} picked={picked} toggle={toggle} />}
        {current === "team" && <TeamStep team={team} setTeam={setTeam} />}
      </div>

      <footer className="sticky bottom-0 border-t border-neutral-100 bg-white/90 backdrop-blur">
        <div className={cn("mx-auto flex w-full items-center justify-between px-6 py-4", width)}>
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)} className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-950">
              <ArrowLeft className="size-4" /> Back
            </button>
          ) : (
            <span />
          )}
          <Button onClick={next} disabled={!canContinue}>
            {step === STEPS.length - 1 ? "Create campaign" : "Continue"}
          </Button>
        </div>
      </footer>
    </div>
  );
}
