import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Payload } from "payload";
import {
  CONTENT_PACK_REGISTRY,
  type ContentPackRegistryEntry,
} from "../../../packages/engine/src/escape-the-dungeon/contracts/index";
import * as EngineRuntime from "../../../packages/engine/src/escape-the-dungeon/contracts/index";
import { slugify } from "@/lib/utils";

export const CONTENT_PROJECTS_COLLECTION = "content-projects" as const;
export const CONTENT_SCHEMA_IMPORTS_COLLECTION =
  "content-schema-imports" as const;
export const CONTENT_PACK_DOCUMENTS_COLLECTION =
  "content-pack-documents" as const;
export const CONTENT_CUSTOM_SCHEMAS_COLLECTION =
  "content-custom-schemas" as const;
export const CONTENT_PROJECT_DATA_COLLECTION = "content-platform-data" as const;
export const CONTENT_DRAFT_REVISIONS_COLLECTION =
  "content-draft-revisions" as const;
export const CONTENT_PUBLISH_JOBS_COLLECTION = "content-publish-jobs" as const;

type AuthoringCollection =
  | typeof CONTENT_PROJECTS_COLLECTION
  | typeof CONTENT_SCHEMA_IMPORTS_COLLECTION
  | typeof CONTENT_PACK_DOCUMENTS_COLLECTION
  | typeof CONTENT_CUSTOM_SCHEMAS_COLLECTION
  | typeof CONTENT_PROJECT_DATA_COLLECTION
  | typeof CONTENT_DRAFT_REVISIONS_COLLECTION
  | typeof CONTENT_PUBLISH_JOBS_COLLECTION;

type JsonDocument =
  | string
  | number
  | boolean
  | null
  | JsonDocument[]
  | { [key: string]: JsonDocument };

type PayloadRecord = {
  id?: number | string;
  [key: string]: unknown;
};

type UntypedPayloadApi = {
  find: (options: Record<string, unknown>) => Promise<unknown>;
  findByID: (options: Record<string, unknown>) => Promise<unknown>;
  create: (options: Record<string, unknown>) => Promise<unknown>;
  update: (options: Record<string, unknown>) => Promise<unknown>;
  delete: (options: Record<string, unknown>) => Promise<unknown>;
};

type ProjectStatus = "draft" | "validated" | "published";
type SchemaImportStatus = "imported" | "refreshed";
type PackDocumentStatus = "imported" | "edited" | "exported";
type CustomSchemaStatus = "draft" | "validated" | "exported";
type CustomSchemaType = "json-schema" | "object-schema" | "canonical-asset";
type ProjectDataStatus = "draft" | "validated" | "exported";
type ProjectDataLayer = "docs-site-payloadcms";
type DraftRevisionTargetType =
  | "pack-document"
  | "custom-schema"
  | "platform-data";
type DraftRevisionChangeKind = "import" | "edit" | "publish";
type PublishJobStatus = "running" | "succeeded" | "failed";
type ProjectDataNamespace =
  | "admin-ui"
  | "workflow"
  | "publishing"
  | "rendering"
  | "integration"
  | "generic-extension";

const AUTHORING_PROJECT_DATA_LAYER: ProjectDataLayer = "docs-site-payloadcms";
const currentFilePath = fileURLToPath(import.meta.url);
const docsSiteRoot = path.resolve(path.dirname(currentFilePath), "..", "..");
const repoRoot = path.resolve(docsSiteRoot, "..");
const engineEscapeRoot = path.resolve(
  repoRoot,
  "packages",
  "engine",
  "src",
  "escape-the-dungeon"
);
const engineContentSourcePath = path.resolve(
  engineEscapeRoot,
  "contracts",
  "source",
  "content-source.json"
);
const engineSchemaRoot = path.resolve(engineEscapeRoot, "contracts", "schemas");
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const npmExecPath = process.env.npm_execpath;
const jsEntrypointPattern = /\.(c|m)?js$/i;

const engineExports = EngineRuntime as Record<string, unknown>;
const contentPackRegistryById = new Map(
  CONTENT_PACK_REGISTRY.map((entry) => [entry.packId, entry])
);

type SupportedGameSchemaDefinition = {
  packId: string;
  schemaFile: string;
};

type SupportedGameSchemaSummary = {
  packId: string;
  schemaId: string;
  title: string;
  kind: string;
  schemaFile: string;
  schemaVersion: string | null;
  schemaRef: string | null;
  description: string | null;
  imported: boolean;
  seeded: boolean;
  customSchemaId: string | null;
};

const supportedGameSchemaDefinitions: SupportedGameSchemaDefinition[] = [
  { packId: "entityTypes", schemaFile: "entity-types.schema.json" },
  { packId: "effects", schemaFile: "effects.schema.json" },
  { packId: "occupations", schemaFile: "occupations.schema.json" },
  { packId: "partyRoles", schemaFile: "party-roles.schema.json" },
  { packId: "spawnTable", schemaFile: "spawn-table.schema.json" },
  { packId: "runes", schemaFile: "runes.schema.json" },
  { packId: "spellCategories", schemaFile: "spell-categories.schema.json" },
  { packId: "spells", schemaFile: "spells.schema.json" },
  { packId: "spellEvolution", schemaFile: "spell-evolution.schema.json" },
  { packId: "titles", schemaFile: "titles.schema.json" },
  { packId: "mounts", schemaFile: "mounts.schema.json" },
  { packId: "worldMap", schemaFile: "world-map.schema.json" },
  { packId: "actionCatalog", schemaFile: "action-catalog.schema.json" },
  { packId: "actionIntents", schemaFile: "action-intents.schema.json" },
  { packId: "actionPolicies", schemaFile: "action-policies.schema.json" },
  { packId: "roomTemplates", schemaFile: "room-templates.schema.json" },
  { packId: "dungeonLayouts", schemaFile: "dungeons.schema.json" },
  { packId: "itemPack", schemaFile: "items.schema.json" },
  { packId: "skillPack", schemaFile: "skills.schema.json" },
  { packId: "archetypePack", schemaFile: "archetypes.schema.json" },
  { packId: "dialoguePack", schemaFile: "dialogue.schema.json" },
  { packId: "cutscenePack", schemaFile: "cutscenes.schema.json" },
  { packId: "questPack", schemaFile: "quests.schema.json" },
  { packId: "eventPack", schemaFile: "events.schema.json" },
];

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function toStringId(value: unknown): string {
  return String(value ?? "");
}

function toNumericId(value: string | number): number {
  const id = Number(value);
  if (!Number.isFinite(id)) {
    throw new Error(`Invalid numeric id: ${String(value)}`);
  }
  return id;
}

function keyFor(projectId: string | number, itemId: string): string {
  return `${String(projectId)}:${itemId}`;
}

