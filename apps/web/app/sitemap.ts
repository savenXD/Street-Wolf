import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

// Bump a page's date only when its content really changes: Google ignores sitemaps whose lastmod is always "now".
const pages: { path: string; lastModified: string; changeFrequency: "weekly" | "monthly"; priority: number }[] = [
  { path: "/", lastModified: "2026-10-30", changeFrequency: "weekly", priority: 1 },
  { path: "/google-maps-scraper", lastModified: "2026-10-30", changeFrequency: "monthly", priority: 0.9 },
  { path: "/run-locally", lastModified: "2026-10-30", changeFrequency: "monthly", priority: 0.8 },
  { path: "/open-source-lead-generation", lastModified: "2026-10-30", changeFrequency: "monthly", priority: 0.8 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return pages.map((p) => ({ url: `${site.url}${p.path === "/" ? "" : p.path}`, lastModified: p.lastModified, changeFrequency: p.changeFrequency, priority: p.priority }));
}
