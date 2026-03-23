import { NextRequest, NextResponse } from "next/server";
import {
  PORTAL_ACCESS_COOKIE,
  hasPortalAccessCookieValue,
} from "@/lib/internal-portal-auth";

const PAYLOAD_COOKIE_PREFIX = process.env.PAYLOAD_COOKIE_PREFIX ?? "payload";

function hasPayloadTokenCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(
      (cookie) =>
        cookie.name.startsWith(PAYLOAD_COOKIE_PREFIX) &&
        cookie.name.includes("token")
    );
}

function isPortalAccessGranted(request: NextRequest): boolean {
  return (
    hasPayloadTokenCookie(request) &&
    hasPortalAccessCookieValue(request.cookies.get(PORTAL_ACCESS_COOKIE)?.value)
  );
}

export function proxy(request: NextRequest) {
  if (isPortalAccessGranted(request)) {
    return NextResponse.next();
  }

  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const redirectUrl = new URL("/portal-access", request.url);
  redirectUrl.searchParams.set("next", nextPath);
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dungeonbreak-content-app/:path*",
    "/api/content-editor/:path*",
    "/api/ai/asset-authoring-chat",
    "/api/ai/generate/:path*",
    "/api/codex/auth/:path*",
  ],
};
