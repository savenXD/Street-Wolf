"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { BrandGlyph, tileStyles } from "@/components/landing/brand-tile";
import { FeaturesPipeline } from "@/components/landing/features-pipeline";
import { Promises } from "@/components/landing/promises";
import { Reveal } from "@/components/landing/reveal";

gsap.registerPlugin(ScrollTrigger);

type Feature = {
  kind: keyof typeof tileStyles;
  platform: string;
  title: string;
  body: string;
  sources: string[];
  /** Drop a transparent 1:1 PNG at this path in /public and it shows up. Until then the slot is empty. */
  image: string;
};

const features: Feature[] = [
  {
    kind: "instagram",
    platform: "Instagram",
    title: "Turn any audience into a lead list.",
    body: "Point Street Wolf at the places your buyers hang out. It collects the profiles, you shortlist the best fits, and it reaches out to each one with the message you set.",
    sources: ["Post comments", "Reels", "Influencer followers"],
    image: "/features/instagram.png",
  },
  {
    kind: "reddit",
    platform: "Reddit",
    title: "Find buyers while they're asking.",
    body: "Catch people mid-search in the threads where they ask for what you sell. Street Wolf pulls the authors, you shortlist, and it follows up with each one automatically.",
    sources: ["Posts", "Comments", "Subreddit members"],
    image: "/features/reddit.png",
  },
  {
    kind: "x",
    platform: "X",
    title: "Reach everyone talking about your space.",
    body: "Scrape the people behind the conversations you care about, shortlist the right ones, then reply or DM them on autopilot.",
    sources: ["Posts & replies", "Search results", "Account followers"],
    image: "/features/x.png",
  },
  {
    kind: "gbp",
    platform: "Google Maps",
    title: "Every local business, in one search.",
    body: "Enter a keyword and a city. Street Wolf collects each business's phone, website, address and rating, then you shortlist and start outreach.",
    sources: ["Keyword + city", "Phone & website", "Ratings & reviews"],
    image: "/features/google-maps.png",
  },
];
const flow = ["Scrape", "Shortlist", "Auto-outreach"];