function assertJsonDocument(value: unknown): JsonDocument {
  return cloneJson(value) as JsonDocument;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function gameSchemaIdForPack(packId: string): string {
  return `escape-the-dungeon/${packId}`;
}

function schemaPathForFile(schemaFile: string): string {
  return path.resolve(engineSchemaRoot, schemaFile);
}

function readSchemaDocument(schemaFile: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(schemaPathForFile(schemaFile), "utf8")
  ) as Record<string, unknown>;
}

function resolveLocalSchemaPointer(
  root: Record<string, unknown>,
  ref: string
): Record<string, unknown> {
  if (!ref.startsWith("#/")) {
    throw new Error(`Unsupported schema ref '${ref}'.`);
  }
  let cursor: unknown = root;
  for (const segment of ref.slice(2).split("/")) {
    if (!isRecord(cursor)) {
      throw new Error(`Invalid schema ref '${ref}'.`);
    }
    cursor = cursor[segment];
  }
  if (!isRecord(cursor)) {
    throw new Error(`Schema ref '${ref}' did not resolve to an object schema.`);
  }
  return cloneJson(cursor);
}

function deriveAssetSchemaDocument(
  packId: string,
  schemaFile: string
): Record<string, unknown> {
  const root = readSchemaDocument(schemaFile);
  const properties = isRecord(root.properties) ? root.properties : {};
  const collectionEntry = Object.entries(properties).find(([key, value]) => {
    if (
      key === "$schema" ||
      key === "$id" ||
      key === "schemaVersion" ||
      key === "description"
    ) {
      return false;
    }
    return isRecord(value) && value.type === "array";
  });

  if (!collectionEntry) {
    throw new Error(
      `Schema '${schemaFile}' does not expose a top-level asset collection array.`
    );
  }

  const [collectionKey, collectionSchema] = collectionEntry;
  const collectionRecord = collectionSchema as Record<string, unknown>;
  const rawItemSchema = collectionRecord.items;
  const itemSchema =
    isRecord(rawItemSchema) && typeof rawItemSchema.$ref === "string"
      ? resolveLocalSchemaPointer(root, String(rawItemSchema.$ref))
      : isRecord(rawItemSchema)
        ? cloneJson(rawItemSchema)
        : null;

  if (!itemSchema) {
    throw new Error(
      `Schema '${schemaFile}' does not provide an object item schema for '${collectionKey}'.`
    );
  }

  const itemProperties = isRecord(itemSchema.properties)
    ? itemSchema.properties
    : {};
  const itemIdKey =
    Object.keys(itemProperties).find((key) =>
      key.toLowerCase().endsWith("id")
    ) ?? "id";
  const registryEntry = contentPackRegistryById.get(packId);

  return decorateAssetSchemaDocument(packId, {
    $schema:
      typeof root.$schema === "string"
        ? root.$schema
        : "https://json-schema.org/draft/2020-12/schema",
    $id: `https://dungeonbreak.dev/schemas/generated/${packId}.asset.schema.json`,
    title: `${String(registryEntry?.title ?? packId)} Asset`,
    description:
      typeof root.description === "string"
        ? root.description
        : `Asset schema derived from ${packId}.`,
    type: "object",
    properties: cloneJson(itemProperties),
    required: Array.isArray(itemSchema.required)
      ? cloneJson(itemSchema.required)
      : [],
    ...(isRecord(root.definitions)
      ? { definitions: cloneJson(root.definitions) }
      : {}),
    "x-dungeonbreak-packId": packId,
    "x-dungeonbreak-collectionKey": collectionKey,
    "x-dungeonbreak-itemIdKey": itemIdKey,
  });
}

function ensureObjectSchemaRecord(value: unknown): Record<string, unknown> {
  return isRecord(value)
    ? (value as Record<string, unknown>)
    : { type: "object" };
}

function ensurePropertiesRecord(
  schema: Record<string, unknown>
): Record<string, unknown> {
  if (!isRecord(schema.properties)) {
    schema.properties = {};
  }
  return schema.properties as Record<string, unknown>;
}

function mediaFieldSchema(
  kind: "audio" | "image" | "video",
  config: Record<string, unknown>
) {
  return {
    type: "object",
    "x-dungeonbreak-media": {
      kind,
      ...config,
    },
  };
}

export function decorateAssetSchemaDocument(
  packId: string,
  document: Record<string, unknown>
): Record<string, unknown> {
  const next = cloneJson(document);
  const properties = ensurePropertiesRecord(next);

  if (packId === "itemPack") {
    properties.imagePrompt ??= {
      type: "string",
      description: "Prompt used for generated item art.",
    };
    properties.soundEffectPrompt ??= {
      type: "string",
      description: "Prompt used for generated item sound effects.",
    };
    properties.latestImage ??= mediaFieldSchema("image", {
      defaultProfile: "item_art",
      label: "Latest Item Image",
      promptField: "imagePrompt",
    });
    properties.latestAudio ??= mediaFieldSchema("audio", {
      defaultProfile: "item_sfx",
      label: "Latest Item Audio",
      textField: "soundEffectPrompt",
    });
    return next;
  }

  if (packId === "dialoguePack") {
    properties.audioVoiceId ??= {
      type: "string",
      description: "ElevenLabs voice id used for generated dialogue voice.",
    };
    properties.audioModelId ??= {
      type: "string",
      description: "Hosted model id used for dialogue generation.",
    };
    properties.latestAudio ??= mediaFieldSchema("audio", {
      defaultProfile: "dialogue_voice",
      label: "Latest Dialogue Voice",
      modelField: "audioModelId",
      textField: "line",
      voiceIdField: "audioVoiceId",
    });
    return next;
  }

  if (packId === "entityTypes") {
    const visualRef = ensureObjectSchemaRecord(properties.visualRef);
    const visualProperties = ensurePropertiesRecord(visualRef);
    visualProperties.portraitPrompt ??= {
      type: "string",
      description: "Prompt used for generated entity portrait or key art.",
    };
    visualProperties.latestImage ??= mediaFieldSchema("image", {
      defaultProfile: "character_portrait",
      label: "Latest Entity Portrait",
      promptField: "visualRef.portraitPrompt",
    });
    visualRef.type = "object";
    properties.visualRef = visualRef;
    return next;
  }

  return next;
}

function supportedGameSchemaCatalogBase(): SupportedGameSchemaSummary[] {
  return supportedGameSchemaDefinitions.map((definition) => {
    const registryEntry = contentPackRegistryById.get(definition.packId);
    return {
      packId: definition.packId,
      schemaId: gameSchemaIdForPack(definition.packId),
      title: String(registryEntry?.title ?? definition.packId),
      kind: String(registryEntry?.kind ?? "content"),
      schemaFile: definition.schemaFile,
      schemaVersion:
        typeof registryEntry?.schemaVersion === "string"
          ? registryEntry.schemaVersion
          : null,
      schemaRef:
        typeof registryEntry?.schemaRef === "string"
          ? registryEntry.schemaRef
          : null,
      description:
        typeof registryEntry?.description === "string"
          ? registryEntry.description
          : null,
      imported: false,
      seeded: false,
      customSchemaId: null,
    };
  });
}

