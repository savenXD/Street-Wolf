import { ArrowRight, Star } from "lucide-react";
import { BrandIcon } from "@/components/brand-icon";
import { DotField } from "@/components/landing/dot-field";
import { Features } from "@/components/landing/features";
import { Faq } from "@/components/landing/faq";
import { HeroTitle } from "@/components/landing/hero-title";
import { Marquee } from "@/components/landing/marquee";
import { ProductWindow } from "@/components/landing/product-window";
import { MotionRoot, Reveal } from "@/components/landing/reveal";
import { SmoothScroll } from "@/components/landing/smooth-scroll";
import { Terminal } from "@/components/landing/terminal";
import { ToolsBento } from "@/components/landing/tools-bento";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";
import { githubUrl, site } from "@/lib/site";
import { cacheLife } from "next/cache";

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
      <SmoothScroll />
      <div className="overflow-x-clip bg-white text-neutral-950">
        {/* Nav */}
        <header className="sticky top-0 z-30 border-b border-neutral-100 bg-white/80 backdrop-blur-lg">
          <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-8">
              <Logo />
              <div className="hidden items-center gap-6 text-sm text-neutral-600 md:flex">
                <a href="#features" className="hover:text-neutral-950">Features</a>
                <a href="#tools" className="hover:text-neutral-950">Tools</a>
                <a href="#faq" className="hover:text-neutral-950">FAQ</a>
              </div>
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
              Open source · Free forever · No paywall
              <ArrowRight className="size-3" />
            </a>
          </Reveal>
          <HeroTitle />
          <Reveal immediate delay={0.6} className="mx-auto mt-6 max-w-2xl text-center text-base leading-relaxed text-neutral-600 sm:text-lg">
            Find leads, message them, post, reply and even call, across Google, Instagram, Reddit, X and every channel we plug in next.
            One dashboard, one open-source engine, yours to self-host.
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

        {/* Tools */}
        <section id="tools" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">One den. Every channel.</h2>
            <p className="mt-3 max-w-lg text-neutral-600">
              Each channel is a plug-in tool. Use what ships, or write your own in an afternoon.
            </p>
          </Reveal>
          <ToolsBento />
        </section>

        {/* Open source */}
        <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <Reveal className="grid items-center gap-10 rounded-[2rem] bg-neutral-950 px-6 py-12 text-white sm:px-12 lg:grid-cols-2">
            <div>
              <BrandIcon name="github" className="size-8" />
              <h2 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">Your data. Your server. Your pack.</h2>
              <ul className="mt-6 space-y-2 text-neutral-400">
                <li>MIT licensed, every line on GitHub</li>
                <li>Self-host in two minutes with Docker</li>
                <li>No per-lead pricing, ever</li>
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/dashboard" size="lg" className="bg-white text-neutral-950 hover:bg-neutral-200">
                  Use it free
                </ButtonLink>
                <ButtonLink href={githubUrl} target="_blank" rel="noreferrer" size="lg" className="border border-neutral-700 bg-transparent hover:bg-neutral-900">
                  <Star className="size-4" /> Star on GitHub
                </ButtonLink>
              </div>
            </div>
            <Terminal />
          </Reveal>
        </section>

        {/* FAQ */}
        <section id="faq" className="px-4 py-14 sm:px-6">
          <Reveal>
            <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-5xl">Questions</h2>
            <Faq />
          </Reveal>
        </section>

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
        <footer className="border-t border-neutral-100">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-neutral-500 sm:px-6">
            <Logo />
            <div className="flex items-center gap-5">
              <a href={githubUrl} target="_blank" rel="noreferrer" className="hover:text-neutral-950">GitHub</a>
              <a href={`${githubUrl}/blob/main/LICENSE`} target="_blank" rel="noreferrer" className="hover:text-neutral-950">License</a>
              <span>Made by the pack.</span>
            </div>
          </div>
        </footer>
      </div>
    </MotionRoot>
  );
}
