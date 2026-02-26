import path from "node:path";
import { fileURLToPath } from "node:url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { importExportPlugin } from "@payloadcms/plugin-import-export";
import { searchPlugin } from "@payloadcms/plugin-search";
import { s3Storage } from "@payloadcms/storage-s3";
import { mcpPlugin } from "@payloadcms/plugin-mcp";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import sharp from "sharp";
import { AudioAssets } from "./collections/AudioAssets";
import { Categories } from "./collections/Categories";
import { Characters } from "./collections/Characters";
import { DialogueLines } from "./collections/DialogueLines";
import { Docs } from "./collections/Docs";
import { GameTraits } from "./collections/GameTraits";
import { ImageAssets } from "./collections/ImageAssets";
import { Items } from "./collections/Items";
import { Media } from "./collections/Media";
import { NarrativeDialogs } from "./collections/NarrativeDialogs";
import { NarrativeEntities } from "./collections/NarrativeEntities";
import { Users } from "./collections/Users";
import { Weapons } from "./collections/Weapons";
import { Env } from "./globals/Env";
import { isOwnerOrAdminUser } from "@/lib/access";
import {
	AUDIO_QUEUE,
	AUDIO_TASK_SLUGS,
	IMAGE_QUEUE,
	IMAGE_TASK_SLUGS,
} from "@/lib/generation/constants";
import {
	handleGenerateCharacterImage,
	handleGenerateDialogueAudio,
	handleGenerateItemImage,
	handleGenerateItemSFX,
	handleGenerateWeaponImage,
	handleGenerateWeaponSFX,
} from "@/lib/jobs/generation-tasks";
import "dotenv/config";

const filenameToPath = fileURLToPath(import.meta.url);
const dirname = path.dirname(filenameToPath);

export default buildConfig({
	admin: {
		importMap: {
			baseDir: path.resolve(dirname),
		},
		meta: {
			titleSuffix: " | DungeonBreak Docs",
			description:
				"Admin panel for documentation - Manage your documentation and content.",
			defaultOGImageType: "dynamic",
			icons: [
				{
					rel: "icon",
					type: "image/x-icon",
					url: "/favicon.ico",
				},
				{
					rel: "apple-touch-icon",
					type: "image/x-icon",
					url: "/favicon.ico",
				},
			],
			robots: "noindex, nofollow",
		},
		theme: "dark",
		components: {
			header: ["@/components/admin/DashboardHeader#DashboardHeader"],
			afterNavLinks: ["@/components/home-nav-link#HomeNavLink"],
		},
	},
	collections: [
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
	],
	globals: [Env],
	cors: {
		origins: ["*"],
	},
	csrf: ["*"],
		db: postgresAdapter({
			pool: {
				connectionString: process.env.DATABASE_URL,
			},
		migrationDir: path.resolve(dirname, "migrations", "postgres"),
	}),
	editor: lexicalEditor(),
	graphQL: {
		disable: false,
	},
	jobs: {
		access: {
			queue: ({ req }) => isOwnerOrAdminUser(req.user),
			run: ({ req }) => isOwnerOrAdminUser(req.user),
			cancel: ({ req }) => isOwnerOrAdminUser(req.user),
		},
		autoRun: [
			{
				allQueues: false,
				cron: "*/15 * * * * *",
				limit: 5,
				queue: AUDIO_QUEUE,
			},
			{
				allQueues: false,
				cron: "*/15 * * * * *",
				limit: 5,
				queue: IMAGE_QUEUE,
			},
		],
		tasks: [
			{
				slug: AUDIO_TASK_SLUGS.DIALOGUE,
				label: "Generate Dialogue Audio",
				inputSchema: [
					{
						name: "generationId",
						type: "number",
						required: true,
					},
				],
				handler: handleGenerateDialogueAudio,
			},
			{
				slug: AUDIO_TASK_SLUGS.WEAPON,
				label: "Generate Weapon SFX",
				inputSchema: [
					{
						name: "generationId",
						type: "number",
						required: true,
					},
				],
				handler: handleGenerateWeaponSFX,
			},
			{
				slug: AUDIO_TASK_SLUGS.ITEM,
				label: "Generate Item SFX",
				inputSchema: [
					{
						name: "generationId",
						type: "number",
						required: true,
					},
				],
				handler: handleGenerateItemSFX,
			},
			{
				slug: IMAGE_TASK_SLUGS.CHARACTER,
				label: "Generate Character Image",
				inputSchema: [
					{
						name: "generationId",
						type: "number",
						required: true,
					},
				],
				handler: handleGenerateCharacterImage,
			},
			{
				slug: IMAGE_TASK_SLUGS.WEAPON,
				label: "Generate Weapon Image",
				inputSchema: [
					{
						name: "generationId",
						type: "number",
						required: true,
					},
				],
				handler: handleGenerateWeaponImage,
			},
			{
				slug: IMAGE_TASK_SLUGS.ITEM,
				label: "Generate Item Image",
				inputSchema: [
					{
						name: "generationId",
						type: "number",
						required: true,
					},
				],
				handler: handleGenerateItemImage,
			},
		],
	},
	plugins: [
		s3Storage({
			collections: {
				media: true,
			},
			bucket: process.env.S3_BUCKET!,
			config: {
				credentials: {
					accessKeyId: process.env.S3_ACCESS_KEY_ID!,
					secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
				},
				region: process.env.S3_REGION!,
				endpoint: process.env.S3_ENDPOINT!,
				forcePathStyle: true,
			},
		}),
		importExportPlugin({
			collections: [{ slug: "docs" }, { slug: "categories" }],
		}),
		mcpPlugin({
			collections: {
				docs: {
					enabled: true,
					description: "View and manage your documentation.",
				},
			},
		}),
		searchPlugin({
			collections: ["docs"],
			defaultPriorities: {
				docs: 10,
			},
			searchOverrides: {
				fields: ({ defaultFields }) => [
					...defaultFields,
					{
						name: "description",
						type: "textarea",
						admin: {
							position: "sidebar",
						},
					},
				],
			},
		}),
	],
	secret: process.env.PAYLOAD_SECRET || "change-me-in-production",
	sharp,
	typescript: {
		outputFile: path.resolve(dirname, "payload-types.ts"),
	},
});
