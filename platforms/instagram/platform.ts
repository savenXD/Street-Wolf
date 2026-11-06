import type { PlatformManifest } from "@street-wolf/platform-sdk";

/** Instagram: skeleton. Every feature is planned; see README.md for what goes where. */
export const instagram: PlatformManifest = {
  id: "instagram",
  name: "Instagram",
  brand: "instagram",
  desc: "Creators and brands on Instagram.",
  status: "planned",
  features: [
    { id: "instagram:scrape", category: "scrape", title: "Scraping", desc: "Bios, followers and contact info from hashtags and niches.", status: "planned" },
    { id: "instagram:dm", category: "outreach", title: "DMs", desc: "Automated, human-paced DMs to each lead.", status: "planned" },
    { id: "instagram:post", category: "post", title: "Auto posting", desc: "Schedule posts and reels.", status: "planned" },
  ],
};
