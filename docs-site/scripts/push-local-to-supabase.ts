/**
 * One-time (or repeat) push from local SQLite payload.db and media folder to Supabase Postgres + S3.
 * Run from docs-site: pnpm run push-local-to-supabase
 * Or: pnpm exec tsx docs-site/scripts/push-local-to-supabase.ts (from repo root)
 *
 * Requires .env: DATABASE_URL (Supabase), S3_* for media uploads.
 * Optional: LOCAL_SQLITE_PATH, LOCAL_MEDIA_DIR (defaults: ./payload.db, ./media from docs-site).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import { getPayload } from "payload";
import { runPushLocalToSupabase } from "../lib/push-local-to-supabase";
import { getSqliteConfig } from "../lib/push-local-sqlite-config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsSiteDir = path.resolve(__dirname, "..");

async function main() {
	const sqlitePath =
		process.env.LOCAL_SQLITE_PATH || path.join(docsSiteDir, "payload.db");
	const mediaDir =
		process.env.LOCAL_MEDIA_DIR || path.join(docsSiteDir, "media");
	const sqliteUrl = sqlitePath.startsWith("file:")
		? sqlitePath
		: `file:${path.resolve(sqlitePath)}`;

	if (!process.env.DATABASE_URL?.startsWith("postgres")) {
		throw new Error(
			"DATABASE_URL must be a Postgres URL (Supabase). Set it in .env before running."
		);
	}

	console.log("SQLite source:", sqliteUrl);
	console.log("Media dir:", mediaDir);
	console.log("Connecting to Postgres (destination, using app config)...");

	const appConfig = (await import("../payload.config")).default;
	const postgresPayload = await getPayload({
		config: appConfig,
		key: "push-postgres",
	});

	console.log("Connecting to SQLite (source)...");
	const sqliteConfig = getSqliteConfig(sqliteUrl, docsSiteDir);
	const sqlitePayload = await getPayload({
		config: sqliteConfig,
		key: "push-sqlite",
	});

	console.log("Running migration...");
	const result = await runPushLocalToSupabase({
		sqlitePayload,
		postgresPayload,
		mediaDir,
	});

	if (result.error) {
		console.error("Migration failed:", result.error);
		process.exit(1);
	}
	console.log("Done. Counts:", result.counts);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
