import { ContentPage } from "@/components/seo/content-page";
import { pageMetadata } from "@/lib/seo";

const path = "/open-source-lead-generation";
export const metadata = pageMetadata({
  path,
  title: "Open-Source Lead Generation Tool: Free Forever, Self-Hostable",
  description: "Street Wolf is a free, open-source lead generation tool. Scrape Google Maps today, with Instagram, Reddit and X next. Shortlist leads and reach out with your team. No card, no limits.",
});

export default function Page() {
  return (
    <ContentPage
      path={path}
      crumb="Open-source lead generation"
      eyebrow="Open source"
      h1="Open-source lead generation, free forever"
      intro="Most lead tools charge per lead or per export. Street Wolf is the opposite: an open-source lead engine you can use free on the hosted site or run yourself, with no per-lead pricing and no lock-in."
      sections={[
        {
          heading: "One workflow: scrape, shortlist, reach out",
          paragraphs: [
            "Collect leads from a source, shortlist the ones that fit, then contact them. Google Maps scraping is live today. Instagram, Reddit and X lead collection are on the roadmap and are built as plug-in tools, so any channel can be added with a small amount of code.",
          ],
        },
        {
          heading: "Built for teams and solo operators",
          bullets: [
            "Live sheets that fill as the scraper finds businesses",
            "Labels, filters and CSV import and export",
            "Team workspaces with invites, so a pack can work one list",
            "Per-user data isolation: leads are never shared unless you share them",
          ],
        },
        {
          heading: "Open source and self-hostable",
          paragraphs: ["Read the code, change it, host it. Use the free hosted dashboard to start in a minute, or run everything on your own machine."],
        },
      ]}
      faqs={[
        { q: "What makes Street Wolf different from other lead generation tools?", a: "It is free and open source, runs locally, has no per-lead pricing, and keeps your leads in a sheet you own." },
        { q: "Which lead sources are available?", a: "Google Maps today. Instagram, Reddit and X are planned and will plug in as tools." },
        { q: "Can my team use it together?", a: "Yes. Create a team, invite members, and share campaigns and sheets while keeping everything else private." },
      ]}
    />
  );
}
