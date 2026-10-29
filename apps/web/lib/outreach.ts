import type { LabelNode } from "@/lib/labels";

/** "Didn't pick" doesn't count as outreach: the person never actually spoke to anyone. */
const isDidntPick = (n: Pick<LabelNode, "id" | "name">) => n.id === "no-pick" || /^(didnt|did not|dint)\s*pick/.test(n.name.toLowerCase().replace(/[’'`]/g, "").trim());

/**
 * Ids of the labels that do NOT count as outreach in this campaign's label tree. The built-in "no-pick" id always
 * counts as one, even if the tree was customised, so renaming or rebuilding the tree can't silently turn missed
 * calls into outreach. Works on a loosely typed tree because it arrives from the database as `unknown`.
 */
export function nonOutreachIds(tree?: unknown): Set<string> {
  const ids = new Set<string>(["no-pick"]);
  const walk = (n: unknown, depth = 0) => {
    if (!n || typeof n !== "object" || depth > 12) return;
    const { id, name, children } = n as Partial<LabelNode>;
    if (typeof id === "string" && typeof name === "string" && isDidntPick({ id, name })) ids.add(id);
    if (Array.isArray(children)) children.forEach((c) => walk(c, depth + 1));
  };
  walk(tree);
  return ids;
}

/** A row counts as outreach when it carries any label other than "Didn't pick". */
export const countsAsOutreach = (label: string | null | undefined, skip: Set<string>) => !!label && !skip.has(label);
