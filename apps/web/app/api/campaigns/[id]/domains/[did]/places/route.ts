import { z } from "zod";
import { col } from "@street-wolf/db";
import { requireRole } from "@/lib/server/access";
import { newId } from "@/lib/server/crypto";
import { api, body, conflict, notFound, ok, uuid } from "@/lib/server/http";
import { requireBrowserUser } from "@/lib/server/session";

export const POST = api<{ id: string; did: string }>(async (req, { id, did }) => {
  const user = await requireBrowserUser(req);
  await requireRole(id, user._id);
  const b = await body(req, z.object({ id: uuid.optional(), name: z.string().trim().min(1).max(80) }));
  if (!(await (await col("domains")).findOne({ _id: did, campaignId: id }))) throw notFound("Domain not found");
  const places = await col("places");
  if ((await places.countDocuments({ campaignId: id, domainId: did })) >= 500) throw conflict("A domain can have up to 500 places");
  const last = await places.find({ campaignId: id, domainId: did }).sort({ position: -1 }).limit(1).next();
  const pid = b.id ?? newId();
  const now = new Date();
  await places.updateOne(
    { _id: pid, campaignId: id },
    { $setOnInsert: { _id: pid, campaignId: id, domainId: did, name: b.name, scrape: null, view: null, position: (last?.position ?? -1) + 1, stats: { leads: 0, outreached: 0, converted: 0 }, createdAt: now, updatedAt: now } },
    { upsert: true },
  );
  return ok({ id: pid }, { status: 201 });
});
