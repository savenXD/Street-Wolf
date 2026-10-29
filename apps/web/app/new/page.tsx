"use client";

import { ArrowLeft, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandIcon } from "@/components/brand-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { platforms } from "@/lib/features";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace";

const STEPS = 4;
const purposes = ["Find new customers", "Book meetings", "Promote a product", "Recruit talent", "Research a market"];

function Heading({ title, hint }: { title: string; hint?: string }) {
  return (
    <>
      <h1 className="font-brand text-4xl font-bold tracking-[-0.04em] sm:text-5xl">{title}</h1>
      {hint && <p className="mt-3 text-neutral-500">{hint}</p>}
    </>
  );
}

export default function NewCampaignPage() {
  const router = useRouter();
  const { ready, signedIn, addCampaign, invites } = useWorkspace();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [team, setTeam] = useState<string[]>([]);
  const [email, setEmail] = useState("");

  const canContinue = [name.trim().length > 0, purpose.trim().length > 0, picked.length > 0, true][step];
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  function addEmail() {
    const e = email.trim().toLowerCase();
    if (e && /\S+@\S+\.\S+/.test(e) && !team.includes(e)) setTeam([...team, e]);
    setEmail("");
  }

  function finish() {
    addCampaign({ name: name.trim(), purpose: purpose.trim(), features: picked, team });
    router.push("/dashboard");
  }

  const next = () => (step === STEPS - 1 ? finish() : setStep(step + 1));
  if (!ready || !signedIn) return null;

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto flex gap-1.5">
        {Array.from({ length: STEPS }, (_, i) => (
          <span key={i} className={cn("h-1 w-10 rounded-full transition-colors", i <= step ? "bg-neutral-950" : "bg-neutral-200")} />
        ))}
      </div>

      <div className={cn("mx-auto w-full flex-1 px-6 py-14", step === 2 ? "max-w-4xl" : "max-w-xl")}>
        {step === 0 && (
          <>
            <Heading title="Name your campaign" hint="Something you'll recognise later." />
            <Input
              autoFocus
              placeholder="Dentists in Austin"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canContinue && next()}
              className="mt-10 h-14 rounded-2xl text-lg"
            />
          </>
        )}

        {step === 1 && (
          <>
            <Heading title="What's the purpose?" hint="In a sentence, what do you want out of this campaign?" />
            <textarea
              autoFocus
              rows={3}
              placeholder="Book demos with local dental clinics"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="mt-10 w-full resize-none rounded-2xl border border-neutral-300 p-4 text-lg outline-none placeholder:text-neutral-400 focus:border-neutral-950"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {purposes.map((p) => (
                <button
                  key={p}
                  onClick={() => setPurpose(p)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                    purpose === p ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-300 text-neutral-600 hover:border-neutral-950",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <Heading title="Add features" hint="Pick a platform, then switch on what this campaign should do there." />
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {platforms.map((p) => {
                const count = p.features.filter((f) => picked.includes(f.id)).length;
                return (
                  <section key={p.id} className={cn("rounded-3xl border p-5 transition-colors", count ? "border-neutral-950" : "border-neutral-200")}>
                    <div className="flex items-center gap-3">
                      <span className="flex size-12 items-center justify-center rounded-2xl border border-neutral-200 bg-white">
                        <BrandIcon name={p.brand} colored className="size-6" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="font-brand text-xl font-bold leading-tight tracking-[-0.02em]">{p.name}</h2>
                        <p className="truncate text-sm text-neutral-500">{p.desc}</p>
                      </div>
                      {count > 0 && <span className="rounded-full bg-neutral-950 px-2 py-0.5 text-xs text-white">{count}</span>}
                    </div>
                    <div className="mt-4 space-y-2">
                      {p.features.map((f) => {
                        const on = picked.includes(f.id);
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
                                {f.via && <BrandIcon name={f.via.brand} colored className="size-3.5" />}
                                {f.title}
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
        )}

        {step === 3 && (
          <>
            <Heading title="Add your friends" hint="Invite teammates by email. You can skip this and add them later." />
            <form
              className="mt-10 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                addEmail();
              }}
            >
              <Input autoFocus type="email" placeholder="friend@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-14 rounded-2xl text-lg" />
              <Button type="submit" variant="outline" className="h-14">Add</Button>
            </form>
            {invites.some((i) => !team.includes(i.email)) && (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
                From your friends:
                {invites
                  .filter((i) => !team.includes(i.email))
                  .map((i) => (
                    <button key={i.email} onClick={() => setTeam([...team, i.email])} className="rounded-full border border-neutral-300 px-3 py-1 hover:border-neutral-950">
                      + {i.email}
                    </button>
                  ))}
              </div>
            )}
            <ul className="mt-6 space-y-2">
              {team.map((t) => (
                <li key={t} className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3 text-sm">
                  {t}
                  <button onClick={() => setTeam(team.filter((x) => x !== t))} aria-label={`Remove ${t}`} className="text-neutral-400 hover:text-neutral-950">
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <footer className="sticky bottom-0 border-t border-neutral-100 bg-white/90 backdrop-blur">
        <div className={cn("mx-auto flex w-full items-center justify-between px-6 py-4", step === 2 ? "max-w-4xl" : "max-w-xl")}>
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)} className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-950">
              <ArrowLeft className="size-4" /> Back
            </button>
          ) : (
            <span />
          )}
          <Button onClick={next} disabled={!canContinue}>
            {step === STEPS - 1 ? "Create campaign" : "Continue"}
          </Button>
        </div>
      </footer>
    </div>
  );
}
