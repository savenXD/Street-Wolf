"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/** Signs in with the emailed token. Runs in the browser (not on page load of a mail scanner) and only once. */
export function Confirm({ token }: { token: string }) {
  const [error, setError] = useState(token ? "" : "This sign-in link is incomplete.");
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    fetch("/api/auth/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) })
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        if (!r.ok) return setError(d?.error ?? "Couldn't sign you in.");
        // Full load so the workspace re-hydrates as the signed-in user.
        window.location.replace(d.next);
      })
      .catch(() => setError("Couldn't reach the server. Check your connection and try again."));
  }, [token]);

  if (error) {
    return (
      <>
        <h1 className="text-3xl font-semibold tracking-tight">Link didn&apos;t work</h1>
        <p className="mt-2 text-neutral-500">{error}</p>
        <Link href="/signup" className="mt-6 inline-block text-sm underline">Get a new sign-in link</Link>
      </>
    );
  }
  return <p className="text-neutral-500">Signing you in…</p>;
}
