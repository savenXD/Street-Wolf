import { getDb } from "./index";

const DAY = 60 * 60 * 24;

/** Idempotent: safe to run on every boot. Every query the app makes is covered by one of these. */
export async function ensureIndexes() {
  const db = await getDb();
  const c = (n: string) => db.collection(n);

  await Promise.all([
    c("users").createIndexes([
      { key: { email: 1 }, unique: true },
      { key: { googleId: 1 }, unique: true, partialFilterExpression: { googleId: { $type: "string" } } },
    ]),
    // TTL: Mongo deletes expired rows itself, so no cleanup job is needed.
    c("sessions").createIndexes([{ key: { userId: 1 } }, { key: { expiresAt: 1 }, expireAfterSeconds: 0 }]),
    c("authTokens").createIndexes([{ key: { expiresAt: 1 }, expireAfterSeconds: 0 }]),
    c("oauthStates").createIndexes([{ key: { expiresAt: 1 }, expireAfterSeconds: 0 }]),
    c("apiTokens").createIndexes([{ key: { userId: 1 } }]),

    c("campaigns").createIndexes([{ key: { ownerId: 1 } }]),
    c("members").createIndexes([
      { key: { campaignId: 1, userId: 1 }, unique: true },
      { key: { userId: 1 } }, // "which campaigns am I in"
    ]),
    c("invites").createIndexes([
      { key: { tokenHash: 1 }, unique: true },
      // Only one open invite per person per campaign; old accepted/revoked ones are kept as history.
      { key: { campaignId: 1, email: 1 }, unique: true, partialFilterExpression: { status: "pending" } },
      { key: { email: 1, status: 1 } }, // "invites waiting for me"
      { key: { campaignId: 1, status: 1 } },
    ]),
    c("domains").createIndexes([{ key: { campaignId: 1, position: 1 } }]),
    c("places").createIndexes([{ key: { campaignId: 1, domainId: 1, position: 1 } }]),
    c("leads").createIndexes([
      { key: { placeId: 1, row: 1 }, unique: true },
      // Re-scrapes of the same business must not create duplicates.
      { key: { placeId: 1, source: 1, sourceId: 1 }, unique: true, partialFilterExpression: { sourceId: { $type: "string" } } },
      { key: { placeId: 1, updatedAt: 1, row: 1 } }, // live sync: "rows changed since..." for one sheet, paged by (updatedAt, row)
    ]),
    c("notifications").createIndexes([
      { key: { userId: 1, createdAt: -1 } },
      { key: { userId: 1, readAt: 1 } },
      { key: { createdAt: 1 }, expireAfterSeconds: 180 * DAY }, // keep six months
    ]),
    c("emails").createIndexes([
      { key: { status: 1, nextAttemptAt: 1 } },
      { key: { createdAt: 1 }, expireAfterSeconds: 30 * DAY, partialFilterExpression: { status: "failed" } }, // dead letters don't pile up forever
      { key: { sentAt: 1 }, expireAfterSeconds: 30 * DAY, partialFilterExpression: { status: "sent" } },
    ]),
    c("dailyStats").createIndexes([{ key: { campaignId: 1, day: 1 } }, { key: { campaignId: 1, userId: 1, day: 1 } }]),
    c("jobs").createIndexes([{ key: { status: 1, createdBy: 1, createdAt: 1 } }, { key: { placeId: 1, createdAt: -1 } }, { key: { campaignId: 1, createdAt: -1 } }]),
    c("rateLimits").createIndexes([{ key: { expiresAt: 1 }, expireAfterSeconds: 0 }]),
  ]);

  // Indexes nothing queries any more still cost a write on every row change. Dropping a missing index is a no-op.
  await Promise.all(
    [
      ["leads", "campaignId_1_label_1"],
      ["leads", "placeId_1_updatedAt_1"], // replaced by the (placeId, updatedAt, row) index
      ["authTokens", "email_1_createdAt_-1"],
    ].map(([coll, name]) => c(coll).dropIndex(name).catch(() => undefined)),
  );
}
