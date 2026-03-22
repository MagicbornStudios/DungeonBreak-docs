"use client";

import Form from "@rjsf/core";
import type { RJSFSchema } from "@rjsf/utils";
import validator from "@rjsf/validator-ajv8";
import { SearchIcon } from "lucide-react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AuthoringAssistantWidget } from "@/components/ai/authoring-assistant-widget";
import type {
  AuthoringApplyResult,
  AuthoringChatOperation,
} from "@/components/ai/authoring-chat-panel";
import {
  AssetSpacePlot,
  type AssetSpacePoint,
} from "@/components/reports/asset-explorer/asset-space-plot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { slugify } from "@/lib/utils";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type ProjectSummary = {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: string;
  exportRoot: string;
  sourceMode: string;
  notes: string;
  schemaImportCount: number;
  packCount: number;
};

export type CustomSchemaRecord = {
  id: string;
  schemaId: string;
  name: string;
  targetPackId: string | null;
  schemaType: string;
  status: string;
  updatedAt: string | null;
  document: JsonValue;
};

export type ProjectAssetRecord = {
  id: string;
  dataId: string;
  name: string;
  projectLayer: string;
  namespace: string;
  targetId: string | null;
  status: string;
  updatedAt: string | null;
  document: JsonValue;
};

export type PackDocumentRecord = {
  id: string;
  packId: string;
  title: string;
  kind: string;
  exportName: string;
  sourceFile: string;
  contentSourcePath: string | null;
  bundleKey: string | null;
  schemaVersion: string | null;
  status: string;
  updatedAt: string | null;
  document: JsonValue;
};

