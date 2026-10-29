import { z } from "zod";
import { col } from "@street-wolf/db";
import { api, body, ok } from "@/lib/server/http";
import { requireBrowserUser } from "@/lib/server/session";

const Body = z.object({ name: z.string().trim().max(80).optional(), title: z.string().trim().max(80).optional(), welcomed: z.boolean().optional() });

export const PATCH = api(async (req) => {
  const u = await requireBrowserUser(req);
  const patch = await body(req, Body);
  if (Object.keys(patch).length) await (await col("users")).updateOne({ _id: u._id }, { $set: patch });
  return ok({ ok: true });
});
