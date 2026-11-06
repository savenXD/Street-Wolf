import { col } from "@street-wolf/db";
import { requireRole } from "@/lib/server/access";
import { api, notFound, ok } from "@/lib/server/http";
import { requireBrowserUser } from "@/lib/server/session";
import { scrapeHistory } from "@street-wolf/google-maps/server";

type P = { id: string; did: string; pid: string };

/** The searches and full setups already used on this Google Maps sheet (see scrapeHistory in platforms/google-maps). */
export const GET = api<P>(async (req, { id, did, pid }) => {
  const user = await requireBrowserUser(req);
  await requireRole(id, user._id);
  if (!(await (await col("places")).findOne({ _id: pid, campaignId: id, domainId: did }, { projection: { _id: 1 } }))) throw notFound("Place not found");
  const jobs = await (await col("jobs"))
    .find({ campaignId: id, placeId: pid, status: { $in: ["done", "cancelled", "failed"] } })
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray();
  return ok(scrapeHistory(jobs));
});
