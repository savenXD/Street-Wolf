import "server-only";
import { col, type User } from "@street-wolf/db";
import { newId } from "./crypto";
import { claimInvitesFor } from "./invites";

/** Find or create the user for a verified email, then attach any invites waiting for that address. */
export async function upsertUser(p: { email: string; name?: string; avatarUrl?: string | null; googleId?: string | null }): Promise<User> {
  const users = await col("users");
  const now = new Date();
  const set: Partial<User> = { lastLoginAt: now };
  if (p.googleId) set.googleId = p.googleId;
  if (p.avatarUrl) set.avatarUrl = p.avatarUrl;
  const u = await users.findOneAndUpdate(
    { email: p.email },
    {
      $set: set,
      $setOnInsert: { _id: newId(), email: p.email, name: p.name ?? "", title: "", welcomed: false, createdAt: now, ...(p.googleId ? {} : { googleId: null }), ...(p.avatarUrl ? {} : { avatarUrl: null }) },
    },
    { upsert: true, returnDocument: "after" },
  );
  // A name from Google fills a blank profile but never overwrites one the user chose.
  if (u && !u.name && p.name) {
    await users.updateOne({ _id: u._id, name: "" }, { $set: { name: p.name } });
    u.name = p.name;
  }
  await claimInvitesFor(u!);
  return u!;
}
