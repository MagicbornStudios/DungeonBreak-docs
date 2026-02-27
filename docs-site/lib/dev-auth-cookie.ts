import type { Payload } from "payload";
import { cookies } from "next/headers";
import { generatePayloadCookie } from "payload";
import { NextResponse } from "next/server";

/**
 * Set Payload auth cookie and return redirect to /admin.
 * Used by dev-login and dev-create-admin (dev only).
 */
export async function setPayloadAuthCookieAndRedirect(
	payload: Payload,
	token: string,
	requestUrl: string,
): Promise<NextResponse> {
	const authConfig = payload.collections.users?.config.auth;
	if (!authConfig || typeof authConfig !== "object") {
		return NextResponse.json({ error: "No auth config" }, { status: 500 });
	}
	const cookiePrefix = payload.config.cookiePrefix ?? "payload";
	const cookieExpiration =
		authConfig.tokenExpiration != null
			? new Date(Date.now() + authConfig.tokenExpiration)
			: undefined;
	const payloadCookie = generatePayloadCookie({
		collectionAuthConfig: authConfig,
		cookiePrefix,
		expires: cookieExpiration,
		returnCookieAsObject: true,
		token,
	});
	const cookieStore = await cookies();
	if (payloadCookie.value) {
		cookieStore.set(payloadCookie.name, payloadCookie.value, {
			domain: authConfig.cookies?.domain,
			expires:
				payloadCookie.expires != null ? new Date(payloadCookie.expires) : undefined,
			httpOnly: true,
			sameSite:
				typeof authConfig.cookies?.sameSite === "string"
					? (authConfig.cookies.sameSite.toLowerCase() as "lax" | "strict" | "none")
					: "lax",
			secure: authConfig.cookies?.secure ?? false,
		});
	}
	return NextResponse.redirect(new URL("/admin", requestUrl));
}
