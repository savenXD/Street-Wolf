"use client";

import { Bell, Check, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace";

type Item = { id: string; type: string; title: string; body: string; data: Record<string, string>; read: boolean; at: number };

const ago = (t: number) => {
  const s = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};

const TOAST_MS = 5000;

/** One small card that slides in at the top right, then fades out by itself. */
function Toast({ n, onDone }: { n: Item; onDone: () => void }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    const hide = setTimeout(() => setShown(false), TOAST_MS);
    const gone = setTimeout(onDone, TOAST_MS + 400);
    return () => (cancelAnimationFrame(raf), clearTimeout(hide), clearTimeout(gone));
  }, [onDone]);
  return (
    <div
      role="status"
      onClick={() => (setShown(false), setTimeout(onDone, 300))}
      className={cn("pointer-events-auto w-72 cursor-pointer rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-lg transition-all duration-300 ease-out", shown ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0")}
    >
      <p className="text-sm font-medium">{n.title}</p>
      {n.body && <p className="mt-0.5 line-clamp-2 text-sm text-neutral-500">{n.body}</p>}
    </div>
  );
}

/** Polls while the tab is visible (every 30s). Cheap: one indexed count query. Server-sent events can replace this later. */
export function NotificationBell() {
  const { account, acceptInvite, declineInvite, refresh } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Item[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const announced = useRef<Set<string> | null>(null); // null until the first load, so old unread items don't all pop up at once
  const openRef = useRef(false);
  useEffect(() => void (openRef.current = open), [open]);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/notifications?limit=20");
      if (!r.ok) return;
      const d = await r.json();
      setUnread(d.unread);
      setItems(d.items);
      const seen = announced.current;
      const fresh: Item[] = d.items.filter((n: Item) => !n.read && !seen?.has(n.id));
      announced.current = new Set([...(seen ?? []), ...d.items.map((n: Item) => n.id)]);
      if (seen && fresh.length && !openRef.current) setToasts((t) => [...t, ...fresh.slice(0, 3)]);
    } catch {}
  }, []);
  const drop = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  useEffect(() => {
    if (!account) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const t = setInterval(() => document.visibilityState === "visible" && void load(), 30_000);
    return () => clearInterval(t);
  }, [account, load]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (!account) return null;

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      await load();
      if (unread) {
        await fetch("/api/notifications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ all: true }) });
        setUnread(0);
      }
    }
  }

  async function answer(n: Item, accept: boolean) {
    const inviteId = n.data.inviteId;
    if (!inviteId) return;
    setBusy(n.id);
    try {
      await (accept ? acceptInvite(inviteId) : declineInvite(inviteId));
      setItems((xs) => xs.filter((x) => x.id !== n.id));
    } catch {
      await refresh();
      await load();
    }
    setBusy(null);
  }

  return (
    <div ref={box} className="relative">
      <div className="pointer-events-none fixed right-4 top-20 z-50 flex flex-col gap-2" aria-live="polite">
        {toasts.map((n) => (
          <Toast key={n.id} n={n} onDone={() => drop(n.id)} />
        ))}
      </div>
      <button onClick={toggle} aria-label="Notifications" className="relative flex size-9 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100">
        <Bell className="size-5" />
        {unread > 0 && <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-neutral-950 px-1 text-[10px] font-medium leading-4 text-white">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-80 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl">
          <p className="border-b border-neutral-100 px-4 py-3 text-sm font-medium">Notifications</p>
          <ul className="max-h-96 divide-y divide-neutral-100 overflow-y-auto">
            {items.length === 0 && <li className="px-4 py-8 text-center text-sm text-neutral-400">Nothing yet</li>}
            {items.map((n) => (
              <li key={n.id} className="px-4 py-3">
                <p className={cn("text-sm", !n.read && "font-medium")}>{n.title}</p>
                <p className="text-sm text-neutral-500">{n.body}</p>
                <p className="mt-0.5 text-xs text-neutral-400">{ago(n.at)}</p>
                {n.type === "invite_received" && n.data.inviteId && (
                  <div className="mt-2 flex gap-2">
                    <button disabled={busy === n.id} onClick={() => answer(n, true)} className="inline-flex h-7 items-center gap-1 rounded-full bg-neutral-950 px-3 text-xs text-white disabled:opacity-50">
                      <Check className="size-3" /> Accept
                    </button>
                    <button disabled={busy === n.id} onClick={() => answer(n, false)} className="inline-flex h-7 items-center gap-1 rounded-full border border-neutral-300 px-3 text-xs text-neutral-600 hover:border-neutral-950 disabled:opacity-50">
                      <X className="size-3" /> Decline
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
