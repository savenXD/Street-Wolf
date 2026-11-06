// ATC = "asked to callback". One cell holds the day the client asked to be called and a short note:
// "2026-11-03" on the first line, the note after it. Stored like any other cell, so it syncs to teammates and the phone page.

export type Atc = { date: string; note: string };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseAtc(text: string): Atc {
  const [first = "", ...rest] = text.replace(/\r/g, "").split("\n");
  if (!DATE.test(first.trim())) return { date: "", note: text.trim() };
  return { date: first.trim(), note: rest.join("\n").trim() };
}

export const buildAtc = ({ date, note }: Atc) => (date ? `${date}${note.trim() ? `\n${note.trim()}` : ""}` : note.trim());

export const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const fromIso = (s: string) => new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));

/** "Mon 3 Nov" (with the year when it isn't this one). */
export function dayLabel(date: string) {
  if (!DATE.test(date)) return "";
  const d = fromIso(date);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", ...(d.getFullYear() !== new Date().getFullYear() && { year: "numeric" }) });
}

/** One line for a table cell. */
export function previewAtc(text: string) {
  const { date, note } = parseAtc(text);
  return [dayLabel(date), note.replace(/\s*\n\s*/g, " ")].filter(Boolean).join("  ·  ");
}

/** The callback day has already passed. */
export const isOverdue = (text: string) => {
  const { date } = parseAtc(text);
  return !!date && date < isoDay(new Date());
};
