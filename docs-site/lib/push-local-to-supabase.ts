/**
 * Shared migration logic: read all data from a SQLite Payload instance and write to Postgres+S3.
 * Used by the CLI script and the admin "Push local to Supabase" API.
 */
import type { Payload } from "payload";
import fs from "node:fs/promises";
import path from "node:path";

const COLLECTION_ORDER = [
	"users",
	"media",
	"categories",
	"docs",
	"game-traits",
	"narrative-entities",
	"narrative-dialogs",
	"characters",
	"dialogue-lines",
	"weapons",
	"items",
	"audio-assets",
	"image-assets",
] as const;

/** Map collection slug -> { field name -> target collection slug for relation/upload */
const RELATION_FIELDS: Record<string, Record<string, string>> = {
	users: {},
	media: {},
	categories: { icon: "media" },
	docs: { category: "categories", parent: "docs" },
	"game-traits": {},
	"narrative-entities": {},
	"narrative-dialogs": {},
	characters: {
		canonicalEntity: "narrative-entities",
		traits: "game-traits",
		latestPortrait: "image-assets",
	},
	"dialogue-lines": {
		character: "characters",
		canonicalDialog: "narrative-dialogs",
		latestAudioAsset: "audio-assets",
	},
	weapons: { latestAudioAsset: "audio-assets", latestImageAsset: "image-assets" },
	items: { latestAudioAsset: "audio-assets", latestImageAsset: "image-assets" },
	"audio-assets": {
		media: "media",
		character: "characters",
		dialogueLine: "dialogue-lines",
		weapon: "weapons",
		item: "items",
	},
	"image-assets": {
		media: "media",
		character: "characters",
		weapon: "weapons",
		item: "items",
	},
};

const ID_MAP_KEYS = new Set<string>([
	"users",
	"media",
	"categories",
	"docs",
	"game-traits",
	"narrative-entities",
	"narrative-dialogs",
	"characters",
	"dialogue-lines",
	"weapons",
	"items",
	"audio-assets",
	"image-assets",
]);

type IdMaps = Record<string, Map<number, number>>;

function mapRelation(
	value: number | { id: number } | null | undefined,
	idMaps: IdMaps,
	collectionSlug: string
): number | null {
	if (value == null) return null;
	const oldId = typeof value === "object" ? value.id : value;
	const map = idMaps[collectionSlug];
	if (!map) return null;
	const newId = map.get(oldId);
	return newId ?? null;
}

function sanitizeDoc(
	doc: Record<string, unknown>,
	collectionSlug: string,
	idMaps: IdMaps
): Record<string, unknown> {
	const relations = RELATION_FIELDS[collectionSlug];
	if (!relations) return doc;

	const out = { ...doc };
	delete (out as Record<string, unknown>).id;
	delete (out as Record<string, unknown>).updatedAt;
	delete (out as Record<string, unknown>).createdAt;

	for (const [field, targetSlug] of Object.entries(relations)) {
		const v = out[field];
		if (v == null) continue;
		if (Array.isArray(v)) {
			(out as Record<string, unknown>)[field] = v
				.map((item) => mapRelation(item, idMaps, targetSlug))
				.filter((id): id is number => id != null);
		} else {
			(out as Record<string, unknown>)[field] = mapRelation(
				v as number | { id: number },
				idMaps,
				targetSlug
			);
		}
	}
	return out;
}

export type RunPushLocalToSupabaseOptions = {
	mediaDir: string;
	postgresPayload: Payload;
	sqlitePayload: Payload;
};

export type RunPushLocalToSupabaseResult = {
	counts: Record<string, number>;
	error?: string;
};

export async function runPushLocalToSupabase({
	sqlitePayload,
	postgresPayload,
	mediaDir,
}: RunPushLocalToSupabaseOptions): Promise<RunPushLocalToSupabaseResult> {
	const idMaps: IdMaps = {};
	for (const slug of ID_MAP_KEYS) {
		idMaps[slug] = new Map<number, number>();
	}
	const counts: Record<string, number> = {};

	try {
		for (const collectionSlug of COLLECTION_ORDER) {
			let page = 1;
			const limit = 50;
			let total = 0;

			// eslint-disable-next-line no-constant-condition
			while (true) {
				const { docs, totalDocs } = await sqlitePayload.find({
					collection: collectionSlug as "users",
					limit,
					page,
					depth: 0,
				});

				for (const doc of docs) {
					const oldId = doc.id as number;
					if (collectionSlug === "users") {
						const data = sanitizeDoc(
							doc as unknown as Record<string, unknown>,
							collectionSlug,
							idMaps
						) as Record<string, unknown>;
						delete data.sessions;
						delete data.password;
						delete data.hash;
						delete data.salt;
						delete data.resetPasswordToken;
						delete data.resetPasswordExpiration;
						delete data.loginAttempts;
						delete data.lockUntil;
						// Temporary password; migrated users should reset password
						const created = await postgresPayload.create({
							collection: "users",
							data: {
								...data,
								password: "changeme-migrate-reset-password",
							} as Record<string, unknown>,
							draft: false,
							overrideAccess: true,
						} as never);
						const newId = created.id as number;
						idMaps.users.set(oldId, newId);
					} else if (collectionSlug === "media") {
						const d = doc as unknown as Record<string, unknown>;
						const filename = d.filename as string | undefined;
						const alt = (d.alt as string) ?? "";
						let created: { id: number };
						if (filename) {
							const localPath = path.join(mediaDir, filename);
							try {
								await fs.access(localPath);
							} catch {
								// File missing: create media doc without file
								created = (await postgresPayload.create({
									collection: "media",
									data: { alt },
									overrideAccess: true,
								})) as { id: number };
								idMaps.media.set(oldId, created.id);
								total++;
								continue;
							}
							const buffer = await fs.readFile(localPath);
							const mimeType = (d.mimeType as string) || "application/octet-stream";
							created = (await postgresPayload.create({
								collection: "media",
								data: { alt },
								file: {
									data: buffer,
									name: filename,
									size: buffer.length,
									mimetype: mimeType,
								},
								overrideAccess: true,
							})) as { id: number };
						} else {
							created = (await postgresPayload.create({
								collection: "media",
								data: { alt },
								overrideAccess: true,
							})) as { id: number };
						}
						idMaps.media.set(oldId, created.id);
					} else {
						const data = sanitizeDoc(
							doc as unknown as Record<string, unknown>,
							collectionSlug,
							idMaps
						);
						const created = await postgresPayload.create({
							collection: collectionSlug as "categories",
							data: data as Record<string, unknown>,
							draft: false,
							overrideAccess: true,
						} as never);
						const map = idMaps[collectionSlug];
						if (map) map.set(oldId, created.id as number);
					}
					total++;
				}

				if (docs.length < limit) break;
				page++;
			}
			counts[collectionSlug] = total;
		}

		return { counts };
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return { counts, error: message };
	}
}
