import type { BrandName } from "@/components/brand-icon";

export type Category = "scrape" | "outreach" | "post";

export type Feature = {
  id: string;
  brand: BrandName;
  platform: string;
  category: Category;
  title: string;
  desc: string;
};

type SubFeature = {
  id: string;
  category: Category;
  title: string;
  desc: string;
  /** Set when the sub-feature is powered by a different brand than its platform card. */
  via?: { brand: BrandName; name: string };
};

export type Platform = {
  id: string;
  brand: BrandName;
  name: string;
  desc: string;
  features: SubFeature[];
};

export const categories: { id: Category; label: string; hint: string }[] = [
  { id: "scrape", label: "Scraping", hint: "Find and collect leads" },
  { id: "outreach", label: "Outreach", hint: "Reach out to them" },
  { id: "post", label: "Posting", hint: "Publish content to attract them" },
];

export const platforms: Platform[] = [
  {
    id: "googlemaps",
    brand: "googlemaps",
    name: "Google Maps",
    desc: "Local businesses and how to reach them.",
    features: [
      { id: "googlemaps:scrape", category: "scrape", title: "Scraping", desc: "Names, phones, websites and reviews by niche and place." },
      { id: "elevenlabs:outreach", category: "outreach", title: "AI calling", desc: "A natural-sounding voice agent phones every lead.", via: { brand: "elevenlabs", name: "ElevenLabs" } },
      { id: "whatsapp:outreach", category: "outreach", title: "WhatsApp outreach", desc: "Personalised WhatsApp messages to each lead.", via: { brand: "whatsapp", name: "WhatsApp" } },
    ],
  },
  {
    id: "instagram",
    brand: "instagram",
    name: "Instagram",
    desc: "Creators and brands on Instagram.",
    features: [
      { id: "instagram:scrape", category: "scrape", title: "Scraping", desc: "Bios, followers and contact info from hashtags and niches." },
      { id: "instagram:outreach", category: "outreach", title: "Outreach", desc: "Automated, human-paced DMs." },
      { id: "instagram:post", category: "post", title: "Auto posting", desc: "Schedule posts and reels." },
    ],
  },
  {
    id: "reddit",
    brand: "reddit",
    name: "Reddit",
    desc: "Communities where buyers ask for what you sell.",
    features: [
      { id: "reddit:scrape", category: "scrape", title: "Scraping", desc: "Posts and users showing buying intent." },
      { id: "reddit:outreach", category: "outreach", title: "Outreach", desc: "Helpful comments and DMs." },
      { id: "reddit:post", category: "post", title: "Auto posting", desc: "Share in the right subreddits." },
    ],
  },
  {
    id: "x",
    brand: "x",
    name: "X",
    desc: "Live conversations about your topic.",
    features: [
      { id: "x:scrape", category: "scrape", title: "Scraping", desc: "Find people talking about your topic." },
      { id: "x:outreach", category: "outreach", title: "Outreach", desc: "Replies and DMs to prospects." },
      { id: "x:post", category: "post", title: "Auto posting", desc: "Posts and threads on a schedule." },
    ],
  },
];

export const features: Feature[] = platforms.flatMap((p) =>
  p.features.map((f) => ({
    id: f.id,
    brand: f.via?.brand ?? p.brand,
    platform: f.via?.name ?? p.name,
    category: f.category,
    title: f.title,
    desc: f.desc,
  })),
);

export const featureById = (id: string) => features.find((f) => f.id === id);
