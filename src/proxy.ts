import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Defensively allow static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".svg")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("cinetaste_session")?.value;
  const session = token ? verifySessionToken(token) : null;
  const isAuthenticated = Boolean(session);

  // If accessing /login
  if (pathname === "/login") {
    if (isAuthenticated) {
      const redirectParam = request.nextUrl.searchParams.get("redirect");
      const target = redirectParam && redirectParam.startsWith("/") ? redirectParam : "/";
      return NextResponse.redirect(new URL(target, request.url));
    }
    return NextResponse.next();
  }

  // Public auth API endpoints
  if (
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/logout" ||
    pathname === "/api/auth/register"
  ) {
    return NextResponse.next();
  }

  // Protected application routes
  if (!isAuthenticated) {
    // API routes fall through to route handlers to return 401 JSON
    if (pathname.startsWith("/api/")) {
      return NextResponse.next();
    }

    // Web pages redirect to dedicated login page with preserved destination
    const destination = pathname + search;
    const loginUrl = new URL("/login", request.url);
    if (destination && destination !== "/") {
      loginUrl.searchParams.set("redirect", destination);
    }
    return NextResponse.redirect(loginUrl);
  }

  // User is authenticated:
  // Admin route check
  if (pathname === "/admin") {
    if (session?.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
