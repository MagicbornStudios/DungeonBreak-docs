/**
 * Build a minimal Payload config that uses SQLite for reading (used by push-local-to-supabase script and API).
 */
import path from "node:path";
import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import sharp from "sharp";
import { AudioAssets } from "@/collections/AudioAssets";
import { Categories } from "@/collections/Categories";
import { Characters } from "@/collections/Characters";
import { DialogueLines } from "@/collections/DialogueLines";
import { Docs } from "@/collections/Docs";
import { GameTraits } from "@/collections/GameTraits";
import { ImageAssets } from "@/collections/ImageAssets";
import { Items } from "@/collections/Items";
import { Media } from "@/collections/Media";
import { NarrativeDialogs } from "@/collections/NarrativeDialogs";
import { NarrativeEntities } from "@/collections/NarrativeEntities";
import { Users } from "@/collections/Users";
import { Weapons } from "@/collections/Weapons";
import { Env } from "@/globals/Env";

const collections = [
	Users,
	Media,
	Categories,
	Docs,
	GameTraits,
	NarrativeEntities,
	NarrativeDialogs,
	Characters,
	DialogueLines,
	Weapons,
	Items,
	AudioAssets,
	ImageAssets,
];

export function getSqliteConfig(sqliteUrl: string, docsSiteDir: string) {
	return buildConfig({
		collections,
		globals: [Env],
		secret: process.env.PAYLOAD_SECRET || "change-me",
		sharp,
		editor: lexicalEditor(),
		db: sqliteAdapter({
			client: { url: sqliteUrl },
			migrationDir: path.join(docsSiteDir, "migrations"),
			push: false,
		}),
		admin: { disable: true },
		cors: [],
		csrf: [],
		typescript: { outputFile: path.join(docsSiteDir, "payload-types.ts") },
	});
}
