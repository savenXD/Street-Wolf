"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Token = { id: string; name: string; prefix: string; createdAt: number; lastUsedAt: number | null };

/** Access tokens that let the local scraper app push leads into your campaigns. The secret is shown once. */
export function ScraperTokens() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/tokens");
    if (r.ok) setTokens((await r.json()).tokens);
  }, []);
  // Initial fetch; setState happens after the await, not synchronously.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => void load(), [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const r = await fetch("/api/tokens", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
    const d = await r.json().catch(() => null);
    if (!r.ok) return setErr(d?.error ?? "Couldn't create the token");
    setFresh(d.token);
    setName("");
    void load();
  }

  async function revoke(id: string) {
    await fetch(`/api/tokens/${id}`, { method: "DELETE" });
    void load();
  }

  return (
    <div className="py-4">
      <p className="text-sm font-medium">Scraper access</p>
      <p className="text-sm text-neutral-500">Paste a token into the scraper app on your computer so it can send leads to your campaigns.</p>
      <form onSubmit={create} className="mt-3 flex gap-2">
        <Input placeholder="Name, e.g. My laptop" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} className="max-w-xs" />
        <Button type="submit" size="sm" variant="outline">Create token</Button>
      </form>
      {err && <p className="mt-2 text-sm text-neutral-600">{err}</p>}
      {fresh && (
        <div className="mt-3 rounded-xl border border-neutral-300 bg-neutral-50 p-3">
          <p className="text-xs text-neutral-500">Copy it now. You won&apos;t be able to see it again.</p>
          <code className="mt-1 block break-all text-sm">{fresh}</code>
          <button onClick={() => navigator.clipboard?.writeText(fresh)} className="mt-2 text-xs text-neutral-500 underline hover:text-neutral-950">Copy</button>
        </div>
      )}
      <ul className="mt-3 divide-y divide-neutral-100">
        {tokens.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
            <span className="min-w-0">
              <span className="block truncate text-sm">{t.name} <span className="text-neutral-400">{t.prefix}…</span></span>
              <span className="block text-xs text-neutral-400">{t.lastUsedAt ? `Last used ${new Date(t.lastUsedAt).toLocaleDateString()}` : "Never used"}</span>
            </span>
            <Button variant="outline" size="sm" onClick={() => revoke(t.id)}>Revoke</Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
