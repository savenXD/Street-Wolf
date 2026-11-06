// What Instagram can give us, and the setup a scrape runs with. Plain data, no imports: the web app, its server code and
// the scrape worker (inside the downloadable scraper) all read it. Draft: adjust when the scraper is built.

export type Field = { key: string; label: string };
export type FieldGroup = { id: string; label: string; fields: Field[] };

export const fieldGroups: FieldGroup[] = [
  {
    id: "basics",
    label: "Basics",
    fields: [
      { key: "username", label: "Username" },
      { key: "fullName", label: "Full name" },
      { key: "bio", label: "Bio" },
      { key: "category", label: "Category" },
      { key: "profileUrl", label: "Profile link" },
    ],
  },
  {
    id: "reach",
    label: "Reach",
    fields: [
      { key: "followers", label: "Followers" },
      { key: "following", label: "Following" },
      { key: "posts", label: "Posts" },
      { key: "verified", label: "Verified" },
    ],
  },
  {
    id: "contact",
    label: "Contact",
    fields: [
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "website", label: "Website" },
    ],
  },
];

export type ScrapeConfig = {
  /** hashtags (#skincare) or niche keywords */
  queries: string[];
  limit: "all" | number;
  fields: string[];
};

export const defaultFields = ["username", "fullName", "bio", "followers", "email", "website"];

export const defaultConfig = (queries: string[]): ScrapeConfig => ({ queries, limit: 100, fields: defaultFields });
