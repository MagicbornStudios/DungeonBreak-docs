import configPromise from "@payload-config";
import path from "node:path";
import { createPayloadRequest, getPayload } from "payload";
import { NextResponse } from "next/server";
import { getSqliteConfig } from "@/lib/push-local-sqlite-config";
import { runPushLocalToSupabase } from "@/lib/push-local-to-supabase";

export async function POST(request: Request) {
	try {
		const req = await createPayloadRequest({
			config: configPromise,
			request,
		});
		const payload = await getPayload({ config: configPromise });
		const user = req.user;
		if (!user || (user as { collection?: string; role?: string }).collection !== "users") {
			return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
		}
		const role = (user as { role?: string }).role;
		if (role !== "owner" && role !== "admin") {
			return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
		}
		if (!process.env.DATABASE_URL?.startsWith("postgres")) {
			return NextResponse.json(
				{ ok: false, error: "Push is only available when DATABASE_URL is Supabase Postgres." },
				{ status: 400 }
			);
		}
		const docsSiteDir = path.resolve(process.cwd());
		const sqlitePath =
			process.env.LOCAL_SQLITE_PATH || path.join(docsSiteDir, "payload.db");
		const mediaDir =
			process.env.LOCAL_MEDIA_DIR || path.join(docsSiteDir, "media");
		const sqliteUrl = sqlitePath.startsWith("file:")
			? sqlitePath
			: `file:${path.resolve(sqlitePath)}`;

		const sqliteConfig = getSqliteConfig(sqliteUrl, docsSiteDir);
		const sqlitePayload = await getPayload({
			config: sqliteConfig,
			key: `push-sqlite-${Date.now()}`,
		});

		const result = await runPushLocalToSupabase({
			sqlitePayload,
			postgresPayload: payload,
			mediaDir,
		});

		if (result.error) {
			return NextResponse.json(
				{ ok: false, error: result.error },
				{ status: 500 }
			);
		}
		return NextResponse.json({ ok: true, counts: result.counts });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return NextResponse.json(
			{ ok: false, error: message },
			{ status: 500 }
		);
	}
}
