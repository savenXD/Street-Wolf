import type { Metadata } from "next";
import { githubUrl, site } from "@/lib/site";

/** Every answer here is also rendered on the page and in FAQPage JSON-LD, so keep them true and self-contained. */
export const faqs = [
  {
    q: "Is Street Wolf really free?",
    a: "Yes. Street Wolf is open source and free forever: no credit card, no per-lead pricing, no row limits. You can use the free hosted dashboard or run everything on your own computer.",
  },
  {
    q: "Do I need to sign up to scrape Google Maps?",
    a: "Not to scrape. The command-line scraper runs on your own computer with no account: one command turns a search like \"dentists in Austin, TX\" into a CSV file. The dashboard (live sheets, teams, outreach) uses a free account, and you can host that yourself too.",
  },
  {
    q: "Can I run Street Wolf locally?",
    a: "Yes, Street Wolf is local-first. The scraper installs on Windows or Linux in a few minutes and runs in your own browser session, and the whole web app can be self-hosted with Node.js and MongoDB. Your data stays on your machine or your server.",
  },
  {
    q: "What data does the Google Maps scraper collect?",
    a: "For each business: name, category, address, phone number, website, rating, review count, coordinates and the Maps link. It can also read public email addresses and social links from the business's own website.",
  },
  {
    q: "Is scraping Google Maps allowed?",
    a: "Street Wolf only reads business information that anyone can see by searching Google Maps. Laws and terms differ by country and use, so check the rules that apply to you, and follow anti-spam and privacy rules (GDPR, CAN-SPAM) when you contact leads.",
  },
  {
    q: "How is it different from paid Google Maps scrapers?",
    a: "It is free, open source and runs on your own machine instead of a paid cloud. The scraper paces itself and keeps Google's result order, and your leads go into a sheet you own rather than a vendor's export credits.",
  },
  {
    q: "Which platforms are supported?",
    a: "Google Maps is live today. Instagram, Reddit and X lead collection are on the roadmap and are built as plug-in tools, so new channels can be added by anyone.",
  },
];

export const useCases = [
  { title: "Agencies & freelancers", body: "Build prospect lists of local businesses that need websites, SEO, ads or software, with phone and website ready to contact." },
  { title: "Sales teams", body: "Fill a pipeline with every dentist, gym, realtor or restaurant in a city, then work the list together in shared sheets." },
  { title: "Local market research", body: "Map competitors, ratings and review counts for any category and area to size a market before you enter it." },
  { title: "Founders & indie hackers", body: "Find your first customers without paying per lead. Scrape, shortlist and reach out from one free tool." },
];

type PageMeta = { path: string; title: string; description: string };

/** Per-page metadata with canonical + social tags. Child pages replace (not merge) openGraph, so they must restate it. */
export function pageMetadata({ path, title, description }: PageMeta): Metadata {
  const url = path === "/" ? "/" : path;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", url, title, description, siteName: site.name, locale: site.locale, images: [{ url: site.ogImage, width: 1200, height: 630, alt: `${site.name}: free open-source Google Maps lead scraper` }] },
    twitter: { card: "summary_large_image", title, description, images: [site.ogImage] },
  };
}

export const noIndex: Metadata = { robots: { index: false, follow: false } };

const abs = (path: string) => `${site.url}${path}`;

export function siteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": abs("/#organization"),
        name: site.name,
        url: abs("/"),
        logo: { "@type": "ImageObject", url: abs("/street_wolf_logo.png"), width: 2172, height: 724 },
        sameAs: [githubUrl],
      },
      {
        "@type": "WebSite",
        "@id": abs("/#website"),
        url: abs("/"),
        name: site.name,
        description: site.description,
        inLanguage: "en",
        publisher: { "@id": abs("/#organization") },
      },
      {
        "@type": "SoftwareApplication",
        "@id": abs("/#software"),
        name: site.name,
        url: abs("/"),
        description: site.description,
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Lead generation",
        operatingSystem: "Web, Windows, Linux",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        image: abs(site.ogImage),
        sameAs: [githubUrl],
        featureList: [
          "Google Maps business scraper",
          "Live lead sheets with CSV export",
          "Runs locally on Windows and Linux",
          "Self-hostable, open source",
          "Team workspaces and outreach",
        ],
        publisher: { "@id": abs("/#organization") },
      },
    ],
  };
}

export function faqJsonLd(items = faqs) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...trail].map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, item: abs(t.path) })),
  };
}

/** Serialised for a <script type="application/ld+json">; "<" is escaped so content can never close the tag. */
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
