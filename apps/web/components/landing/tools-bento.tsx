import { ArrowRight, Star } from "lucide-react";
import { BrandGlyph, tileStyles } from "@/components/landing/brand-tile";
import { Tilt } from "@/components/landing/tilt";
import { githubUrl } from "@/lib/site";

function Head({ kind, name, live }: { kind: keyof typeof tileStyles; name: string; live?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 items-center justify-center rounded-xl" style={{ background: tileStyles[kind] }}>
        <BrandGlyph kind={kind} className="size-5" />
      </span>
      <h3 className="font-semibold">{name}</h3>
      <span
        className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium ${
          live ? "bg-neutral-950 text-white" : "border border-neutral-200 text-neutral-500"
        }`}
      >
        {live ? "Live" : "Soon"}
      </span>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <Tilt className={`h-full ${className}`} max={5}>
      <span className="flex h-full flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white p-6 transition-shadow hover:shadow-[0_24px_48px_-24px_rgba(0,0,0,0.22)]">
        {children}
      </span>
    </Tilt>
  );
}

const PINS = [[20, 40], [45, 25], [62, 60], [80, 35], [34, 72], [88, 78]];

export function ToolsBento() {
  return (
    <div className="mt-10 grid gap-4 md:grid-cols-4 md:grid-rows-[repeat(2,minmax(0,1fr))]">
      <Card className="md:col-span-2 md:row-span-2">
        <Head kind="gbp" name="Google Business Profiles" live />
        <span className="mt-3 text-sm text-neutral-500">
          Name, phone, website, address, rating and review count for every business that matches your search.
        </span>
        <span className="relative mt-5 min-h-48 flex-1 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50">
          <svg className="absolute inset-0 size-full text-neutral-200" aria-hidden>
            <defs>
              <pattern id="bento-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M24 0H0V24" fill="none" stroke="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#bento-grid)" />
          </svg>
          {PINS.map(([x, y], i) => (
            <span key={i} className="absolute" style={{ left: `${x}%`, top: `${y}%` }}>
              <span className="absolute size-3 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-[#2a6ff0]/50" style={{ animationDelay: `${i * 0.4}s` }} />
              <span className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#2a6ff0] shadow" />
            </span>
          ))}
        </span>
      </Card>

      <Card>
        <Head kind="instagram" name="Instagram" />
        <span className="mt-4 space-y-2 text-sm">
          <span className="block w-fit rounded-2xl rounded-bl-sm bg-neutral-100 px-3 py-2">Love your latte art ☕</span>
          <span className="ml-auto flex w-fit gap-1 rounded-2xl rounded-br-sm bg-neutral-950 px-3 py-3">
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-1.5 animate-bounce rounded-full bg-white" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </span>
        </span>
        <span className="mt-auto pt-4 text-sm text-neutral-500">Scrape profiles, send DMs.</span>
      </Card>

      <Card>
        <Head kind="reddit" name="Reddit" />
        <span className="mt-4 space-y-2 text-sm">
          <span className="block h-2 w-3/4 rounded bg-neutral-100" />
          <span className="block rounded-xl border border-[#ff4500]/40 bg-[#ff4500]/5 p-2.5 text-xs">
            “Anyone know a good CRM for a 5-person agency?”
            <span className="mt-1.5 block w-fit rounded-full bg-[#ff4500] px-2 py-0.5 text-[10px] font-medium text-white">buyer intent</span>
          </span>
        </span>
        <span className="mt-auto pt-4 text-sm text-neutral-500">Find buyers in threads.</span>
      </Card>

      <Card>
        <Head kind="x" name="X & auto-posting" />
        <span className="mt-4 rounded-xl border border-neutral-200 p-3 text-xs">
          Launching our spring menu 🌸
          <span className="mt-2 block h-1 overflow-hidden rounded-full bg-neutral-100">
            <span className="block h-full w-2/3 animate-pulse rounded-full bg-neutral-950" />
          </span>
          <span className="mt-1 block text-neutral-400">Posting in 2 min</span>
        </span>
        <span className="mt-auto pt-4 text-sm text-neutral-500">Scrape, reply, schedule.</span>
      </Card>

      <Card>
        <Head kind="voice" name="AI voice caller" />
        <span className="mt-4 flex h-12 items-center gap-[3px]">
          {Array.from({ length: 22 }, (_, i) => (
            <span
              key={i}
              className="h-full w-1 origin-center animate-wave rounded-full bg-neutral-950"
              style={{ animationDelay: `${(i * 0.09) % 1}s`, animationDuration: `${0.8 + (i % 5) * 0.15}s` }}
            />
          ))}
        </span>
        <span className="mt-auto pt-4 text-sm text-neutral-500">Call leads with an ElevenLabs voice.</span>
      </Card>

      <Card className="md:col-span-4">
        <span className="grid items-center gap-6 md:grid-cols-2">
          <span>
            <span className="flex items-center gap-2 font-semibold">
              <Star className="size-4" /> Build your own tool
            </span>
            <span className="mt-2 block max-w-sm text-neutral-600">
              A tool is one file: a name, an input schema and a run function. Save leads, log progress, done.
            </span>
            <a href={`${githubUrl}#build-a-tool`} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium hover:underline">
              Read the guide <ArrowRight className="size-3.5" />
            </a>
          </span>
          <pre className="overflow-x-auto rounded-2xl bg-neutral-950 p-4 font-mono text-xs leading-relaxed text-neutral-300">
{`export default defineTool({
  id: "my-tool",
  category: "scrape",
  inputSchema: z.object({ query: z.string() }),
  async run({ query }, ctx) {
    await ctx.saveLeads(await find(query));
  },
});`}
          </pre>
        </span>
      </Card>
    </div>
  );
}
