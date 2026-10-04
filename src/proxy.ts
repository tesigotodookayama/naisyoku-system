/**
 * Next.js Proxy.
 * Secret entry cookies gate the admin site and the worker portal separately.
 * When a key is not configured, that area stays open.
 * Admin pages still require the admin session after the gate.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE_MAX_AGE,
  ADMIN_ACCESS_COOKIE,
  PORTAL_ACCESS_COOKIE,
  accessCookieValue,
  decideAccess,
  readAccessKey,
} from "@/lib/accessGate";

const NOT_FOUND_PATH = "/secret-missing";

function withRobots(response: NextResponse) {
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const adminKey = readAccessKey(process.env.ADMIN_ACCESS_KEY);
  const portalKey = readAccessKey(process.env.PORTAL_ACCESS_KEY);
  const decision = await decideAccess({
    pathname,
    keyParam: request.nextUrl.searchParams.has("key")
      ? request.nextUrl.searchParams.get("key") ?? ""
      : null,
    adminKey,
    portalKey,
    adminCookie: request.cookies.get(ADMIN_ACCESS_COOKIE)?.value ?? null,
    portalCookie: request.cookies.get(PORTAL_ACCESS_COOKIE)?.value ?? null,
  });

  if (typeof decision === "object") {
    const secret = decision.grant === "admin" ? adminKey : portalKey;
    const clean = request.nextUrl.clone();
    clean.searchParams.delete("key");
    const response = NextResponse.redirect(clean);
    response.cookies.set(
      decision.grant === "admin" ? ADMIN_ACCESS_COOKIE : PORTAL_ACCESS_COOKIE,
      secret ? await accessCookieValue(secret) : "",
      {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: ACCESS_COOKIE_MAX_AGE,
        path: "/",
      }
    );
    return withRobots(response);
  }

  if (decision === "deny") {
    const url = request.nextUrl.clone();
    url.pathname = NOT_FOUND_PATH;
    url.search = "";
    return withRobots(NextResponse.rewrite(url));
  }

  if (
    pathname.startsWith("/admin/login") ||
    pathname.startsWith("/portal") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === NOT_FOUND_PATH
  ) {
    return withRobots(NextResponse.next());
  }

  const session = request.cookies.get("admin_session");
  if (!session || session.value !== "authenticated") {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return withRobots(NextResponse.redirect(loginUrl));
  }

  return withRobots(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
