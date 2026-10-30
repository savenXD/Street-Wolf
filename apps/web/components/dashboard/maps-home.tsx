"use client";

import { LinkPending } from "@/components/ui/spinner";
import { ArrowLeft, Plus, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { BrandIcon } from "@/components/brand-icon";
import { cityStats, conversionRate, type Stats } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { useConfirmDelete } from "@/components/ui/confirm-delete";
import { type Campaign, type City, type Domain, useWorkspace } from "@/lib/workspace";

const rate = conversionRate;

function Mini({ label, value, left }: { label: string; value: string | number; left?: boolean }) {
  return (
    <span className={left ? "text-left" : "text-center"}>
      <span className="block font-brand text-lg font-bold leading-none tracking-[-0.03em] tabular-nums">{value}</span>
      <span className="block text-[10px] uppercase tracking-wide text-neutral-400">{label}</span>
    </span>
  );
}

const suggestions = ["Lawyers", "Clinics", "Tuition teachers", "Gyms", "Restaurants", "Salons"];

function InlineAdd({ placeholder, onAdd, onClose }: { placeholder: string; onAdd: (v: string) => void; onClose: () => void }) {
  const [v, setV] = useState("");
  return (
    <form
      className="inline-flex"
      onSubmit={(e) => {
        e.preventDefault();
        if (v.trim()) onAdd(v.trim());
        onClose();
      }}
    >
      <input
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => !v.trim() && onClose()}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        placeholder={placeholder}
        className="h-8 w-36 rounded-full border border-neutral-950 px-3 text-sm outline-none"
      />
    </form>
  );
}

function AddDomain({ onAdd }: { onAdd: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const close = () => (setOpen(false), setName(""));
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-dashed border-neutral-400 px-4 text-sm text-neutral-600 transition-colors hover:border-neutral-950 hover:text-neutral-950"
      >
        <Plus className="size-4" /> Add domain
      </button>
      {open && (
        <form
          className="absolute left-0 top-11 z-20 w-80 rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            onAdd(name.trim());
            close();
          }}
        >
          <label className="block text-xs font-medium uppercase tracking-wide text-neutral-400">Name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && close()}
            placeholder="e.g. Lawyers"
            className="mt-1 h-9 w-full rounded-xl border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-950"
          />
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={close} className="h-8 rounded-full px-3 text-sm text-neutral-500 hover:text-neutral-950">Cancel</button>
            <button type="submit" disabled={!name.trim()} className="h-8 rounded-full bg-neutral-950 px-4 text-sm text-white disabled:opacity-40">Add</button>
          </div>
        </form>
      )}
    </div>
  );
}

