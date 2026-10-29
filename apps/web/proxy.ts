import { NextResponse, type NextRequest } from "next/server";

// Routes that need an account (real accounts only; there is no guest mode). This only checks that a session cookie exists (cheap, runs on every request);
// the real check, against the database, happens in the API and on the client when it loads /api/bootstrap.
const PROTECTED = ["/dashboard", "/new", "/onboarding", "/c/"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PROTECTED.some((p) => pathname.startsWith(p)) && !request.cookies.has("sw_session")) {
    const url = request.nextUrl.clone();
    url.pathname = "/signup";
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
