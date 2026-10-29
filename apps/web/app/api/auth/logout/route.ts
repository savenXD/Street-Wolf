import { api, ok } from "@/lib/server/http";
import { COOKIE, destroySession } from "@/lib/server/session";

export const POST = api(async (req) => {
  await destroySession(req);
  const res = ok({ ok: true });
  res.cookies.set(COOKIE, "", { path: "/", maxAge: 0 });
  return res;
});
