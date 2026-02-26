import configPromise from "@payload-config";
import { getPayload } from "payload";
import { cookies } from "next/headers";
import { generatePayloadCookie } from "payload";
import { NextResponse } from "next/server";

const SEED_EMAIL = process.env.SEED_USER_EMAIL ?? "admin@example.com";
const SEED_PASSWORD = process.env.SEED_USER_PASSWORD ?? "changeme";

export async function GET(request: Request) {
	if (process.env.NODE_ENV !== "development") {
		return NextResponse.json({ error: "Not available" }, { status: 404 });
	}
	if (process.env.PAYLOAD_DEV_AUTO_LOGIN === "false") {
		return NextResponse.json({ error: "Disabled" }, { status: 404 });
	}

	try {
		const payload = await getPayload({ config: configPromise });
		const result = await payload.login({
			collection: "users",
			data: { email: SEED_EMAIL, password: SEED_PASSWORD },
		});
		if (!result.token) {
			return NextResponse.json(
				{ error: "Login failed (wrong credentials or run seed first)" },
				{ status: 401 }
			);
		}
		const authConfig = payload.collections.users?.config.auth;
		if (!authConfig) {
			return NextResponse.json({ error: "No auth config" }, { status: 500 });
		}
		const cookiePrefix = payload.config.cookiePrefix ?? "payload";
		const cookieExpiration = authConfig.tokenExpiration
			? new Date(Date.now() + authConfig.tokenExpiration)
			: undefined;
		const payloadCookie = generatePayloadCookie({
			collectionAuthConfig: authConfig,
			cookiePrefix,
			expires: cookieExpiration,
			returnCookieAsObject: true,
			token: result.token,
		});
		const cookieStore = await cookies();
		if (payloadCookie.value) {
			cookieStore.set(payloadCookie.name, payloadCookie.value, {
				domain: authConfig.cookies?.domain,
				expires: payloadCookie.expires
					? new Date(payloadCookie.expires)
					: undefined,
				httpOnly: true,
				sameSite:
					typeof authConfig.cookies?.sameSite === "string"
						? (authConfig.cookies.sameSite.toLowerCase() as "lax" | "strict" | "none")
						: "lax",
				secure: authConfig.cookies?.secure ?? false,
			});
		}
		return NextResponse.redirect(new URL("/admin", request.url));
	} catch (err) {
		console.error("dev-login error:", err);
		return NextResponse.json(
			{ error: "Login failed" },
			{ status: 500 }
		);
	}
}
