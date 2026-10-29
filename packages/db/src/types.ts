// Document shapes for every collection. Ids are strings (UUIDs, or a sha256 for tokens) so the browser can
// mint ids itself and update optimistically. Nothing here is Mongo-specific, so the web app can import it too.

export type Role = "owner" | "admin" | "member";

/** Every platform a campaign can use. New platforms (reddit, linkedin...) only need an entry here and in lib/features. */
export type Platform = "googlemaps" | "instagram" | "reddit";

export type User = {
  _id: string;
  email: string; // lowercase, unique
  name: string;
  title: string; // free text shown in onboarding, e.g. "Founder"
  avatarUrl: string | null;
  googleId: string | null;
  welcomed: boolean;
  createdAt: Date;
  lastLoginAt: Date;
  /** IANA zone from the browser, so "today" and the daily chart follow this person's own day. */
  tz?: string;
};

/** _id is the sha256 of the cookie token, so a leaked database cannot be replayed as sessions. */
export type Session = {
  _id: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date; // TTL index
  ip: string | null;
  userAgent: string | null;
};

/** One-time sign-in link. _id is the sha256 of the emailed token. */
export type AuthToken = {
  _id: string;
  email: string;
  next: string;
  createdAt: Date;
  expiresAt: Date; // TTL index
  usedAt: Date | null;
};

/** Short-lived OAuth state + PKCE verifier while the user is at Google. */
export type OAuthState = {
  _id: string; // state
  verifier: string;
  next: string;
  expiresAt: Date; // TTL index
};

/** Personal access token for the local scraper app. _id is the sha256 of the token. */
export type ApiToken = {
  _id: string;
  userId: string;
  name: string;
  prefix: string; // first chars, shown in the UI so tokens can be told apart
  createdAt: Date;
  lastUsedAt: Date | null;
};

export type Campaign = {
  _id: string;
  ownerId: string;
  name: string;
  purpose: string;
  features: string[]; // feature ids from lib/features, e.g. "googlemaps:scrape"
  labelTree: unknown | null; // custom call-outcome tree; null = built-in
  createdAt: Date;
  updatedAt: Date;
};

export type Member = {
  _id: string;
  campaignId: string;
  userId: string;
  role: Role;
  addedBy: string;
  createdAt: Date;
};

export type InviteStatus = "pending" | "accepted" | "revoked";

export type Invite = {
  _id: string;
  campaignId: string;
  email: string;
  role: Exclude<Role, "owner">;
  tokenHash: string;
  invitedBy: string;
  status: InviteStatus;
  createdAt: Date;
  expiresAt: Date;
  acceptedBy: string | null;
  acceptedAt: Date | null;
};

export type Domain = {
  _id: string;
  campaignId: string;
  name: string;
  image: string | null;
  position: number;
  createdAt: Date;
};

/** A place (city) inside a domain: one sheet of leads. */
export type Place = {
  _id: string;
  campaignId: string;
  domainId: string;
  name: string;
  scrape: unknown | null; // ScrapeConfig, owned by the platform tool
  view: { order?: string[]; widths?: Record<string, number> } | null;
  position: number;
  /** Denormalised so dashboards never scan leads. Kept in step by the sheet writers. */
  stats: { leads: number; outreached: number; converted: number };
  createdAt: Date;
  updatedAt: Date;
};

/** One sheet row. Rows are their own documents so a sheet can grow without hitting the 16MB document limit. */
export type Lead = {
  _id: string;
  campaignId: string;
  placeId: string;
  row: number; // position in the sheet
  cells: Record<string, string>; // column key -> text
  label: string | null; // call-outcome label id
  source: Platform | "manual" | "import";
  sourceId: string | null; // platform id used to dedupe re-scrapes
  updatedBy: string | null;
  /** Who first made this row a real outreach (any label but "Didn't pick"), and the day it was credited to them. */
  outreachedBy?: string;
  outreachedAt?: Date;
  outreachedDay?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type NotificationType =
  | "invite_received"
  | "invite_accepted"
  | "member_joined"
  | "member_removed"
  | "role_changed"
  | "job_done";

export type Notification = {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, string>; // ids for deep links: campaignId, inviteToken...
  readAt: Date | null;
  createdAt: Date;
};

export type EmailStatus = "queued" | "sent" | "failed";

/** Durable outbox: a request enqueues here, a drain sends. Survives crashes and provider outages. */
export type Email = {
  _id: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  status: EmailStatus;
  attempts: number;
  nextAttemptAt: Date;
  lastError: string | null;
  createdAt: Date;
  sentAt: Date | null;
};

/** Per person, per campaign, per day. Powers the outreach chart and per-member stats without scanning leads. */
export type DailyStat = {
  _id: string; // `${campaignId}:${userId}:${day}`
  campaignId: string;
  userId: string;
  day: string; // YYYY-MM-DD in the acting person's own timezone (users.tz); UTC when unknown
  outreached: number;
  converted: number;
  leads: number;
};

export type JobStatus = "queued" | "running" | "done" | "failed" | "cancelled";

/** A scrape the local worker picks up. `tool` is the platform; `input` is whatever that tool needs. */
export type Job = {
  _id: string;
  campaignId: string;
  placeId: string | null;
  tool: Platform;
  input: unknown;
  status: JobStatus;
  progress: number; // 0..1
  leadsFound: number;
  error: string | null;
  createdBy: string;
  claimedBy: string | null; // api token id
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  /** Last sign of life from the worker (every progress ping or ingest). Missing on old jobs: startedAt is used instead. */
  heartbeatAt?: Date | null;
};

/** Fixed-window counter for rate limits. */
export type RateLimit = {
  _id: string; // `${bucket}:${key}`
  count: number;
  expiresAt: Date; // TTL index
};
