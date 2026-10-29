"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Preview = { campaign: string; inviter: string; email: string; status: string; signedIn: boolean; emailMatches: boolean | null };

export function InviteCard({ token }: { token: string }) {
  const router = useRouter();
  const [p, setP] = useState<Preview | null>(null);
  const [gone, setGone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch(`/api/invites/${token}`)
      .then(async (r) => (r.ok ? setP(await r.json()) : setGone(true)))
      .catch(() => setGone(true));
  }, [token]);

  async function accept() {
    setBusy(true);
    setErr("");
    const r = await fetch(`/api/invites/${token}`, { method: "POST" });
    if (r.ok) {
      // Full load on purpose, so the workspace re-hydrates with the new campaign.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/dashboard";
      return;
    }
    setErr((await r.json().catch(() => null))?.error ?? "Couldn't accept the invite.");
    setBusy(false);
  }

  if (gone) {
    return (
      <>
        <h1 className="text-3xl font-semibold tracking-tight">Invite not found</h1>
        <p className="mt-2 text-neutral-500">This link isn&apos;t valid any more. It may have been replaced by a newer invite or revoked. Ask for a fresh one.</p>
        <Button className="mt-6" variant="outline" onClick={() => router.push("/dashboard")}>Go to dashboard</Button>
      </>
    );
  }
  if (!p) return <p className="text-neutral-500">Loading…</p>;

  const next = `/invite/${token}`;
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Join {p.campaign}</h1>
      <p className="mt-2 text-neutral-500">
        <b className="text-neutral-950">{p.inviter}</b> invited <span className="whitespace-nowrap">{p.email}</span> to work on this campaign.
      </p>
      {p.status === "accepted" && <p className="mt-6 text-sm text-neutral-600">This invite was already used.</p>}
      {p.status === "expired" && <p className="mt-6 text-sm text-neutral-600">This invite has expired. Ask {p.inviter} to send a new one.</p>}
      {p.status === "pending" && (
        <div className="mt-6 space-y-3">
          {p.signedIn ? (
            <>
              {p.emailMatches === false && <p className="text-sm text-neutral-600">You&apos;re signed in with a different email than the one invited. Sign out and use {p.email}.</p>}
              <Button className="w-full" onClick={accept} disabled={busy || p.emailMatches === false}>{busy ? "Joining…" : "Accept invite"}</Button>
            </>
          ) : (
            <Link href={`/signup?next=${encodeURIComponent(next)}`} className="block">
              <Button className="w-full">Sign in to accept</Button>
            </Link>
          )}
          {err && <p className="text-sm text-neutral-600">{err}</p>}
        </div>
      )}
    </>
  );
}
