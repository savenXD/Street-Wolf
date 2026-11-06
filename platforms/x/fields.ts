// What X can give us, and the setup a scrape runs with. Plain data, no imports: the web app, its server code and
// the scrape worker (inside the downloadable scraper) all read it. Draft: adjust when the scraper is built.

export type Field = { key: string; label: string };
export type FieldGroup = { id: string; label: string; fields: Field[] };

export const fieldGroups: FieldGroup[] = [
  {
    id: "post",
    label: "Post",
    fields: [
      { key: "text", label: "Text" },
      { key: "postUrl", label: "Link" },
      { key: "postedAt", label: "Posted" },
      { key: "likes", label: "Likes" },
      { key: "reposts", label: "Reposts" },
    ],
  },
  {
    id: "author",
    label: "Author",
    fields: [
      { key: "username", label: "Username" },
      { key: "displayName", label: "Name" },
      { key: "bio", label: "Bio" },
      { key: "followers", label: "Followers" },
      { key: "website", label: "Website" },
    ],
  },
];

export type ScrapeConfig = {
  /** search terms and hashtags */
  queries: string[];
  limit: "all" | number;
  fields: string[];
};

export const defaultFields = ["username", "displayName", "text", "postUrl", "followers"];

export const defaultConfig = (queries: string[]): ScrapeConfig => ({ queries, limit: 100, fields: defaultFields });
