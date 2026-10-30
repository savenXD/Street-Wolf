export type Field = { key: string; label: string; note?: string };
export type FieldGroup = { id: string; label: string; fields: Field[] };

// What a Google Maps listing can give us. "via website" fields need a second pass over the business's own site.
export const fieldGroups: FieldGroup[] = [
  {
    id: "basics",
    label: "Basics",
    fields: [
      { key: "name", label: "Business name" },
      { key: "category", label: "Category" },
      { key: "address", label: "Address" },
      { key: "phone", label: "Phone" },
      { key: "website", label: "Website" },
      { key: "mapsUrl", label: "Google Maps link" },
    ],
  },
  {
    id: "reputation",
    label: "Reputation",
    fields: [
      { key: "rating", label: "Rating" },
      { key: "reviews", label: "Review count" },
      { key: "priceLevel", label: "Price level" },
      { key: "reviewSnippets", label: "Review snippets" },
    ],
  },
  {
    id: "details",
    label: "Details",
    fields: [
      { key: "hours", label: "Opening hours" },
      { key: "openNow", label: "Open now" },
      { key: "attributes", label: "Services & amenities" },
      { key: "photo", label: "Main photo URL" },
    ],
  },
  {
    id: "location",
    label: "Location",
    fields: [
      { key: "lat", label: "Latitude" },
      { key: "lng", label: "Longitude" },
      { key: "plusCode", label: "Plus code" },
      { key: "postalCode", label: "Postal code" },
    ],
  },
  {
    id: "contact",
    label: "Contact enrichment",
    fields: [
      { key: "email", label: "Email", note: "via website" },
      { key: "instagram", label: "Instagram", note: "via website" },
      { key: "facebook", label: "Facebook", note: "via website" },
      { key: "linkedin", label: "LinkedIn", note: "via website" },
    ],
  },
];

export const allFields = fieldGroups.flatMap((g) => g.fields);
/**
 * The call summary is not scraped, so it is not in the setup picker. Every sheet has it as the 2nd column by default,
 * and it is saved like any other cell (so teammates and the phone page see it too).
 */
export const SUMMARY_KEY = "callSummary";
export const summaryField: Field = { key: SUMMARY_KEY, label: "Call summary" };
export const fieldByKey = (key: string) => (key === SUMMARY_KEY ? summaryField : allFields.find((f) => f.key === key));

/** The data columns of a sheet, in the saved order. A column the person has never placed goes to its default spot: the call summary right after Label (the 2nd column), anything else at the end. */
export function sheetKeys(cfg: { fields: string[] } | undefined, blank: string[], saved: string[] = []): string[] {
  const catalog = fieldGroups.flatMap((g) => g.fields.map((f) => f.key));
  const base = [SUMMARY_KEY, ...(cfg ? catalog.filter((k) => cfg.fields.includes(k)) : blank)];
  const fresh = base.filter((k) => !saved.includes(k));
  return [...fresh.filter((k) => k === SUMMARY_KEY), ...saved.filter((k) => base.includes(k)), ...fresh.filter((k) => k !== SUMMARY_KEY)];
}

export type ScrapeConfig = {
  queries: string[];
  /** Per query: "all" runs until the query has no more results. */
  limit: "all" | number;
  fields: string[];
  filters: {
    minRating: number;
    minReviews: number;
    website: "any" | "has" | "none";
    mustHavePhone: boolean;
    skipClosed: boolean;
    skipScraped: boolean;
    exclude: string[];
  };
};

export const defaultFields = ["name", "category", "address", "phone", "website", "rating", "reviews"];

export const defaultConfig = (queries: string[]): ScrapeConfig => ({
  queries,
  limit: "all",
  fields: defaultFields,
  filters: { minRating: 0, minReviews: 0, website: "any", mustHavePhone: false, skipClosed: true, skipScraped: true, exclude: [] },
});
