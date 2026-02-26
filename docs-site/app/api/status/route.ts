import configPromise from "@payload-config";
import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { createPayloadRequest, getPayload } from "payload";
import { existsSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

type CheckResult = {
	label: string;
	status: "connected" | "error";
	message?: string;
};

export async function GET(request: Request) {
	try {
		const req = await createPayloadRequest({
			config: configPromise,
			request,
		});
		const payload = await getPayload({ config: configPromise });
		const user = req.user;
		if (!user || (user as { collection?: string }).collection !== "users") {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}
		const role = (user as { role?: string }).role;
		if (role !== "owner" && role !== "admin") {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const database: CheckResult = await (async () => {
			const url = process.env.DATABASE_URL ?? "";
			const label = url.includes("supabase") ? "Supabase Postgres" : "Local SQLite";
			try {
				await payload.count({ collection: "users" });
				return { label, status: "connected" as const };
			} catch (err) {
				return {
					label,
					status: "error" as const,
					message: err instanceof Error ? err.message : String(err),
				};
			}
		})();

		const storage: CheckResult = await (async () => {
			const bucket = process.env.S3_BUCKET;
			const endpoint = process.env.S3_ENDPOINT;
			const region = process.env.S3_REGION;
			const accessKeyId = process.env.S3_ACCESS_KEY_ID;
			const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
			if (!bucket || !endpoint || !region || !accessKeyId || !secretAccessKey) {
				return {
					label: "Supabase S3",
					status: "error",
					message: "Missing S3_* env vars",
				};
			}
			try {
				const client = new S3Client({
					region,
					endpoint,
					credentials: { accessKeyId, secretAccessKey },
					forcePathStyle: true,
				});
				await client.send(new HeadBucketCommand({ Bucket: bucket }));
				return { label: "Supabase S3", status: "connected" };
			} catch (err) {
				return {
					label: "Supabase S3",
					status: "error",
					message: err instanceof Error ? err.message : String(err),
				};
			}
		})();

		const apiKeys = [
			{ key: "OPENAI_API_KEY", set: Boolean(process.env.OPENAI_API_KEY?.trim()) },
			{ key: "ELEVENLABS_API_KEY", set: Boolean(process.env.ELEVENLABS_API_KEY?.trim()) },
		];

		const docsSiteDir = path.resolve(process.cwd());
		const sqlitePathRaw =
			process.env.LOCAL_SQLITE_PATH || path.join(docsSiteDir, "payload.db");
		const absoluteSqlitePath = sqlitePathRaw.startsWith("file:")
			? path.resolve(sqlitePathRaw.slice(5).trim())
			: path.resolve(sqlitePathRaw);
		const localDbFile = { present: existsSync(absoluteSqlitePath) };

		return NextResponse.json({
			database,
			storage,
			apiKeys,
			localDbFile,
		});
	} catch {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}
}
