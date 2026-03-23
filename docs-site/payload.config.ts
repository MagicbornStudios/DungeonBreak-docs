import path from "node:path";
import { fileURLToPath } from "node:url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { s3Storage } from "@payloadcms/storage-s3";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import sharp from "sharp";
import { AudioAssets } from "./collections/AudioAssets";
import { Characters } from "./collections/Characters";
import { ContentCustomSchemas } from "./collections/ContentCustomSchemas";
import { ContentDraftRevisions } from "./collections/ContentDraftRevisions";
import { ContentPackDocuments } from "./collections/ContentPackDocuments";
import { ContentProjectData } from "./collections/ContentProjectData";
import { ContentPublishJobs } from "./collections/ContentPublishJobs";
import { ContentProjects } from "./collections/ContentProjects";
import { ContentSchemaImports } from "./collections/ContentSchemaImports";
import { DialogueLines } from "./collections/DialogueLines";
import { ImageAssets } from "./collections/ImageAssets";
import { Items } from "./collections/Items";
import { Media } from "./collections/Media";
import { Users } from "./collections/Users";
import { Weapons } from "./collections/Weapons";
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
      titleSuffix: " | DungeonBreak Portal",
      description:
        "Internal admin panel for DungeonBreak asset authoring and media operations.",
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
  },
  collections: [
    Users,
    Media,
    Characters,
    DialogueLines,
    Weapons,
    Items,
    AudioAssets,
    ImageAssets,
    ContentProjects,
    ContentSchemaImports,
    ContentPackDocuments,
    ContentCustomSchemas,
    ContentProjectData,
    ContentDraftRevisions,
    ContentPublishJobs,
  ],
  globals: [],
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
  ],
  secret: process.env.PAYLOAD_SECRET || "change-me-in-production",
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
});
