import "server-only";
import { connection, NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { env } from "./env";

export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}
export const bad = (m: string) => new HttpError(400, m, "bad_request");
export const unauthorized = (m = "Sign in to continue") => new HttpError(401, m, "unauthorized");
export const forbidden = (m = "You don't have access to that") => new HttpError(403, m, "forbidden");
export const notFound = (m = "Not found") => new HttpError(404, m, "not_found");
export const conflict = (m: string) => new HttpError(409, m, "conflict");

export const ok = <T>(data: T, init?: ResponseInit) => NextResponse.json(data, init);

export const clientIp = (req: NextRequest) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;

/** Mutating requests must come from our own pages. SameSite=Lax cookies are the first line; this is the second. */
function checkOrigin(req: NextRequest) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  if (req.headers.get("authorization")?.startsWith("Bearer ")) return; // token clients aren't browsers
  const origin = req.headers.get("origin");
  if (!origin) return; // non-browser clients (curl, tests) send no Origin; they also carry no ambient cookies
  const allowed = new Set([env.appUrl, req.nextUrl.origin]);
  if (!allowed.has(origin)) throw forbidden("Cross-site request blocked");
}

const tooLarge = () => new HttpError(413, "Request too large", "too_large");

/** Reads the body but stops at maxBytes. Content-Length alone isn't enough: chunked requests don't send one. */
async function readBounded(req: NextRequest, maxBytes: number) {
  if (Number(req.headers.get("content-length") ?? 0) > maxBytes) throw tooLarge();
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw tooLarge();
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function body<S extends z.ZodType>(req: NextRequest, schema: S, maxBytes = 1_000_000): Promise<z.output<S>> {
  const text = await readBounded(req, maxBytes);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw bad("Expected a JSON body");
  }
  const r = schema.safeParse(raw);
  if (!r.success) throw bad(r.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; "));
  return r.data;
}

const SLOW_MS = 1500;

type Ctx<P> = { params: Promise<P> };

/** Wraps a handler: origin check, JSON errors, no stack traces leaking, no caching of API responses. */
export function api<P = Record<string, never>>(fn: (req: NextRequest, params: P) => Promise<Response>) {
  return async (req: NextRequest, ctx: Ctx<P>) => {
    // API routes are always per-request. Without this, handlers that don't read the request (e.g. providers)
    // would be prerendered at build time and freeze the build machine's environment into the response.
    await connection();
    const started = performance.now();
    const rid = req.headers.get("x-request-id")?.slice(0, 64) || crypto.randomUUID();
    const headers = { "Cache-Control": "no-store", "X-Request-Id": rid };
    // Only the interesting requests are logged (errors and slow ones), as one JSON line each so a log service can filter on them.
    const log = (status: number, err?: unknown) => {
      const ms = Math.round(performance.now() - started);
      if (status >= 500 || ms >= SLOW_MS) console[status >= 500 ? "error" : "warn"](JSON.stringify({ at: "api", rid, method: req.method, path: req.nextUrl.pathname, status, ms, ...(err ? { err: err instanceof Error ? (err.stack ?? err.message) : String(err) } : {}) }));
    };
    try {
      checkOrigin(req);
      const res = await fn(req, await ctx.params);
      for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
      log(res.status);
      return res;
    } catch (e) {
      if (e instanceof HttpError) {
        log(e.status);
        return NextResponse.json({ error: e.message, code: e.code }, { status: e.status, headers });
      }
      // The database being unreachable or saturated is "try again", not "we are broken": 503 lets clients and load balancers back off.
      const name = (e as { name?: string })?.name ?? "";
      if (/^Mongo(ServerSelection|WaitQueueTimeout|NetworkTimeout|Network)/.test(name)) {
        log(503, e);
        return NextResponse.json({ error: "The service is busy. Try again in a moment.", code: "unavailable" }, { status: 503, headers: { ...headers, "Retry-After": "5" } });
      }
      log(500, e);
      return NextResponse.json({ error: "Something went wrong", code: "internal" }, { status: 500, headers });
    }
  };
}

export const email = z.string().trim().toLowerCase().max(254).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email");
export const uuid = z.uuid();
/** Only same-site relative paths: stops open redirects through ?next=. */
export const safeNext = (n: string | null | undefined, fallback = "/dashboard") =>
  n && n.startsWith("/") && !n.startsWith("//") && !n.includes("\\") ? n : fallback;
