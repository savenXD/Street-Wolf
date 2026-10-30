const DEFAULT_URL = "https://streetwolf.vercel.app";

export const site = {
  name: "Street Wolf",
  tagline: "Hunt leads like a pack.",
  title: "Street Wolf | Free Google Maps Scraper & Lead Generator (Open Source)",
  description:
    "Free open-source Google Maps scraper. Collect business leads with phone, website and ratings into a live sheet. Run it locally, free forever, no credit card.",
  keywords: [
    "google maps scraper",
    "google maps lead scraper",
    "free google maps scraper",
    "open source lead generation",
    "local business leads",
    "scrape google maps to csv",
    "self-hosted lead generation",
    "lead generation tool",
    "google maps data extractor",
    "local lead finder",
  ],
  // Set NEXT_PUBLIC_SITE_URL to the final public domain in production: every canonical, sitemap and OG URL is built from it.
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_URL).replace(/\/$/, ""),
  // TODO: point at the real repo once it's created on GitHub.
  githubRepo: process.env.NEXT_PUBLIC_GITHUB_REPO ?? "savenXD/Street-Wolf",
  selfHosted: process.env.NEXT_PUBLIC_SELF_HOSTED === "true",
  // Put a 1200x630 PNG at public/og-image.png.
  ogImage: "/og-image.png",
  locale: "en_US",
};

export const githubUrl = `https://github.com/${site.githubRepo}`;
