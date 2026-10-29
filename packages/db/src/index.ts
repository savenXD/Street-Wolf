import { MongoClient, type Db, type Collection } from "mongodb";
import type * as T from "./types";

export type * from "./types";
export { ensureIndexes } from "./indexes";

export type Collections = {
  users: T.User;
  sessions: T.Session;
  authTokens: T.AuthToken;
  oauthStates: T.OAuthState;
  apiTokens: T.ApiToken;
  campaigns: T.Campaign;
  members: T.Member;
  invites: T.Invite;
  domains: T.Domain;
  places: T.Place;
  leads: T.Lead;
  notifications: T.Notification;
  emails: T.Email;
  dailyStats: T.DailyStat;
  jobs: T.Job;
  rateLimits: T.RateLimit;
};

type Cache = { client?: Promise<MongoClient> };
// One client per process, reused across hot reloads and requests: the driver pools connections itself.
const g = globalThis as unknown as { __swMongo?: Cache };
const cache = (g.__swMongo ??= {});

export function getClient(): Promise<MongoClient> {
  if (!cache.client) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not set. See apps/web/.env.example.");
    cache.client = new MongoClient(uri, {
      appName: "street-wolf",
      maxPoolSize: Number(process.env.MONGODB_POOL ?? 50),
      minPoolSize: 0, // idle instances (serverless) must not hold connections open against the Atlas connection limit
      maxIdleTimeMS: 60_000,
      serverSelectionTimeoutMS: 8000,
      waitQueueTimeoutMS: 10_000, // a saturated pool fails fast (503) instead of piling requests up forever
      socketTimeoutMS: 45_000, // a hung query can't hold a request (and a pooled connection) indefinitely
      retryWrites: true,
      retryReads: true,
      writeConcern: { w: "majority" },
    }).connect();
    cache.client.catch(() => (cache.client = undefined));
  }
  return cache.client;
}

export async function getDb(): Promise<Db> {
  return (await getClient()).db(process.env.MONGODB_DB ?? "streetwolf");
}

export async function col<K extends keyof Collections>(name: K): Promise<Collection<Collections[K] & { _id: string }>> {
  return (await getDb()).collection<Collections[K] & { _id: string }>(name) as unknown as Collection<Collections[K] & { _id: string }>;
}

export async function closeClient() {
  if (cache.client) await (await cache.client).close();
  cache.client = undefined;
}
