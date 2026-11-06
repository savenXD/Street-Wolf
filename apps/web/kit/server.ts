// The kit, server: helpers a platform's server.ts may use inside API route handlers. Every campaign-scoped handler must
// call requireBrowserUser (or requireUser for scraper tokens) and then requireRole before touching data.
import "server-only";

export { requireRole } from "@/lib/server/access";
export { api, bad, body, conflict, forbidden, HttpError, notFound, ok, uuid } from "@/lib/server/http";
export { rateLimit } from "@/lib/server/ratelimit";
export { requireBrowserUser, requireUser } from "@/lib/server/session";
