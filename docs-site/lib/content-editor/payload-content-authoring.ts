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
export const CONTENT_PLATFORM_DATA_COLLECTION =
  "content-platform-data" as const;
export const CONTENT_DRAFT_REVISIONS_COLLECTION =
  "content-draft-revisions" as const;
export const CONTENT_PUBLISH_JOBS_COLLECTION =
  "content-publish-jobs" as const;

type AuthoringCollection =
  | typeof CONTENT_PROJECTS_COLLECTION
  | typeof CONTENT_SCHEMA_IMPORTS_COLLECTION
  | typeof CONTENT_PACK_DOCUMENTS_COLLECTION
  | typeof CONTENT_CUSTOM_SCHEMAS_COLLECTION
  | typeof CONTENT_PLATFORM_DATA_COLLECTION
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
type PlatformDataStatus = "draft" | "validated" | "exported";
type PlatformLayer = "docs-site-payloadcms";
type DraftRevisionTargetType =
  | "pack-document"
  | "custom-schema"
  | "platform-data";
type DraftRevisionChangeKind = "import" | "edit" | "publish";
type PublishJobStatus = "running" | "succeeded" | "failed";
type PlatformNamespace =
  | "admin-ui"
  | "workflow"
  | "publishing"
  | "rendering"
  | "integration"
  | "generic-extension";

const AUTHORING_PLATFORM_LAYER: PlatformLayer = "docs-site-payloadcms";
const currentFilePath = fileURLToPath(import.meta.url);
const docsSiteRoot = path.resolve(path.dirname(currentFilePath), "..", "..");
const repoRoot = path.resolve(docsSiteRoot, "..");
const engineEscapeRoot = path.resolve(
  repoRoot,
  "packages",
  "engine",
  "src",
  "escape-the-dungeon",
);
const engineContentSourcePath = path.resolve(
  engineEscapeRoot,
  "contracts",
  "source",
  "content-source.json",
);
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const npmExecPath = process.env.npm_execpath;
const jsEntrypointPattern = /\.(c|m)?js$/i;

const engineExports = EngineRuntime as Record<string, unknown>;

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

function toProjectStatus(value: string | undefined): ProjectStatus | undefined {
  if (value === "draft" || value === "validated" || value === "published") {
    return value;
  }
  return undefined;
}

function toCustomSchemaStatus(
  value: string | undefined,
): CustomSchemaStatus | undefined {
  if (value === "draft" || value === "validated" || value === "exported") {
    return value;
  }
  return undefined;
}

function toPlatformDataStatus(
  value: string | undefined,
): PlatformDataStatus | undefined {
  if (value === "draft" || value === "validated" || value === "exported") {
    return value;
  }
  return undefined;
}

function toPackDocumentStatus(
  value: string | undefined,
): PackDocumentStatus | undefined {
  if (value === "imported" || value === "edited" || value === "exported") {
    return value;
  }
  return undefined;
}

function toCustomSchemaType(
  value: string | undefined,
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

function toPlatformNamespace(
  value: string | undefined,
): PlatformNamespace | undefined {
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
  value: string | undefined,
): DraftRevisionChangeKind | undefined {
  if (value === "import" || value === "edit" || value === "publish") {
    return value;
  }
  return undefined;
}

async function findOneByKey(
  payload: Payload,
  collection: AuthoringCollection,
  key: string,
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
  id: string | number,
): Promise<PayloadRecord> {
  return (await payloadApi(payload).findByID({
    collection,
    id: toNumericId(id),
    depth: 0,
    overrideAccess: true,
  })) as unknown as PayloadRecord;
}

function resolveCanonicalDocument(entry: ContentPackRegistryEntry): JsonDocument {
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
    updatedAt:
      typeof doc.updatedAt === "string" ? String(doc.updatedAt) : null,
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
    bundleKey:
      typeof doc.bundleKey === "string" ? String(doc.bundleKey) : null,
    schemaVersion:
      typeof doc.schemaVersion === "string" ? String(doc.schemaVersion) : null,
    status: String(doc.status ?? "imported"),
    updatedAt:
      typeof doc.updatedAt === "string" ? String(doc.updatedAt) : null,
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
    updatedAt:
      typeof doc.updatedAt === "string" ? String(doc.updatedAt) : null,
    document: assertJsonDocument(doc.document ?? {}),
  };
}