function toProjectStatus(value: string | undefined): ProjectStatus | undefined {
  if (value === "draft" || value === "validated" || value === "published") {
    return value;
  }
  return undefined;
}

function toCustomSchemaStatus(
  value: string | undefined
): CustomSchemaStatus | undefined {
  if (value === "draft" || value === "validated" || value === "exported") {
    return value;
  }
  return undefined;
}

function toProjectDataStatus(
  value: string | undefined
): ProjectDataStatus | undefined {
  if (value === "draft" || value === "validated" || value === "exported") {
    return value;
  }
  return undefined;
}

function toPackDocumentStatus(
  value: string | undefined
): PackDocumentStatus | undefined {
  if (value === "imported" || value === "edited" || value === "exported") {
    return value;
  }
  return undefined;
}

function toCustomSchemaType(
  value: string | undefined
): CustomSchemaType | undefined {
  if (
    value === "json-schema" ||
    value === "object-schema" ||
    value === "canonical-asset"
  ) {
    return value;
  }
  return undefined;
}

function toProjectDataNamespace(
  value: string | undefined
): ProjectDataNamespace | undefined {
  if (
    value === "admin-ui" ||
    value === "workflow" ||
    value === "publishing" ||
    value === "rendering" ||
    value === "integration" ||
    value === "generic-extension"
  ) {
    return value;
  }
  return undefined;
}

function toDraftRevisionChangeKind(
  value: string | undefined
): DraftRevisionChangeKind | undefined {
  if (value === "import" || value === "edit" || value === "publish") {
    return value;
  }
  return undefined;
}

async function findOneByKey(
  payload: Payload,
  collection: AuthoringCollection,
  key: string
): Promise<PayloadRecord | null> {
  const result = (await payloadApi(payload).find({
    collection,
    where: { key: { equals: key } },
    limit: 1,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })) as unknown as { docs?: PayloadRecord[] };
  return result.docs?.[0] ?? null;
}

async function findById(
  payload: Payload,
  collection: AuthoringCollection,
  id: string | number
): Promise<PayloadRecord> {
  return (await payloadApi(payload).findByID({
    collection,
    id: toNumericId(id),
    depth: 0,
    overrideAccess: true,
  })) as unknown as PayloadRecord;
}

function resolveCanonicalDocument(
  entry: ContentPackRegistryEntry
): JsonDocument {
  const document = engineExports[entry.exportName];
  if (typeof document === "undefined") {
    throw new Error(`Engine export missing for ${entry.exportName}`);
  }
  return assertJsonDocument(document);
}

function normalizeProject(project: PayloadRecord) {
  return {
    id: toStringId(project.id),
    name: String(project.name ?? ""),
    slug: String(project.slug ?? ""),
    description: String(project.description ?? ""),
    status: String(project.status ?? "draft"),
    exportRoot: String(project.exportRoot ?? "content-projects"),
    sourceMode: String(project.sourceMode ?? "payload"),
    notes: String(project.notes ?? ""),
    updatedAt:
      typeof project.updatedAt === "string" ? String(project.updatedAt) : null,
    createdAt:
      typeof project.createdAt === "string" ? String(project.createdAt) : null,
  };
}

function normalizeSchemaImport(doc: PayloadRecord) {
  return {
    id: toStringId(doc.id),
    packId: String(doc.packId ?? ""),
    title: String(doc.title ?? ""),
    kind: String(doc.kind ?? ""),
    exportName: String(doc.exportName ?? ""),
    sourceFile: String(doc.sourceFile ?? ""),
    contentSourcePath:
      typeof doc.contentSourcePath === "string"
        ? String(doc.contentSourcePath)
        : null,
    schemaVersion:
      typeof doc.schemaVersion === "string" ? String(doc.schemaVersion) : null,
    importStatus: String(doc.importStatus ?? "imported"),
    updatedAt: typeof doc.updatedAt === "string" ? String(doc.updatedAt) : null,
  };
}

function normalizePackDocument(doc: PayloadRecord) {
  return {
    id: toStringId(doc.id),
    packId: String(doc.packId ?? ""),
    title: String(doc.title ?? ""),
    kind: String(doc.kind ?? ""),
    exportName: String(doc.exportName ?? ""),
    sourceFile: String(doc.sourceFile ?? ""),
    contentSourcePath:
      typeof doc.contentSourcePath === "string"
        ? String(doc.contentSourcePath)
        : null,
    bundleKey: typeof doc.bundleKey === "string" ? String(doc.bundleKey) : null,
    schemaVersion:
      typeof doc.schemaVersion === "string" ? String(doc.schemaVersion) : null,
    status: String(doc.status ?? "imported"),
    updatedAt: typeof doc.updatedAt === "string" ? String(doc.updatedAt) : null,
    document: assertJsonDocument(doc.document ?? {}),
  };
}

function normalizeCustomSchema(doc: PayloadRecord) {
  return {
    id: toStringId(doc.id),
    schemaId: String(doc.schemaId ?? ""),
    name: String(doc.name ?? ""),
    targetPackId:
      typeof doc.targetPackId === "string" ? String(doc.targetPackId) : null,
    schemaType: String(doc.schemaType ?? "json-schema"),
    status: String(doc.status ?? "draft"),
    updatedAt: typeof doc.updatedAt === "string" ? String(doc.updatedAt) : null,
    document: assertJsonDocument(doc.document ?? {}),
  };
}

function normalizeProjectData(doc: PayloadRecord) {
  return {
    id: toStringId(doc.id),
    dataId: String(doc.dataId ?? ""),
    name: String(doc.name ?? ""),
    projectLayer: String(doc.platformLayer ?? AUTHORING_PROJECT_DATA_LAYER),
    namespace: String(doc.namespace ?? "generic-extension"),
    targetId: typeof doc.targetId === "string" ? String(doc.targetId) : null,
    status: String(doc.status ?? "draft"),
    updatedAt: typeof doc.updatedAt === "string" ? String(doc.updatedAt) : null,
    document: assertJsonDocument(doc.document ?? {}),
  };
}

function normalizeDraftRevision(doc: PayloadRecord) {
  const targetType = String(doc.targetType ?? "pack-document");
  return {
    id: toStringId(doc.id),
    key: String(doc.key ?? ""),
    targetType: targetType === "platform-data" ? "project-data" : targetType,
    targetKey: String(doc.targetKey ?? ""),
    targetName: String(doc.targetName ?? ""),
    targetDocumentId: String(doc.targetDocumentId ?? ""),
    changeKind: String(doc.changeKind ?? "edit"),
    notes: typeof doc.notes === "string" ? String(doc.notes) : "",
    updatedAt: typeof doc.updatedAt === "string" ? String(doc.updatedAt) : null,
    createdAt: typeof doc.createdAt === "string" ? String(doc.createdAt) : null,
    document: assertJsonDocument(doc.document ?? {}),
  };
}

