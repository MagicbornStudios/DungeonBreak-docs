import { NextRequest, NextResponse } from "next/server";

const PAYLOAD_COOKIE_PREFIX = process.env.PAYLOAD_COOKIE_PREFIX ?? "payload";

/**
 * In development only: if user hits /admin with no Payload auth cookie,
 * redirect to /api/dev-login so they get logged in and the cookie is set.
 * After that the cookie is stored in the browser and they stay logged in.
 */
export function middleware(request: NextRequest) {
	if (process.env.NODE_ENV !== "development") {
		return NextResponse.next();
	}
	if (process.env.PAYLOAD_DEV_AUTO_LOGIN === "false") {
		return NextResponse.next();
	}

	const pathname = request.nextUrl.pathname;
	if (!pathname.startsWith("/admin")) {
		return NextResponse.next();
	}
	// Avoid redirect loop
	if (pathname.startsWith("/api/")) {
		return NextResponse.next();
	}

	const hasPayloadCookie = request.cookies.getAll().some(
		(c) => c.name.startsWith(PAYLOAD_COOKIE_PREFIX) && c.name.includes("token"),
	);
	if (hasPayloadCookie) {
		return NextResponse.next();
	}

	const devLoginUrl = new URL("/api/dev-login", request.url);
	return NextResponse.redirect(devLoginUrl);
}

export const config = {
	matcher: ["/admin", "/admin/(.*)"],
};
