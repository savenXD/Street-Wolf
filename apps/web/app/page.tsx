import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { BrandIcon } from "@/components/brand-icon";
import { DotField } from "@/components/landing/dot-field";
import { Features } from "@/components/landing/features";
import { HeroTitle } from "@/components/landing/hero-title";
import { Marquee } from "@/components/landing/marquee";
import { ProductWindow } from "@/components/landing/product-window";
import { MotionRoot, Reveal } from "@/components/landing/reveal";
import { SmoothScroll } from "@/components/landing/smooth-scroll";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";
import { jsonLd, pageMetadata, siteJsonLd } from "@/lib/seo";
import { githubUrl, site } from "@/lib/site";
import { cacheLife } from "next/cache";

export const metadata: Metadata = { ...pageMetadata({ path: "/", title: site.title, description: site.description }), title: { absolute: site.title } };

// Sharp downward-pointing teeth along the bottom edge of the nav bar.
const zigzagTooth = "conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) bottom / 20px 10px repeat-x";
const zigzagBody = "linear-gradient(#000 0 0) top / 100% calc(100% - 9px) no-repeat";
const zigzag = { mask: `${zigzagTooth}, ${zigzagBody}`, WebkitMask: `${zigzagTooth}, ${zigzagBody}` };

async function getStars(): Promise<number | null> {
  "use cache";
  cacheLife("hours");
  try {
    const res = await fetch(`https://api.github.com/repos/${site.githubRepo}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { stargazers_count?: number };
    return data.stargazers_count ?? null;
  } catch {
    return null;
  }
}

export default async function Landing() {
  const stars = await getStars();

  return (
    <MotionRoot>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(siteJsonLd()) }} />
      <SmoothScroll />
      <div className="overflow-x-clip bg-white text-neutral-950">
        {/* Nav */}
        {/* The drop-shadow lives on the wrapper because clip-path would cut it off the inner bar. */}
        <header className="sticky top-0 z-30 drop-shadow-[0_2px_0_rgba(0,0,0,0.08)]">
          <div className="bg-white/95 pb-2.5" style={zigzag}>
          <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-8">
              <Logo />
            </div>
            <div className="flex items-center gap-2">
              <a
                href={githubUrl}
                target="_blank"
                rel="noreferrer"
                className="group inline-flex h-9 items-center gap-2 rounded-full bg-neutral-950 px-4 text-sm font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-neutral-800 hover:shadow-lg"
              >
                <BrandIcon name="github" className="size-4" />
                <span className="hidden sm:inline">GitHub</span>
                {stars !== null && (
                  <span className="flex items-center gap-1 border-l border-white/25 pl-2 text-neutral-300">
                    <Star className="size-3 transition-transform group-hover:rotate-72 group-hover:fill-current" />
                    {stars.toLocaleString()}
                  </span>
                )}
              </a>
              <ButtonLink href="/dashboard" size="sm" className="bg-neutral-100 text-neutral-950 hover:bg-neutral-200">
                Try for free
              </ButtonLink>
            </div>
          </nav>
          </div>
        </header>

        {/* Hero */}
        <section className="relative isolate px-4 pt-14 sm:px-6 sm:pt-20">
          {/* Dot grid that fades out toward the centre so the headline stays clean. */}
          <div
            className="absolute inset-0 -z-10 bg-[radial-gradient(#c4c4c4_1.3px,transparent_1.3px)] bg-[size:22px_22px] [mask-image:radial-gradient(ellipse_55%_50%_at_50%_38%,transparent_0%,#000_100%)]"
            aria-hidden
          />
          <Reveal immediate className="mb-6 flex justify-center">
            <a
              href={githubUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-950"
            >
              <BrandIcon name="github" className="size-3.5" />
              Open source · Free forever · Runs locally
              <ArrowRight className="size-3" />
            </a>
          </Reveal>
          <HeroTitle />
          <Reveal immediate delay={0.6} className="mx-auto mt-6 max-w-2xl text-center text-base leading-relaxed text-neutral-600 sm:text-lg">
            Turn any Google Maps search into a lead sheet. <strong className="font-semibold text-neutral-950">100% free</strong>,{" "}
            <strong className="font-semibold text-neutral-950">no paywalls</strong>, <strong className="font-semibold text-neutral-950">local first</strong>.
          </Reveal>
          <Reveal immediate delay={0.75} className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/dashboard" size="lg" className="transition-transform hover:-translate-y-0.5">
              Try for free <ArrowRight className="size-4" />
            </ButtonLink>
            <ButtonLink href={githubUrl} target="_blank" rel="noreferrer" variant="outline" size="lg" className="transition-transform hover:-translate-y-0.5">
              <BrandIcon name="github" className="size-4" /> Self-host
            </ButtonLink>
          </Reveal>
          <div className="mt-14">
            <ProductWindow />
          </div>
        </section>

        <div className="mt-16">
          <Marquee />
        </div>

        <Features />

        {/* Final CTA */}
        <section className="relative overflow-hidden border-t border-neutral-100 px-4 py-24 text-center sm:px-6">
          <DotField />
          <Reveal className="relative">
            <h2 className="text-4xl font-semibold tracking-tighter sm:text-6xl">
              Your pack is <span className="text-neutral-400">waiting.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-neutral-600">Run your first hunt in under a minute. No card, no limits.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/dashboard" size="lg" className="transition-transform hover:-translate-y-0.5">
                Try for free <ArrowRight className="size-4" />
              </ButtonLink>
              <ButtonLink href={githubUrl} target="_blank" rel="noreferrer" variant="outline" size="lg" className="transition-transform hover:-translate-y-0.5">
                <BrandIcon name="github" className="size-4" /> GitHub
              </ButtonLink>
            </div>
          </Reveal>
        </section>

        {/* Footer */}
        <footer className="relative overflow-hidden border-t border-neutral-100 bg-neutral-50">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 pt-10 text-sm text-neutral-500 sm:px-6">
            <Logo />
            <div className="flex flex-wrap items-center gap-5">
              <a href="#features" className="hover:text-neutral-950">Features</a>
              <Link href="/google-maps-scraper" className="hover:text-neutral-950">Google Maps scraper</Link>
              <Link href="/run-locally" className="hover:text-neutral-950">Run locally</Link>
              <Link href="/open-source-lead-generation" className="hover:text-neutral-950">Open source</Link>
              <a href={githubUrl} target="_blank" rel="noreferrer" className="hover:text-neutral-950">GitHub</a>
              <a href={`${githubUrl}/blob/main/LICENSE`} target="_blank" rel="noreferrer" className="hover:text-neutral-950">License</a>
            </div>
          </div>
          <p
            aria-hidden
            className="mt-6 select-none whitespace-nowrap text-center text-[15.5vw] font-semibold uppercase leading-[0.8] tracking-tighter text-neutral-200/80 [mask-image:linear-gradient(to_bottom,#000_35%,transparent)]"
          >
            Street Wolf
          </p>
        </footer>
      </div>
    </MotionRoot>
  );
}
