import { ArrowRight, ImageIcon } from "lucide-react";
import { BrandGlyph, tileStyles } from "@/components/landing/brand-tile";
import { Reveal } from "@/components/landing/reveal";

type Feature = {
  kind: keyof typeof tileStyles;
  platform: string;
  title: string;
  body: string;
  sources: string[];
  image: string;
};

const features: Feature[] = [
  {
    kind: "instagram",
    platform: "Instagram",
    title: "Turn any audience into a lead list.",
    body: "Point Street Wolf at the places your buyers hang out. It collects the profiles, you shortlist the best fits, and it reaches out to each one with the message you set.",
    sources: ["Post comments", "Reels", "Influencer followers"],
    image: "Instagram screenshot",
  },
  {
    kind: "reddit",
    platform: "Reddit",
    title: "Find buyers while they're asking.",
    body: "Catch people mid-search in the threads where they ask for what you sell. Street Wolf pulls the authors, you shortlist, and it follows up with each one automatically.",
    sources: ["Posts", "Comments", "Subreddit members"],
    image: "Reddit screenshot",
  },
  {
    kind: "x",
    platform: "X",
    title: "Reach everyone talking about your space.",
    body: "Scrape the people behind the conversations you care about, shortlist the right ones, then reply or DM them on autopilot.",
    sources: ["Posts & replies", "Search results", "Account followers"],
    image: "X screenshot",
  },
  {
    kind: "gbp",
    platform: "Google Maps",
    title: "Every local business, in one search.",
    body: "Enter a keyword and a city. Street Wolf collects each business's phone, website, address and rating, then you shortlist and start outreach.",
    sources: ["Keyword + city", "Phone & website", "Ratings & reviews"],
    image: "Google Maps screenshot",
  },
];

const flow = ["Scrape", "Shortlist", "Auto-outreach"];

function ImageSlot({ label, kind }: { kind: keyof typeof tileStyles; label: string }) {
  return (
    <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-3xl border border-dashed border-neutral-300 bg-neutral-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#fff,transparent_60%)]" aria-hidden />
      <div className="relative flex flex-col items-center gap-3 text-neutral-400">
        <span className="flex size-12 items-center justify-center rounded-2xl" style={{ background: tileStyles[kind] }}>
          <BrandGlyph kind={kind} className="size-6" />
        </span>
        <span className="flex items-center gap-1.5 text-sm">
          <ImageIcon className="size-4" /> {label}
        </span>
      </div>
    </div>
  );
}

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <Reveal className="text-center">
        <p className="text-xs font-medium tracking-widest text-neutral-400 uppercase">What it does</p>
        <h2 className="mt-3 text-5xl font-semibold tracking-tighter sm:text-7xl">Current features</h2>
      </Reveal>

      <div className="mt-20 space-y-24 sm:space-y-32">
        {features.map((f, i) => (
          <Reveal key={f.platform} className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
            <div className={i % 2 ? "md:order-2" : ""}>
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl" style={{ background: tileStyles[f.kind] }}>
                  <BrandGlyph kind={f.kind} className="size-5" />
                </span>
                <span className="font-semibold">{f.platform}</span>
                <span className="font-mono text-xs text-neutral-400">0{i + 1}</span>
              </div>
              <h3 className="mt-6 text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">{f.title}</h3>
              <p className="mt-4 max-w-md leading-relaxed text-neutral-600">{f.body}</p>

              <div className="mt-6 flex flex-wrap gap-2">
                {f.sources.map((s) => (
                  <span key={s} className="rounded-full border border-neutral-200 px-3 py-1.5 text-sm text-neutral-700">
                    {s}
                  </span>
                ))}
              </div>

              <div className="mt-8 flex items-center gap-2 text-sm font-medium">
                {flow.map((step, j) => (
                  <span key={step} className="flex items-center gap-2">
                    <span className={j === flow.length - 1 ? "rounded-full bg-neutral-950 px-3 py-1 text-white" : "text-neutral-950"}>
                      {step}
                    </span>
                    {j < flow.length - 1 && <ArrowRight className="size-3.5 text-neutral-400" />}
                  </span>
                ))}
              </div>
            </div>
            <ImageSlot kind={f.kind} label={f.image} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
