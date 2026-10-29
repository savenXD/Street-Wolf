import { z } from "zod";
import { col } from "@street-wolf/db";
import { requireRole } from "@/lib/server/access";
import { api, body, notFound, ok } from "@/lib/server/http";
import { requireBrowserUser } from "@/lib/server/session";

export const PATCH = api<{ id: string; did: string }>(async (req, { id, did }) => {
  const user = await requireBrowserUser(req);
  await requireRole(id, user._id);
  const b = await body(req, z.object({ name: z.string().trim().min(1).max(80).optional(), image: z.string().trim().max(2000).url().nullable().optional() }));
  const r = await (await col("domains")).updateOne({ _id: did, campaignId: id }, { $set: b });
  if (!r.matchedCount) throw notFound("Domain not found");
  return ok({ ok: true });
});

/** Removing a domain removes its places and every lead on them. */
export const DELETE = api<{ id: string; did: string }>(async (req, { id, did }) => {
  const user = await requireBrowserUser(req);
  await requireRole(id, user._id, "admin");
  const places = await (await col("places")).find({ campaignId: id, domainId: did }, { projection: { _id: 1 } }).toArray();
  const pids = places.map((p) => p._id);
  await (await col("leads")).deleteMany({ campaignId: id, placeId: { $in: pids } });
  await (await col("jobs")).deleteMany({ campaignId: id, placeId: { $in: pids } });
  await (await col("places")).deleteMany({ campaignId: id, domainId: did });
  await (await col("domains")).deleteOne({ _id: did, campaignId: id });
  return ok({ ok: true });
});
