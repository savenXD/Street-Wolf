"use client";

import { useState } from "react";
import { BrandIcon } from "@/components/brand-icon";
import { GoogleLogo } from "@/components/google-button";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function SignupForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const [googling, setGoogling] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);

  async function withGoogle() {
    setGoogling(true);
    const p = await fetch("/api/auth/providers").then((r) => r.json()).catch(() => ({ google: false }));
    // Full navigation on purpose: this is an API route that redirects to Google.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    if (p.google) window.location.href = `/api/auth/google?next=${encodeURIComponent(next)}`;
    else {
      setGoogling(false);
      setMessage("Google sign-in isn't switched on yet. Use the email link below.");
    }
  }

  async function withEmail(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setMessage("");
    const r = await fetch("/api/auth/email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, next }) }).catch(() => null);
    const data = await r?.json().catch(() => null);
    if (r?.ok) {
      setDevLink(data?.devLink ?? null);
      setState("sent");
    } else {
      setMessage(data?.error ?? "Couldn't send the link. Try again.");
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div className="mt-8 rounded-2xl border border-neutral-200 p-5">
        <p className="font-medium">Check your inbox</p>
        <p className="mt-1 text-sm text-neutral-500">We sent a sign-in link to {email}. It works once and expires in 15 minutes.</p>
        {devLink && (
          <p className="mt-3 rounded-xl bg-neutral-50 p-3 text-xs text-neutral-600">
            Dev mode (no email provider yet):{" "}
            <a href={devLink} className="font-medium underline">open the sign-in link</a>
          </p>
        )}
        <button onClick={() => setState("idle")} className="mt-3 text-sm text-neutral-500 hover:text-neutral-950">Use a different email</button>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <Button variant="outline" className="w-full" onClick={withGoogle} loading={googling}>
        {!googling && <GoogleLogo />}
        Continue with Google
      </Button>
      <div className="flex items-center gap-3 text-xs text-neutral-400">
        <div className="h-px flex-1 bg-neutral-200" /> or <div className="h-px flex-1 bg-neutral-200" />
      </div>
      <form onSubmit={withEmail} className="space-y-3">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" loading={state === "sending"}>
          {state === "sending" ? "Sending…" : "Email me a link"}
        </Button>
      </form>
      {message && <p className="text-sm text-neutral-600">{message}</p>}
      <p className="text-xs text-neutral-400">
        Prefer your own server? <BrandIcon name="github" className="inline size-3" /> Self-host it, same app.
      </p>
    </div>
  );
}
