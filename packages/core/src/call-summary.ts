// A call summary is typed as points: a "-" starts a new point, so "- my name is Devansh - I am 19" is two points.
// Hyphens inside words ("follow-up") are left alone; only a "-" that stands on its own (start of the text, or between spaces) splits.

export function parseSummary(text: string): string[] {
  return text
    .replace(/\r/g, "")
    .replace(/^\s*-(?=\S)/, "- ") // "-first" at the very start still counts
    .split(/(?:^|\s)-(?:\s+|$)/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** One line for a table cell. */
export const previewSummary = (text: string) => parseSummary(text).join("  ·  ");