function normalizePublishJob(doc: PayloadRecord) {
  return {
    id: toStringId(doc.id),
    jobId: String(doc.jobId ?? ""),
    status: String(doc.status ?? "running"),
    exportRoot:
      typeof doc.exportRoot === "string" ? String(doc.exportRoot) : "",
    commands: Array.isArray(doc.commands)
      ? doc.commands.map((entry) => String(entry))
      : [],
    exportFiles: Array.isArray(doc.exportFiles)
      ? doc.exportFiles.map((entry) => String(entry))
      : [],
    engineFiles: Array.isArray(doc.engineFiles)
      ? doc.engineFiles.map((entry) => String(entry))
      : [],
    skippedPacks: Array.isArray(doc.skippedPacks)
      ? doc.skippedPacks.map((entry) => String(entry))
      : [],
    errorMessage:
      typeof doc.errorMessage === "string" ? String(doc.errorMessage) : "",
    summary: assertJsonDocument(doc.summary ?? {}),
    updatedAt: typeof doc.updatedAt === "string" ? String(doc.updatedAt) : null,
    createdAt: typeof doc.createdAt === "string" ? String(doc.createdAt) : null,
  };
}

function createRevisionKey(
  projectId: string,
  targetType: DraftRevisionTargetType,
  targetKey: string
) {
  return `${projectId}:${targetType}:${targetKey}:${Date.now()}:${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function createPublishJobId(projectId: string) {
  return `publish:${projectId}:${Date.now()}:${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function setNestedValue(
  target: Record<string, unknown>,
  dottedPath: string,
  value: JsonDocument
) {
  const segments = dottedPath.split(".").filter(Boolean);
  if (segments.length === 0) {
    throw new Error("contentSourcePath cannot be empty.");
  }
  let cursor: Record<string, unknown> = target;
  for (const segment of segments.slice(0, -1)) {
    const next = cursor[segment];
    if (!isRecord(next)) {
      cursor[segment] = {};
    }
    cursor = cursor[segment] as Record<string, unknown>;
  }
  cursor[segments[segments.length - 1] ?? dottedPath] = cloneJson(value);
}

function writeJsonFile(filePath: string, document: JsonDocument) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
}

function removeStaleJsonFiles(
  directory: string,
  expectedFiles: ReadonlySet<string>
) {
  if (!existsSync(directory)) {
    return;
  }
  for (const fileName of readdirSync(directory)) {
    if (!fileName.endsWith(".json")) {
      continue;
    }
    if (expectedFiles.has(fileName)) {
      continue;
    }
    unlinkSync(path.join(directory, fileName));
  }
}

function runRepoCommand(args: string[]) {
  const command =
    npmExecPath && jsEntrypointPattern.test(npmExecPath)
      ? process.execPath
      : npmExecPath || pnpmCommand;
  const commandArgs =
    npmExecPath && jsEntrypointPattern.test(npmExecPath)
      ? [npmExecPath, ...args]
      : args;
  execFileSync(command, commandArgs, {
    cwd: repoRoot,
    stdio: "pipe",
    encoding: "utf8",
  });
}

function payloadApi(payload: Payload): UntypedPayloadApi {
  return payload as unknown as UntypedPayloadApi;
}

async function recordDraftRevision(
  payload: Payload,
  input: {
    projectId: string;
    targetType: DraftRevisionTargetType;
    targetKey: string;
    targetName: string;
    targetDocumentId: string;
    changeKind: DraftRevisionChangeKind;
    notes?: string;
    document: unknown;
  }
) {
  return (await payloadApi(payload).create({
    collection: CONTENT_DRAFT_REVISIONS_COLLECTION,
    data: {
      key: createRevisionKey(
        input.projectId,
        input.targetType,
        input.targetKey
      ),
      project: toNumericId(input.projectId),
      targetType: input.targetType,
      targetKey: input.targetKey,
      targetName: input.targetName,
      targetDocumentId: input.targetDocumentId,
      changeKind: input.changeKind,
      notes: input.notes?.trim() || undefined,
      document: assertJsonDocument(input.document),
    },
    overrideAccess: true,
  })) as unknown as PayloadRecord;
}

async function createPublishJob(
  payload: Payload,
  projectId: string,
  summary: JsonDocument
) {
  const jobId = createPublishJobId(projectId);
  const job = (await payloadApi(payload).create({
    collection: CONTENT_PUBLISH_JOBS_COLLECTION,
    data: {
      jobId,
      project: toNumericId(projectId),
      status: "running" as PublishJobStatus,
      summary,
    },
    overrideAccess: true,
  })) as unknown as PayloadRecord;
  return {
    jobId,
    recordId: toStringId(job.id),
  };
}

async function updatePublishJob(
  payload: Payload,
  publishJobRecordId: string,
  input: {
    status: PublishJobStatus;
    exportRoot?: string;
    commands?: string[];
    exportFiles?: string[];
    engineFiles?: string[];
    skippedPacks?: string[];
    errorMessage?: string;
    summary?: JsonDocument;
  }
) {
  return (await payloadApi(payload).update({
    collection: CONTENT_PUBLISH_JOBS_COLLECTION,
    id: toNumericId(publishJobRecordId),
    data: {
      status: input.status,
      ...(typeof input.exportRoot === "string"
        ? { exportRoot: input.exportRoot }
        : {}),
      ...(input.commands ? { commands: input.commands } : {}),
      ...(input.exportFiles ? { exportFiles: input.exportFiles } : {}),
      ...(input.engineFiles ? { engineFiles: input.engineFiles } : {}),
      ...(input.skippedPacks ? { skippedPacks: input.skippedPacks } : {}),
      ...(typeof input.errorMessage === "string"
        ? { errorMessage: input.errorMessage }
        : {}),
      ...(typeof input.summary !== "undefined"
        ? { summary: input.summary }
        : {}),
    },
    overrideAccess: true,
  })) as unknown as PayloadRecord;
}

export function registryEntries(): ContentPackRegistryEntry[] {
  return CONTENT_PACK_REGISTRY.map((entry) => cloneJson(entry));
}

export function supportedGameSchemaPackIds(): string[] {
  return supportedGameSchemaDefinitions.map((definition) => definition.packId);
}

export async function seedSupportedGameSchemas(
  payload: Payload,
  projectId: string,
  packIds?: string[]
): Promise<{ seededPackIds: string[] }> {
  const selected = new Set(
    packIds?.length ? packIds : supportedGameSchemaPackIds()
  );
  const seededPackIds: string[] = [];

  for (const definition of supportedGameSchemaDefinitions) {
    if (!selected.has(definition.packId)) {
      continue;
    }
    const registryEntry = contentPackRegistryById.get(definition.packId);
    await createCustomSchema(payload, projectId, {
      schemaId: gameSchemaIdForPack(definition.packId),
      name: `${String(registryEntry?.title ?? definition.packId)} Asset`,
      targetPackId: definition.packId,
      schemaType: "json-schema",
      document: deriveAssetSchemaDocument(
        definition.packId,
        definition.schemaFile
      ),
    });
    seededPackIds.push(definition.packId);
  }

  return { seededPackIds };
}

export async function createProject(
  payload: Payload,
  input: {
    name: string;
    slug?: string;
    description?: string;
    notes?: string;
  }
) {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Project name is required.");
  }
  const slug = (input.slug?.trim() || slugify(name)).trim();
  if (!slug) {
    throw new Error("Project slug is required.");
  }
  return (await payloadApi(payload).create({
    collection: CONTENT_PROJECTS_COLLECTION,
    data: {
      name,
      slug,
      description: input.description?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      status: "draft",
      exportRoot: "content-projects",
      sourceMode: "payload",
    },
    overrideAccess: true,
  })) as unknown as PayloadRecord;
}

