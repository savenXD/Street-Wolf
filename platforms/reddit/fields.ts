// What Reddit can give us, and the setup a scrape runs with. Plain data, no imports: the web app, its server code and
// the scrape worker (inside the downloadable scraper) all read it. Draft: adjust when the scraper is built.

export type Field = { key: string; label: string };
export type FieldGroup = { id: string; label: string; fields: Field[] };

export const fieldGroups: FieldGroup[] = [
  {
    id: "post",
    label: "Post",
    fields: [
      { key: "title", label: "Title" },
      { key: "body", label: "Text" },
      { key: "subreddit", label: "Subreddit" },
      { key: "postUrl", label: "Link" },
      { key: "postedAt", label: "Posted" },
    ],
  },
  {
    id: "author",
    label: "Author",
    fields: [
      { key: "username", label: "Username" },
      { key: "karma", label: "Karma" },
      { key: "accountAge", label: "Account age" },
    ],
  },
  {
    id: "signal",
    label: "Signal",
    fields: [
      { key: "score", label: "Score" },
      { key: "comments", label: "Comments" },
      { key: "intent", label: "Buying intent" },
    ],
  },
];

export type ScrapeConfig = {
  /** subreddits (r/smallbusiness) and keywords */
  queries: string[];
  limit: "all" | number;
  fields: string[];
};

export const defaultFields = ["title", "subreddit", "username", "postUrl", "postedAt"];

export const defaultConfig = (queries: string[]): ScrapeConfig => ({ queries, limit: 100, fields: defaultFields });