function normalizePlatformData(doc: PayloadRecord) {
  return {
    id: toStringId(doc.id),
    dataId: String(doc.dataId ?? ""),
    name: String(doc.name ?? ""),
    platformLayer: String(doc.platformLayer ?? AUTHORING_PLATFORM_LAYER),
    namespace: String(doc.namespace ?? "generic-extension"),
    targetId: typeof doc.targetId === "string" ? String(doc.targetId) : null,
    status: String(doc.status ?? "draft"),
    updatedAt:
      typeof doc.updatedAt === "string" ? String(doc.updatedAt) : null,
    document: assertJsonDocument(doc.document ?? {}),
  };
}

function normalizeDraftRevision(doc: PayloadRecord) {
  return {
    id: toStringId(doc.id),
    key: String(doc.key ?? ""),
    targetType: String(doc.targetType ?? "pack-document"),
    targetKey: String(doc.targetKey ?? ""),
    targetName: String(doc.targetName ?? ""),
    targetDocumentId: String(doc.targetDocumentId ?? ""),
    changeKind: String(doc.changeKind ?? "edit"),
    notes: typeof doc.notes === "string" ? String(doc.notes) : "",
    updatedAt:
      typeof doc.updatedAt === "string" ? String(doc.updatedAt) : null,
    createdAt:
      typeof doc.createdAt === "string" ? String(doc.createdAt) : null,
    document: assertJsonDocument(doc.document ?? {}),
  };
}

function normalizePublishJob(doc: PayloadRecord) {
  return {
    id: toStringId(doc.id),
    jobId: String(doc.jobId ?? ""),
    status: String(doc.status ?? "running"),
    exportRoot: typeof doc.exportRoot === "string" ? String(doc.exportRoot) : "",
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
    updatedAt:
      typeof doc.updatedAt === "string" ? String(doc.updatedAt) : null,
    createdAt:
      typeof doc.createdAt === "string" ? String(doc.createdAt) : null,
  };
}

function createRevisionKey(
  projectId: string,
  targetType: DraftRevisionTargetType,
  targetKey: string,
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
  value: JsonDocument,
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
  expectedFiles: ReadonlySet<string>,
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
  const command = npmExecPath && jsEntrypointPattern.test(npmExecPath)
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
  },
) {
  return (await payloadApi(payload).create({
    collection: CONTENT_DRAFT_REVISIONS_COLLECTION,
    data: {
      key: createRevisionKey(input.projectId, input.targetType, input.targetKey),
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
  summary: JsonDocument,
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
  },
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
      ...(typeof input.summary !== "undefined" ? { summary: input.summary } : {}),
    },
    overrideAccess: true,
  })) as unknown as PayloadRecord;
}

export function registryEntries(): ContentPackRegistryEntry[] {
  return CONTENT_PACK_REGISTRY.map((entry) => cloneJson(entry));
}