export async function updateProject(
  payload: Payload,
  projectId: string,
  input: Partial<{
    name: string;
    slug: string;
    description: string;
    notes: string;
    status: string;
    exportRoot: string;
  }>
) {
  return (await payloadApi(payload).update({
    collection: CONTENT_PROJECTS_COLLECTION,
    id: toNumericId(projectId),
    data: {
      ...(typeof input.name === "string" ? { name: input.name.trim() } : {}),
      ...(typeof input.slug === "string"
        ? { slug: input.slug.trim() || slugify(input.slug) }
        : {}),
      ...(typeof input.description === "string"
        ? { description: input.description }
        : {}),
      ...(typeof input.notes === "string" ? { notes: input.notes } : {}),
      ...(toProjectStatus(input.status)
        ? { status: toProjectStatus(input.status) }
        : {}),
      ...(typeof input.exportRoot === "string"
        ? { exportRoot: input.exportRoot.trim() || "content-projects" }
        : {}),
    },
    overrideAccess: true,
  })) as unknown as PayloadRecord;
}

export async function listProjects(payload: Payload) {
  const result = (await payloadApi(payload).find({
    collection: CONTENT_PROJECTS_COLLECTION,
    limit: 100,
    pagination: false,
    sort: "name",
    overrideAccess: true,
  })) as unknown as { docs?: PayloadRecord[] };
  return result.docs ?? [];
}

export async function getProjectById(payload: Payload, projectId: string) {
  return await findById(payload, CONTENT_PROJECTS_COLLECTION, projectId);
}

export async function importCanonicalPacks(
  payload: Payload,
  projectId: string,
  packIds?: string[]
): Promise<{ imported: number; packs: string[]; removed: string[] }> {
  const projectNumericId = toNumericId(projectId);
  const selected = new Set(
    packIds?.length
      ? packIds
      : CONTENT_PACK_REGISTRY.map((entry) => entry.packId)
  );
  let imported = 0;
  const packs: string[] = [];
  const removed: string[] = [];

  for (const entry of CONTENT_PACK_REGISTRY) {
    if (!selected.has(entry.packId)) {
      continue;
    }
    const document = resolveCanonicalDocument(entry);
    const key = keyFor(projectId, entry.packId);
    const schemaImportData = {
      key,
      project: projectNumericId,
      packId: entry.packId,
      title: entry.title,
      kind: entry.kind,
      exportName: entry.exportName,
      sourceFile: entry.sourceFile,
      bundleKey: entry.bundleKey,
      contentSourcePath: entry.contentSourcePath,
      schemaVersion: entry.schemaVersion,
      schemaRef: entry.schemaRef,
      topLevelCounts: cloneJson(entry.topLevelCounts),
      canonicalDocument: document,
      importStatus: "refreshed" as SchemaImportStatus,
    };

    const existingImport = await findOneByKey(
      payload,
      CONTENT_SCHEMA_IMPORTS_COLLECTION,
      key
    );
    const schemaImport = existingImport
      ? ((await payloadApi(payload).update({
          collection: CONTENT_SCHEMA_IMPORTS_COLLECTION,
          id: toNumericId(existingImport.id ?? 0),
          data: schemaImportData,
          overrideAccess: true,
        })) as unknown as PayloadRecord)
      : ((await payloadApi(payload).create({
          collection: CONTENT_SCHEMA_IMPORTS_COLLECTION,
          data: {
            ...schemaImportData,
            importStatus: "imported" as SchemaImportStatus,
          },
          overrideAccess: true,
        })) as unknown as PayloadRecord);

    const packDocumentData = {
      key,
      project: projectNumericId,
      schemaImport: toNumericId(schemaImport.id ?? 0),
      packId: entry.packId,
      title: entry.title,
      kind: entry.kind,
      exportName: entry.exportName,
      sourceFile: entry.sourceFile,
      bundleKey: entry.bundleKey,
      contentSourcePath: entry.contentSourcePath,
      schemaVersion: entry.schemaVersion,
      document,
      status: "imported" as PackDocumentStatus,
    };

    const existingPackDocument = await findOneByKey(
      payload,
      CONTENT_PACK_DOCUMENTS_COLLECTION,
      key
    );
    let savedPackDocument: PayloadRecord;
    if (existingPackDocument) {
      savedPackDocument = (await payloadApi(payload).update({
        collection: CONTENT_PACK_DOCUMENTS_COLLECTION,
        id: toNumericId(existingPackDocument.id ?? 0),
        data: packDocumentData,
        overrideAccess: true,
      })) as unknown as PayloadRecord;
    } else {
      savedPackDocument = (await payloadApi(payload).create({
        collection: CONTENT_PACK_DOCUMENTS_COLLECTION,
        data: packDocumentData,
        overrideAccess: true,
      })) as unknown as PayloadRecord;
    }
    await recordDraftRevision(payload, {
      projectId,
      targetType: "pack-document",
      targetKey: entry.packId,
      targetName: entry.title,
      targetDocumentId: toStringId(savedPackDocument.id),
      changeKind: "import",
      notes: "Imported canonical engine pack into project.",
      document,
    });

    imported += 1;
    packs.push(entry.packId);
  }

  if (!packIds?.length) {
    const schemaImportsResult = (await payloadApi(payload).find({
      collection: CONTENT_SCHEMA_IMPORTS_COLLECTION,
      where: { project: { equals: projectNumericId } },
      limit: 500,
      pagination: false,
      depth: 0,
      overrideAccess: true,
    })) as unknown as { docs?: PayloadRecord[] };
    const packDocumentsResult = (await payloadApi(payload).find({
      collection: CONTENT_PACK_DOCUMENTS_COLLECTION,
      where: { project: { equals: projectNumericId } },
      limit: 500,
      pagination: false,
      depth: 0,
      overrideAccess: true,
    })) as unknown as { docs?: PayloadRecord[] };

    for (const doc of packDocumentsResult.docs ?? []) {
      const stalePackId = String(doc.packId ?? "");
      if (!stalePackId || selected.has(stalePackId)) {
        continue;
      }
      await payloadApi(payload).delete({
        collection: CONTENT_PACK_DOCUMENTS_COLLECTION,
        id: toNumericId(doc.id ?? 0),
        overrideAccess: true,
      });
      removed.push(stalePackId);
    }

    for (const doc of schemaImportsResult.docs ?? []) {
      const stalePackId = String(doc.packId ?? "");
      if (!stalePackId || selected.has(stalePackId)) {
        continue;
      }
      await payloadApi(payload).delete({
        collection: CONTENT_SCHEMA_IMPORTS_COLLECTION,
        id: toNumericId(doc.id ?? 0),
        overrideAccess: true,
      });
    }
  }

  return { imported, packs, removed };
}