export type SupportedGameSchemaRecord = {
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

export type ProjectDetailResponse = {
  ok: boolean;
  project?: {
    id: string;
    name: string;
    slug: string;
    description: string;
    status: string;
    exportRoot: string;
    sourceMode: string;
    notes: string;
    updatedAt: string | null;
    createdAt: string | null;
  };
  packs?: PackDocumentRecord[];
  customSchemas?: CustomSchemaRecord[];
  projectData?: ProjectAssetRecord[];
  supportedGameSchemas?: SupportedGameSchemaRecord[];
  exportRoot?: string;
  files?: string[];
  publish?: {
    publishJobId?: string;
    exportRoot?: string;
    exportFiles?: string[];
    engineFiles?: string[];
    skippedPacks?: string[];
    commands?: string[];
  };
  error?: string;
};

type ProjectsResponse = {
  ok: boolean;
  projects?: ProjectSummary[];
  error?: string;
};

export type JsonObject = Record<string, JsonValue>;
export type SchemaBindingMeta = {
  packId: string;
  collectionKey: string;
  itemIdKey: string;
};

export type ExploredAsset = {
  id: string;
  dataId: string;
  name: string;
  namespace: string;
  status: string;
  updatedAt: string | null;
  document: JsonValue;
  source: "project-data" | "pack";
  packId: string | null;
};

const defaultSchemaDocument = `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["power", "rarity"],
  "properties": {
    "power": {
      "type": "number",
      "default": 8
    },
    "rarity": {
      "type": "number",
      "default": 1
    },
    "price": {
      "type": "number",
      "default": 25
    },
    "presentation": {
      "type": "object",
      "properties": {
        "label": {
          "type": "string"
        },
        "element": {
          "type": "string"
        }
      }
    }
  }
}
`;

const schemaTypeOptions = ["json-schema", "object-schema", "canonical-asset"];
const assetNamespaceOptions = [
  "generic-extension",
  "integration",
  "rendering",
  "workflow",
  "publishing",
  "admin-ui",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function asJsonObject(value: JsonValue | undefined): JsonObject {
  return isRecord(value) ? (value as JsonObject) : {};
}

function prettyJson(value: JsonValue): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function parseJsonValue(value: string): JsonValue {
  return JSON.parse(value) as JsonValue;
}

function formatTimestamp(value: string | null): string {
  if (!value) {
    return "n/a";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function statusTone(status: string): "default" | "secondary" | "outline" {
  if (
    status === "published" ||
    status === "validated" ||
    status === "exported"
  ) {
    return "default";
  }
  if (status === "draft" || status === "edited" || status === "imported") {
    return "secondary";
  }
  return "outline";
}

function toRjsfSchema(document: JsonValue): RJSFSchema | null {
  if (!isRecord(document)) {
    return null;
  }
  return document as RJSFSchema;
}

export function collectNumericPaths(value: JsonValue, prefix = ""): string[] {
  if (typeof value === "number" && prefix.length > 0) {
    return [prefix];
  }
  if (!isRecord(value)) {
    return [];
  }
  const paths: string[] = [];
  for (const [key, nestedValue] of Object.entries(value)) {
    const nextPrefix = prefix.length > 0 ? `${prefix}.${key}` : key;
    paths.push(...collectNumericPaths(nestedValue as JsonValue, nextPrefix));
  }
  return paths;
}

export function getNumberAtPath(value: JsonValue, path: string): number | null {
  if (!path) {
    return null;
  }
  let cursor: JsonValue | undefined = value;
  for (const segment of path.split(".")) {
    if (!isRecord(cursor)) {
      return null;
    }
    cursor = cursor[segment] as JsonValue | undefined;
  }
  return typeof cursor === "number" ? cursor : null;
}

export function schemaBindingMeta(
  schema: CustomSchemaRecord | null
): SchemaBindingMeta | null {
  const document = schema ? asJsonObject(schema.document) : null;
  if (!document) {
    return null;
  }
  const packId = document["x-dungeonbreak-packId"];
  const collectionKey = document["x-dungeonbreak-collectionKey"];
  const itemIdKey = document["x-dungeonbreak-itemIdKey"];
  if (
    typeof packId !== "string" ||
    typeof collectionKey !== "string" ||
    typeof itemIdKey !== "string"
  ) {
    return null;
  }
  return {
    packId,
    collectionKey,
    itemIdKey,
  };
}

export function assetNameFromDocument(
  document: JsonValue,
  dataId: string
): string {
  if (!isRecord(document)) {
    return dataId;
  }
  if (typeof document.name === "string" && document.name.length > 0) {
    return document.name;
  }
  if (typeof document.label === "string" && document.label.length > 0) {
    return document.label;
  }
  if (typeof document.title === "string" && document.title.length > 0) {
    return document.title;
  }
  return dataId;
}

export function exploredAssetsFromPack(
  pack: PackDocumentRecord | null,
  meta: SchemaBindingMeta | null,
  search: string
): ExploredAsset[] {
  if (!pack || !meta) {
    return [];
  }
  const packDocument = asJsonObject(pack.document);
  const rawCollection = packDocument[meta.collectionKey];
  if (!Array.isArray(rawCollection)) {
    return [];
  }
  return rawCollection
    .map((entry, index) => {
      const document = isRecord(entry) ? (entry as JsonObject) : {};
      const rawId = document[meta.itemIdKey];
      const dataId =
        typeof rawId === "string" && rawId.length > 0
          ? rawId
          : `${pack.packId}-${index + 1}`;
      return {
        id: dataId,
        dataId,
        name: assetNameFromDocument(document, dataId),
        namespace: `canonical:${pack.packId}`,
        status: pack.status,
        updatedAt: pack.updatedAt,
        document: entry as JsonValue,
        source: "pack" as const,
        packId: pack.packId,
      };
    })
    .filter((asset) => {
      if (!search) {
        return true;
      }
      const haystack = [
        asset.name,
        asset.dataId,
        asset.namespace,
        JSON.stringify(asset.document),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    });
}

export function withUpsertedPackAsset(
  packDocument: JsonValue,
  meta: SchemaBindingMeta,
  assetId: string,
  assetDocument: JsonValue
): JsonValue {
  const nextDocument = cloneJsonObject(asJsonObject(packDocument));
  const rawCollection = nextDocument[meta.collectionKey];
  const nextCollection = Array.isArray(rawCollection) ? [...rawCollection] : [];
  const nextAsset = cloneJsonObject(asJsonObject(assetDocument));
  nextAsset[meta.itemIdKey] = assetId;
  const existingIndex = nextCollection.findIndex((entry) => {
    if (!isRecord(entry)) {
      return false;
    }
    return entry[meta.itemIdKey] === assetId;
  });
  if (existingIndex >= 0) {
    nextCollection[existingIndex] = nextAsset;
  } else {
    nextCollection.push(nextAsset);
  }
  nextDocument[meta.collectionKey] = nextCollection;
  return nextDocument;
}

function cloneJsonObject(value: JsonObject): JsonObject {
  return JSON.parse(JSON.stringify(value)) as JsonObject;
}

function schemaRecordBySchemaId(
  detail: Pick<ProjectDetailResponse, "customSchemas"> | null,
  schemaId: string
): CustomSchemaRecord | null {
  return (
    (detail?.customSchemas ?? []).find(
      (schema) => schema.schemaId === schemaId
    ) ?? null
  );
}

function packRecordForSchema(
  detail: Pick<ProjectDetailResponse, "packs"> | null,
  schema: CustomSchemaRecord | null
): PackDocumentRecord | null {
  const meta = schemaBindingMeta(schema);
  if (!meta) {
    return null;
  }
  return (
    (detail?.packs ?? []).find((pack) => pack.packId === meta.packId) ?? null
  );
}

function exploredAssetsForSchema(
  detail: Pick<ProjectDetailResponse, "packs" | "projectData"> | null,
  schema: CustomSchemaRecord | null
): ExploredAsset[] {
  if (!schema) {
    return [];
  }
  const meta = schemaBindingMeta(schema);
  if (meta) {
    const pack = packRecordForSchema(detail, schema);
    return exploredAssetsFromPack(pack, meta, "");
  }
  return (detail?.projectData ?? [])
    .filter((asset) => asset.targetId === schema.schemaId)
    .map((asset) => ({
      ...asset,
      source: "project-data" as const,
      packId: null,
    }));
}

function exploredAssetByDataId(
  detail: Pick<ProjectDetailResponse, "packs" | "projectData"> | null,
  schema: CustomSchemaRecord | null,
  dataId: string
): ExploredAsset | null {
  return (
    exploredAssetsForSchema(detail, schema).find(
      (asset) => asset.dataId === dataId
    ) ?? null
  );
}

function setCanonicalAssetName(
  document: JsonValue,
  nextName: string
): JsonValue {
  const nextDocument = cloneJsonObject(asJsonObject(document));
  if (
    typeof nextDocument.name === "string" ||
    (!("label" in nextDocument) && !("title" in nextDocument))
  ) {
    nextDocument.name = nextName;
    return nextDocument;
  }
  if (typeof nextDocument.label === "string") {
    nextDocument.label = nextName;
    return nextDocument;
  }
  if (typeof nextDocument.title === "string") {
    nextDocument.title = nextName;
    return nextDocument;
  }
  nextDocument.name = nextName;
  return nextDocument;
}

export function AssetExplorer() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectDetail, setProjectDetail] =
    useState<ProjectDetailResponse | null>(null);
  const [selectedSchemaDocId, setSelectedSchemaDocId] = useState("");
  const [selectedAssetDocId, setSelectedAssetDocId] = useState("");
  const [assetSearch, setAssetSearch] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [schemaForm, setSchemaForm] = useState({
    schemaId: "",
    name: "",
    schemaType: "json-schema",
    documentText: defaultSchemaDocument,
  });
  const [schemaEditorText, setSchemaEditorText] = useState(
    defaultSchemaDocument
  );
  const [assetDraft, setAssetDraft] = useState({
    dataId: "",
    name: "",
    namespace: "generic-extension",
  });
  const [formData, setFormData] = useState<JsonValue>({});
  const [axisX, setAxisX] = useState("");
  const [axisY, setAxisY] = useState("");
  const [axisZ, setAxisZ] = useState("");

  const deferredAssetSearch = useDeferredValue(assetSearch);

  async function loadProjects(nextProjectId?: string) {
    const response = await fetch("/api/content-editor/projects", {
      cache: "no-store",
    });
    const body = (await response.json()) as ProjectsResponse;
    if (!body.ok) {
      throw new Error(body.error ?? "Failed to load projects.");
    }
    const nextProjects = body.projects ?? [];
    setProjects(nextProjects);
    const resolvedProjectId =
      nextProjectId ||
      (nextProjects.some((project) => project.id === selectedProjectId)
        ? selectedProjectId
        : nextProjects[0]?.id || "");
    setSelectedProjectId(resolvedProjectId);
    return resolvedProjectId;
  }

  async function loadProjectDetail(projectId: string) {
    if (!projectId) {
      setProjectDetail(null);
      return;
    }
    const response = await fetch(`/api/content-editor/projects/${projectId}`, {
      cache: "no-store",
    });
    const body = (await response.json()) as ProjectDetailResponse;
    if (!body.ok) {
      throw new Error(body.error ?? "Failed to load project detail.");
    }
    setProjectDetail(body);
  }

  useEffect(() => {
    void Promise.all([loadProjects()])
      .then(([projectId]) => {
        if (projectId) {
          return loadProjectDetail(projectId);
        }
        return undefined;
      })
      .catch((nextError) => {
        setError(String(nextError));
      });
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      return;
    }
    void loadProjectDetail(selectedProjectId).catch((nextError) => {
      setError(String(nextError));
    });
  }, [selectedProjectId]);

  const selectedSchema = useMemo(() => {
    const schemas = projectDetail?.customSchemas ?? [];
    return (
      schemas.find((schema) => schema.id === selectedSchemaDocId) ??
      schemas[0] ??
      null
    );
  }, [projectDetail?.customSchemas, selectedSchemaDocId]);
  const selectedSchemaMeta = useMemo(
    () => schemaBindingMeta(selectedSchema),
    [selectedSchema]
  );
  const selectedPack = useMemo(() => {
    if (!selectedSchemaMeta) {
      return null;
    }
    return (
      (projectDetail?.packs ?? []).find(
        (pack) => pack.packId === selectedSchemaMeta.packId
      ) ?? null
    );
  }, [projectDetail?.packs, selectedSchemaMeta]);

  useEffect(() => {
    if (selectedSchema) {
      setSelectedSchemaDocId(selectedSchema.id);
      setSchemaEditorText(prettyJson(selectedSchema.document));
      const nextSchemaMeta = schemaBindingMeta(selectedSchema);
      setAssetDraft((current) => ({
        ...current,
        dataId: current.dataId || `${selectedSchema.schemaId}-asset`,
        namespace: nextSchemaMeta
          ? `canonical:${nextSchemaMeta.packId}`
          : current.namespace,
      }));
      return;
    }
    setSelectedSchemaDocId("");
    setSchemaEditorText(defaultSchemaDocument);
  }, [selectedSchema?.id]);

  const schemaBoundAssets = useMemo(() => {
    if (!selectedSchema) {
      return [];
    }
    const search = deferredAssetSearch.trim().toLowerCase();
    if (selectedSchemaMeta && selectedPack) {
      return exploredAssetsFromPack(selectedPack, selectedSchemaMeta, search);
    }
    return (projectDetail?.projectData ?? [])
      .filter((asset) => asset.targetId === selectedSchema.schemaId)
      .filter((asset) => {
        if (!search) {
          return true;
        }
        const haystack = [
          asset.name,
          asset.dataId,
          asset.namespace,
          JSON.stringify(asset.document),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(search);
      })
      .map((asset) => ({
        ...asset,
        source: "project-data" as const,
        packId: null,
      }));
  }, [
    deferredAssetSearch,
    projectDetail?.projectData,
    selectedPack,
    selectedSchema,
    selectedSchemaMeta,
  ]);

  const selectedAsset = useMemo(() => {
    return (
      schemaBoundAssets.find((asset) => asset.id === selectedAssetDocId) ??
      schemaBoundAssets[0] ??
      null
    );
  }, [schemaBoundAssets, selectedAssetDocId]);

  useEffect(() => {
    if (selectedAsset) {
      setSelectedAssetDocId(selectedAsset.id);
      setAssetDraft({
        dataId: selectedAsset.dataId,
        name: selectedAsset.name,
        namespace: selectedAsset.namespace,
      });
      setFormData(selectedAsset.document);
      return;
    }
    setSelectedAssetDocId("");
    setFormData({});
  }, [selectedAsset?.id]);

  const numericPaths = useMemo(() => {
    const paths = new Set<string>();
    for (const asset of schemaBoundAssets) {
      for (const path of collectNumericPaths(asset.document)) {
        paths.add(path);
      }
    }
    return [...paths].sort();
  }, [schemaBoundAssets]);

  useEffect(() => {
    if (numericPaths.length === 0) {
      setAxisX("");
      setAxisY("");
      setAxisZ("");
      return;
    }
    setAxisX((current) =>
      numericPaths.includes(current) ? current : (numericPaths[0] ?? "")
    );
    setAxisY((current) => {
      if (numericPaths.includes(current)) {
        return current;
      }
      return numericPaths[1] ?? numericPaths[0] ?? "";
    });
    setAxisZ((current) => {
      if (numericPaths.includes(current)) {
        return current;
      }
      return numericPaths[2] ?? numericPaths[1] ?? numericPaths[0] ?? "";
    });
  }, [numericPaths]);

  const plotPoints = useMemo(() => {
    if (!axisX || !axisY || !axisZ) {
      return [];
    }
    return schemaBoundAssets
      .map((asset) => {
        const x = getNumberAtPath(asset.document, axisX);
        const y = getNumberAtPath(asset.document, axisY);
        const z = getNumberAtPath(asset.document, axisZ);
        if (x === null || y === null || z === null) {
          return null;
        }
        return {
          assetId: asset.id,
          label: asset.name || asset.dataId,
          x,
          y,
          z,
          colorLabel: asset.namespace,
        } satisfies AssetSpacePoint;
      })
      .filter((point): point is AssetSpacePoint => Boolean(point));
  }, [axisX, axisY, axisZ, schemaBoundAssets]);

  const selectedSchemaForm = selectedSchema
    ? toRjsfSchema(selectedSchema.document)
    : null;

  async function handleImportCanonicalGameData() {
    if (!selectedProjectId) {
      return;
    }
    try {
      setBusyAction("import-game-data");
      setError("");
      setNotice("");
      const packIds = (projectDetail?.supportedGameSchemas ?? []).map(
        (schema) => schema.packId
      );
      const response = await fetch(
        `/api/content-editor/projects/${selectedProjectId}/import-canonical`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ packIds }),
        }
      );
      const body = (await response.json()) as ProjectDetailResponse & {
        imported?: number;
      };
      if (!body.ok) {
        throw new Error(body.error ?? "Failed to import canonical game data.");
      }
      setProjectDetail(body);
      setNotice(
        `Imported canonical game data for ${body.imported ?? packIds.length} packs.`
      );
    } catch (nextError) {
      setError(String(nextError));
    } finally {
      setBusyAction("");
    }
  }

  async function handleSeedGameForms() {
    if (!selectedProjectId) {
      return;
    }
    try {
      setBusyAction("seed-game-forms");
      setError("");
      setNotice("");
      const response = await fetch(
        `/api/content-editor/projects/${selectedProjectId}/game-schemas`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      const body = (await response.json()) as ProjectDetailResponse & {
        seededPackIds?: string[];
      };
      if (!body.ok) {
        throw new Error(body.error ?? "Failed to seed game forms.");
      }
      setProjectDetail(body);
      setNotice(
        `Seeded ${body.seededPackIds?.length ?? 0} Escape the Dungeon forms.`
      );
    } catch (nextError) {
      setError(String(nextError));
    } finally {
      setBusyAction("");
    }
  }

  async function handleExportProject() {
    if (!selectedProjectId) {
      return;
    }
    try {
      setBusyAction("export-project");
      setError("");
      setNotice("");
      const response = await fetch(
        `/api/content-editor/projects/${selectedProjectId}/export`,
        {
          method: "POST",
        }
      );
      const body = (await response.json()) as ProjectDetailResponse;
      if (!body.ok) {
        throw new Error(body.error ?? "Failed to export project files.");
      }
      setProjectDetail(body);
      await loadProjects(selectedProjectId);
      setNotice(
        `Exported ${body.files?.length ?? 0} files to ${body.exportRoot ?? "content-projects"}.`
      );
    } catch (nextError) {
      setError(String(nextError));
    } finally {
      setBusyAction("");
    }
  }

  async function handlePublishProject() {
    if (!selectedProjectId) {
      return;
    }
    try {
      setBusyAction("publish-project");
      setError("");
      setNotice("");
      const response = await fetch(
        `/api/content-editor/projects/${selectedProjectId}/publish`,
        {
          method: "POST",
        }
      );
      const body = (await response.json()) as ProjectDetailResponse;
      if (!body.ok) {
        throw new Error(body.error ?? "Failed to publish project.");
      }
      setProjectDetail(body);
      await loadProjects(selectedProjectId);
      setNotice(
        `Published ${body.publish?.engineFiles?.length ?? 0} engine files and skipped ${body.publish?.skippedPacks?.length ?? 0} packs.`
      );
    } catch (nextError) {
      setError(String(nextError));
    } finally {
      setBusyAction("");
    }
  }

  async function handleCreateSchema() {
    if (!selectedProjectId) {
      return;
    }
    try {
      setBusyAction("create-schema");
      setError("");
      setNotice("");
      const payload = {
        schemaId: schemaForm.schemaId.trim() || slugify(schemaForm.name),
        name: schemaForm.name.trim(),
        schemaType: schemaForm.schemaType,
        document: parseJsonValue(schemaForm.documentText),
      };
      const response = await fetch(
        `/api/content-editor/projects/${selectedProjectId}/custom-schemas`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const body = (await response.json()) as ProjectDetailResponse;
      if (!body.ok) {
        throw new Error(body.error ?? "Failed to create asset form.");
      }
      setProjectDetail(body);
      const createdSchema = (body.customSchemas ?? []).find(
        (schema) => schema.schemaId === payload.schemaId
      );
      if (createdSchema) {
        setSelectedSchemaDocId(createdSchema.id);
      }
      setSchemaForm({
        schemaId: "",
        name: "",
        schemaType: "json-schema",
        documentText: defaultSchemaDocument,
      });
      setNotice(`Created asset form ${payload.schemaId}.`);
    } catch (nextError) {
      setError(String(nextError));
    } finally {
      setBusyAction("");
    }
  }

  async function handleSaveSchema() {
    if (!selectedProjectId || !selectedSchema) {
      return;
    }
    try {
      setBusyAction("save-schema");
      setError("");
      setNotice("");
      const response = await fetch(
        `/api/content-editor/projects/${selectedProjectId}/custom-schemas/${selectedSchema.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: selectedSchema.name,
            schemaType: selectedSchema.schemaType,
            document: parseJsonValue(schemaEditorText),
          }),
        }
      );
      const body = (await response.json()) as ProjectDetailResponse;
      if (!body.ok) {
        throw new Error(body.error ?? "Failed to save asset form.");
      }
      setProjectDetail(body);
      setNotice(`Saved form ${selectedSchema.schemaId}.`);
    } catch (nextError) {
      setError(String(nextError));
    } finally {
      setBusyAction("");
    }
  }

  async function handleCreateAsset() {
    if (!selectedProjectId || !selectedSchema) {
      return;
    }
    try {
      setBusyAction("create-asset");
      setError("");
      setNotice("");
      if (selectedSchemaMeta && selectedPack) {
        const assetId = assetDraft.dataId.trim() || slugify(assetDraft.name);
        const nextDocument = withUpsertedPackAsset(
          selectedPack.document,
          selectedSchemaMeta,
          assetId,
          formData
        );
        const response = await fetch(
          `/api/content-editor/projects/${selectedProjectId}/packs/${selectedPack.packId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: "edited",
              document: nextDocument,
            }),
          }
        );
        const body = (await response.json()) as ProjectDetailResponse;
        if (!body.ok) {
          throw new Error(body.error ?? "Failed to create canonical asset.");
        }
        setProjectDetail(body);
        setSelectedAssetDocId(assetId);
        setNotice(
          `Saved ${assetId} into canonical pack ${selectedPack.packId}.`
        );
        return;
      }
      const dataId = assetDraft.dataId.trim() || slugify(assetDraft.name);
      const response = await fetch(
        `/api/content-editor/projects/${selectedProjectId}/project-data`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dataId,
            name: assetDraft.name.trim() || dataId,
            namespace: assetDraft.namespace,
            targetId: selectedSchema.schemaId,
            document: formData,
          }),
        }
      );
      const body = (await response.json()) as ProjectDetailResponse;
      if (!body.ok) {
        throw new Error(body.error ?? "Failed to create asset.");
      }
      setProjectDetail(body);
      const createdAsset = (body.projectData ?? []).find(
        (asset) =>
          asset.dataId === dataId && asset.targetId === selectedSchema.schemaId
      );
      if (createdAsset) {
        setSelectedAssetDocId(createdAsset.id);
      }
      setNotice(`Created asset ${dataId}.`);
    } catch (nextError) {
      setError(String(nextError));
    } finally {
      setBusyAction("");
    }
  }

  async function handleSaveAsset() {
    if (!selectedProjectId || !selectedAsset) {
      return;
    }
    try {
      setBusyAction("save-asset");
      setError("");
      setNotice("");
      if (selectedSchemaMeta && selectedPack) {
        const assetId = assetDraft.dataId.trim() || selectedAsset.dataId;
        const nextDocument = withUpsertedPackAsset(
          selectedPack.document,
          selectedSchemaMeta,
          assetId,
          formData
        );
        const response = await fetch(
          `/api/content-editor/projects/${selectedProjectId}/packs/${selectedPack.packId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: "edited",
              document: nextDocument,
            }),
          }
        );
        const body = (await response.json()) as ProjectDetailResponse;
        if (!body.ok) {
          throw new Error(body.error ?? "Failed to save canonical asset.");
        }
        setProjectDetail(body);
        setSelectedAssetDocId(assetId);
        setNotice(
          `Updated ${assetId} inside canonical pack ${selectedPack.packId}.`
        );
        return;
      }
      const response = await fetch(
        `/api/content-editor/projects/${selectedProjectId}/project-data/${selectedAsset.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: assetDraft.name.trim() || selectedAsset.name,
            namespace: assetDraft.namespace,
            document: formData,
          }),
        }
      );
      const body = (await response.json()) as ProjectDetailResponse;
      if (!body.ok) {
        throw new Error(body.error ?? "Failed to save asset.");
      }
      setProjectDetail(body);
      setNotice(`Saved asset ${assetDraft.dataId || selectedAsset.dataId}.`);
    } catch (nextError) {
      setError(String(nextError));
    } finally {
      setBusyAction("");
    }
  }

  const assetAuthoringChatContext = useMemo(
    () => ({
      projectId: selectedProjectId || "none",
      projectName: projectDetail?.project?.name ?? "none",
      projectStatus: projectDetail?.project?.status ?? "draft",
      exportRoot: projectDetail?.project?.exportRoot ?? "content-projects",
      schemaCount: projectDetail?.customSchemas?.length ?? 0,
      visibleAssetCount: schemaBoundAssets.length,
      selectedSchema: selectedSchema
        ? {
            schemaId: selectedSchema.schemaId,
            name: selectedSchema.name,
            schemaType: selectedSchema.schemaType,
            canonicalPackId: selectedSchemaMeta?.packId ?? null,
            status: selectedSchema.status,
          }
        : null,
      selectedAsset: selectedAsset
        ? {
            dataId: selectedAsset.dataId,
            name: selectedAsset.name,
            namespace: selectedAsset.namespace,
            source: selectedAsset.source,
            packId: selectedAsset.packId,
            status: selectedAsset.status,
          }
        : null,
      supportedGameSchemas: (projectDetail?.supportedGameSchemas ?? []).map(
        (schema) => ({
          packId: schema.packId,
          schemaId: schema.schemaId,
          title: schema.title,
          imported: schema.imported,
          seeded: schema.seeded,
        })
      ),
      visibleSchemas: (projectDetail?.customSchemas ?? [])
        .slice(0, 24)
        .map((schema) => ({
          schemaId: schema.schemaId,
          name: schema.name,
          schemaType: schema.schemaType,
          targetPackId: schema.targetPackId,
        })),
      visibleAssets: schemaBoundAssets.slice(0, 30).map((asset) => ({
        dataId: asset.dataId,
        name: asset.name,
        namespace: asset.namespace,
        source: asset.source,
      })),
      plotAxes: { x: axisX, y: axisY, z: axisZ },
    }),
    [
      axisX,
      axisY,
      axisZ,
      projectDetail?.customSchemas,
      projectDetail?.project,
      projectDetail?.supportedGameSchemas,
      schemaBoundAssets,
      selectedAsset,
      selectedProjectId,
      selectedSchema,
      selectedSchemaMeta?.packId,
    ]
  );

  const applyAuthoringOperations = useCallback(
    async (
      operations: AuthoringChatOperation[]
    ): Promise<AuthoringApplyResult> => {
      if (!selectedProjectId) {
        return {
          ok: false,
          summary: "Select a project before applying chat operations.",
        };
      }
      if (!projectDetail) {
        return { ok: false, summary: "Project detail is not loaded yet." };
      }
      if (!Array.isArray(operations) || operations.length === 0) {
        return { ok: false, summary: "No operations were proposed." };
      }

      let nextDetail: ProjectDetailResponse = projectDetail;
      const applied: string[] = [];
      const errors: string[] = [];
      let activeSchemaId = selectedSchema?.schemaId ?? "";

      const updateDetail = (body: ProjectDetailResponse) => {
        nextDetail = body;
        setProjectDetail(body);
      };

      const runDetailMutation = async (
        path: string,
        init: RequestInit
      ): Promise<ProjectDetailResponse> => {
        const response = await fetch(path, init);
        const body = (await response.json()) as ProjectDetailResponse;
        if (!response.ok || !body.ok) {
          throw new Error(body.error ?? `Request failed (${response.status})`);
        }
        updateDetail(body);
        return body;
      };

      for (const operation of operations) {
        try {
          switch (operation.op) {
            case "select_schema": {
              const schema = schemaRecordBySchemaId(
                nextDetail,
                operation.schemaId
              );
              if (!schema) {
                throw new Error(
                  `Schema '${operation.schemaId}' was not found.`
                );
              }
              activeSchemaId = schema.schemaId;
              setSelectedSchemaDocId(schema.id);
              setSchemaEditorText(prettyJson(schema.document));
              applied.push(`select-schema:${operation.schemaId}`);
              break;
            }
            case "create_schema": {
              const payload = {
                schemaId: operation.schemaId.trim(),
                name: operation.name.trim(),
                schemaType: operation.schemaType?.trim() || "json-schema",
                document: asJsonObject((operation.document ?? {}) as JsonValue),
              };
              const body = await runDetailMutation(
                `/api/content-editor/projects/${selectedProjectId}/custom-schemas`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                }
              );
              const createdSchema = schemaRecordBySchemaId(
                body,
                payload.schemaId
              );
              if (createdSchema) {
                activeSchemaId = createdSchema.schemaId;
                setSelectedSchemaDocId(createdSchema.id);
                setSchemaEditorText(prettyJson(createdSchema.document));
              }
              applied.push(`create-schema:${payload.schemaId}`);
              break;
            }
            case "update_schema_document": {
              const schema = schemaRecordBySchemaId(
                nextDetail,
                operation.schemaId
              );
              if (!schema) {
                throw new Error(
                  `Schema '${operation.schemaId}' was not found.`
                );
              }
              activeSchemaId = schema.schemaId;
              const body = await runDetailMutation(
                `/api/content-editor/projects/${selectedProjectId}/custom-schemas/${schema.id}`,
                {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: operation.name?.trim() || schema.name,
                    schemaType:
                      operation.schemaType?.trim() || schema.schemaType,
                    document: asJsonObject(operation.document as JsonValue),
                  }),
                }
              );
              const updatedSchema = schemaRecordBySchemaId(
                body,
                schema.schemaId
              );
              if (updatedSchema) {
                setSelectedSchemaDocId(updatedSchema.id);
                setSchemaEditorText(prettyJson(updatedSchema.document));
              }
              applied.push(`update-schema:${operation.schemaId}`);
              break;
            }
            case "seed_game_forms": {
              await runDetailMutation(
                `/api/content-editor/projects/${selectedProjectId}/game-schemas`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    ...(operation.packIds
                      ? { packIds: operation.packIds }
                      : {}),
                  }),
                }
              );
              applied.push("seed-game-forms");
              break;
            }
            case "import_canonical_game_data": {
              await runDetailMutation(
                `/api/content-editor/projects/${selectedProjectId}/import-canonical`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    packIds:
                      operation.packIds ??
                      (nextDetail.supportedGameSchemas ?? []).map(
                        (schema) => schema.packId
                      ),
                  }),
                }
              );
              applied.push("import-canonical-game-data");
              break;
            }
            case "select_asset": {
              const schema =
                (operation.schemaId
                  ? schemaRecordBySchemaId(nextDetail, operation.schemaId)
                  : schemaRecordBySchemaId(nextDetail, activeSchemaId)) ?? null;
              if (!schema) {
                throw new Error("Select a schema before selecting an asset.");
              }
              const asset = exploredAssetByDataId(
                nextDetail,
                schema,
                operation.dataId
              );
              if (!asset) {
                throw new Error(`Asset '${operation.dataId}' was not found.`);
              }
              activeSchemaId = schema.schemaId;
              setSelectedSchemaDocId(schema.id);
              setSelectedAssetDocId(asset.id);
              setAssetDraft({
                dataId: asset.dataId,
                name: asset.name,
                namespace: asset.namespace,
              });
              setFormData(asset.document);
              applied.push(`select-asset:${operation.dataId}`);
              break;
            }
            case "create_asset": {
              const schema =
                (operation.schemaId
                  ? schemaRecordBySchemaId(nextDetail, operation.schemaId)
                  : schemaRecordBySchemaId(nextDetail, activeSchemaId)) ?? null;
              if (!schema) {
                throw new Error(
                  "Create or select a schema before creating an asset."
                );
              }
              activeSchemaId = schema.schemaId;
              const schemaMeta = schemaBindingMeta(schema);
              const assetId = operation.dataId.trim();
              const assetName = operation.name?.trim() || assetId;
              const assetDocument = asJsonObject(
                (operation.document ?? {}) as JsonValue
              );
              if (schemaMeta) {
                const pack = packRecordForSchema(nextDetail, schema);
                if (!pack) {
                  throw new Error(
                    `Canonical pack '${schemaMeta.packId}' is not imported yet.`
                  );
                }
                const nextDocument = withUpsertedPackAsset(
                  pack.document,
                  schemaMeta,
                  assetId,
                  assetDocument
                );
                const body = await runDetailMutation(
                  `/api/content-editor/projects/${selectedProjectId}/packs/${pack.packId}`,
                  {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      status: "edited",
                      document: nextDocument,
                    }),
                  }
                );
                const savedAsset = exploredAssetByDataId(body, schema, assetId);
                if (savedAsset) {
                  setSelectedSchemaDocId(schema.id);
                  setSelectedAssetDocId(savedAsset.id);
                  setAssetDraft({
                    dataId: savedAsset.dataId,
                    name: savedAsset.name,
                    namespace: savedAsset.namespace,
                  });
                  setFormData(savedAsset.document);
                }
              } else {
                const body = await runDetailMutation(
                  `/api/content-editor/projects/${selectedProjectId}/project-data`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      dataId: assetId,
                      name: assetName,
                      namespace:
                        operation.namespace?.trim() || assetDraft.namespace,
                      targetId: schema.schemaId,
                      document: assetDocument,
                    }),
                  }
                );
                const savedAsset = exploredAssetByDataId(body, schema, assetId);
                if (savedAsset) {
                  setSelectedSchemaDocId(schema.id);
                  setSelectedAssetDocId(savedAsset.id);
                  setAssetDraft({
                    dataId: savedAsset.dataId,
                    name: savedAsset.name,
                    namespace: savedAsset.namespace,
                  });
                  setFormData(savedAsset.document);
                }
              }
              applied.push(`create-asset:${assetId}`);
              break;
            }
            case "update_asset_document": {
              const schema =
                (operation.schemaId
                  ? schemaRecordBySchemaId(nextDetail, operation.schemaId)
                  : schemaRecordBySchemaId(nextDetail, activeSchemaId)) ?? null;
              if (!schema) {
                throw new Error("Select a schema before updating an asset.");
              }
              activeSchemaId = schema.schemaId;
              const schemaMeta = schemaBindingMeta(schema);
              if (schemaMeta) {
                const pack = packRecordForSchema(nextDetail, schema);
                const currentAsset = exploredAssetByDataId(
                  nextDetail,
                  schema,
                  operation.dataId
                );
                if (!pack || !currentAsset) {
                  throw new Error(
                    `Canonical asset '${operation.dataId}' was not found.`
                  );
                }
                const nextDocument = withUpsertedPackAsset(
                  pack.document,
                  schemaMeta,
                  operation.dataId,
                  operation.document as JsonValue
                );
                const body = await runDetailMutation(
                  `/api/content-editor/projects/${selectedProjectId}/packs/${pack.packId}`,
                  {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      status: "edited",
                      document: nextDocument,
                    }),
                  }
                );
                const savedAsset = exploredAssetByDataId(
                  body,
                  schema,
                  operation.dataId
                );
                if (savedAsset) {
                  setSelectedSchemaDocId(schema.id);
                  setSelectedAssetDocId(savedAsset.id);
                  setAssetDraft({
                    dataId: savedAsset.dataId,
                    name: savedAsset.name,
                    namespace: savedAsset.namespace,
                  });
                  setFormData(savedAsset.document);
                }
              } else {
                const asset =
                  exploredAssetByDataId(nextDetail, schema, operation.dataId) ??
                  null;
                if (!asset || asset.source !== "project-data") {
                  throw new Error(`Asset '${operation.dataId}' was not found.`);
                }
                const body = await runDetailMutation(
                  `/api/content-editor/projects/${selectedProjectId}/project-data/${asset.id}`,
                  {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      name: asset.name,
                      namespace: asset.namespace,
                      document: asJsonObject(operation.document as JsonValue),
                    }),
                  }
                );
                const savedAsset = exploredAssetByDataId(
                  body,
                  schema,
                  operation.dataId
                );
                if (savedAsset) {
                  setSelectedSchemaDocId(schema.id);
                  setSelectedAssetDocId(savedAsset.id);
                  setAssetDraft({
                    dataId: savedAsset.dataId,
                    name: savedAsset.name,
                    namespace: savedAsset.namespace,
                  });
                  setFormData(savedAsset.document);
                }
              }
              applied.push(`update-asset-document:${operation.dataId}`);
              break;
            }
            case "update_asset_metadata": {
              const schema =
                (operation.schemaId
                  ? schemaRecordBySchemaId(nextDetail, operation.schemaId)
                  : schemaRecordBySchemaId(nextDetail, activeSchemaId)) ?? null;
              if (!schema) {
                throw new Error(
                  "Select a schema before updating asset metadata."
                );
              }
              activeSchemaId = schema.schemaId;
              const schemaMeta = schemaBindingMeta(schema);
              if (schemaMeta) {
                const pack = packRecordForSchema(nextDetail, schema);
                const currentAsset = exploredAssetByDataId(
                  nextDetail,
                  schema,
                  operation.dataId
                );
                if (!pack || !currentAsset) {
                  throw new Error(
                    `Canonical asset '${operation.dataId}' was not found.`
                  );
                }
                const nextAssetDocument = operation.name?.trim()
                  ? setCanonicalAssetName(
                      currentAsset.document,
                      operation.name.trim()
                    )
                  : currentAsset.document;
                const nextDocument = withUpsertedPackAsset(
                  pack.document,
                  schemaMeta,
                  operation.dataId,
                  nextAssetDocument
                );
                const body = await runDetailMutation(
                  `/api/content-editor/projects/${selectedProjectId}/packs/${pack.packId}`,
                  {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      status: "edited",
                      document: nextDocument,
                    }),
                  }
                );
                const savedAsset = exploredAssetByDataId(
                  body,
                  schema,
                  operation.dataId
                );
                if (savedAsset) {
                  setSelectedAssetDocId(savedAsset.id);
                  setAssetDraft({
                    dataId: savedAsset.dataId,
                    name: savedAsset.name,
                    namespace: savedAsset.namespace,
                  });
                  setFormData(savedAsset.document);
                }
              } else {
                const asset =
                  exploredAssetByDataId(nextDetail, schema, operation.dataId) ??
                  null;
                if (!asset || asset.source !== "project-data") {
                  throw new Error(`Asset '${operation.dataId}' was not found.`);
                }
                const body = await runDetailMutation(
                  `/api/content-editor/projects/${selectedProjectId}/project-data/${asset.id}`,
                  {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      name: operation.name?.trim() || asset.name,
                      namespace: operation.namespace?.trim() || asset.namespace,
                      document: asset.document,
                    }),
                  }
                );
                const savedAsset = exploredAssetByDataId(
                  body,
                  schema,
                  operation.dataId
                );
                if (savedAsset) {
                  setSelectedAssetDocId(savedAsset.id);
                  setAssetDraft({
                    dataId: savedAsset.dataId,
                    name: savedAsset.name,
                    namespace: savedAsset.namespace,
                  });
                }
              }
              applied.push(`update-asset-metadata:${operation.dataId}`);
              break;
            }
            case "export_project": {
              await runDetailMutation(
                `/api/content-editor/projects/${selectedProjectId}/export`,
                { method: "POST" }
              );
              applied.push("export-project");
              break;
            }
            case "publish_project": {
              await runDetailMutation(
                `/api/content-editor/projects/${selectedProjectId}/publish`,
                { method: "POST" }
              );
              applied.push("publish-project");
              break;
            }
            default:
              errors.push("Unsupported operation.");
          }
        } catch (error) {
          errors.push(error instanceof Error ? error.message : String(error));
        }
      }

      const summary =
        errors.length > 0
          ? `Applied ${applied.length} operation(s) with ${errors.length} issue(s).`
          : `Applied ${applied.length} operation(s).`;
      if (errors.length > 0) {
        setError(errors.join(" | "));
      } else {
        setNotice(summary);
      }
      return {
        ok: errors.length === 0,
        summary,
        validationErrors: errors,
      };
    },
    [assetDraft.namespace, projectDetail, selectedProjectId, selectedSchema]
  );

  return (
    <div className="space-y-4">
      <Card className="bg-card/70">
        <CardHeader>
          <CardTitle>Asset Explorer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Asset Explorer is now aimed at Escape the Dungeon first. Seed the
            game&apos;s canonical schemas, import the same data packs the
            runtime consumes, author through RJSF, and inspect the resulting
            collection as a searchable numeric space.
          </p>
          <div className="grid gap-3 md:grid-cols-4">
            <MetricCard label="Projects" value={String(projects.length)} />
            <MetricCard
              label="Forms"
              value={String(projectDetail?.customSchemas?.length ?? 0)}
            />
            <MetricCard
              label="Assets"
              value={String(projectDetail?.projectData?.length ?? 0)}
            />
            <MetricCard label="Plotted" value={String(plotPoints.length)} />
          </div>
          {error ? <p className="text-xs text-rose-300">{error}</p> : null}
          {notice ? <p className="text-xs text-emerald-300">{notice}</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="bg-card/60">
            <CardHeader>
              <CardTitle className="text-base">Project + Forms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <select
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                value={selectedProjectId}
                onChange={(event) => setSelectedProjectId(event.target.value)}
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <div className="rounded-xl border border-border bg-background/40 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    {projectDetail?.project?.status ?? "draft"}
                  </Badge>
                  <Badge variant="outline">
                    export{" "}
                    {projectDetail?.project?.exportRoot ?? "content-projects"}
                  </Badge>
                  <Badge variant="outline">
                    {(projectDetail?.packs ?? []).length} packs
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportProject}
                    disabled={!selectedProjectId || busyAction.length > 0}
                  >
                    {busyAction === "export-project"
                      ? "Exporting..."
                      : "Export Project Files"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handlePublishProject}
                    disabled={!selectedProjectId || busyAction.length > 0}
                  >
                    {busyAction === "publish-project"
                      ? "Publishing..."
                      : "Publish To Game"}
                  </Button>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-background/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-foreground">
                      Escape the Dungeon Support
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Seed actual game schemas as asset forms and import the
                      same canonical data packs the runtime consumes.
                    </div>
                  </div>
                  <Badge variant="outline">
                    {
                      (projectDetail?.supportedGameSchemas ?? []).filter(
                        (schema) => schema.seeded
                      ).length
                    }
                    /{projectDetail?.supportedGameSchemas?.length ?? 0} seeded
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={handleImportCanonicalGameData}
                    disabled={!selectedProjectId || busyAction.length > 0}
                  >
                    {busyAction === "import-game-data"
                      ? "Importing..."
                      : "Import Canonical Game Data"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSeedGameForms}
                    disabled={!selectedProjectId || busyAction.length > 0}
                  >
                    {busyAction === "seed-game-forms"
                      ? "Seeding..."
                      : "Seed Game Forms"}
                  </Button>
                </div>
                <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
                  {(projectDetail?.supportedGameSchemas ?? []).map((schema) => (
                    <div
                      key={schema.packId}
                      className="rounded-lg border border-border/60 bg-background/50 px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold text-foreground">
                            {schema.title}
                          </div>
                          <div className="font-mono text-[10px] text-muted-foreground">
                            {schema.packId}
                          </div>
                        </div>
                        <div className="flex flex-wrap justify-end gap-1">
                          <Badge
                            variant={schema.imported ? "default" : "outline"}
                          >
                            {schema.imported ? "data" : "no data"}
                          </Badge>
                          <Badge
                            variant={schema.seeded ? "default" : "outline"}
                          >
                            {schema.seeded ? "form" : "no form"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                {(projectDetail?.customSchemas ?? []).map((schema) => {
                  const schemaMeta = schemaBindingMeta(schema);
                  const matchingPack = schemaMeta
                    ? ((projectDetail?.packs ?? []).find(
                        (pack) => pack.packId === schemaMeta.packId
                      ) ?? null)
                    : null;
                  const assetCount = schemaMeta
                    ? exploredAssetsFromPack(matchingPack, schemaMeta, "")
                        .length
                    : (projectDetail?.projectData ?? []).filter(
                        (asset) => asset.targetId === schema.schemaId
                      ).length;
                  const isSelected = schema.id === selectedSchema?.id;
                  return (
                    <button
                      key={schema.id}
                      type="button"
                      className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background/40 hover:border-primary/50"
                      }`}
                      onClick={() => setSelectedSchemaDocId(schema.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-foreground">
                            {schema.name}
                          </div>
                          <div className="font-mono text-[10px] text-muted-foreground">
                            {schema.schemaId}
                          </div>
                        </div>
                        <Badge variant={statusTone(schema.status)}>
                          {schema.status}
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline">{schema.schemaType}</Badge>
                        {schema.targetPackId ? (
                          <Badge variant="outline">{schema.targetPackId}</Badge>
                        ) : null}
                        <Badge variant="outline">{assetCount} assets</Badge>
                      </div>
                    </button>
                  );
                })}
                {projectDetail?.customSchemas?.length ? null : (
                  <div className="rounded border border-dashed border-border px-3 py-4 text-muted-foreground">
                    No forms yet. Create one below.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/60">
            <CardHeader>
              <CardTitle className="text-base">New Form</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <Input
                placeholder="schema id"
                value={schemaForm.schemaId}
                onChange={(event) =>
                  setSchemaForm((current) => ({
                    ...current,
                    schemaId: event.target.value,
                  }))
                }
              />
              <Input
                placeholder="Form name"
                value={schemaForm.name}
                onChange={(event) =>
                  setSchemaForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
              <select
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                value={schemaForm.schemaType}
                onChange={(event) =>
                  setSchemaForm((current) => ({
                    ...current,
                    schemaType: event.target.value,
                  }))
                }
              >
                {schemaTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <textarea
                className="min-h-64 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-[11px] leading-relaxed"
                value={schemaForm.documentText}
                onChange={(event) =>
                  setSchemaForm((current) => ({
                    ...current,
                    documentText: event.target.value,
                  }))
                }
              />
              <Button
                onClick={handleCreateSchema}
                disabled={!selectedProjectId || busyAction.length > 0}
              >
                {busyAction === "create-schema" ? "Creating..." : "Create Form"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="bg-card/60">
            <CardHeader>
              <CardTitle className="text-base">Selected Form</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {selectedSchema ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{selectedSchema.schemaId}</Badge>
                    <Badge variant={statusTone(selectedSchema.status)}>
                      {selectedSchema.status}
                    </Badge>
                    {selectedSchemaMeta ? (
                      <Badge variant="outline">
                        canonical {selectedSchemaMeta.packId}
                      </Badge>
                    ) : null}
                    {selectedSchemaMeta ? (
                      <Badge variant={selectedPack ? "default" : "outline"}>
                        {selectedPack ? "pack imported" : "pack missing"}
                      </Badge>
                    ) : null}
                    <Badge variant="outline">
                      updated {formatTimestamp(selectedSchema.updatedAt)}
                    </Badge>
                  </div>
                  <textarea
                    className="min-h-48 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-[11px] leading-relaxed"
                    value={schemaEditorText}
                    onChange={(event) =>
                      setSchemaEditorText(event.target.value)
                    }
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleSaveSchema}
                      disabled={busyAction.length > 0}
                    >
                      {busyAction === "save-schema"
                        ? "Saving..."
                        : "Save Form JSON"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setSchemaEditorText(prettyJson(selectedSchema.document))
                      }
                      disabled={busyAction.length > 0}
                    >
                      Reset
                    </Button>
                  </div>
                </>
              ) : (
                <div className="rounded border border-dashed border-border px-3 py-6 text-muted-foreground">
                  Select a project form to inspect or create a new one.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/60">
            <CardHeader>
              <CardTitle className="text-base">Asset Form Runtime</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {selectedSchemaForm ? (
                <>
                  <div className="grid gap-3 md:grid-cols-3">
                    <Input
                      placeholder="asset id"
                      value={assetDraft.dataId}
                      onChange={(event) =>
                        setAssetDraft((current) => ({
                          ...current,
                          dataId: event.target.value,
                        }))
                      }
                    />
                    <Input
                      placeholder="Asset name"
                      value={assetDraft.name}
                      onChange={(event) =>
                        setAssetDraft((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                    />
                    <select
                      className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                      value={assetDraft.namespace}
                      onChange={(event) =>
                        setAssetDraft((current) => ({
                          ...current,
                          namespace: event.target.value,
                        }))
                      }
                    >
                      {assetNamespaceOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="rounded-xl border border-border bg-background/40 p-4">
                    <Form
                      schema={selectedSchemaForm}
                      formData={asJsonObject(formData)}
                      validator={validator}
                      onChange={(event) => {
                        setFormData((event.formData ?? {}) as JsonValue);
                      }}
                    >
                      <div />
                    </Form>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={handleCreateAsset}
                      disabled={
                        busyAction.length > 0 ||
                        !selectedSchema ||
                        (Boolean(selectedSchemaMeta) && !selectedPack)
                      }
                    >
                      {busyAction === "create-asset"
                        ? "Creating..."
                        : "Create Asset"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleSaveAsset}
                      disabled={
                        !selectedAsset ||
                        busyAction.length > 0 ||
                        (Boolean(selectedSchemaMeta) && !selectedPack)
                      }
                    >
                      {busyAction === "save-asset"
                        ? "Saving..."
                        : "Save Selected Asset"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSelectedAssetDocId("");
                        setAssetDraft({
                          dataId: selectedSchema
                            ? `${selectedSchema.schemaId}-${Date.now()}`
                            : "",
                          name: "",
                          namespace: "generic-extension",
                        });
                        setFormData({});
                      }}
                      disabled={busyAction.length > 0}
                    >
                      New Draft
                    </Button>
                  </div>
                  {selectedSchemaMeta && !selectedPack ? (
                    <div className="rounded border border-dashed border-border px-3 py-2 text-muted-foreground">
                      Import canonical game data for{" "}
                      <code>{selectedSchemaMeta.packId}</code> before editing
                      assets from this form.
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="rounded border border-dashed border-border px-3 py-6 text-muted-foreground">
                  This form cannot render yet. Pick a JSON-schema-backed form or
                  create one above.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="bg-card/60">
            <CardHeader>
              <CardTitle className="text-base">Asset Collection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search by id, name, namespace, or JSON"
                  value={assetSearch}
                  onChange={(event) => setAssetSearch(event.target.value)}
                />
              </div>
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {schemaBoundAssets.map((asset) => {
                  const isSelected = asset.id === selectedAsset?.id;
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background/40 hover:border-primary/50"
                      }`}
                      onClick={() => setSelectedAssetDocId(asset.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-foreground">
                            {asset.name}
                          </div>
                          <div className="font-mono text-[10px] text-muted-foreground">
                            {asset.dataId}
                          </div>
                        </div>
                        <Badge variant={statusTone(asset.status)}>
                          {asset.status}
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline">{asset.namespace}</Badge>
                        <Badge variant="outline">
                          {formatTimestamp(asset.updatedAt)}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
                {schemaBoundAssets.length > 0 ? null : (
                  <div className="rounded border border-dashed border-border px-3 py-4 text-muted-foreground">
                    {selectedSchemaMeta && !selectedPack
                      ? "Import canonical game data to populate this collection."
                      : "No assets bound to this form yet."}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/60">
            <CardHeader>
              <CardTitle className="text-base">Asset Space</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="grid gap-2 md:grid-cols-3">
                <AxisSelect
                  label="X"
                  options={numericPaths}
                  value={axisX}
                  onChange={setAxisX}
                />
                <AxisSelect
                  label="Y"
                  options={numericPaths}
                  value={axisY}
                  onChange={setAxisY}
                />
                <AxisSelect
                  label="Z"
                  options={numericPaths}
                  value={axisZ}
                  onChange={setAxisZ}
                />
              </div>
              <div className="h-[320px] rounded-xl border border-border bg-background/40 p-2">
                {plotPoints.length > 0 ? (
                  <AssetSpacePlot
                    axisLabels={{ x: axisX, y: axisY, z: axisZ }}
                    points={plotPoints}
                    selectedAssetId={selectedAsset?.id ?? null}
                    onSelectAsset={setSelectedAssetDocId}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    Pick numeric fields that exist on at least one asset to
                    populate the 3D space.
                  </div>
                )}
              </div>
              <div className="rounded border border-border bg-background/40 px-3 py-2 text-muted-foreground">
                Numeric leaf paths are discovered from the assets bound to the
                selected form. The first slice keeps plotting simple: one asset
                per point, one number per axis.
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/60">
            <CardHeader>
              <CardTitle className="text-base">Selected Asset Detail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {selectedAsset ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{selectedAsset.dataId}</Badge>
                    <Badge variant="outline">{selectedAsset.namespace}</Badge>
                    <Badge variant={statusTone(selectedAsset.status)}>
                      {selectedAsset.status}
                    </Badge>
                  </div>
                  <div className="grid gap-2 md:grid-cols-3">
                    <MetricCard
                      label={axisX || "axis x"}
                      value={
                        axisX
                          ? String(
                              getNumberAtPath(selectedAsset.document, axisX) ??
                                "n/a"
                            )
                          : "n/a"
                      }
                    />
                    <MetricCard
                      label={axisY || "axis y"}
                      value={
                        axisY
                          ? String(
                              getNumberAtPath(selectedAsset.document, axisY) ??
                                "n/a"
                            )
                          : "n/a"
                      }
                    />
                    <MetricCard
                      label={axisZ || "axis z"}
                      value={
                        axisZ
                          ? String(
                              getNumberAtPath(selectedAsset.document, axisZ) ??
                                "n/a"
                            )
                          : "n/a"
                      }
                    />
                  </div>
                  <pre className="overflow-x-auto rounded-xl border border-border bg-background/40 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                    {prettyJson(selectedAsset.document)}
                  </pre>
                </>
              ) : (
                <div className="rounded border border-dashed border-border px-3 py-6 text-muted-foreground">
                  Select an asset to inspect its JSON and plotted metrics.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <AuthoringAssistantWidget
        endpoint="/api/ai/asset-authoring-chat"
        context={assetAuthoringChatContext}
        title="Asset Explorer Chat"
        description="Plan and review Escape the Dungeon forms and assets, then apply targeted updates inside Asset Explorer. This hosted chat prefers existing subscriptions when available and can fall back to our routed model path."
        onApplyOperations={applyAuthoringOperations}
      />
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 px-3 py-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-foreground">{value}</div>
    </div>
  );
}

function AxisSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label className="space-y-1">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </div>
      <select
        className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.length === 0 ? (
          <option value="">No numeric paths</option>
        ) : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
