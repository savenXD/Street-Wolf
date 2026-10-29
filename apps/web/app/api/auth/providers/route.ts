import { env } from "@/lib/server/env";
import { api, ok } from "@/lib/server/http";

/** Which sign-in options are configured, so the UI never sends people to a dead end. */
export const GET = api(async () => ok({ google: !!(env.googleId && env.googleSecret), email: true }));
