import type { PlatformManifest } from "@street-wolf/platform-sdk";

/** Reddit: skeleton. Every feature is planned; see README.md for what goes where. */
export const reddit: PlatformManifest = {
  id: "reddit",
  name: "Reddit",
  brand: "reddit",
  desc: "Communities where buyers ask for what you sell.",
  status: "planned",
  features: [
    { id: "reddit:scrape", category: "scrape", title: "Scraping", desc: "Posts and users showing buying intent.", status: "planned" },
    { id: "reddit:dm", category: "outreach", title: "DMs and comments", desc: "Helpful comments and DMs to people asking.", status: "planned" },
    { id: "reddit:post", category: "post", title: "Auto posting", desc: "Share in the right subreddits.", status: "planned" },
  ],
};
