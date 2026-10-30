import { ContentPage } from "@/components/seo/content-page";
import { pageMetadata } from "@/lib/seo";

const path = "/run-locally";
export const metadata = pageMetadata({
  path,
  title: "Run Street Wolf Locally: Self-Hosted, Local-First Lead Scraper",
  description: "Run the Google Maps lead scraper on your own computer, no account needed, or self-host the whole dashboard. Local-first, open source, free forever. Windows and Linux.",
});

export default function Page() {
  return (
    <ContentPage
      path={path}
      crumb="Run locally"
      eyebrow="Local-first"
      h1="Run Street Wolf on your own computer"
      intro="Street Wolf is built local-first. The scraper runs on your machine in your own browser session, and the full web app can be self-hosted, so your leads never have to live on someone else's server."
      sections={[
        {
          heading: "Option 1: the scraper alone, no account",
          paragraphs: ["Install on Linux with one line (Windows uses a PowerShell installer, see the repository). It sets up Node.js and the browser privately, with no admin rights."],
          code: "curl -fsSL https://github.com/savenXD/Street-Wolf/releases/latest/download/install.sh | sh\n\nstreet-wolf-scraper scrape \"gyms\" --location \"Austin, TX\" --limit 50 > leads.csv",
        },
        {
          heading: "Option 2: self-host the dashboard",
          paragraphs: ["Run the web app (live sheets, teams, outreach) on your own machine. You need Node.js and pnpm; the dev command starts a local MongoDB for you, no Docker required."],
          code: "git clone https://github.com/savenXD/Street-Wolf.git\ncd Street-Wolf\npnpm install\npnpm db:dev   # terminal 1: local MongoDB\npnpm dev      # terminal 2: http://localhost:3000",
        },
        {
          heading: "Why local-first",
          bullets: [
            "Your data stays on your computer or your own server",
            "Free forever: no subscription, no credits, no row limits",
            "Open source, so you can read, change and audit everything",
            "Connect the local scraper to your own dashboard, or to the free hosted one",
          ],
        },
      ]}
      faqs={[
        { q: "Can I use Street Wolf offline or without the hosted site?", a: "The scraper needs internet to reach Google Maps, but nothing needs to go through our servers. You can run the scraper and your own copy of the dashboard entirely on your machine." },
        { q: "What do I need to self-host?", a: "Node.js, pnpm and MongoDB. The repository includes a command that starts a local MongoDB without Docker." },
        { q: "Does it cost anything to run locally?", a: "No. There is no license fee, no usage limit and no paid tier. You only use your own computer and internet connection." },
      ]}
    />
  );
}
