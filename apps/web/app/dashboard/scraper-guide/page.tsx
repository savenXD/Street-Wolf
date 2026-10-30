import type { Metadata } from "next";
import { ScraperGuide } from "@/components/dashboard/scraper-guide";

export const metadata: Metadata = { title: "Set up the scraper · Street Wolf", robots: { index: false, follow: false } };

export default function ScraperGuidePage() {
  return <ScraperGuide />;
}