/** Every feature stays on the page in normal flow, so nothing can be scrolled past. GSAP only adds motion on top. */
export function Features() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const cleanups: (() => void)[] = [];
      const q = gsap.utils.selector(el);

      // A rail runs through all four features and fills as you scroll.
      gsap.fromTo(
        q(".fx-spine-fill"),
        { scaleY: 0 },
        { scaleY: 1, ease: "none", scrollTrigger: { trigger: q(".fx-rows")[0], start: "top 55%", end: "bottom 55%", scrub: 0.4 } },
      );

      q(".fx-row").forEach((row, i) => {
        const r = gsap.utils.selector(row);
        const dir = i % 2 ? -1 : 1;

        // Title: each word rises out of a mask.
        const words = r(".fx-word");
        gsap.set(words, { yPercent: 115 });
        gsap.set(r(".fx-item"), { autoAlpha: 0, y: 34, filter: "blur(8px)" });
        gsap.set(r(".fx-chip"), { autoAlpha: 0, scale: 0.6 });

        const flowPills = r(".fx-step");
        const loop = gsap.timeline({ repeat: -1, paused: true });
        flowPills.forEach((p, j) => {
          loop
            .to(p, { backgroundColor: "#0a0a0a", color: "#fff", scale: 1.06, duration: 0.3, ease: "back.out(2)" }, j * 1.1)
            .to(p, { backgroundColor: "rgba(10,10,10,0)", color: "#a3a3a3", scale: 1, duration: 0.3 }, j * 1.1 + 1.0);
        });
        loop.to({}, { duration: 0.2 });

        const enter = gsap.timeline({
          paused: true,
          defaults: { ease: "power4.out" },
        });
        enter
          .to(r(".fx-node"), { scale: 1, duration: 0.7, ease: "elastic.out(1, 0.5)" }, 0)
          .to(r(".fx-ring"), { scale: 2.4, autoAlpha: 0, duration: 1, ease: "power2.out", startAt: { scale: 1, autoAlpha: 0.5 } }, 0)
          .to(words, { yPercent: 0, duration: 0.9, stagger: 0.06 }, 0.1)
          .to(r(".fx-item"), { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.8, stagger: 0.1 }, 0.25)
          .to(r(".fx-chip"), { autoAlpha: 1, scale: 1, duration: 0.6, stagger: 0.08, ease: "back.out(2.2)" }, 0.55);

        ScrollTrigger.create({
          trigger: row,
          start: "top 72%",
          onEnter: () => (enter.play(), loop.play()),
          onLeaveBack: () => (enter.reverse(), loop.pause()),
          onLeave: () => loop.pause(),
          onEnterBack: () => loop.play(),
        });

        // Node starts small; the outlined number and the image slot drift at their own speeds.
        gsap.set(r(".fx-node"), { scale: 0.4 });
        gsap.fromTo(r(".fx-num"), { yPercent: 25 }, { yPercent: -25, ease: "none", scrollTrigger: { trigger: row, start: "top bottom", end: "bottom top", scrub: true } });

        const slot = r(".fx-slot")[0] as HTMLElement;
        gsap.fromTo(
          slot,
          { autoAlpha: 0, scale: 0.7, rotate: dir * -10, yPercent: 14 },
          { autoAlpha: 1, scale: 1, rotate: 0, yPercent: 0, ease: "power3.out", scrollTrigger: { trigger: row, start: "top 85%", end: "top 35%", scrub: 0.6 } },
        );
        gsap.fromTo(
          r(".fx-float"),
          { y: 50 },
          { y: -50, ease: "none", scrollTrigger: { trigger: row, start: "top bottom", end: "bottom top", scrub: 1 } },
        );

        // Hover: the image slot tilts in 3D toward the cursor.
        const tiltX = gsap.quickTo(slot, "rotationX", { duration: 0.6, ease: "power3" });
        const tiltY = gsap.quickTo(slot, "rotationY", { duration: 0.6, ease: "power3" });
        const move = (e: PointerEvent) => {
          const b = slot.getBoundingClientRect();
          tiltY(((e.clientX - b.left) / b.width - 0.5) * 22);
          tiltX(-((e.clientY - b.top) / b.height - 0.5) * 22);
        };
        const leave = () => (tiltX(0), tiltY(0));
        slot.addEventListener("pointermove", move);
        slot.addEventListener("pointerleave", leave);
        cleanups.push(() => {
          slot.removeEventListener("pointermove", move);
          slot.removeEventListener("pointerleave", leave);
        });
      });
      return () => cleanups.forEach((c) => c());
    });

    return () => mm.revert();
  }, []);

  return (
    <section id="features" ref={root} className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <Reveal className="text-center">
        <p className="text-xs font-medium tracking-widest text-neutral-400 uppercase">What it does</p>
        <h2 className="mt-3 text-5xl font-semibold tracking-tighter sm:text-7xl">Runs up to 24 hours a day</h2>
      </Reveal>

      <FeaturesPipeline />

      <Promises />

      <div className="fx-rows relative mt-24">
        <div aria-hidden className="absolute top-0 bottom-0 left-1/2 hidden w-px -translate-x-1/2 bg-neutral-200 md:block">
          <div className="fx-spine-fill h-full w-full origin-top bg-neutral-950" />
        </div>

        <div className="space-y-24 md:space-y-40">
          {features.map((f, i) => {
            const flip = i % 2 === 1;
            return (
              <div key={f.platform} id={`feature-${f.kind}`} className="fx-row relative scroll-mt-24 grid items-center gap-10 md:grid-cols-[1fr_auto_1fr] md:gap-14">
                <div className={`relative ${flip ? "md:order-3" : ""}`}>
                  <span
                    aria-hidden
                    className="fx-num pointer-events-none absolute -top-12 -left-2 -z-10 font-brand text-[9rem] leading-none font-bold text-transparent select-none sm:text-[13rem]"
                    style={{ WebkitTextStroke: "1.5px #ececec" }}
                  >
                    0{i + 1}
                  </span>

                  <div className="fx-item flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl" style={{ background: tileStyles[f.kind] }}>
                      <BrandGlyph kind={f.kind} className="size-5" />
                    </span>
                    <span className="font-semibold">{f.platform}</span>
                  </div>

                  <h3 className="mt-6 text-3xl leading-[1.1] font-semibold tracking-tight sm:text-5xl">
                    {f.title.split(" ").map((w, j) => (
                      <span key={j} className="mr-[0.25em] inline-block overflow-hidden pb-1 align-top">
                        <span className="fx-word inline-block">{w}</span>
                      </span>
                    ))}
                  </h3>
                  <p className="fx-item mt-4 max-w-md leading-relaxed text-neutral-600">{f.body}</p>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {f.sources.map((s) => (
                      <span key={s} className="fx-chip rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700">
                        {s}
                      </span>
                    ))}
                  </div>

                  <div className="fx-item mt-8 flex items-center gap-1 text-sm font-medium">
                    {flow.map((name, j) => (
                      <span key={name} className="flex items-center gap-1">
                        <span className="fx-step rounded-full px-3 py-1 text-neutral-400">{name}</span>
                        {j < flow.length - 1 && <ArrowRight className="size-3.5 text-neutral-300" />}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Spine node */}
                <div className="relative hidden items-center justify-center md:flex md:order-2">
                  <span className="fx-ring absolute size-12 rounded-2xl opacity-0" style={{ background: tileStyles[f.kind] }} />
                  <span className="fx-node relative flex size-12 items-center justify-center rounded-2xl ring-[10px] ring-white" style={{ background: tileStyles[f.kind] }}>
                    <BrandGlyph kind={f.kind} className="size-6" />
                  </span>
                </div>

                {/* Fully transparent 1:1 slot: no background, no border. */}
                <div className={`fx-float flex justify-center ${flip ? "md:order-1" : "md:order-3"}`}>
                  <div className="[perspective:1000px] w-full max-w-[460px]">
                    <div className="fx-slot relative aspect-square w-full [transform-style:preserve-3d]">
                      {/* Soft grey cloud behind the image. */}
                      <div
                        aria-hidden
                        className="pointer-events-none absolute -inset-[8%] blur-2xl"
                        style={{
                          background:
                            "radial-gradient(closest-side at 28% 58%, #e4e4e4 55%, transparent), radial-gradient(closest-side at 55% 30%, #dadada 50%, transparent), radial-gradient(closest-side at 74% 62%, #e6e6e6 55%, transparent), radial-gradient(closest-side at 50% 78%, #e0e0e0 50%, transparent)",
                        }}
                      />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={f.image}
                        alt=""
                        className="relative size-full object-contain"
                        ref={(img) => {
                          // A missing file (or one that failed before hydration) leaves the slot empty, with no broken-image icon.
                          if (img?.complete && img.naturalWidth === 0) img.style.display = "none";
                        }}
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
