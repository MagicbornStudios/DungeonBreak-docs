import configPromise from "@payload-config";
import { getPayload } from "payload";
import { NextResponse } from "next/server";
import { setPayloadAuthCookieAndRedirect } from "@/lib/dev-auth-cookie";

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
		return setPayloadAuthCookieAndRedirect(payload, result.token, request.url);
	} catch (err) {
		console.error("dev-login error:", err);
		return NextResponse.json(
			{ error: "Login failed" },
			{ status: 500 }
		);
	}
}
