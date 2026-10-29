import { z } from "zod";
import { col } from "@street-wolf/db";
import { newId } from "@/lib/server/crypto";
import { api, body, conflict, email, ok, uuid } from "@/lib/server/http";
import { createInvite } from "@/lib/server/invites";
import { featureIds } from "@/lib/server/schemas";
import { rateLimit } from "@/lib/server/ratelimit";
import { requireBrowserUser } from "@/lib/server/session";
import { loadWorkspace } from "@/lib/server/workspace";

const Body = z.object({
  id: uuid.optional(), // the browser mints ids so the UI can update before the server answers
  name: z.string().trim().min(1).max(80),
  purpose: z.string().trim().max(500).default(""),
  features: featureIds.default([]),
  team: z.array(email).max(50).default([]),
});

export const POST = api(async (req) => {
  const user = await requireBrowserUser(req);
  const b = await body(req, Body);
  await rateLimit("campaign-create", user._id, 30, 3600);
  const campaigns = await col("campaigns");
  if ((await campaigns.countDocuments({ ownerId: user._id })) >= 100) throw conflict("You've reached the limit of 100 campaigns");

  const id = b.id ?? newId();
  const now = new Date();
  try {
    await campaigns.insertOne({ _id: id, ownerId: user._id, name: b.name, purpose: b.purpose, features: b.features, labelTree: null, createdAt: now, updatedAt: now });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) throw conflict("That campaign already exists");
    throw e;
  }
  try {
    await (await col("members")).insertOne({ _id: newId(), campaignId: id, userId: user._id, role: "owner", addedBy: user._id, createdAt: now });
  } catch (e) {
    await campaigns.deleteOne({ _id: id }).catch(() => undefined); // no campaign without an owner membership: it would be invisible yet count against the 100 limit
    throw e;
  }

  const campaign = (await campaigns.findOne({ _id: id }))!;
  const failed: string[] = [];
  for (const to of b.team.filter((e) => e !== user.email)) {
    try {
      await createInvite({ campaign, inviter: user, email: to, role: "member" });
    } catch {
      failed.push(to);
    }
  }
  return ok({ campaign: (await loadWorkspace(user._id, [id]))[0], failedInvites: failed }, { status: 201 });
});
