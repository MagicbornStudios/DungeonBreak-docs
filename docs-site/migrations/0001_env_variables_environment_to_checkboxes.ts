import type { MigrateDownArgs, MigrateUpArgs } from "@payloadcms/db-sqlite";
import { sql } from "@payloadcms/db-sqlite";

/**
 * Migrate env_variables from single `environment` column to four checkboxes:
 * env_all, env_development, env_production, env_staging.
 * No-op if table does not exist or already has the new columns (e.g. new DB or already migrated).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
	const tableResult = await db.run(
		sql.raw(`SELECT name FROM sqlite_master WHERE type='table' AND name='env_variables'`)
	);
	const tableRows = Array.isArray((tableResult as { rows?: unknown[] })?.rows)
		? (tableResult as unknown as { rows: { name: string }[] }).rows
		: [];
	if (tableRows.length === 0) return;

	const pragmaResult = await db.run(sql.raw(`PRAGMA table_info(env_variables)`));
	const pragmaRows = Array.isArray((pragmaResult as { rows?: unknown[] })?.rows)
		? (pragmaResult as unknown as { rows: { name: string }[] }).rows
		: [];
	const columns = pragmaRows.map((r) => r.name);
	if (!columns.includes("environment") || columns.includes("env_all")) return;

	await db.run(sql.raw(`ALTER TABLE env_variables ADD COLUMN env_all INTEGER DEFAULT 0`));
	await db.run(sql.raw(`ALTER TABLE env_variables ADD COLUMN env_development INTEGER DEFAULT 0`));
	await db.run(sql.raw(`ALTER TABLE env_variables ADD COLUMN env_production INTEGER DEFAULT 0`));
	await db.run(sql.raw(`ALTER TABLE env_variables ADD COLUMN env_staging INTEGER DEFAULT 0`));

	await db.run(
		sql.raw(`UPDATE env_variables SET
			env_all = CASE WHEN environment = 'all' THEN 1 ELSE 0 END,
			env_development = CASE WHEN environment = 'development' THEN 1 ELSE 0 END,
			env_production = CASE WHEN environment = 'production' THEN 1 ELSE 0 END,
			env_staging = CASE WHEN environment = 'staging' THEN 1 ELSE 0 END
			WHERE environment IS NOT NULL`)
	);

	await db.run(sql.raw(`ALTER TABLE env_variables DROP COLUMN environment`));
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	const pragmaResult = await db.run(sql.raw(`PRAGMA table_info(env_variables)`));
	const pragmaRows = Array.isArray((pragmaResult as { rows?: unknown[] })?.rows)
		? (pragmaResult as unknown as { rows: { name: string }[] }).rows
		: [];
	const columns = pragmaRows.map((r) => r.name);
	if (!columns.includes("env_all")) return;

	await db.run(sql.raw(`ALTER TABLE env_variables ADD COLUMN environment TEXT`));
	await db.run(
		sql.raw(`UPDATE env_variables SET environment = CASE
			WHEN env_all = 1 THEN 'all'
			WHEN env_development = 1 THEN 'development'
			WHEN env_production = 1 THEN 'production'
			WHEN env_staging = 1 THEN 'staging'
			ELSE 'all' END`)
	);
	await db.run(sql.raw(`ALTER TABLE env_variables DROP COLUMN env_all`));
	await db.run(sql.raw(`ALTER TABLE env_variables DROP COLUMN env_development`));
	await db.run(sql.raw(`ALTER TABLE env_variables DROP COLUMN env_production`));
	await db.run(sql.raw(`ALTER TABLE env_variables DROP COLUMN env_staging`));
}
