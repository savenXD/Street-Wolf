import "server-only";
import { col, type Member, type Role } from "@street-wolf/db";
import { forbidden, notFound } from "./http";

const rank: Record<Role, number> = { member: 1, admin: 2, owner: 3 };

/**
 * The one gate every campaign-scoped endpoint goes through. Returns the caller's membership or throws.
 * 404 (not 403) for non-members, so ids of other people's campaigns can't be probed.
 */
export async function requireRole(campaignId: string, userId: string, min: Role = "member"): Promise<Member> {
  const m = await (await col("members")).findOne({ campaignId, userId });
  if (!m) throw notFound("Campaign not found");
  if (rank[m.role] < rank[min]) throw forbidden(min === "owner" ? "Only the owner can do that" : "Only admins can do that");
  return m;
}
