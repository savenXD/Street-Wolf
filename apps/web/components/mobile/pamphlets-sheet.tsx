"use client";

import { Check, Copy, Download, Plus, Send, Share2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BrandIcon } from "@/components/brand-icon";
import { Sheet } from "@/components/mobile/sheet";
import { canvasToFile, drawPamphlet, fill, loadKit, PAMPHLET_COLORS, saveKit, type Pamphlet, type PamphletKit } from "@/lib/pamphlets";
import { cn } from "@/lib/utils";

type Lead = { name: string; phone: string | null };

/**
 * Quick follow-ups for after a call: ready messages that open WhatsApp with the text filled in, and a pamphlet image
 * whose name and prices you can change. Opened from a lead it targets that lead; opened from the top bar it's just the library.
 */
export function PamphletsSheet({ campaignId, lead, onClose }: { campaignId: string; lead: Lead | null; onClose: () => void }) {
  const [tab, setTab] = useState<"messages" | "pamphlet">("messages");
  const [kit, setKit] = useState<PamphletKit>(() => loadKit(campaignId));
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const p = kit.pamphlet;

  const edit = (patch: Partial<Pamphlet>) =>
    setKit((k) => {
      const next = { ...k, pamphlet: { ...k.pamphlet, ...patch } };
      saveKit(campaignId, next);
      return next;
    });
  const editItem = (i: number, patch: Partial<Pamphlet["items"][number]>) => edit({ items: p.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });

  useEffect(() => {
    if (tab === "pamphlet" && canvas.current) drawPamphlet(canvas.current, p);
  }, [tab, p]);

  const vars = { name: lead?.name, business: p.business };
  const sendText = (text: string) => {
    const t = fill(text, vars);
    if (lead?.phone) window.open(`https://wa.me/${lead.phone}?text=${encodeURIComponent(t)}`, "_blank", "noopener");
    else void navigator.clipboard?.writeText(t);
  };
  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(fill(text, vars));
      setCopied(id);
      setTimeout(() => setCopied(null), 1600);
    } catch {}
  };

  // WhatsApp can't be handed a picture by link, so the phone's share sheet is used: pick WhatsApp, then the chat.
  const share = async () => {
    if (!canvas.current) return;
    setBusy(true);
    try {
      const file = await canvasToFile(canvas.current, p.business);
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text: fill("Hi {name}, here are the details from {business}.", vars) });
      else download(file);
    } catch {
      /* cancelled */
    } finally {
      setBusy(false);
    }
  };
  const download = (file: File) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const save = async () => canvas.current && download(await canvasToFile(canvas.current, p.business));

  return (
    <Sheet title={lead ? `Send to ${lead.name || "lead"}` : "Pamphlets"} onClose={onClose}>
      <div className="px-5 pb-3">
        <div className="grid grid-cols-2 gap-1 rounded-full bg-neutral-100 p-1 text-sm font-medium">
          {(["messages", "pamphlet"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={cn("h-9 rounded-full capitalize transition-colors", tab === t ? "bg-white shadow-sm" : "text-neutral-500")}>
              {t === "messages" ? "Messages" : "Pamphlet"}
            </button>
          ))}
        </div>
      </div>

      {tab === "messages" ? (
        <ul className="px-3 pb-4">
          {kit.messages.map((m) => (
            <li key={m.id} className="rounded-2xl p-2">
              <div className="rounded-2xl border border-neutral-200 p-3.5">
                <p className="text-sm font-semibold">{m.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-neutral-600">{fill(m.text, vars)}</p>
                <div className="mt-3 flex items-center gap-2">
                  {lead?.phone && (
                    <button type="button" aria-label={`Send "${m.title}" on WhatsApp`} onClick={() => sendText(m.text)} className="flex h-11 flex-1 items-center justify-center rounded-full bg-[#25D366] text-white active:scale-[0.98]">
                      <Send className="size-5" />
                    </button>
                  )}
                  <button type="button" aria-label="Copy message" onClick={() => copy(m.id, m.text)} className={cn("flex h-11 items-center justify-center rounded-full border border-neutral-200 text-neutral-700 active:bg-neutral-50", lead?.phone ? "w-11" : "flex-1")}>
                    {copied === m.id ? <Check className="size-5 text-emerald-600" /> : <Copy className="size-5" />}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="px-5 pb-5">
          <canvas ref={canvas} className="aspect-square w-full rounded-2xl border border-neutral-200" />

          <div className="mt-4 flex items-center gap-2">
            <button type="button" onClick={share} disabled={busy} aria-label="Share the pamphlet" className="flex h-12 flex-1 items-center justify-center rounded-full bg-[#25D366] text-white active:scale-[0.98] disabled:opacity-50">
              <BrandIcon name="whatsapp" className="size-6" />
              <Share2 className="ml-2 size-5" />
            </button>
            <button type="button" onClick={save} aria-label="Save the image" className="flex size-12 items-center justify-center rounded-full border border-neutral-200 text-neutral-700 active:bg-neutral-50">
              <Download className="size-5" />
            </button>
          </div>

          <div className="mt-6 space-y-3">
            <Field label="Business name" value={p.business} onChange={(v) => edit({ business: v })} />
            <Field label="Title" value={p.headline} onChange={(v) => edit({ headline: v })} />
            <Field label="Contact" value={p.contact} onChange={(v) => edit({ contact: v })} inputMode="tel" />
            <div>
              <p className="mb-1.5 text-xs font-medium text-neutral-500">Items and prices</p>
              <div className="space-y-2">
                {p.items.map((it, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input value={it.name} onChange={(e) => editItem(i, { name: e.target.value })} aria-label={`Item ${i + 1} name`} placeholder="Item" className="h-11 min-w-0 flex-1 rounded-xl border border-neutral-200 px-3 text-base outline-none focus:border-neutral-950" />
                    <input value={it.price} onChange={(e) => editItem(i, { price: e.target.value })} aria-label={`Item ${i + 1} price`} placeholder="Price" className="h-11 w-28 rounded-xl border border-neutral-200 px-3 text-base outline-none focus:border-neutral-950" />
                    <button type="button" aria-label="Remove item" onClick={() => edit({ items: p.items.filter((_, j) => j !== i) })} className="flex size-10 shrink-0 items-center justify-center rounded-full text-neutral-400 active:bg-neutral-100">
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
                {p.items.length < 5 && (
                  <button type="button" onClick={() => edit({ items: [...p.items, { name: "", price: "" }] })} className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-neutral-300 text-sm text-neutral-500 active:bg-neutral-50">
                    <Plus className="size-4" /> Add item
                  </button>
                )}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-neutral-500">Colour</p>
              <div className="flex gap-2.5">
                {PAMPHLET_COLORS.map((c) => (
                  <button key={c} type="button" aria-label={`Colour ${c}`} aria-pressed={p.color === c} onClick={() => edit({ color: c })} className={cn("size-9 rounded-full ring-offset-2", p.color === c && "ring-2 ring-neutral-950")} style={{ background: c }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </Sheet>
  );
}

function Field({ label, value, onChange, inputMode }: { label: string; value: string; onChange: (v: string) => void; inputMode?: "tel" }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-neutral-500">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} inputMode={inputMode} className="h-11 w-full rounded-xl border border-neutral-200 px-3 text-base outline-none focus:border-neutral-950" />
    </label>
  );
}
