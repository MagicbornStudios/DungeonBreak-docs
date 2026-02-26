import configPromise from "@payload-config";
import { createPayloadRequest, getPayload } from "payload";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
	try {
		const req = await createPayloadRequest({
			config: configPromise,
			request,
		});
		await getPayload({ config: configPromise });
		const user = req.user;
		if (!user || (user as { collection?: string }).collection !== "users") {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}
		const role = (user as { role?: string }).role;
		if (role !== "owner" && role !== "admin") {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const cwd = process.cwd();
		const examplePath = join(cwd, ".env.example");
		let raw: string;
		try {
			raw = await readFile(examplePath, "utf-8");
		} catch {
			return NextResponse.json(
				{ expected: [], optional: [], env: {} },
				{ headers: { "content-type": "application/json" } }
			);
		}

		const expected: string[] = [];
		const optional: string[] = [];
		const keysSeen = new Set<string>();

		for (const line of raw.split(/\r?\n/)) {
			const trimmed = line.trim();
			if (!trimmed || (trimmed.startsWith("#") && !trimmed.includes("="))) continue;
			const isComment = trimmed.startsWith("#");
			const rest = isComment ? trimmed.slice(1).trim() : trimmed;
			const eq = rest.indexOf("=");
			const key = eq >= 0 ? rest.slice(0, eq).trim() : rest.trim();
			if (!key || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
			if (keysSeen.has(key)) continue;
			keysSeen.add(key);
			if (isComment) optional.push(key);
			else expected.push(key);
		}

		const allKeys = [...expected, ...optional];
		const env: Record<string, boolean> = {};
		for (const key of allKeys) {
			env[key] = Boolean(process.env[key]?.trim());
		}

		return NextResponse.json({ expected, optional, env });
	} catch {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}
}