function DomainCard({ campaign, domain, detailed }: { campaign: Campaign; domain: Domain; detailed: boolean }) {
  const { addCity, removeCity, removeDomain } = useWorkspace();
  const [adding, setAdding] = useState(false);
  const { ask, dialog } = useConfirmDelete();
  const askCity = (c: City) => {
    const leads = cityStats(c, campaign.labelTree).leads;
    ask({ name: c.name, what: "city", detail: `This permanently deletes this city sheet and its ${leads} ${leads === 1 ? "lead" : "leads"} from your account and everyone else's on this campaign. It can't be undone.`, run: () => removeCity(campaign.id, domain.id, c.id) });
  };
  const total = domain.cities.reduce<Stats>(
    (a, c) => {
      const s = cityStats(c, campaign.labelTree);
      return { leads: a.leads + s.leads, outreached: a.outreached + s.outreached, converted: a.converted + s.converted };
    },
    { leads: 0, outreached: 0, converted: 0 },
  );

  return (
    <section className="group rounded-2xl border border-neutral-200 bg-white p-5 transition-colors hover:border-neutral-400">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-brand text-2xl font-bold tracking-[-0.03em]">{domain.name}</h2>
          <p className="text-sm text-neutral-500">
            {domain.cities.length} {domain.cities.length === 1 ? "place" : "places"}
          </p>
        </div>
        <button
          onClick={() =>
            ask({ name: domain.name, what: "domain", detail: `This permanently deletes the domain, its ${domain.cities.length} ${domain.cities.length === 1 ? "city" : "cities"} and all ${total.leads} leads in them, for everyone on this campaign. It can't be undone.`, run: () => removeDomain(campaign.id, domain.id) })
          }
          aria-label={`Remove ${domain.name}`}
          className="text-neutral-400 opacity-0 transition-opacity hover:text-neutral-950 group-hover:opacity-100 focus-visible:opacity-100"
        >
          <X className="size-4" />
        </button>
      </div>
      {detailed && (
        <div className="mt-4 grid grid-cols-4 gap-2 border-y border-neutral-100 py-3">
          <Mini left label="Leads" value={total.leads} />
          <Mini left label="Outreached" value={total.outreached} />
          <Mini left label="Converted" value={total.converted} />
          <Mini left label="Conv. rate" value={rate(total)} />
        </div>
      )}

      <div className={cn("mt-4", detailed ? "grid grid-cols-2 gap-2" : "flex flex-wrap gap-2")}>
        {domain.cities.map((c) => {
          const st = cityStats(c, campaign.labelTree);
          return detailed ? (
            <div key={c.id} className="group/chip relative rounded-2xl border border-neutral-200 transition-colors hover:border-neutral-950">
              <Link href={`/dashboard/maps/${campaign.id}/${domain.id}/${c.id}`} className="relative block p-4">
                <LinkPending overlay />
                <span className="block truncate pr-4 text-sm font-medium">{c.name}</span>
                <span className="mt-3 grid grid-cols-2 divide-x divide-neutral-100">
                  <span className="pr-3"><Mini left label="Leads" value={st.leads} /></span>
                  <span className="pl-4"><Mini left label="Outreached" value={st.outreached} /></span>
                </span>
                <span className="mt-4 block h-1.5 overflow-hidden rounded-full bg-neutral-100">
                  <span
                    className="block h-full rounded-full bg-neutral-950"
                    style={{ width: `${st.leads ? (st.outreached / st.leads) * 100 : 0}%` }}
                  />
                </span>
              </Link>
              <button
                onClick={() => askCity(c)}
                aria-label={`Remove ${c.name}`}
                className="absolute right-2 top-2 hidden text-neutral-400 hover:text-neutral-950 group-hover/chip:block"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <span key={c.id} className="group/chip inline-flex items-center rounded-full border border-neutral-300 transition-colors hover:border-neutral-950">
              <Link href={`/dashboard/maps/${campaign.id}/${domain.id}/${c.id}`} className="flex items-center gap-2 py-1.5 pl-3.5 pr-2 text-sm">
                {c.name}
                <LinkPending />
                <span className="rounded-full bg-neutral-100 px-1.5 text-xs tabular-nums text-neutral-500">{st.leads}</span>
              </Link>
              <button
                onClick={() => askCity(c)}
                aria-label={`Remove ${c.name}`}
                className="mr-1.5 hidden text-neutral-400 hover:text-neutral-950 group-hover/chip:block"
              >
                <X className="size-3.5" />
              </button>
            </span>
          );
        })}
        {adding ? (
          <InlineAdd placeholder="City, e.g. Patna" onAdd={(v) => addCity(campaign.id, domain.id, v)} onClose={() => setAdding(false)} />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className={cn(
              "inline-flex items-center justify-center gap-1 border border-dashed border-neutral-400 text-sm text-neutral-500 hover:border-neutral-950 hover:text-neutral-950",
              detailed ? "min-h-28 rounded-2xl" : "h-8 rounded-full px-3",
            )}
          >
            <Plus className="size-3.5" /> Add city
          </button>
        )}
      </div>
      {dialog}
    </section>
  );
}

export function MapsHome({ id }: { id: string }) {
  const { ready, campaigns, addDomain } = useWorkspace();
  const [detailed, setDetailed] = useState(true);
  const campaign = campaigns.find((c) => c.id === id);

  if (!ready) return null;
  if (!campaign) {
    return (
      <div className="px-6 py-10">
        <Link href="/dashboard" className="text-sm text-neutral-500 hover:text-neutral-950">← Back to dashboard</Link>
        <p className="mt-6 text-neutral-500">Campaign not found.</p>
      </div>
    );
  }

  return (
    <div className="w-full px-6 pb-12">
      <Link href="/dashboard" className="mt-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-950">
        <ArrowLeft className="size-4" /> {campaign.name}
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <span className="flex size-14 items-center justify-center rounded-2xl border border-neutral-200">
          <BrandIcon name="googlemaps" colored className="size-7" />
        </span>
        <div>
          <h1 className="font-brand text-4xl font-bold tracking-[-0.04em] sm:text-5xl">Google Maps</h1>
          <p className="text-neutral-500">Add a domain to hunt, then the places to hunt it in.</p>
        </div>
        <div className="ml-auto flex items-center gap-5">
        <AddDomain onAdd={(n) => addDomain(campaign.id, n)} />
        <button
          role="switch"
          aria-checked={detailed}
          onClick={() => setDetailed((d) => !d)}
          className="flex items-center gap-2.5 text-sm text-neutral-600 hover:text-neutral-950"
        >
          Detailed view
          <span className={cn("flex h-6 w-10 items-center rounded-full p-0.5 transition-colors", detailed ? "bg-neutral-950" : "bg-neutral-300")}>
            <span className={cn("size-5 rounded-full bg-white shadow transition-transform", detailed && "translate-x-4")} />
          </span>
        </button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {campaign.domains.map((d) => (
          <DomainCard key={d.id} campaign={campaign} domain={d} detailed={detailed} />
        ))}
      </div>

      {campaign.domains.length === 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-sm text-neutral-500">Try:</span>
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => addDomain(campaign.id, s)}
              className="rounded-full border border-neutral-300 px-3 py-1 text-xs text-neutral-600 hover:border-neutral-950 hover:text-neutral-950"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