export async function updatePackDocument(
  payload: Payload,
  projectId: string,
  packId: string,
  input: { document: unknown; status?: string }
) {
  const existing = await findOneByKey(
    payload,
    CONTENT_PACK_DOCUMENTS_COLLECTION,
    keyFor(projectId, packId)
  );
  if (!existing) {
    throw new Error(
      `Pack document ${packId} is not imported for this project.`
    );
  }
  const updated = (await payloadApi(payload).update({
    collection: CONTENT_PACK_DOCUMENTS_COLLECTION,
    id: toNumericId(existing.id ?? 0),
    data: {
      document: assertJsonDocument(input.document),
      ...(toPackDocumentStatus(input.status)
        ? { status: toPackDocumentStatus(input.status) }
        : { status: "edited" as PackDocumentStatus }),
    },
    overrideAccess: true,
  })) as unknown as PayloadRecord;
  await recordDraftRevision(payload, {
    projectId,
    targetType: "pack-document",
    targetKey: String(updated.packId ?? packId),
    targetName: String(updated.title ?? packId),
    targetDocumentId: toStringId(updated.id),
    changeKind: "edit",
    notes: "Updated pack document JSON in Payload.",
    document: updated.document ?? input.document,
  });
  return updated;
}

export async function createCustomSchema(
  payload: Payload,
  projectId: string,
  input: {
    schemaId: string;
    name: string;
    targetPackId?: string;
    schemaType?: string;
    document: unknown;
  }
) {
  const schemaId = input.schemaId.trim() || slugify(input.name);
  if (!schemaId) {
    throw new Error("schemaId is required.");
  }
  const name = input.name.trim();
  if (!name) {
    throw new Error("Custom schema name is required.");
  }
  const key = keyFor(projectId, `schema:${schemaId}`);
  const existing = await findOneByKey(
    payload,
    CONTENT_CUSTOM_SCHEMAS_COLLECTION,
    key
  );
  const data = {
    key,
    project: toNumericId(projectId),
    schemaId,
    name,
    targetPackId: input.targetPackId?.trim() || undefined,
    schemaType: toCustomSchemaType(input.schemaType) ?? "json-schema",
    document: assertJsonDocument(input.document),
    status: "draft" as CustomSchemaStatus,
  };
  if (existing) {
    const updated = (await payloadApi(payload).update({
      collection: CONTENT_CUSTOM_SCHEMAS_COLLECTION,
      id: toNumericId(existing.id ?? 0),
      data,
      overrideAccess: true,
    })) as unknown as PayloadRecord;
    await recordDraftRevision(payload, {
      projectId,
      targetType: "custom-schema",
      targetKey: schemaId,
      targetName: name,
      targetDocumentId: toStringId(updated.id),
      changeKind: "edit",
      notes: "Updated project custom schema.",
      document: updated.document ?? input.document,
    });
    return updated;
  }
  const created = (await payloadApi(payload).create({
    collection: CONTENT_CUSTOM_SCHEMAS_COLLECTION,
    data,
    overrideAccess: true,
  })) as unknown as PayloadRecord;
  await recordDraftRevision(payload, {
    projectId,
    targetType: "custom-schema",
    targetKey: schemaId,
    targetName: name,
    targetDocumentId: toStringId(created.id),
    changeKind: "edit",
    notes: "Created project custom schema.",
    document: created.document ?? input.document,
  });
  return created;
}

export async function updateCustomSchema(
  payload: Payload,
  customSchemaId: string,
  input: Partial<{
    name: string;
    targetPackId: string;
    schemaType: string;
    status: string;
    document: unknown;
  }>
) {
  const current = await findById(
    payload,
    CONTENT_CUSTOM_SCHEMAS_COLLECTION,
    customSchemaId
  );
  const updated = (await payloadApi(payload).update({
    collection: CONTENT_CUSTOM_SCHEMAS_COLLECTION,
    id: toNumericId(customSchemaId),
    data: {
      ...(typeof input.name === "string" ? { name: input.name.trim() } : {}),
      ...(typeof input.targetPackId === "string"
        ? { targetPackId: input.targetPackId.trim() || null }
        : {}),
      ...(toCustomSchemaType(input.schemaType)
        ? { schemaType: toCustomSchemaType(input.schemaType) }
        : {}),
      ...(toCustomSchemaStatus(input.status)
        ? { status: toCustomSchemaStatus(input.status) }
        : {}),
      ...(typeof input.document !== "undefined"
        ? { document: assertJsonDocument(input.document) }
        : {}),
    },
    overrideAccess: true,
  })) as unknown as PayloadRecord;
  await recordDraftRevision(payload, {
    projectId: toStringId(current.project),
    targetType: "custom-schema",
    targetKey: String(updated.schemaId ?? current.schemaId ?? customSchemaId),
    targetName: String(updated.name ?? current.name ?? customSchemaId),
    targetDocumentId: toStringId(updated.id),
    changeKind: "edit",
    notes: "Edited custom schema document.",
    document: updated.document ?? input.document ?? {},
  });
  return updated;
}

export async function createProjectData(
  payload: Payload,
  projectId: string,
  input: {
    dataId: string;
    name: string;
    namespace?: string;
    targetId?: string;
    document: unknown;
  }
) {
  const dataId = input.dataId.trim() || slugify(input.name);
  if (!dataId) {
    throw new Error("dataId is required.");
  }
  const name = input.name.trim();
  if (!name) {
    throw new Error("Project data name is required.");
  }
  const key = keyFor(projectId, `platform:${dataId}`);
  const existing = await findOneByKey(
    payload,
    CONTENT_PROJECT_DATA_COLLECTION,
    key
  );
  const data = {
    key,
    project: toNumericId(projectId),
    dataId,
    name,
    platformLayer: AUTHORING_PROJECT_DATA_LAYER,
    namespace: toProjectDataNamespace(input.namespace) ?? "generic-extension",
    targetId: input.targetId?.trim() || undefined,
    document: assertJsonDocument(input.document),
    status: "draft" as ProjectDataStatus,
  };
  if (existing) {
    const updated = (await payloadApi(payload).update({
      collection: CONTENT_PROJECT_DATA_COLLECTION,
      id: toNumericId(existing.id ?? 0),
      data,
      overrideAccess: true,
    })) as unknown as PayloadRecord;
    await recordDraftRevision(payload, {
      projectId,
      targetType: "platform-data",
      targetKey: dataId,
      targetName: name,
      targetDocumentId: toStringId(updated.id),
      changeKind: "edit",
      notes: "Updated docs-site/Payload project data record.",
      document: updated.document ?? input.document,
    });
    return updated;
  }
  const created = (await payloadApi(payload).create({
    collection: CONTENT_PROJECT_DATA_COLLECTION,
    data,
    overrideAccess: true,
  })) as unknown as PayloadRecord;
  await recordDraftRevision(payload, {
    projectId,
    targetType: "platform-data",
    targetKey: dataId,
    targetName: name,
    targetDocumentId: toStringId(created.id),
    changeKind: "edit",
    notes: "Created docs-site/Payload project data record.",
    document: created.document ?? input.document,
  });
  return created;
}