export async function createProject(
  payload: Payload,
  input: {
    name: string;
    slug?: string;
    description?: string;
    notes?: string;
  },
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
  }>,
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
  packIds?: string[],
): Promise<{ imported: number; packs: string[]; removed: string[] }> {
  const projectNumericId = toNumericId(projectId);
  const selected = new Set(
    packIds?.length ? packIds : CONTENT_PACK_REGISTRY.map((entry) => entry.packId),
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
      key,
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
      key,
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
  input: { document: unknown; status?: string },
) {
  const existing = await findOneByKey(
    payload,
    CONTENT_PACK_DOCUMENTS_COLLECTION,
    keyFor(projectId, packId),
  );
  if (!existing) {
    throw new Error(`Pack document ${packId} is not imported for this project.`);
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
  },
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
    key,
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
  }>,
) {
  const current = await findById(
    payload,
    CONTENT_CUSTOM_SCHEMAS_COLLECTION,
    customSchemaId,
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

export async function createPlatformData(
  payload: Payload,
  projectId: string,
  input: {
    dataId: string;
    name: string;
    namespace?: string;
    targetId?: string;
    document: unknown;
  },
) {
  const dataId = input.dataId.trim() || slugify(input.name);
  if (!dataId) {
    throw new Error("dataId is required.");
  }
  const name = input.name.trim();
  if (!name) {
    throw new Error("Platform data name is required.");
  }
  const key = keyFor(projectId, `platform:${dataId}`);
  const existing = await findOneByKey(
    payload,
    CONTENT_PLATFORM_DATA_COLLECTION,
    key,
  );
  const data = {
    key,
    project: toNumericId(projectId),
    dataId,
    name,
    platformLayer: AUTHORING_PLATFORM_LAYER,
    namespace: toPlatformNamespace(input.namespace) ?? "generic-extension",
    targetId: input.targetId?.trim() || undefined,
    document: assertJsonDocument(input.document),
    status: "draft" as PlatformDataStatus,
  };
  if (existing) {
    const updated = (await payloadApi(payload).update({
      collection: CONTENT_PLATFORM_DATA_COLLECTION,
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
      notes: "Updated docs-site/Payload platform data extension.",
      document: updated.document ?? input.document,
    });
    return updated;
  }
  const created = (await payloadApi(payload).create({
    collection: CONTENT_PLATFORM_DATA_COLLECTION,
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
    notes: "Created docs-site/Payload platform data extension.",
    document: created.document ?? input.document,
  });
  return created;
}

export async function updatePlatformData(
  payload: Payload,
  platformDataId: string,
  input: Partial<{
    name: string;
    namespace: string;
    targetId: string;
    status: string;
    document: unknown;
  }>,
) {
  const current = await findById(
    payload,
    CONTENT_PLATFORM_DATA_COLLECTION,
    platformDataId,
  );
  const updated = (await payloadApi(payload).update({
    collection: CONTENT_PLATFORM_DATA_COLLECTION,
    id: toNumericId(platformDataId),
    data: {
      ...(typeof input.name === "string" ? { name: input.name.trim() } : {}),
      platformLayer: AUTHORING_PLATFORM_LAYER,
      ...(toPlatformNamespace(input.namespace)
        ? { namespace: toPlatformNamespace(input.namespace) }
        : {}),
      ...(typeof input.targetId === "string"
        ? { targetId: input.targetId.trim() || null }
        : {}),
      ...(toPlatformDataStatus(input.status)
        ? { status: toPlatformDataStatus(input.status) }
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
    targetKey: String(updated.dataId ?? current.dataId ?? platformDataId),
    targetName: String(updated.name ?? current.name ?? platformDataId),
    targetDocumentId: toStringId(updated.id),
    changeKind: "edit",
    notes: "Edited docs-site/Payload platform data extension.",
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
  const platformData = (await payloadApi(payload).find({
    collection: CONTENT_PLATFORM_DATA_COLLECTION,
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

  return {
    project: normalizeProject(project),
    schemaImports: (schemaImports.docs ?? []).map(normalizeSchemaImport),
    packs: (packDocuments.docs ?? []).map(normalizePackDocument),
    customSchemas: (customSchemas.docs ?? []).map(normalizeCustomSchema),
    platformData: (platformData.docs ?? []).map(normalizePlatformData),
    revisions: (draftRevisions.docs ?? []).map(normalizeDraftRevision),
    publishJobs: (publishJobs.docs ?? []).map(normalizePublishJob),
  };
}

export async function exportProjectFiles(
  payload: Payload,
  projectId: string,
): Promise<{ rootDir: string; files: string[] }> {
  const detail = await projectDetail(payload, projectId);
  const rootDir = path.resolve(
    process.cwd(),
    detail.project.exportRoot,
    detail.project.slug,
  );
  const packDir = path.join(rootDir, "packs");
  const customSchemaDir = path.join(rootDir, "custom-schemas");
  const platformDataDir = path.join(rootDir, "platform-data");
  mkdirSync(packDir, { recursive: true });
  mkdirSync(customSchemaDir, { recursive: true });
  mkdirSync(platformDataDir, { recursive: true });

  removeStaleJsonFiles(
    packDir,
    new Set(detail.packs.map((pack) => `${pack.packId}.json`)),
  );
  removeStaleJsonFiles(
    customSchemaDir,
    new Set(detail.customSchemas.map((schema) => `${schema.schemaId}.json`)),
  );
  removeStaleJsonFiles(
    platformDataDir,
    new Set(detail.platformData.map((platform) => `${platform.dataId}.json`)),
  );

  const files: string[] = [];

  for (const pack of detail.packs) {
    const fullPath = path.join(packDir, `${pack.packId}.json`);
    writeFileSync(fullPath, `${JSON.stringify(pack.document, null, 2)}\n`, "utf8");
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
      "utf8",
    );
    files.push(fullPath);
    await payloadApi(payload).update({
      collection: CONTENT_CUSTOM_SCHEMAS_COLLECTION,
      id: toNumericId(schema.id),
      data: { status: "exported" as CustomSchemaStatus },
      overrideAccess: true,
    });
  }

  for (const platform of detail.platformData) {
    const fullPath = path.join(platformDataDir, `${platform.dataId}.json`);
    writeFileSync(
      fullPath,
      `${JSON.stringify(platform.document, null, 2)}\n`,
      "utf8",
    );
    files.push(fullPath);
    await payloadApi(payload).update({
      collection: CONTENT_PLATFORM_DATA_COLLECTION,
      id: toNumericId(platform.id),
      data: { status: "exported" as PlatformDataStatus },
      overrideAccess: true,
    });
  }

  const schemaImportsPath = path.join(rootDir, "schema-imports.json");
  writeFileSync(
    schemaImportsPath,
    `${JSON.stringify(detail.schemaImports, null, 2)}\n`,
    "utf8",
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
        platformDataCount: detail.platformData.length,
        files: files.map((file) => path.relative(rootDir, file)),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  files.push(manifestPath);

  return { rootDir, files };
}

export async function publishProjectToGame(
  payload: Payload,
  projectId: string,
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
      readFileSync(engineContentSourcePath, "utf8"),
    ) as Record<string, unknown>;
    let contentSourceDirty = false;

    const sortedPacks = [...detail.packs].sort((left, right) =>
      left.packId.localeCompare(right.packId),
    );

    for (const pack of sortedPacks) {
      const sourceFile = pack.sourceFile.trim();
      if (!sourceFile) {
        skippedPacks.push(pack.packId);
        continue;
      }

      if (pack.contentSourcePath) {
        setNestedValue(contentSourceDocument, pack.contentSourcePath, pack.document);
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
          contentSourceDocument = cloneJson(pack.document) as Record<string, unknown>;
          contentSourceDirty = true;
          await recordDraftRevision(payload, {
            projectId,
            targetType: "pack-document",
            targetKey: pack.packId,
            targetName: pack.title,
            targetDocumentId: pack.id,
            changeKind: "publish",
            notes: "Published merged content source through project publish loop.",
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
      writeJsonFile(engineContentSourcePath, contentSourceDocument as JsonDocument);
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
    commands.push("pnpm --dir docs-site exec node scripts/ensure-engine-dist.mjs");
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
