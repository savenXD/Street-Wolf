"use client";

import { ArrowLeft, Download, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { RELEASES, SCRAPER_PORT, targets } from "@/lib/scraper";
import { CodeBlock, useScraperStatus } from "./scraper-status";

const toc = [
  ["overview", "Overview"],
  ["windows", "Windows"],
  ["linux", "Linux"],
  ["connect", "Connect your account"],
  ["run", "Run it: background or window"],
  ["verify", "Check the connection"],
  ["safety", "Speed, bans and proxies"],
  ["troubleshooting", "Troubleshooting"],
] as const;

const h2 = "scroll-mt-24 font-brand text-3xl font-bold tracking-[-0.03em]";
const p = "mt-3 leading-7 text-neutral-600";

export function ScraperGuide() {
  const { status, check } = useScraperStatus();
  const connected = status === "connected";
  const [origin, setOrigin] = useState("http://localhost:3000");
  // The scraper has to be told where this site lives; read it from the address bar instead of making people type it.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOrigin(window.location.origin), []);

  return (
    <article className="mx-auto w-full max-w-3xl px-6 pb-24">
      <Link href="/dashboard" className="mt-6 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-950">
        <ArrowLeft className="size-4" /> Dashboard
      </Link>

      <header className="mt-8">
        <p className="text-sm font-medium uppercase tracking-wide text-neutral-400">Guide</p>
        <h1 className="mt-2 font-brand text-5xl font-bold leading-[1.05] tracking-[-0.04em] sm:text-6xl">Set up the scraper</h1>
        <p className="mt-5 text-lg leading-8 text-neutral-600">
          Scraping runs from a small app on your own computer, so it uses your connection and your data never passes through anyone else&apos;s server.
          Install it once, keep it running, and this dashboard connects to it automatically.
        </p>
      </header>

      <div className={cn("mt-8 flex items-center justify-between rounded-2xl border px-5 py-4", connected ? "border-emerald-200 bg-emerald-50" : "border-neutral-200 bg-neutral-50")}>
        <span className="flex items-center gap-2.5 font-medium">
          <span className={cn("size-2.5 rounded-full", connected ? "bg-emerald-500" : "bg-amber-400")} />
          {connected ? "Scraper connected. You're all set." : "Scraper not connected yet"}
        </span>
        <button onClick={check} className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-950">
          <RefreshCw className="size-3.5" /> Check again
        </button>
      </div>

      <nav aria-label="On this page" className="mt-10 rounded-2xl border border-neutral-200 p-5">
        <p className="text-sm font-semibold">On this page</p>
        <ol className="mt-3 space-y-1.5 text-neutral-600">
          {toc.map(([id, label], i) => (
            <li key={id}>
              <a href={`#${id}`} className="hover:text-neutral-950 hover:underline">
                {i + 1}. {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <section id="overview" className="mt-14">
        <h2 className={h2}>Overview</h2>
        <p className={p}>Setup takes a few minutes and you only do it once:</p>
        <ol className="mt-3 list-decimal space-y-1.5 pl-6 leading-7 text-neutral-600">
          <li>Run the one-line install for Windows or Linux below. It sets up everything it needs, including a private copy of Node.js and the browser.</li>
          <li>Paste your access token from Settings so the scraper knows it is you.</li>
          <li>Start it, then press <strong className="text-neutral-950">Start</strong> on any city sheet. Results appear in the sheet as they are found and are saved to your account as they arrive.</li>
        </ol>
        <p className={p}>
          Scraping runs on your own computer, with your own connection. Your scraper only ever picks up scrapes <em>you</em> started, and only writes into the sheet they were started from.
          A teammate&apos;s scraper can&apos;t run your jobs, and yours can&apos;t touch anyone else&apos;s campaign.
        </p>
      </section>

      {targets.map((t) => (
        <section key={t.os} id={t.os} className="mt-16 border-t border-neutral-200 pt-12">
          <h2 className={h2}>{t.label}</h2>

          <h3 className="mt-8 text-lg font-semibold tracking-tight">Install it</h3>
          <ol className="mt-3 space-y-4">
            {t.steps.map((s, i) => (
              <li key={s} className="flex gap-4 leading-7 text-neutral-600">
                <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-xs font-medium text-neutral-950">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>

          <p className={p}>The quickest way is one line that downloads and installs everything:</p>
          <div className="mt-3">
            <CodeBlock title={t.oneLiner.shell} lines={[t.oneLiner.cmd]} />
          </div>
          <p className={p}>Prefer to see every step? This does the same thing by hand:</p>
          <div className="mt-3">
            <CodeBlock title={t.manual.shell} lines={t.manual.lines} />
          </div>
          <p className={p}>
            Or <a href={`${RELEASES}/${t.file}`} className="inline-flex items-center gap-1 font-medium text-neutral-950 underline"><Download className="size-3.5" /> download {t.file}</a>, extract it, and run the installer inside.
            It installs into <code className="rounded bg-neutral-100 px-1 text-sm">{t.run.folder}</code>.
          </p>
        </section>
      ))}

      <section id="connect" className="mt-16 border-t border-neutral-200 pt-12">
        <h2 className={h2}>Connect your account</h2>
        <p className={p}>The scraper needs a personal access token so it can save leads to your campaigns. The installer asks for it; you can also do this any time.</p>
        <ol className="mt-4 space-y-4">
          {[
            <>Open <Link href="/dashboard/settings" className="font-medium text-neutral-950 underline">Settings</Link>, open the <strong className="text-neutral-950">Integrations</strong> tab, find <strong className="text-neutral-950">Scraper access</strong>, name the token after your computer and press Create token.</>,
            "Copy the token right away. It is shown once and starts with swk_.",
            <>When the installer (or the setup command below) asks, paste the address <code className="rounded bg-neutral-100 px-1 text-sm">{origin}</code>, then the token. It tests both before saving.</>,
          ].map((x, i) => (
            <li key={i} className="flex gap-4 leading-7 text-neutral-600">
              <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-xs font-medium text-neutral-950">{i + 1}</span>
              <span>{x}</span>
            </li>
          ))}
        </ol>
        <div className="mt-4 space-y-3">
          {targets.map((t) => (
            <CodeBlock key={t.os} title={`${t.label}, to change the token later`} lines={[`cd ${t.run.folder}`, t.run.setup]} />
          ))}
        </div>
      </section>

      <section id="run" className="mt-16 border-t border-neutral-200 pt-12">
        <h2 className={h2}>Run it: background or window</h2>
        <p className={p}>Both do exactly the same work. Pick whichever suits you:</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-6 leading-7 text-neutral-600">
          <li><strong className="text-neutral-950">Background.</strong> No browser window. Nothing gets in your way, and it is the fastest. This is the normal choice.</li>
          <li><strong className="text-neutral-950">Window.</strong> A real browser opens and you watch it work. Use it to see what is happening, or if Google keeps showing a CAPTCHA you can solve by hand.</li>
        </ul>
        <div className="mt-4 space-y-3">
          {targets.map((t) => (
            <CodeBlock key={t.os} title={t.label} lines={[`cd ${t.run.folder}`, `${t.run.background}      # background`, `${t.run.window}   # visible window`]} />
          ))}
        </div>
        <p className={p}>Leave it running while you scrape. Press Ctrl+C in its window to quit. Then go to a city sheet, press <strong className="text-neutral-950">Start</strong>, and watch rows fill in. The bar shows the scrape&apos;s progress and whether your changes are saved.</p>
      </section>

      <section id="verify" className="mt-16 border-t border-neutral-200 pt-12">
        <h2 className={h2}>Check the connection</h2>
        <p className={p}>
          With the scraper running, open the dashboard. The badge in the top bar reads <strong className="text-neutral-950">Scraper connected</strong> within a few seconds, and
          the Guide button disappears. You can also check from a terminal:
        </p>
        <div className="mt-3">
          <CodeBlock title="Any system" lines={[`curl http://127.0.0.1:${SCRAPER_PORT}/health`]} />
        </div>
        <p className={p}>To test the install itself (browser, Google Maps, your token), run the doctor command in the scraper folder:</p>
        <div className="mt-3">
          <CodeBlock title="Windows" lines={["street-wolf-scraper.cmd doctor"]} />
          <div className="mt-3" />
          <CodeBlock title="Linux" lines={["./street-wolf-scraper doctor"]} />
        </div>
      </section>

      <section id="safety" className="mt-16 border-t border-neutral-200 pt-12">
        <h2 className={h2}>Speed, bans and proxies</h2>
        <p className={p}>Google rate-limits scrapers, so the scraper goes as fast as it safely can and slows itself down when needed:</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-6 leading-7 text-neutral-600">
          <li>It only opens a business&apos;s own page when you picked a field that needs it (phone, website, hours, email). Names, ratings, reviews, addresses and coordinates come straight from the results list, which is many times faster.</li>
          <li>It stays on the search results and clicks through the list like a person (no new page for every business), with short random pauses, no images or fonts, and businesses already on the sheet are skipped. It stops at the end of the list instead of waiting forever.</li>
          <li>If Google pushes back, it stops, waits (1 minute, then 2, 4 and so on), switches to a fresh browser session and carries on slowly. If it keeps happening it stops cleanly and keeps everything found so far.</li>
          <li>Google Maps shows about 120 results per search. For a bigger area, add more specific searches (for example &quot;dentists in Austin 78704&quot;).</li>
        </ul>
        <p className={p}>
          <strong className="text-neutral-950">Proxies are optional.</strong> To use your own, put one per line in <code className="rounded bg-neutral-100 px-1 text-sm">proxies.txt</code> in the scraper folder (<code className="rounded bg-neutral-100 px-1 text-sm">host:port</code> or <code className="rounded bg-neutral-100 px-1 text-sm">http://user:pass@host:port</code>).
          Free public proxies are available with <code className="rounded bg-neutral-100 px-1 text-sm">--free-proxies</code>, but most are dead, slow or already blocked by Google, so they are only a fallback after a block, never a speed boost. Paid residential proxies are the only dependable way to scrape at high volume.
        </p>
      </section>

      <section id="troubleshooting" className="mt-16 border-t border-neutral-200 pt-12">
        <h2 className={h2}>Troubleshooting</h2>
        <dl className="mt-4 space-y-6">
          {[
            ["The badge stays amber.", "Make sure the scraper window is still open, then press Check again. Closing the terminal stops it."],
            [`Port ${SCRAPER_PORT} is already in use.`, "Another program is using that port. Quit it, or restart the scraper after closing other copies of it."],
            ["The job stays on “Waiting for your scraper”.", "The scraper isn't running, or it is set up with a different account's token. Start it, and check that the token came from the same account you are signed in with."],
            ["It stopped with “Google keeps blocking this connection”.", "Wait an hour, or switch network (a phone hotspot works). Use window mode to solve a CAPTCHA by hand, or add proxies. Everything found before the block is already saved."],
            ["Linux: the browser won't start (missing libraries).", "Run sudo npx patchright install-deps chromium in the scraper folder once, then doctor again."],
            ["Window mode does nothing on Linux.", "It needs a desktop session. Over SSH or on a server it falls back to background mode automatically."],
            ["My firewall asks for permission.", "Allow it on private networks. It only listens on your own machine, never on the internet."],
            ["It runs but still shows not connected.", "Some browser extensions and privacy settings block requests to localhost. Try a private window or disable them for this site."],
          ].map(([q, a]) => (
            <div key={q}>
              <dt className="font-semibold">{q}</dt>
              <dd className="mt-1 leading-7 text-neutral-600">{a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </article>
  );
}