export async function updateProjectData(
  payload: Payload,
  projectDataId: string,
  input: Partial<{
    name: string;
    namespace: string;
    targetId: string;
    status: string;
    document: unknown;
  }>
) {
  const current = await findById(
    payload,
    CONTENT_PROJECT_DATA_COLLECTION,
    projectDataId
  );
  const updated = (await payloadApi(payload).update({
    collection: CONTENT_PROJECT_DATA_COLLECTION,
    id: toNumericId(projectDataId),
    data: {
      ...(typeof input.name === "string" ? { name: input.name.trim() } : {}),
      platformLayer: AUTHORING_PROJECT_DATA_LAYER,
      ...(toProjectDataNamespace(input.namespace)
        ? { namespace: toProjectDataNamespace(input.namespace) }
        : {}),
      ...(typeof input.targetId === "string"
        ? { targetId: input.targetId.trim() || null }
        : {}),
      ...(toProjectDataStatus(input.status)
        ? { status: toProjectDataStatus(input.status) }
        : {}),
      ...(typeof input.document !== "undefined"
        ? { document: assertJsonDocument(input.document) }
        : {}),
    },
    overrideAccess: true,
  })) as unknown as PayloadRecord;
  await recordDraftRevision(payload, {
    projectId: toStringId(current.project),
    targetType: "platform-data",
    targetKey: String(updated.dataId ?? current.dataId ?? projectDataId),
    targetName: String(updated.name ?? current.name ?? projectDataId),
    targetDocumentId: toStringId(updated.id),
    changeKind: "edit",
    notes: "Edited docs-site/Payload project data record.",
    document: updated.document ?? input.document ?? {},
  });
  return updated;
}

export async function projectDetail(payload: Payload, projectId: string) {
  const project = await getProjectById(payload, projectId);
  const projectNumericId = toNumericId(projectId);
  const schemaImports = (await payloadApi(payload).find({
    collection: CONTENT_SCHEMA_IMPORTS_COLLECTION,
    where: { project: { equals: projectNumericId } },
    limit: 500,
    pagination: false,
    sort: "packId",
    overrideAccess: true,
  })) as unknown as { docs?: PayloadRecord[] };
  const packDocuments = (await payloadApi(payload).find({
    collection: CONTENT_PACK_DOCUMENTS_COLLECTION,
    where: { project: { equals: projectNumericId } },
    limit: 500,
    pagination: false,
    sort: "packId",
    overrideAccess: true,
  })) as unknown as { docs?: PayloadRecord[] };
  const customSchemas = (await payloadApi(payload).find({
    collection: CONTENT_CUSTOM_SCHEMAS_COLLECTION,
    where: { project: { equals: projectNumericId } },
    limit: 500,
    pagination: false,
    sort: "schemaId",
    overrideAccess: true,
  })) as unknown as { docs?: PayloadRecord[] };
  const projectData = (await payloadApi(payload).find({
    collection: CONTENT_PROJECT_DATA_COLLECTION,
    where: { project: { equals: projectNumericId } },
    limit: 500,
    pagination: false,
    sort: "dataId",
    overrideAccess: true,
  })) as unknown as { docs?: PayloadRecord[] };
  const draftRevisions = (await payloadApi(payload).find({
    collection: CONTENT_DRAFT_REVISIONS_COLLECTION,
    where: { project: { equals: projectNumericId } },
    limit: 100,
    pagination: false,
    sort: "-createdAt",
    overrideAccess: true,
  })) as unknown as { docs?: PayloadRecord[] };
  const publishJobs = (await payloadApi(payload).find({
    collection: CONTENT_PUBLISH_JOBS_COLLECTION,
    where: { project: { equals: projectNumericId } },
    limit: 50,
    pagination: false,
    sort: "-createdAt",
    overrideAccess: true,
  })) as unknown as { docs?: PayloadRecord[] };
  const supportedGameSchemas = supportedGameSchemaCatalogBase().map(
    (schema) => {
      const matchingCustomSchema = (customSchemas.docs ?? []).find((doc) => {
        const schemaId = String(doc.schemaId ?? "");
        const targetPackId = String(doc.targetPackId ?? "");
        return schemaId === schema.schemaId || targetPackId === schema.packId;
      });
      const imported = (packDocuments.docs ?? []).some(
        (doc) => String(doc.packId ?? "") === schema.packId
      );
      return {
        ...schema,
        imported,
        seeded: Boolean(matchingCustomSchema),
        customSchemaId: matchingCustomSchema
          ? toStringId(matchingCustomSchema.id)
          : null,
      };
    }
  );

  return {
    project: normalizeProject(project),
    schemaImports: (schemaImports.docs ?? []).map(normalizeSchemaImport),
    packs: (packDocuments.docs ?? []).map(normalizePackDocument),
    customSchemas: (customSchemas.docs ?? []).map(normalizeCustomSchema),
    projectData: (projectData.docs ?? []).map(normalizeProjectData),
    revisions: (draftRevisions.docs ?? []).map(normalizeDraftRevision),
    publishJobs: (publishJobs.docs ?? []).map(normalizePublishJob),
    supportedGameSchemas,
  };
}

