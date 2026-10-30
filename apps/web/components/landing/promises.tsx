import type { ReactNode } from "react";
import { Reveal } from "@/components/landing/reveal";

/** Product-style thumbnails: a cropped UI card sitting on a soft panel, in the same neutral palette as the rest of the page. */
function Thumb({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-52 items-end overflow-hidden rounded-2xl bg-neutral-100 px-6 pt-7">
      <div className="w-full rounded-t-xl border border-b-0 border-neutral-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">{children}</div>
    </div>
  );
}

function Box({ title, body, tag, children, delay }: { title: string; body: string; tag: string; children: ReactNode; delay: number }) {
  return (
    <li>
      <Reveal delay={delay} className="h-full">
        <div className="flex h-full flex-col rounded-3xl border border-neutral-200 bg-white p-5 transition-colors duration-200 hover:border-neutral-400">
          <Thumb>{children}</Thumb>
          <p className="mt-6 text-xs font-medium tracking-wide text-neutral-400 uppercase">{tag}</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h3>
          <p className="mt-2 leading-relaxed text-neutral-600">{body}</p>
        </div>
      </Reveal>
    </li>
  );
}

const Tick = () => (
  <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" aria-hidden>
    <path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** A price card that reads $0 with nothing hidden under it. */
function FreeThumb() {
  const rows = ["Unlimited leads", "CSV export", "No credit card"];
  return (
    <div className="p-4">
      <div className="flex items-center justify-between text-[11px] font-medium text-neutral-500">
        <span>Street Wolf</span>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5">Open source</span>
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="font-brand text-4xl font-semibold tracking-tighter">$0</span>
        <span className="text-xs text-neutral-500">forever</span>
      </div>
      <ul className="mt-3 space-y-1.5 border-t border-neutral-100 pt-3 text-xs text-neutral-700">
        {rows.map((r) => (
          <li key={r} className="flex items-center gap-2">
            <Tick />
            {r}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A slice of the real lead sheet: header, rows, one selected, label dots. */
function UiThumb() {
  const rows = [
    { n: "Brew & Bean", p: "+91 98••• 41820", l: "Interested", c: "#14b8a6" },
    { n: "The Daily Grind", p: "+91 90••• 17734", l: "Messaged", c: "#737373" },
    { n: "Latte Lab", p: "+91 97••• 20468", l: "Converted", c: "#16a34a" },
    { n: "Chai & Chill", p: "+91 88••• 90312", l: "Not interested", c: "#ef4444" },
  ];
  return (
    <div className="text-[11px]">
      <div className="flex items-center gap-1.5 border-b border-neutral-100 px-3 py-2">
        <span className="font-semibold text-neutral-950">Cafes in Pune</span>
        <span className="ml-auto text-neutral-400">716 leads</span>
      </div>
      <div className="grid grid-cols-[1.3fr_1.2fr_1fr] border-b border-neutral-100 bg-neutral-50 px-3 py-1.5 font-medium text-neutral-500">
        <span>Business</span>
        <span>Phone</span>
        <span>Label</span>
      </div>
      {rows.map((r, i) => (
        <div key={r.n} className={`grid grid-cols-[1.3fr_1.2fr_1fr] items-center border-b border-neutral-100 px-3 py-1.5 ${i === 0 ? "bg-neutral-50" : ""}`}>
          <span className="truncate font-medium text-neutral-900">{r.n}</span>
          <span className="truncate text-neutral-500 tabular-nums">{r.p}</span>
          <span className="flex items-center gap-1.5 text-neutral-700">
            <span className="size-1.5 rounded-full" style={{ background: r.c }} />
            <span className="truncate">{r.l}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/** A settings panel on localhost: every capability is a switch you own. */
function LocalThumb() {
  const rows: [string, boolean][] = [
    ["Google Maps scraper", true],
    ["Auto-outreach", true],
    ["Instagram & Reddit", false],
    ["Cloud sync", false],
  ];
  return (
    <div className="text-xs">
      <div className="flex items-center gap-2 border-b border-neutral-100 px-3 py-2">
        <svg viewBox="0 0 16 16" className="size-3.5 text-neutral-500" aria-hidden>
          <rect x="2.5" y="7" width="11" height="7" rx="1.8" fill="currentColor" />
          <path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        <span className="font-medium text-neutral-900">Settings</span>
        <span className="ml-auto flex items-center gap-1.5 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          localhost:3000
        </span>
      </div>
      <ul>
        {rows.map(([name, on]) => (
          <li key={name} className="flex items-center justify-between border-b border-neutral-100 px-3 py-2">
            <span className={on ? "text-neutral-900" : "text-neutral-400"}>{name}</span>
            <span className={`flex h-4 w-7 items-center rounded-full px-0.5 ${on ? "justify-end bg-neutral-950" : "justify-start bg-neutral-200"}`}>
              <span className="size-3 rounded-full bg-white" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Promises() {
  return (
    <section className="mt-24">
      <Reveal className="text-center">
        <p className="text-xs font-medium tracking-widest text-neutral-400 uppercase">Why Street Wolf</p>
        <h3 className="mx-auto mt-3 max-w-2xl text-3xl font-semibold tracking-tighter text-balance sm:text-5xl">Free, beautiful, and yours.</h3>
      </Reveal>
      <ul className="mt-10 grid gap-4 md:grid-cols-3">
        <Box delay={0} tag="No card. No catch." title="100% free, forever." body="No paywalls, no per-lead pricing, no trial that ends. It's open source, so it stays free.">
          <FreeThumb />
        </Box>
        <Box delay={0.1} tag="Built to be used" title="Goated UI." body="A fast, clean sheet that feels like the spreadsheet you wish you had. Leads, labels and messages in one place.">
          <UiThumb />
        </Box>
        <Box delay={0.2} tag="Your machine, your rules" title="Local first." body="It runs on your own computer, and you control every feature, from scraping to outreach. Your leads stay with you.">
          <LocalThumb />
        </Box>
      </ul>
    </section>
  );
}
