import { defaultTree, type LabelNode } from "@/lib/labels";
import { nonOutreachIds } from "@/lib/outreach";
import type { Campaign } from "@/lib/workspace";

/** How many rows carry each label id, across every place in the campaign. */
export function campaignLabelCounts(campaign: Campaign): Record<string, number> {
  const out: Record<string, number> = {};
  for (const city of campaign.domains.flatMap((d) => d.cities)) {
    // Same rule as cityStats: once a sheet's rows are downloaded, its live labels win over the server's counters.
    const counts =
      city.rows === undefined
        ? (city.labelCounts ?? {})
        : Object.values(city.labels ?? {}).reduce<Record<string, number>>((a, l) => ((a[l] = (a[l] ?? 0) + 1), a), {});
    for (const [id, n] of Object.entries(counts)) out[id] = (out[id] ?? 0) + n;
  }
  return out;
}

export type Stage = { id: string; name: string; value: number };
export type Part = { id: string; name: string; color: string; value: number };
export type Group = Part & { parts: Part[] };
export type Breakdown = { stages: Stage[]; groups: Group[]; called: number };

const OTHER_COLOR = "#737373";

/**
 * Turns label counts into the two views the dashboard draws:
 *  - stages: the funnel (leads → called → picked → interested → converted). A stage whose label the campaign's tree
 *    doesn't have is skipped, so customised trees still get a sensible funnel.
 *  - groups: what the calls ended as. The root's children, with "Picked" opened one level so Interested and
 *    Not interested sit side by side with Didn't pick and Irrelevant. Each group lists its own children as parts.
 */
export function breakdown(counts: Record<string, number>, leads: number, tree: LabelNode = defaultTree): Breakdown {
  const known = new Set<string>();
  const total = (n: LabelNode): number => {
    known.add(n.id);
    return (counts[n.id] ?? 0) + (n.children ?? []).reduce((a, c) => a + total(c), 0);
  };
  const totals = new Map<string, number>();
  const walk = (n: LabelNode) => {
    totals.set(n.id, total(n));
    n.children?.forEach(walk);
  };
  walk(tree);
  const unknown = Object.entries(counts).reduce((a, [id, n]) => (known.has(id) ? a : a + n), 0);
  const called = (totals.get(tree.id) ?? 0) + unknown;

  const find = (id: string, n: LabelNode = tree): LabelNode | undefined => (n.id === id ? n : n.children?.map((c) => find(id, c)).find(Boolean));
  const stages: Stage[] = [
    { id: "leads", name: "Leads", value: Math.max(leads, called) },
    { id: tree.id, name: tree.name, value: called },
    ...["picked", "interested", "converted"].flatMap((id) => {
      const n = find(id);
      return n ? [{ id, name: n.name, value: totals.get(id) ?? 0 }] : [];
    }),
  ];

  const skip = nonOutreachIds(tree);
  const asPart = (n: LabelNode): Part => ({ id: n.id, name: n.name, color: n.color, value: totals.get(n.id) ?? 0 });
  const self = (n: LabelNode, name: string): Part[] => (counts[n.id] ? [{ id: `${n.id}:self`, name, color: n.color, value: counts[n.id] }] : []);
  const group = (n: LabelNode): Group => ({ ...asPart(n), parts: [...(n.children ?? []).map(asPart), ...(n.children?.length ? self(n, "No detail") : [])] });

  const groups: Group[] = [];
  for (const c of tree.children ?? []) {
    // Open up a branch that has sub-outcomes (Picked → Interested / Not interested). "Didn't pick" stays whole.
    if (c.children?.length && !skip.has(c.id)) {
      groups.push(...c.children.map(group));
      groups.push(...self(c, `${c.name}, no detail`).map((p) => ({ ...p, parts: [] })));
    } else groups.push(group(c));
  }
  groups.push(...self(tree, `${tree.name}, no outcome`).map((p) => ({ ...p, parts: [] })));
  if (unknown) groups.push({ id: "other", name: "Removed labels", color: OTHER_COLOR, value: unknown, parts: [] });

  return { stages, groups, called };
}