export async function exportProjectFiles(
  payload: Payload,
  projectId: string
): Promise<{ rootDir: string; files: string[] }> {
  const detail = await projectDetail(payload, projectId);
  const rootDir = path.resolve(
    process.cwd(),
    detail.project.exportRoot,
    detail.project.slug
  );
  const packDir = path.join(rootDir, "packs");
  const customSchemaDir = path.join(rootDir, "custom-schemas");
  const projectDataDir = path.join(rootDir, "project-data");
  mkdirSync(packDir, { recursive: true });
  mkdirSync(customSchemaDir, { recursive: true });
  mkdirSync(projectDataDir, { recursive: true });

  removeStaleJsonFiles(
    packDir,
    new Set(detail.packs.map((pack) => `${pack.packId}.json`))
  );
  removeStaleJsonFiles(
    customSchemaDir,
    new Set(detail.customSchemas.map((schema) => `${schema.schemaId}.json`))
  );
  removeStaleJsonFiles(
    projectDataDir,
    new Set(detail.projectData.map((entry) => `${entry.dataId}.json`))
  );

  const files: string[] = [];

  for (const pack of detail.packs) {
    const fullPath = path.join(packDir, `${pack.packId}.json`);
    writeFileSync(
      fullPath,
      `${JSON.stringify(pack.document, null, 2)}\n`,
      "utf8"
    );
    files.push(fullPath);

    await payloadApi(payload).update({
      collection: CONTENT_PACK_DOCUMENTS_COLLECTION,
      id: toNumericId(pack.id),
      data: { status: "exported" as PackDocumentStatus },
      overrideAccess: true,
    });
  }

  for (const schema of detail.customSchemas) {
    const fullPath = path.join(customSchemaDir, `${schema.schemaId}.json`);
    writeFileSync(
      fullPath,
      `${JSON.stringify(schema.document, null, 2)}\n`,
      "utf8"
    );
    files.push(fullPath);
    await payloadApi(payload).update({
      collection: CONTENT_CUSTOM_SCHEMAS_COLLECTION,
      id: toNumericId(schema.id),
      data: { status: "exported" as CustomSchemaStatus },
      overrideAccess: true,
    });
  }

  for (const entry of detail.projectData) {
    const fullPath = path.join(projectDataDir, `${entry.dataId}.json`);
    writeFileSync(
      fullPath,
      `${JSON.stringify(entry.document, null, 2)}\n`,
      "utf8"
    );
    files.push(fullPath);
    await payloadApi(payload).update({
      collection: CONTENT_PROJECT_DATA_COLLECTION,
      id: toNumericId(entry.id),
      data: { status: "exported" as ProjectDataStatus },
      overrideAccess: true,
    });
  }

  const schemaImportsPath = path.join(rootDir, "schema-imports.json");
  writeFileSync(
    schemaImportsPath,
    `${JSON.stringify(detail.schemaImports, null, 2)}\n`,
    "utf8"
  );
  files.push(schemaImportsPath);

  const manifestPath = path.join(rootDir, "project-manifest.json");
  writeFileSync(
    manifestPath,
    `${JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        project: detail.project,
        packCount: detail.packs.length,
        schemaImportCount: detail.schemaImports.length,
        customSchemaCount: detail.customSchemas.length,
        projectDataCount: detail.projectData.length,
        files: files.map((file) => path.relative(rootDir, file)),
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  files.push(manifestPath);

  return { rootDir, files };
}

export async function publishProjectToGame(
  payload: Payload,
  projectId: string
): Promise<{
  publishJobId: string;
  exportRoot: string;
  exportFiles: string[];
  engineFiles: string[];
  skippedPacks: string[];
  commands: string[];
}> {
  const publishJob = await createPublishJob(payload, projectId, {
    phase: "publish-project-to-game",
  });
  try {
    const exportResult = await exportProjectFiles(payload, projectId);
    const detail = await projectDetail(payload, projectId);
    const engineFiles: string[] = [];
    const skippedPacks: string[] = [];
    const commands: string[] = [];

    let contentSourceDocument = JSON.parse(
      readFileSync(engineContentSourcePath, "utf8")
    ) as Record<string, unknown>;
    let contentSourceDirty = false;

    const sortedPacks = [...detail.packs].sort((left, right) =>
      left.packId.localeCompare(right.packId)
    );

    for (const pack of sortedPacks) {
      const sourceFile = pack.sourceFile.trim();
      if (!sourceFile) {
        skippedPacks.push(pack.packId);
        continue;
      }

      if (pack.contentSourcePath) {
        setNestedValue(
          contentSourceDocument,
          pack.contentSourcePath,
          pack.document
        );
        contentSourceDirty = true;
        await recordDraftRevision(payload, {
          projectId,
          targetType: "pack-document",
          targetKey: pack.packId,
          targetName: pack.title,
          targetDocumentId: pack.id,
          changeKind: "publish",
          notes: "Published pack through project publish loop.",
          document: pack.document,
        });
        continue;
      }

      if (sourceFile === "contracts/source/content-source.json") {
        if (pack.packId === "contentSource") {
          contentSourceDocument = cloneJson(pack.document) as Record<
            string,
            unknown
          >;
          contentSourceDirty = true;
          await recordDraftRevision(payload, {
            projectId,
            targetType: "pack-document",
            targetKey: pack.packId,
            targetName: pack.title,
            targetDocumentId: pack.id,
            changeKind: "publish",
            notes:
              "Published merged content source through project publish loop.",
            document: pack.document,
          });
          continue;
        }
        skippedPacks.push(pack.packId);
        continue;
      }

      const engineFilePath = path.resolve(engineEscapeRoot, sourceFile);
      writeJsonFile(engineFilePath, pack.document);
      engineFiles.push(engineFilePath);
      await recordDraftRevision(payload, {
        projectId,
        targetType: "pack-document",
        targetKey: pack.packId,
        targetName: pack.title,
        targetDocumentId: pack.id,
        changeKind: "publish",
        notes: `Published pack back to ${sourceFile}.`,
        document: pack.document,
      });
    }

    if (contentSourceDirty) {
      writeJsonFile(
        engineContentSourcePath,
        contentSourceDocument as JsonDocument
      );
      engineFiles.push(engineContentSourcePath);
    }

    runRepoCommand(["--dir", "packages/engine", "run", "build"]);
    commands.push("pnpm --dir packages/engine run build");
    runRepoCommand([
      "--dir",
      "docs-site",
      "exec",
      "node",
      "scripts/ensure-engine-dist.mjs",
    ]);
    commands.push(
      "pnpm --dir docs-site exec node scripts/ensure-engine-dist.mjs"
    );
    runRepoCommand(["--dir", "packages/kaplay-demo", "run", "build"]);
    commands.push("pnpm --dir packages/kaplay-demo run build");

    await updateProject(payload, projectId, { status: "published" });
    await updatePublishJob(payload, publishJob.recordId, {
      status: "succeeded",
      exportRoot: exportResult.rootDir,
      commands,
      exportFiles: exportResult.files,
      engineFiles,
      skippedPacks,
      summary: {
        exportFileCount: exportResult.files.length,
        engineFileCount: engineFiles.length,
        skippedPackCount: skippedPacks.length,
      },
    });

    return {
      publishJobId: publishJob.jobId,
      exportRoot: exportResult.rootDir,
      exportFiles: exportResult.files,
      engineFiles,
      skippedPacks,
      commands,
    };
  } catch (error) {
    await updatePublishJob(payload, publishJob.recordId, {
      status: "failed",
      errorMessage: error instanceof Error ? error.message : String(error),
      summary: {
        failed: true,
      },
    });
    throw error;
  }
}
