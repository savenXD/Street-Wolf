import { z } from "zod";
import { col } from "@street-wolf/db";
import { newToken, sha256 } from "@/lib/server/crypto";
import { api, body, conflict, ok } from "@/lib/server/http";
import { requireBrowserUser } from "@/lib/server/session";

/** Access tokens for the local scraper app. The secret is shown once; only its hash is kept. */
export const GET = api(async (req) => {
  const user = await requireBrowserUser(req);
  const t = await (await col("apiTokens")).find({ userId: user._id }).sort({ createdAt: -1 }).toArray();
  return ok({ tokens: t.map((x) => ({ id: x._id, name: x.name, prefix: x.prefix, createdAt: x.createdAt.getTime(), lastUsedAt: x.lastUsedAt?.getTime() ?? null })) });
});

export const POST = api(async (req) => {
  const user = await requireBrowserUser(req);
  const { name } = await body(req, z.object({ name: z.string().trim().min(1).max(60) }));
  const tokens = await col("apiTokens");
  if ((await tokens.countDocuments({ userId: user._id })) >= 20) throw conflict("Revoke an old token first (limit 20)");
  const secret = `swk_${newToken()}`;
  await tokens.insertOne({ _id: sha256(secret), userId: user._id, name, prefix: secret.slice(0, 8), createdAt: new Date(), lastUsedAt: null });
  return ok({ token: secret, id: sha256(secret), name }, { status: 201 });
});
