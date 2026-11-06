import type { PlatformManifest } from "@street-wolf/platform-sdk";

/** X: skeleton. Every feature is planned; see README.md for what goes where. */
export const x: PlatformManifest = {
  id: "x",
  name: "X",
  brand: "x",
  desc: "Live conversations about your topic.",
  status: "planned",
  features: [
    { id: "x:scrape", category: "scrape", title: "Scraping", desc: "Find people talking about your topic.", status: "planned" },
    { id: "x:dm", category: "outreach", title: "Replies and DMs", desc: "Replies and DMs to prospects.", status: "planned" },
    { id: "x:post", category: "post", title: "Auto posting", desc: "Posts and threads on a schedule.", status: "planned" },
  ],
};
