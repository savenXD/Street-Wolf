import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";
import { breadcrumbJsonLd, faqJsonLd, jsonLd } from "@/lib/seo";
import { githubUrl } from "@/lib/site";

export type ContentSection = { heading: string; paragraphs?: string[]; bullets?: string[]; code?: string };
export type ContentPageProps = {
  path: string;
  crumb: string;
  eyebrow: string;
  h1: string;
  intro: string;
  sections: ContentSection[];
  faqs: { q: string; a: string }[];
};

const related = [
  { href: "/google-maps-scraper", label: "Google Maps scraper" },
  { href: "/run-locally", label: "Run it locally" },
  { href: "/open-source-lead-generation", label: "Open-source lead generation" },
];

/** Plain server-rendered article layout shared by the keyword landing pages. All text is in the HTML for crawlers. */
export function ContentPage({ path, crumb, eyebrow, h1, intro, sections, faqs }: ContentPageProps) {
  return (
    <div className="min-h-screen bg-white text-neutral-950">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbJsonLd([{ name: crumb, path }])) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqJsonLd(faqs)) }} />
      <header className="border-b border-neutral-100">
        <nav aria-label="Main" className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <a href={githubUrl} target="_blank" rel="noreferrer" className="px-3 text-sm text-neutral-600 hover:text-neutral-950">GitHub</a>
            <ButtonLink href="/dashboard" size="sm">Try for free</ButtonLink>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
        <nav aria-label="Breadcrumb" className="text-sm text-neutral-500">
          <Link href="/" className="hover:text-neutral-950">Home</Link> <span aria-hidden>/</span> <span>{crumb}</span>
        </nav>
        <p className="mt-8 text-xs font-medium tracking-widest text-neutral-400 uppercase">{eyebrow}</p>
        <h1 className="mt-3 text-4xl leading-[1.08] font-semibold tracking-tighter text-balance sm:text-6xl">{h1}</h1>
        <p className="mt-6 text-lg leading-relaxed text-neutral-600">{intro}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/dashboard" size="lg">Try for free <ArrowRight className="size-4" /></ButtonLink>
          <ButtonLink href={githubUrl} target="_blank" rel="noreferrer" variant="outline" size="lg">View on GitHub</ButtonLink>
        </div>

        {sections.map((s) => (
          <section key={s.heading} className="mt-14">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{s.heading}</h2>
            {s.paragraphs?.map((p) => (
              <p key={p} className="mt-4 leading-relaxed text-neutral-600">{p}</p>
            ))}
            {s.bullets && (
              <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-neutral-600 marker:text-neutral-400">
                {s.bullets.map((b) => <li key={b}>{b}</li>)}
              </ul>
            )}
            {s.code && (
              <pre className="mt-4 overflow-x-auto rounded-2xl bg-neutral-950 p-4 text-sm leading-relaxed text-neutral-100"><code>{s.code}</code></pre>
            )}
          </section>
        ))}

        <section className="mt-16">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Frequently asked questions</h2>
          <div className="mt-6 divide-y divide-neutral-200 rounded-3xl border border-neutral-200">
            {faqs.map((f) => (
              <div key={f.q} className="px-6 py-5">
                <h3 className="font-medium">{f.q}</h3>
                <p className="mt-2 leading-relaxed text-neutral-600">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <nav aria-label="Related pages" className="mt-16 flex flex-wrap gap-x-6 gap-y-2 border-t border-neutral-100 pt-8 text-sm font-medium">
          {related.filter((r) => r.href !== path).map((r) => (
            <Link key={r.href} href={r.href} className="underline underline-offset-4 hover:text-neutral-500">{r.label}</Link>
          ))}
          <Link href="/" className="underline underline-offset-4 hover:text-neutral-500">Street Wolf home</Link>
        </nav>
      </main>
    </div>
  );
}
