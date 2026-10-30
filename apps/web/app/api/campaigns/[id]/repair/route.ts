import { requireRole } from "@/lib/server/access";
import { api, ok } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/ratelimit";
import { repairCampaign } from "@/lib/server/sheets";
import { requireBrowserUser } from "@/lib/server/session";

/** Long enough for the biggest delete, save or repair; hosts that cap functions lower than this use their own limit. */
export const maxDuration = 60;

/** Admin repair button: rebuilds every sheet's counters from its rows and drops outreach credit that no longer applies. */
export const POST = api<{ id: string }>(async (req, { id }) => {
  const user = await requireBrowserUser(req);
  await requireRole(id, user._id, "admin");
  await rateLimit("repair", `${id}`, 6, 3600);
  return ok({ sheets: await repairCampaign(id) });
});
