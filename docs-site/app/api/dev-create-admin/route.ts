import configPromise from "@payload-config";
import { getPayload } from "payload";
import { NextResponse } from "next/server";
import { setPayloadAuthCookieAndRedirect } from "@/lib/dev-auth-cookie";

export async function POST(request: Request) {
	if (process.env.NODE_ENV !== "development") {
		return NextResponse.json({ error: "Not available" }, { status: 404 });
	}
	if (process.env.PAYLOAD_DEV_ALLOW_CREATE_ADMIN === "false") {
		return NextResponse.json({ error: "Disabled" }, { status: 404 });
	}

	let body: { email?: string; password?: string; name?: string };
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return NextResponse.json(
			{ error: "Invalid JSON body" },
			{ status: 400 }
		);
	}
	const email = typeof body.email === "string" ? body.email.trim() : "";
	const password = typeof body.password === "string" ? body.password : "";
	const name = typeof body.name === "string" ? body.name.trim() : "";
	if (!email || !password || !name) {
		return NextResponse.json(
			{ error: "Missing required fields: email, password, name" },
			{ status: 400 }
		);
	}

	try {
		const payload = await getPayload({ config: configPromise });
		await payload.create({
			collection: "users",
			data: {
				email,
				password,
				name,
				role: "owner",
			},
			overrideAccess: true,
		});
		const result = await payload.login({
			collection: "users",
			data: { email, password },
		});
		if (!result.token) {
			return NextResponse.json(
				{ error: "Account created but login failed" },
				{ status: 500 }
			);
		}
		return setPayloadAuthCookieAndRedirect(payload, result.token, request.url);
	} catch (err) {
		console.error("dev-create-admin error:", err);
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Create failed" },
			{ status: 500 }
		);
	}
}
