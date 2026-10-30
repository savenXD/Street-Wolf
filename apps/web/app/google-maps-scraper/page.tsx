import { ContentPage } from "@/components/seo/content-page";
import { pageMetadata } from "@/lib/seo";

const path = "/google-maps-scraper";
export const metadata = pageMetadata({
  path,
  title: "Free Google Maps Scraper: Extract Business Leads to CSV",
  description: "Scrape Google Maps for free. Get business name, phone, website, address and ratings for any keyword and city, in a live sheet or CSV. Open source, no card, runs locally.",
});

export default function Page() {
  return (
    <ContentPage
      path={path}
      crumb="Google Maps scraper"
      eyebrow="Google Maps scraper"
      h1="A free Google Maps scraper for local business leads"
      intro="Street Wolf collects every business that shows up for a search on Google Maps, such as &quot;dentists in Austin&quot;, and puts them in a live sheet you can sort, filter, share and export to CSV. It is open source, free forever, and runs on your own computer."
      sections={[
        {
          heading: "What you get for every business",
          bullets: [
            "Name, category and full address",
            "Phone number and website",
            "Rating, review count and coordinates",
            "Google Maps link, plus hours and attributes when you ask for them",
            "Public email addresses and social links, read from the business's own website",
          ],
        },
        {
          heading: "How scraping Google Maps with Street Wolf works",
          paragraphs: [
            "Pick a keyword and a location. The scraper opens Google Maps in a lightweight browser, reads the results list, and only opens a business's own page when you asked for details that need it, like phone or website. Results keep the same order Google Maps shows them in, and businesses already on your sheet are skipped.",
            "It paces itself like a person browsing, backs off when Google asks for a CAPTCHA, and stops cleanly instead of hammering the site. Rows appear in your sheet as they are found, and Stop in the dashboard halts the run within seconds.",
          ],
        },
        {
          heading: "Scrape without an account",
          paragraphs: ["The command-line scraper needs no sign-up. Run one command and get a CSV:"],
          code: 'street-wolf-scraper scrape "dentists" --location "Austin, TX" --limit 50 --fields name,phone,website > leads.csv',
        },
        {
          heading: "Good to know",
          paragraphs: [
            "Google Maps returns about 120 results per search, so use more specific searches (a neighbourhood, a sub-category) to cover a large area. Street Wolf reads only information that is publicly visible on Google Maps. Check the rules that apply to you, and follow anti-spam and privacy laws when you contact leads.",
          ],
        },
      ]}
      faqs={[
        { q: "Is this Google Maps scraper free?", a: "Yes. It is open source and free forever, with no credit card, no export credits and no limit on rows." },
        { q: "Do I need the Google Maps API or an API key?", a: "No. Street Wolf reads Google Maps in a browser like a visitor would, so there is no Places API key, billing account or per-request cost." },
        { q: "Can I export Google Maps results to CSV or Excel?", a: "Yes. The command-line scraper prints CSV, and the dashboard sheet exports to CSV, which opens in Excel and Google Sheets." },
        { q: "Which operating systems are supported?", a: "Windows and Linux. The installer sets up Node.js and the browser for you." },
      ]}
    />
  );
}
