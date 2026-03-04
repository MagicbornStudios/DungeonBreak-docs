"use client";

import { ACTION_POLICIES, GameEngine, type PlayerAction } from "@dungeonbreak/engine";
import * as EngineRuntime from "@dungeonbreak/engine";
import {
  IconBraces as BracesIcon,
  IconChartBar as BarChart3Icon,
  IconChevronDown as ChevronDownIcon,
  IconChevronRight as ChevronRightIcon,
  IconChevronUp as ChevronUpIcon,
  IconCircleCheck as CircleCheckIcon,
  IconClockHour3 as Clock3Icon,
  IconCompass as CompassIcon,
  IconCrosshair as CrosshairIcon,
  IconFileTypeTsx as SiTypescript,
  IconFileCode as FileCode2Icon,
  IconFileText as FileTextIcon,
  IconFlask as FlaskConicalIcon,
  IconFolder as FolderTreeIcon,
  IconBrandCpp as SiCplusplus,
  IconBrandCSharp as SiSharp,
  IconHelpCircle as CircleHelpIcon,
  IconHierarchy3 as BoxesIcon,
  IconJson as SiJsonwebtokens,
    IconPackage as PackageIcon,
    IconPlus as PlusIcon,
    IconRefresh as RefreshCwIcon,
  IconSparkles as SparklesIcon,
  IconSwords as SwordsIcon,
  IconTrash as Trash2Icon,
  IconUpload as UploadIcon,
} from "@tabler/icons-react";
import dynamic from "next/dynamic";
import { type ChangeEvent, type ComponentType, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { useShallow } from "zustand/react/shallow";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { runPlaythrough } from "@/lib/playthrough-runner";
import { analyzeReport } from "@/lib/playthrough-analyzer";
import { recomputeSpaceData } from "@/lib/space-recompute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { MultiStepLoader } from "@/components/ui/multi-step-loader";
import { AuthoringAssistantWidget } from "@/components/ai/authoring-assistant-widget";
import { type AuthoringApplyResult, type AuthoringChatOperation } from "@/components/ai/authoring-chat-panel";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SchemaJsonSection } from "@/components/reports/content-creator/schema-json-section";
import {
  buildCanonicalAssetsSchemaJson,
  buildModelsSchemaJson,
  buildStatsSchemaJson,
  parseCanonicalAssets,
  parseModelSchemaRows,
} from "@/components/reports/content-creator/schema-json-utils";
import {
  buildSchemaVersionSnapshot,
  hasSchemaSnapshotChangedForSections,
  validateCanonicalAssets,
  validateModelSchemaRows,
} from "@/components/reports/content-creator/schema-versioning";
import {
  buildContentCreatorTrees,
  type ContentCreatorTreeNode as ModelTreeNode,
} from "@/components/reports/content-creator/tree-builder";
import { TreeContextMenuContent } from "@/components/reports/content-creator/tree-context-menu-content";
import {
  CanonicalInfoPanelContent,
  ModelsInfoPanelContent,
  StatsInfoPanelContent,
} from "@/components/reports/content-creator/info-panel-content";

const TRAIT_NAMES = [
  "Comprehension",
  "Constraint",
  "Construction",
  "Direction",
  "Empathy",
  "Equilibrium",
  "Freedom",
  "Levity",
  "Projection",
  "Survival",
] as const;

const FEATURE_NAMES = ["Fame", "Effort", "Awareness", "Guile", "Momentum"] as const;
const DEFAULT_STAT_FEATURES = [
  { featureId: "Health", label: "Health", groups: ["stats"], spaces: ["combat", "entity", "item"], defaultValue: 100 },
  { featureId: "Stamina", label: "Stamina", groups: ["stats"], spaces: ["combat", "entity", "item"], defaultValue: 60 },
  { featureId: "Attack", label: "Attack", groups: ["stats"], spaces: ["combat", "entity", "item"], defaultValue: 12 },
  { featureId: "Defense", label: "Defense", groups: ["stats"], spaces: ["combat", "entity", "item"], defaultValue: 8 },
  { featureId: "Speed", label: "Speed", groups: ["stats"], spaces: ["combat", "entity", "item"], defaultValue: 6 },
  { featureId: "CritChance", label: "Crit Chance", groups: ["stats"], spaces: ["combat", "entity", "item"], defaultValue: 5 },
] as const;
const DEFAULT_CURRENCY_STAT_FEATURES = [
  { featureId: "Mana", label: "Mana", groups: ["stats", "currency"], spaces: ["currency", "entity", "item"], defaultValue: 100 },
  { featureId: "Gold", label: "Gold", groups: ["stats", "currency"], spaces: ["currency", "entity", "item"], defaultValue: 25 },
  { featureId: "Income", label: "Income", groups: ["stats", "currency"], spaces: ["currency", "entity", "item"], defaultValue: 3 },
  { featureId: "Upkeep", label: "Upkeep", groups: ["stats", "currency"], spaces: ["currency", "entity", "item"], defaultValue: 1 },
  { featureId: "TradeRate", label: "Trade Rate", groups: ["stats", "currency"], spaces: ["currency", "entity", "item"], defaultValue: 1 },
] as const;
const SEMANTIC_AXES = [
  "combatIntensity",
  "socialIntensity",
  "explorationIntensity",
  "craftingIntensity",
  "recoveryIntensity",
  "risk",
  "pressure",
  "mobility",
  "visibility",
] as const;
// Feature-first default for ranking/similarity. Semantic axes remain optional for visualization.
const INCLUDE_SEMANTIC_AXES_IN_SIMILARITY = false;

const NAVIGATION_FEATURE_NAMES = ["Fame", "Awareness", "Guile"] as const;
const MOVEMENT_CONTROL_NAMES = ["Effort", "Momentum"] as const;
const TEST_MODE_LOADING_STATES = [
  { text: "Building content pack bundle" },
  { text: "Resolving object overrides" },
  { text: "Running browser playthrough" },
  { text: "Binding pack + report identity" },
  { text: "Refreshing explorer visualization" },
] as const;
const NO_MODEL_SELECTED = "__none__";

type SpaceVectorPackOverrides = Record<string, unknown>;

type UnifiedSpaceVector = {
  traits: Record<string, number>;
  features: Record<string, number>;
  semantics: Record<string, number>;
};

type RuntimeUnifiedModel = {
  actionSpace: Array<{ actionType: string; vector: UnifiedSpaceVector }>;
  eventSpace: Array<{ eventId: string; kind: string; vector: UnifiedSpaceVector }>;
  effectSpace: Array<{
    effectId: string;
    sourceType: string;
    delta: UnifiedSpaceVector;
    behavior: { style: string; aggregates: { netImpact: number } };
  }>;
};

type RuntimeFeatureSchemaRow = {
  featureId: string;
  label: string;
  groups: string[];
  spaces: string[];
  defaultValue?: number;
};

type RuntimeModelSchemaRow = {
  modelId: string;
  label: string;
  description?: string;
  extendsModelId?: string;
  attachedStatModelIds?: string[];
  featureRefs: Array<{ featureId: string; spaces: string[]; required?: boolean; defaultValue?: number }>;
};

type SpaceVectorsPatchPayload = {
  featureSchema: RuntimeFeatureSchemaRow[];
  modelSchemas: RuntimeModelSchemaRow[];
};

type PatchDraft = {
  id: string;
  name: string;
  createdAt: string;
  patch: SpaceVectorsPatchPayload;
};

type ModelPreset = {
  id: string;
  label: string;
  model: RuntimeModelSchemaRow;
};

type ModelInstanceBinding = {
  id: string;
  name: string;
  modelId: string;
  canonical: boolean;
};

type SchemaLanguage = "typescript" | "cpp" | "csharp";

type ModelMigrationOp = {
  id: string;
  instanceId: string;
  fromModelId: string;
  toModelId: string;
  at: string;
};

type PendingStatImpactAction = {
  oldStatId: string;
  impactedModelIds: string[];
  impactedCanonicalCount: number;
  deleteStatModel: boolean;
  scopeModelId?: string;
  title: string;
  description: string;
};

type SchemaFile = {
  path: string;
  code: string;
};

type ModelSpaceOverlayPoint = {
  id: string;
  name: string;
  coords: { x: number; y: number; z: number };
  vector: number[];
};

type ModelSchemaViewerState = {
  activeModelSchemaId: string;
  activeModelInstanceId: string | null;
  schemaLanguage: SchemaLanguage;
  modelInstances: ModelInstanceBinding[];
  migrationOps: ModelMigrationOp[];
  initFromSchemas: (schemas: RuntimeModelSchemaRow[], inferredKaelModelId: string) => void;
  ensureKaelBinding: (modelId: string) => void;
  setActiveSelection: (modelId: string, instanceId: string | null) => void;
  setSchemaLanguage: (language: SchemaLanguage) => void;
  addCanonicalAsset: (modelId: string, name?: string) => void;
  toggleCanonical: (instanceId: string) => void;
  renameModelInstance: (instanceId: string, name: string) => void;
  deleteModelInstance: (instanceId: string) => void;
  moveInstancesToModel: (instanceIds: string[], toModelId: string) => void;
  clearMigrationOps: () => void;
  replaceModelInstances: (instances: ModelInstanceBinding[]) => void;
};

type SpaceExplorerUiState = {
  vizMode: "3d" | "json" | "deltas";
  colorBy: ColorBy;
  distanceAlgorithm: DistanceAlgorithm;
  nearestK: number;
  runtimeSpaceView: RuntimeSpaceView;
  spaceFeatureMap: Record<ContentSpaceKey, string[]>;
  customFeatureValues: Record<string, number>;
  customFeatureLabels: Record<string, string>;
  movementFeatureIds: string[];
  setVizMode: (next: "3d" | "json" | "deltas") => void;
  setColorBy: (next: ColorBy) => void;
  setDistanceAlgorithm: (next: DistanceAlgorithm) => void;
  setNearestK: (next: number) => void;
  setRuntimeSpaceView: (next: RuntimeSpaceView) => void;
  setSpaceFeatureMap: (
    next:
      | Record<ContentSpaceKey, string[]>
      | ((prev: Record<ContentSpaceKey, string[]>) => Record<ContentSpaceKey, string[]>),
  ) => void;
  setCustomFeatureValues: (
    next:
      | Record<string, number>
      | ((prev: Record<string, number>) => Record<string, number>),
  ) => void;
  setCustomFeatureLabels: (
    next:
      | Record<string, string>
      | ((prev: Record<string, string>) => Record<string, string>),
  ) => void;
  setMovementFeatureIds: (next: string[] | ((prev: string[]) => string[])) => void;
};

type ContentDeliveryState = {
  versionDraft: string;
  pluginVersion: string;
  runtimeVersion: string;
  busy: boolean;
  lastPublishedVersion: string | null;
  lastPulledVersion: string | null;
  selection: DeliveryPullResponse | null;
  setVersionDraft: (next: string) => void;
  setPluginVersion: (next: string) => void;
  setRuntimeVersion: (next: string) => void;
  setBusy: (next: boolean) => void;
  setLastPublishedVersion: (next: string | null) => void;
  setLastPulledVersion: (next: string | null) => void;
  setSelection: (next: DeliveryPullResponse | null) => void;
};

const useModelSchemaViewerStore = create<ModelSchemaViewerState>()(
  persist(
    immer<ModelSchemaViewerState>((set) => ({
      activeModelSchemaId: "",
      activeModelInstanceId: null,
      schemaLanguage: "typescript",
      modelInstances: [],
      migrationOps: [],
      initFromSchemas: (schemas, _inferredKaelModelId) =>
        set((state) => {
          if (
            !state.activeModelSchemaId ||
            (state.activeModelSchemaId !== NO_MODEL_SELECTED &&
              !schemas.some((row) => row.modelId === state.activeModelSchemaId))
          ) {
            state.activeModelSchemaId = NO_MODEL_SELECTED;
            state.activeModelInstanceId = null;
          }
        }),
      ensureKaelBinding: (modelId) =>
        set((state) => {
          if (!modelId || modelId === "none") return;
          const idx = state.modelInstances.findIndex((row) => row.id === "entity-instance.kael");
          if (idx >= 0) {
            state.modelInstances[idx]!.modelId = modelId;
            return;
          }
          state.modelInstances.unshift({
            id: "entity-instance.kael",
            name: "Kael",
            modelId,
            canonical: true,
          });
        }),
      setActiveSelection: (modelId, instanceId) =>
        set((state) => {
          state.activeModelSchemaId = modelId;
          state.activeModelInstanceId = instanceId;
        }),
      setSchemaLanguage: (language) =>
        set((state) => {
          state.schemaLanguage = language;
        }),
      addCanonicalAsset: (modelId, name) =>
        set((state) => {
          const base = modelId.replace(/\./g, "_");
          const index = state.modelInstances.filter((row) => row.modelId === modelId).length + 1;
          state.modelInstances.push({
            id: `${base}-asset-${Date.now()}-${index}`,
            name: name?.trim() || `${modelId.split(".")[0] ?? "asset"}_asset_${index}`,
            modelId,
            canonical: true,
          });
        }),
      toggleCanonical: (instanceId) =>
        set((state) => {
          const row = state.modelInstances.find((item) => item.id === instanceId);
          if (!row) return;
          row.canonical = !row.canonical;
        }),
      renameModelInstance: (instanceId, name) =>
        set((state) => {
          const row = state.modelInstances.find((item) => item.id === instanceId);
          if (!row) return;
          const nextName = name.trim();
          if (!nextName) return;
          row.name = nextName;
        }),
      deleteModelInstance: (instanceId) =>
        set((state) => {
          state.modelInstances = state.modelInstances.filter((item) => item.id !== instanceId);
          if (state.activeModelInstanceId === instanceId) state.activeModelInstanceId = null;
        }),
      moveInstancesToModel: (instanceIds, toModelId) =>
        set((state) => {
          for (const instanceId of instanceIds) {
            const row = state.modelInstances.find((item) => item.id === instanceId);
            if (!row || row.modelId === toModelId) continue;
            state.migrationOps.push({
              id: `${instanceId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              instanceId,
              fromModelId: row.modelId,
              toModelId,
              at: new Date().toISOString(),
            });
            row.modelId = toModelId;
          }
        }),
      clearMigrationOps: () =>
        set((state) => {
          state.migrationOps = [];
        }),
      replaceModelInstances: (instances) =>
        set((state) => {
          state.modelInstances = instances;
        }),
    })),
    {
      name: "space-explorer-model-viewer-v1",
      partialize: (state) => ({
        activeModelSchemaId: state.activeModelSchemaId,
        activeModelInstanceId: state.activeModelInstanceId,
        schemaLanguage: state.schemaLanguage,
        modelInstances: state.modelInstances,
        migrationOps: state.migrationOps,
      }),
    },
  ),
);

function toTypeName(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join("");
}

function parseModelInstancesFromContentBindings(spaceVectors: SpaceVectorPackOverrides | undefined): ModelInstanceBinding[] {
  if (!spaceVectors || typeof spaceVectors !== "object") return [];
  const row = spaceVectors as { contentBindings?: unknown };
  if (!row.contentBindings || typeof row.contentBindings !== "object") return [];
  const bindings = row.contentBindings as {
    canonicalModelInstances?: unknown;
    modelInstances?: unknown;
  };
  const source = Array.isArray(bindings.canonicalModelInstances)
    ? bindings.canonicalModelInstances
    : Array.isArray(bindings.modelInstances)
      ? bindings.modelInstances
      : [];
  const instances: ModelInstanceBinding[] = [];
  for (const item of source) {
    if (!item || typeof item !== "object") continue;
    const parsed = item as { id?: unknown; name?: unknown; modelId?: unknown; canonical?: unknown };
    const id = String(parsed.id ?? "").trim();
    const modelId = String(parsed.modelId ?? "").trim();
    if (!id || !modelId) continue;
    instances.push({
      id,
      modelId,
      name: String(parsed.name ?? id),
      canonical: Boolean(parsed.canonical ?? true),
    });
  }
  return instances;
}

function toConstName(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]/)
    .filter(Boolean)
    .map((part) => part.toUpperCase())
    .join("_");
}

function toMemberName(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9_]/g, "_");
  if (!cleaned) return "value";
  if (/^[0-9]/.test(cleaned)) return `v_${cleaned}`;
  return cleaned;
}

function toFileStem(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "asset"
  );
}

function codeLanguageForTabId(tabId: string): "typescript" | "cpp" | "csharp" | "json" {
  if (tabId.includes("cpp")) return "cpp";
  if (tabId.includes("csharp")) return "csharp";
  if (tabId.includes("ts")) return "typescript";
  return "json";
}

function formatModelIdForUi(modelId: string): string {
  return modelId.replace(/\.base\b/g, "");
}

function resolveParentModelId(
  modelId: string,
  modelIdSet: Set<string>,
  modelById?: Map<string, RuntimeModelSchemaRow>,
): string | null {
  const explicitParent = modelById?.get(modelId)?.extendsModelId;
  if (explicitParent && explicitParent !== modelId && modelIdSet.has(explicitParent)) {
    return explicitParent;
  }
  const parts = modelId.split(".");
  if (parts.length < 2) return null;
  for (let depth = parts.length - 1; depth >= 1; depth -= 1) {
    const parentCandidate = parts.slice(0, depth).join(".");
    if (parentCandidate !== modelId && modelIdSet.has(parentCandidate)) return parentCandidate;
  }
  return null;
}

function ensureStatFeatureSchemaRows(rows: RuntimeFeatureSchemaRow[]): RuntimeFeatureSchemaRow[] {
  const byId = new Map(rows.map((row) => [row.featureId, row] as const));
  const next = [...rows];
  for (const stat of [...DEFAULT_STAT_FEATURES, ...DEFAULT_CURRENCY_STAT_FEATURES]) {
    if (byId.has(stat.featureId)) continue;
    next.push({
      featureId: stat.featureId,
      label: stat.label,
      groups: [...stat.groups],
      spaces: [...stat.spaces],
      defaultValue: stat.defaultValue,
    });
  }
  return next;
}

function ensureCombatStatsModelSchemas(
  rows: RuntimeModelSchemaRow[],
  featureRows: RuntimeFeatureSchemaRow[],
): RuntimeModelSchemaRow[] {
  const byId = new Map(rows.map((row) => [row.modelId, row] as const));
  const featureDefaults = new Map(featureRows.map((row) => [row.featureId, row.defaultValue ?? 0] as const));
  const next = rows.map((row) => ({
    ...row,
    featureRefs: row.featureRefs.map((ref) => ({ ...ref, spaces: [...ref.spaces] })),
  }));
  const combatStatsRefs = DEFAULT_STAT_FEATURES.map((stat) => ({
    featureId: stat.featureId,
    spaces: [...stat.spaces],
    required: true,
    defaultValue: featureDefaults.get(stat.featureId) ?? stat.defaultValue,
  }));
  if (!byId.has("combatstats")) {
    next.unshift({
      modelId: "combatstats",
      label: "Combat Stats",
      description: "Shared reusable combat stat vector defaults for entity and item inheritance.",
      featureRefs: combatStatsRefs,
    });
  } else {
    const idx = next.findIndex((row) => row.modelId === "combatstats");
    if (idx >= 0) {
      next[idx] = {
        ...next[idx]!,
        label: next[idx]!.label || "Combat Stats",
        description:
          next[idx]!.description ??
          "Shared reusable combat stat vector defaults for entity and item inheritance.",
        featureRefs: combatStatsRefs,
      };
    }
  }
  const currencyStatsRefs = DEFAULT_CURRENCY_STAT_FEATURES.map((stat) => ({
    featureId: stat.featureId,
    spaces: [...stat.spaces],
    required: true,
    defaultValue: featureDefaults.get(stat.featureId) ?? stat.defaultValue,
  }));
  if (!byId.has("currencystats")) {
    next.unshift({
      modelId: "currencystats",
      label: "Currency Stats",
      description: "Reusable currency stat vector defaults for currency-bearing models.",
      featureRefs: currencyStatsRefs,
    });
  } else {
    const idx = next.findIndex((row) => row.modelId === "currencystats");
    if (idx >= 0) {
      next[idx] = {
        ...next[idx]!,
        label: next[idx]!.label || "Currency Stats",
        description:
          next[idx]!.description ??
          "Reusable currency stat vector defaults for currency-bearing models.",
        featureRefs: currencyStatsRefs,
      };
    }
  }
  if (!byId.has("currency")) {
    next.push({
      modelId: "currency",
      label: "Currency",
      description: "Currency model that extends CurrencyStats defaults.",
      extendsModelId: "currencystats",
      featureRefs: [],
    });
  } else {
    const idx = next.findIndex((row) => row.modelId === "currency");
    if (idx >= 0) {
      next[idx] = {
        ...next[idx]!,
        label: next[idx]!.label || "Currency",
        description: next[idx]!.description ?? "Currency model that extends CurrencyStats defaults.",
        extendsModelId: "currencystats",
      };
    }
  }
  for (const modelId of ["entity", "item"]) {
    const idx = next.findIndex((row) => row.modelId === modelId);
    if (idx >= 0) {
      next[idx] = { ...next[idx]!, extendsModelId: "combatstats" };
    }
  }
  return next;
}

function buildSchemaFilesForLanguage(
  activeModel: RuntimeModelSchemaRow,
  allSchemas: RuntimeModelSchemaRow[],
  featureDefaults: Map<string, number>,
  language: SchemaLanguage,
): SchemaFile[] {
  const modelById = new Map(allSchemas.map((row) => [row.modelId, row] as const));
  const modelIdSet = new Set(allSchemas.map((row) => row.modelId));
  const chain: RuntimeModelSchemaRow[] = [];
  const visited = new Set<string>();
  let cursor: RuntimeModelSchemaRow | undefined = activeModel;
  while (cursor && !visited.has(cursor.modelId)) {
    chain.unshift(cursor);
    visited.add(cursor.modelId);
    const parentId = resolveParentModelId(cursor.modelId, modelIdSet, modelById);
    cursor = parentId ? modelById.get(parentId) : undefined;
  }

  return chain.map((schema) => {
    const parentId = resolveParentModelId(schema.modelId, modelIdSet, modelById);
    const parent = parentId ? modelById.get(parentId) : null;
    const modelParts = schema.modelId.split(".");
    const name =
      modelParts.length === 2 && modelParts[1] === "base"
        ? modelParts[0] || "schema"
        : modelParts.slice(1).join("-") || modelParts[0] || "schema";
    const fileStem = schema.modelId
      .replace(/\.base\b/g, "")
      .replace(/\.+/g, "-")
      .replace(/^-+|-+$/g, "")
      || "model";
    const typeName = `${toTypeName(schema.modelId)}Schema`;
    const parentTypeName = parent ? `${toTypeName(parent.modelId)}Schema` : null;
    const defaultsName = `${toConstName(schema.modelId)}_DEFAULTS`;
    const parentDefaultsName = parent ? `${toConstName(parent.modelId)}_DEFAULTS` : null;

    if (language === "cpp") {
      const filePath = `${fileStem}.hpp`;
      const code = [
        "#pragma once",
        "",
        `struct ${typeName}${parentTypeName ? ` : ${parentTypeName}` : ""} {`,
        ...schema.featureRefs.map((ref) => `  float ${toMemberName(ref.featureId)} = 0.0f;`),
        "};",
        "",
        `inline ${typeName} ${toTypeName(schema.modelId)}Defaults() {`,
        `  ${typeName} value{};`,
        ...(parentDefaultsName ? [`  value = ${toTypeName(parent!.modelId)}Defaults();`] : []),
        ...schema.featureRefs.map((ref) => {
          const nextDefault = ref.defaultValue ?? featureDefaults.get(ref.featureId) ?? 0;
          return `  value.${toMemberName(ref.featureId)} = ${nextDefault.toFixed(3)}f;`;
        }),
        "  return value;",
        "}",
      ].join("\n");
      return { path: filePath, code };
    }

    if (language === "csharp") {
      const filePath = `${toTypeName(fileStem)}.cs`;
      const code = [
        `public record class ${typeName}${parentTypeName ? ` : ${parentTypeName}` : ""}`,
        "{",
        ...schema.featureRefs.map((ref) => {
          const nextDefault = ref.defaultValue ?? featureDefaults.get(ref.featureId) ?? 0;
          return `  public float ${toTypeName(ref.featureId)} { get; init; } = ${nextDefault.toFixed(3)}f;`;
        }),
        "}",
      ].join("\n");
      return { path: filePath, code };
    }

    const filePath = `${fileStem}.ts`;
    const code = [
      `export interface ${typeName}${parentTypeName ? ` extends ${parentTypeName}` : ""} {`,
      ...schema.featureRefs.map((ref) => `  "${ref.featureId}": number;`),
      "}",
      "",
      `export const ${defaultsName}: ${parentTypeName ? `Partial<${typeName}>` : typeName} = {`,
      ...schema.featureRefs.map((ref) => {
        const nextDefault = ref.defaultValue ?? featureDefaults.get(ref.featureId) ?? 0;
        return `  "${ref.featureId}": ${nextDefault.toFixed(3)},`;
      }),
      "};",
      ...(parentDefaultsName
        ? [
            "",
            `export const ${toConstName(schema.modelId)}_HYDRATED_DEFAULTS: ${typeName} = {`,
            `  ...${parentDefaultsName},`,
            `  ...${defaultsName},`,
            "};",
          ]
        : []),
    ].join("\n");
    return { path: filePath, code };
  });
}

function buildSingleSchemaFileForLanguage(
  activeModel: RuntimeModelSchemaRow,
  allSchemas: RuntimeModelSchemaRow[],
  featureDefaults: Map<string, number>,
  language: SchemaLanguage,
  outputStem: string,
): SchemaFile | null {
  const files = buildSchemaFilesForLanguage(activeModel, allSchemas, featureDefaults, language);
  if (files.length === 0) return null;
  const ext = language === "typescript" ? "ts" : language === "cpp" ? "hpp" : "cs";
  const code = files.map((file) => `// ${file.path}\n${file.code}`).join("\n\n");
  return {
    path: `${outputStem}.${ext}`,
    code,
  };
}

function buildJsonSchemaForModel(
  activeModel: RuntimeModelSchemaRow,
  allSchemas: RuntimeModelSchemaRow[],
  featureDefaults: Map<string, number>,
): Record<string, unknown> {
  const modelById = new Map(allSchemas.map((row) => [row.modelId, row] as const));
  const modelIdSet = new Set(allSchemas.map((row) => row.modelId));
  const chain: RuntimeModelSchemaRow[] = [];
  const visited = new Set<string>();
  let cursor: RuntimeModelSchemaRow | undefined = activeModel;
  while (cursor && !visited.has(cursor.modelId)) {
    chain.unshift(cursor);
    visited.add(cursor.modelId);
    const parentId = resolveParentModelId(cursor.modelId, modelIdSet, modelById);
    cursor = parentId ? modelById.get(parentId) : undefined;
  }

  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `dungeonbreak://object-definition/${activeModel.modelId}.object.json`,
    title: `${activeModel.label || activeModel.modelId} Object Definition`,
    description: activeModel.description ?? `Object definition for ${activeModel.modelId}`,
    type: "object",
    "x-modelId": activeModel.modelId,
    "x-extendsModelId": activeModel.extendsModelId ?? null,
    "x-implements": ["content-model"],
    allOf: chain.map((schema) => {
      const statProperties: Record<string, unknown> = {};
      const requiredStats: string[] = [];
      for (const ref of schema.featureRefs) {
        const nextDefault = ref.defaultValue ?? featureDefaults.get(ref.featureId) ?? 0;
        statProperties[ref.featureId] = {
          type: "number",
          default: Number(nextDefault.toFixed(3)),
          "x-spaces": ref.spaces,
        };
        if (ref.required) requiredStats.push(ref.featureId);
      }
      return {
        title: `${schema.modelId} layer`,
        description: schema.description ?? schema.label,
        type: "object",
        "x-modelId": schema.modelId,
        "x-extendsModelId": schema.extendsModelId ?? null,
        properties: {
          stats: {
            type: "object",
            description: "Stat variables for this model layer.",
            properties: statProperties,
            ...(requiredStats.length > 0 ? { required: requiredStats } : {}),
            additionalProperties: false,
          },
        },
        required: ["stats"],
        additionalProperties: false,
      };
    }),
    additionalProperties: false,
  };
}

function ModelSchemaViewerModal({
  open,
  onClose,
  inferredKaelModelId,
  runtimeModelSchemas,
  runtimeFeatureSchema,
  runtimeContentObjects,
  onUpdateModelMetadata,
  onDeleteModelSchema,
  onCreateModelSchema,
  onAddFeatureRefToModel,
  onRemoveFeatureRefFromModel,
  onUpdateFeatureRefDefaultValue,
  onAttachStatModelToModel,
  onReplaceModelSchemas,
  onReplaceCanonicalAssets,
  onOpenCanonicalAssetInExplorer,
}: {
  open: boolean;
  onClose: () => void;
  inferredKaelModelId: string;
  runtimeModelSchemas: RuntimeModelSchemaRow[];
  runtimeFeatureSchema: RuntimeFeatureSchemaRow[];
  runtimeContentObjects: ContentPoint[];
  onUpdateModelMetadata: (modelId: string, updates: { label?: string; description?: string }) => void;
  onDeleteModelSchema: (modelId: string) => void;
  onCreateModelSchema: (modelId: string, label?: string, templateModelId?: string) => void;
  onAddFeatureRefToModel: (modelId: string, featureId: string) => void;
  onRemoveFeatureRefFromModel: (modelId: string, featureId: string) => void;
  onUpdateFeatureRefDefaultValue: (modelId: string, featureId: string, defaultValue: number | null) => void;
  onAttachStatModelToModel: (modelId: string, statModelId: string) => void;
  onReplaceModelSchemas: (models: RuntimeModelSchemaRow[]) => void;
  onReplaceCanonicalAssets: (assets: ModelInstanceBinding[]) => void;
  onOpenCanonicalAssetInExplorer: (selection: { modelId: string; instanceId: string | null }) => void;
}) {
  const {
    activeModelSchemaId,
    activeModelInstanceId,
    modelInstances,
    initFromSchemas,
    setActiveSelection,
    addCanonicalAsset,
    renameModelInstance,
    deleteModelInstance,
    migrationOps,
    clearMigrationOps,
  } = useModelSchemaViewerStore(
    useShallow((state) => ({
      activeModelSchemaId: state.activeModelSchemaId,
      activeModelInstanceId: state.activeModelInstanceId,
      modelInstances: state.modelInstances,
      initFromSchemas: state.initFromSchemas,
      setActiveSelection: state.setActiveSelection,
      addCanonicalAsset: state.addCanonicalAsset,
      renameModelInstance: state.renameModelInstance,
      deleteModelInstance: state.deleteModelInstance,
      migrationOps: state.migrationOps,
      clearMigrationOps: state.clearMigrationOps,
    })),
  );
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedEditorCode, setCopiedEditorCode] = useState(false);
  const [selectedTreeNodeId, setSelectedTreeNodeId] = useState<string>("");
  const [expandedTreeNodeIds, setExpandedTreeNodeIds] = useState<Record<string, boolean>>({
    "group:stats": true,
    "group:models": true,
    "group:canonical": true,
    "group:objects": true,
  });
  const [objectEditorCode, setObjectEditorCode] = useState("");
  const [modelLabelDraft, setModelLabelDraft] = useState("");
  const [modelDescriptionDraft, setModelDescriptionDraft] = useState("");
  const [codePanelOpen, setCodePanelOpen] = useState(false);
  const [activeCodeTabId, setActiveCodeTabId] = useState("");
  const [canonicalTab, setCanonicalTab] = useState<"edit" | "code">("edit");
  const [objectSectionTab, setObjectSectionTab] = useState<"models" | "canonical">("models");
  const [modelsNavigatorMode, setModelsNavigatorMode] = useState<"tree" | "json">("tree");
  const [canonicalNavigatorMode, setCanonicalNavigatorMode] = useState<"tree" | "json">("tree");
  const [jsonSyntaxMounted, setJsonSyntaxMounted] = useState(false);
  const [jsonSectionOpen, setJsonSectionOpen] = useState<Record<"models" | "stats" | "canonical", boolean>>({
    models: false,
    stats: false,
    canonical: false,
  });
  const [jsonSectionEditorMode, setJsonSectionEditorMode] = useState<Record<"models" | "stats" | "canonical", "preview" | "edit">>({
    models: "preview",
    stats: "preview",
    canonical: "preview",
  });
  const [modelsSchemaDraft, setModelsSchemaDraft] = useState("");
  const [statsSchemaDraft, setStatsSchemaDraft] = useState("");
  const [canonicalSchemaDraft, setCanonicalSchemaDraft] = useState("");
  const [jsonApplyError, setJsonApplyError] = useState("");
  const [canonicalNameDraft, setCanonicalNameDraft] = useState("");
  const [canonicalCreateName, setCanonicalCreateName] = useState("");
  const [newStatFeatureId, setNewStatFeatureId] = useState("");
  const [newStatModelIdDraft, setNewStatModelIdDraft] = useState("");
  const [newStatLabelDraft, setNewStatLabelDraft] = useState("");
  const [newStatTemplateModelId, setNewStatTemplateModelId] = useState<string | undefined>(undefined);
  const [pendingStatImpactAction, setPendingStatImpactAction] = useState<PendingStatImpactAction | null>(null);
  const [pendingStatImpactChoice, setPendingStatImpactChoice] = useState<"delete" | "replace">("delete");
  const [pendingStatImpactReplacementId, setPendingStatImpactReplacementId] = useState("");

  useEffect(() => {
    if (!open) return;
    initFromSchemas(runtimeModelSchemas, inferredKaelModelId);
  }, [open, runtimeModelSchemas, inferredKaelModelId, initFromSchemas]);

  const activeModelSchema = useMemo(
    () => runtimeModelSchemas.find((row) => row.modelId === activeModelSchemaId) ?? null,
    [runtimeModelSchemas, activeModelSchemaId],
  );

  const { modelsTreeData, canonicalTreeData } = useMemo(
    () =>
      buildContentCreatorTrees({
        runtimeModelSchemas,
        modelInstances,
        formatModelIdForUi,
      }),
    [runtimeModelSchemas, modelInstances],
  );
  const activeNavigatorMode = objectSectionTab === "models" ? modelsNavigatorMode : canonicalNavigatorMode;
  const activeTreeData = objectSectionTab === "models" ? modelsTreeData : canonicalTreeData;

  const migrationScript = useMemo(
    () =>
      [
        "// model-instance migration ops",
        ...migrationOps.map(
          (op) =>
            `moveInstance("${op.instanceId}", "${op.fromModelId}", "${op.toModelId}");`,
        ),
      ].join("\n"),
    [migrationOps],
  );
  const featureDefaultMap = useMemo(
    () => new Map(runtimeFeatureSchema.map((row) => [row.featureId, row.defaultValue ?? 0] as const)),
    [runtimeFeatureSchema],
  );
  const modelTreeNodeById = useMemo(() => {
    const next = new Map<string, ModelTreeNode>();
    const walk = (nodes: ModelTreeNode[]) => {
      for (const node of nodes) {
        next.set(node.id, node);
        if (node.children?.length) walk(node.children);
      }
    };
    walk(modelsTreeData);
    walk(canonicalTreeData);
    return next;
  }, [modelsTreeData, canonicalTreeData]);
  const selectedTreeNode = useMemo(
    () => (selectedTreeNodeId ? modelTreeNodeById.get(selectedTreeNodeId) ?? null : null),
    [selectedTreeNodeId, modelTreeNodeById],
  );
  const contentObjectById = useMemo(
    () => new Map(runtimeContentObjects.map((objectPoint) => [objectPoint.id, objectPoint] as const)),
    [runtimeContentObjects],
  );
  const statModelIds = useMemo(
    () => runtimeModelSchemas.filter((row) => row.modelId.endsWith("stats")).map((row) => row.modelId),
    [runtimeModelSchemas],
  );
  const statColorByModelId = useMemo(() => {
    const map = new Map<string, string>();
    for (const statModelId of statModelIds) {
      const hue = Math.round(hashToUnit(`stat-color:${statModelId}`) * 360);
      map.set(statModelId, `hsl(${hue}, 82%, 62%)`);
    }
    return map;
  }, [statModelIds]);
  const attachedStatModelIdsByModelId = useMemo(() => {
    const validStatIds = new Set(statModelIds);
    const map = new Map<string, string[]>();
    for (const model of runtimeModelSchemas) {
      if (model.modelId.endsWith("stats")) continue;
      const attached = [
        ...(model.extendsModelId && validStatIds.has(model.extendsModelId) ? [model.extendsModelId] : []),
        ...((model.attachedStatModelIds ?? []).filter((statId) => validStatIds.has(statId))),
      ];
      map.set(model.modelId, [...new Set(attached)]);
    }
    return map;
  }, [runtimeModelSchemas, statModelIds]);
  const modelsSchemaJson = useMemo(() => buildModelsSchemaJson(runtimeModelSchemas), [runtimeModelSchemas]);
  const statsSchemaJson = useMemo(() => buildStatsSchemaJson(runtimeModelSchemas), [runtimeModelSchemas]);
  const canonicalAssetsSchemaJson = useMemo(() => buildCanonicalAssetsSchemaJson(modelInstances), [modelInstances]);
  const currentSchemaSnapshot = useMemo(
    () =>
      buildSchemaVersionSnapshot({
        modelsJson: modelsSchemaJson,
        statsJson: statsSchemaJson,
        canonicalJson: canonicalAssetsSchemaJson,
      }),
    [modelsSchemaJson, statsSchemaJson, canonicalAssetsSchemaJson],
  );
  const deferredModelsSchemaJson = useDeferredValue(modelsSchemaDraft);
  const deferredStatsSchemaJson = useDeferredValue(statsSchemaDraft);
  const deferredCanonicalSchemaJson = useDeferredValue(canonicalSchemaDraft);
  useEffect(() => {
    setModelsSchemaDraft(modelsSchemaJson);
  }, [modelsSchemaJson]);
  useEffect(() => {
    setStatsSchemaDraft(statsSchemaJson);
  }, [statsSchemaJson]);
  useEffect(() => {
    setCanonicalSchemaDraft(canonicalAssetsSchemaJson);
  }, [canonicalAssetsSchemaJson]);
  useEffect(() => {
    if (activeNavigatorMode !== "json") {
      setJsonSyntaxMounted(false);
      return;
    }
    const timer = window.setTimeout(() => setJsonSyntaxMounted(true), 80);
    return () => window.clearTimeout(timer);
  }, [activeNavigatorMode, objectSectionTab, modelsSchemaDraft, statsSchemaDraft, canonicalSchemaDraft]);
  const applyModelsAndStatsSchemaDraft = useCallback(() => {
    try {
      const parsedModels = parseModelSchemaRows(modelsSchemaDraft, "models", normalizeModelId).filter((row) => !row.modelId.endsWith("stats"));
      const parsedStats = parseModelSchemaRows(statsSchemaDraft, "stats", normalizeModelId).map((row) => ({
        ...row,
        modelId: row.modelId.endsWith("stats") ? row.modelId : `${row.modelId}stats`,
      }));
      const nextRows = [...parsedStats, ...parsedModels];
      const nextSnapshot = buildSchemaVersionSnapshot({
        modelsJson: modelsSchemaDraft,
        statsJson: statsSchemaDraft,
        canonicalJson: canonicalSchemaDraft,
      });
      if (
        !hasSchemaSnapshotChangedForSections(currentSchemaSnapshot, nextSnapshot, [
          "models",
          "stats",
        ])
      ) {
        setJsonApplyError("No schema changes detected.");
        return;
      }
      const validationErrors = validateModelSchemaRows(nextRows);
      if (validationErrors.length > 0) {
        setJsonApplyError(validationErrors.join(" "));
        return;
      }
      onReplaceModelSchemas(nextRows);
      setJsonApplyError("");
    } catch (error) {
      setJsonApplyError(error instanceof Error ? error.message : "Failed to apply schema JSON.");
    }
  }, [modelsSchemaDraft, statsSchemaDraft, canonicalSchemaDraft, currentSchemaSnapshot, onReplaceModelSchemas]);
  const applyCanonicalSchemaDraft = useCallback(() => {
    try {
      const assets = parseCanonicalAssets(canonicalSchemaDraft, normalizeModelId, formatModelIdForUi);
      const nextSnapshot = buildSchemaVersionSnapshot({
        modelsJson: modelsSchemaDraft,
        statsJson: statsSchemaDraft,
        canonicalJson: canonicalSchemaDraft,
      });
      if (
        !hasSchemaSnapshotChangedForSections(currentSchemaSnapshot, nextSnapshot, [
          "canonical",
        ])
      ) {
        setJsonApplyError("No schema changes detected.");
        return;
      }
      const validationErrors = validateCanonicalAssets(
        assets,
        new Set(runtimeModelSchemas.map((row) => row.modelId)),
      );
      if (validationErrors.length > 0) {
        setJsonApplyError(validationErrors.join(" "));
        return;
      }
      onReplaceCanonicalAssets(assets);
      setJsonApplyError("");
    } catch (error) {
      setJsonApplyError(error instanceof Error ? error.message : "Failed to apply canonical JSON.");
    }
  }, [
    canonicalSchemaDraft,
    currentSchemaSnapshot,
    formatModelIdForUi,
    modelsSchemaDraft,
    onReplaceCanonicalAssets,
    runtimeModelSchemas,
    statsSchemaDraft,
  ]);
  const selectedContentObject = useMemo(() => {
    if (selectedTreeNode?.nodeType !== "object" || !selectedTreeNode.objectId) return null;
    return contentObjectById.get(selectedTreeNode.objectId) ?? null;
  }, [selectedTreeNode, contentObjectById]);
  const panelModelId = selectedTreeNode?.modelId ?? activeModelSchema?.modelId ?? null;
  const panelModelSchema = useMemo(
    () => (panelModelId ? runtimeModelSchemas.find((row) => row.modelId === panelModelId) ?? null : null),
    [runtimeModelSchemas, panelModelId],
  );
  const panelResolvedFeatureRefs = useMemo(() => {
    if (!panelModelSchema) return [] as RuntimeModelSchemaRow["featureRefs"];
    const byId = new Map(runtimeModelSchemas.map((row) => [row.modelId, row] as const));
    const idSet = new Set(runtimeModelSchemas.map((row) => row.modelId));
    const pushStatChain = (statModelId: string): RuntimeModelSchemaRow[] => {
      const stat = byId.get(statModelId);
      if (!stat || !stat.modelId.endsWith("stats")) return [];
      const chain: RuntimeModelSchemaRow[] = [];
      const visited = new Set<string>();
      let cursor: RuntimeModelSchemaRow | undefined = stat;
      while (cursor && !visited.has(cursor.modelId)) {
        visited.add(cursor.modelId);
        chain.unshift(cursor);
        const parentId = resolveParentModelId(cursor.modelId, idSet, byId);
        if (!parentId) break;
        const parent = byId.get(parentId);
        if (!parent || !parent.modelId.endsWith("stats")) break;
        cursor = parent;
      }
      return chain;
    };
    const featureMap = new Map<string, RuntimeModelSchemaRow["featureRefs"][number]>();
    const mergeRefs = (schema: RuntimeModelSchemaRow) => {
      for (const ref of schema.featureRefs) {
        featureMap.set(ref.featureId, {
          featureId: ref.featureId,
          spaces: Array.isArray(ref.spaces) && ref.spaces.length > 0 ? [...ref.spaces] : ["entity"],
          required: ref.required,
          defaultValue: ref.defaultValue ?? featureDefaultMap.get(ref.featureId) ?? 0,
        });
      }
    };
    // Stats panels should be sourced from stat models only.
    if (panelModelSchema.modelId.endsWith("stats")) {
      for (const statLayer of pushStatChain(panelModelSchema.modelId)) {
        mergeRefs(statLayer);
      }
      return Array.from(featureMap.values());
    }
    const processedStatIds = new Set<string>();
    const collectAttachedStatIds = (start: RuntimeModelSchemaRow): string[] => {
      const ids: string[] = [];
      const visited = new Set<string>();
      let cursor: RuntimeModelSchemaRow | undefined = start;
      while (cursor && !visited.has(cursor.modelId)) {
        visited.add(cursor.modelId);
        if (cursor.extendsModelId && cursor.extendsModelId.endsWith("stats")) {
          ids.push(cursor.extendsModelId);
        }
        ids.push(...(cursor.attachedStatModelIds ?? []));
        const parentId = resolveParentModelId(cursor.modelId, idSet, byId);
        cursor = parentId ? byId.get(parentId) : undefined;
      }
      return ids;
    };
    for (const statId of collectAttachedStatIds(panelModelSchema)) {
      const normalized = normalizeModelId(statId);
      if (processedStatIds.has(normalized)) continue;
      processedStatIds.add(normalized);
      for (const statLayer of pushStatChain(normalized)) {
        mergeRefs(statLayer);
      }
    }
    return Array.from(featureMap.values());
  }, [panelModelSchema, runtimeModelSchemas, featureDefaultMap]);
  const panelModelInstance = useMemo(() => {
    if (!selectedTreeNode?.instanceId) return null;
    return modelInstances.find((row) => row.id === selectedTreeNode.instanceId) ?? null;
  }, [selectedTreeNode, modelInstances]);
  const activeModelJsonSchema = useMemo(
    () =>
      panelModelSchema
        ? buildJsonSchemaForModel(panelModelSchema, runtimeModelSchemas, featureDefaultMap)
        : null,
    [panelModelSchema, runtimeModelSchemas, featureDefaultMap],
  );
  const activeObjectDefinition = useMemo(() => {
    if (!selectedContentObject) return null;
    return {
      objectId: selectedContentObject.id,
      name: selectedContentObject.name,
      objectType: selectedContentObject.type,
      branch: selectedContentObject.branch,
      unlockRadius: selectedContentObject.unlockRadius ?? null,
      vector: selectedContentObject.vector,
      vectorCombined: selectedContentObject.vectorCombined ?? null,
      position: {
        x: selectedContentObject.x,
        y: selectedContentObject.y,
        z: selectedContentObject.z,
      },
    };
  }, [selectedContentObject]);
  useEffect(() => {
    if (!open) return;
    if (selectedTreeNodeId && modelTreeNodeById.has(selectedTreeNodeId)) return;
    if (activeModelInstanceId) {
      setSelectedTreeNodeId(`instance:${activeModelInstanceId}`);
      return;
    }
    if (activeModelSchemaId && activeModelSchemaId !== NO_MODEL_SELECTED) {
      setSelectedTreeNodeId(`model:${activeModelSchemaId}`);
      return;
    }
    setSelectedTreeNodeId("");
  }, [open, activeModelSchemaId, activeModelInstanceId, selectedTreeNodeId, modelTreeNodeById]);
  useEffect(() => {
    if (!panelModelSchema) {
      setModelLabelDraft("");
      setModelDescriptionDraft("");
      return;
    }
    setModelLabelDraft(panelModelSchema.label ?? panelModelSchema.modelId);
    setModelDescriptionDraft(panelModelSchema.description ?? "");
  }, [panelModelSchema]);
  useEffect(() => {
    if (!panelModelInstance?.canonical) {
      setCanonicalNameDraft("");
      return;
    }
    setCanonicalNameDraft(panelModelInstance.name);
  }, [panelModelInstance]);
  const canonicalCreateModelId = panelModelSchema?.modelId ?? "";

  const createSchemaViaTree = (kind: "model" | "stat", templateModelId?: string, suggestedId?: string) => {
    const suggested = suggestedId || (kind === "stat" ? "newstats" : "entity.new_model");
    if (kind === "stat") {
      const normalized = normalizeModelId(suggested);
      const statId = normalized.endsWith("stats") ? normalized : `${normalized}stats`;
      setNewStatModelIdDraft(statId);
      setNewStatLabelDraft(formatModelIdForUi(statId));
      setNewStatTemplateModelId(templateModelId ?? activeModelSchema?.modelId);
      setSelectedTreeNodeId("group:stats");
      setObjectSectionTab("models");
      return;
    }
    const raw = window.prompt("New model id (example: entity.magicdog):", suggested);
    const nextId = normalizeModelId(raw ?? "");
    if (!nextId) return;
    const modelId = nextId;
    onCreateModelSchema(modelId, modelId, templateModelId ?? activeModelSchema?.modelId);
  };
  const suggestDerivedModelId = (modelId: string) => `${modelId}.subclass`;
  const suggestDerivedStatId = (modelId: string) => {
    const base = `${modelId}.derived`;
    return base.endsWith("stats") ? base : `${base}stats`;
  };
  const buildModelByIdMap = () => new Map(runtimeModelSchemas.map((row) => [row.modelId, row] as const));
  const getStatChain = (statModelId: string, byId: Map<string, RuntimeModelSchemaRow>) => {
    const stat = byId.get(statModelId);
    if (!stat || !stat.modelId.endsWith("stats")) return [] as RuntimeModelSchemaRow[];
    const chain: RuntimeModelSchemaRow[] = [];
    const visited = new Set<string>();
    let cursor: RuntimeModelSchemaRow | undefined = stat;
    while (cursor && !visited.has(cursor.modelId)) {
      visited.add(cursor.modelId);
      chain.unshift(cursor);
      const parentId = resolveParentModelId(cursor.modelId, new Set(byId.keys()), byId);
      if (!parentId) break;
      const parent = byId.get(parentId);
      if (!parent || !parent.modelId.endsWith("stats")) break;
      cursor = parent;
    }
    return chain;
  };
  const collectResolvedStatIdsForModel = (modelId: string, byId: Map<string, RuntimeModelSchemaRow>) => {
    const resolved = new Set<string>();
    const visited = new Set<string>();
    let cursor = byId.get(modelId);
    while (cursor && !visited.has(cursor.modelId)) {
      visited.add(cursor.modelId);
      if (cursor.extendsModelId && cursor.extendsModelId.endsWith("stats")) {
        resolved.add(cursor.extendsModelId);
      }
      for (const attached of cursor.attachedStatModelIds ?? []) {
        if (attached.endsWith("stats")) resolved.add(attached);
      }
      const parentId = resolveParentModelId(cursor.modelId, new Set(byId.keys()), byId);
      cursor = parentId ? byId.get(parentId) : undefined;
    }
    return [...resolved];
  };
  const collectInheritanceChainIdsForModel = (modelId: string, byId: Map<string, RuntimeModelSchemaRow>) => {
    const ids = new Set<string>();
    const visited = new Set<string>();
    let cursor = byId.get(modelId);
    while (cursor && !visited.has(cursor.modelId)) {
      visited.add(cursor.modelId);
      ids.add(cursor.modelId);
      const parentId = resolveParentModelId(cursor.modelId, new Set(byId.keys()), byId);
      cursor = parentId ? byId.get(parentId) : undefined;
    }
    return ids;
  };
  const findImpactedModelsForStat = (statModelId: string, scopeModelId?: string) => {
    const byId = buildModelByIdMap();
    const impacted: string[] = [];
    for (const model of runtimeModelSchemas) {
      if (model.modelId.endsWith("stats")) continue;
      const resolvedStatIds = collectResolvedStatIdsForModel(model.modelId, byId);
      if (!resolvedStatIds.includes(statModelId)) continue;
      if (scopeModelId) {
        const inheritanceIds = collectInheritanceChainIdsForModel(model.modelId, byId);
        if (!inheritanceIds.has(scopeModelId)) continue;
      }
      impacted.push(model.modelId);
    }
    return impacted;
  };
  const replaceStatLinkOnModel = (
    model: RuntimeModelSchemaRow,
    oldStatId: string,
    replacementStatId: string | null,
    directOnly: boolean,
  ) => {
    if (model.modelId.endsWith("stats")) return model;
    let attached = [...(model.attachedStatModelIds ?? [])];
    if (directOnly || attached.includes(oldStatId) || model.extendsModelId === oldStatId) {
      attached = attached.filter((id) => id !== oldStatId);
      if (replacementStatId && !attached.includes(replacementStatId)) attached.push(replacementStatId);
    }
    const extendsModelId =
      model.extendsModelId === oldStatId ? (replacementStatId ?? undefined) : model.extendsModelId;
    return {
      ...model,
      extendsModelId,
      attachedStatModelIds: attached.length > 0 ? attached : undefined,
    };
  };
  const remapFeaturesForModel = (
    model: RuntimeModelSchemaRow,
    oldStatId: string,
    replacementStatId: string | null,
    byId: Map<string, RuntimeModelSchemaRow>,
  ) => {
    const oldStatFeatures = new Set(getStatChain(oldStatId, byId).flatMap((row) => row.featureRefs.map((ref) => ref.featureId)));
    const replacementRefs = replacementStatId
      ? getStatChain(replacementStatId, byId).flatMap((row) => row.featureRefs)
      : [];
    const nextRefs = model.featureRefs.filter((ref) => !oldStatFeatures.has(ref.featureId));
    for (const ref of replacementRefs) {
      if (nextRefs.some((row) => row.featureId === ref.featureId)) continue;
      nextRefs.push({
        featureId: ref.featureId,
        spaces: [...ref.spaces],
        required: ref.required,
        defaultValue: ref.defaultValue,
      });
    }
    return { ...model, featureRefs: nextRefs };
  };
  const openStatImpactDialog = ({
    oldStatId,
    impactedModelIds,
    impactedCanonicalCount,
    deleteStatModel,
    scopeModelId,
    title,
    description,
  }: PendingStatImpactAction) => {
    const defaultReplacement =
      statModelIds.find((statModelId) => statModelId !== oldStatId) ?? "";
    setPendingStatImpactChoice("delete");
    setPendingStatImpactReplacementId(defaultReplacement);
    setPendingStatImpactAction({
      oldStatId,
      impactedModelIds,
      impactedCanonicalCount,
      deleteStatModel,
      scopeModelId,
      title,
      description,
    });
  };
  const applyStatRemovalStrategy = (
    oldStatId: string,
    impactedModelIds: string[],
    replacementStatId: string | null,
    deleteImpactedCanonical: boolean,
    deleteStatModel: boolean,
    scopeModelId?: string,
  ) => {
    let nextModels = runtimeModelSchemas.map((row) =>
      impactedModelIds.includes(row.modelId)
        ? replaceStatLinkOnModel(row, oldStatId, replacementStatId, Boolean(scopeModelId && row.modelId === scopeModelId))
        : row,
    );
    const byIdAfterLinkUpdate = new Map(nextModels.map((row) => [row.modelId, row] as const));
    nextModels = nextModels.map((row) =>
      impactedModelIds.includes(row.modelId)
        ? remapFeaturesForModel(row, oldStatId, replacementStatId, byIdAfterLinkUpdate)
        : row,
    );
    if (deleteStatModel) {
      nextModels = nextModels.filter((row) => row.modelId !== oldStatId);
    }
    onReplaceModelSchemas(nextModels);
    if (deleteImpactedCanonical) {
      const impactedSet = new Set(impactedModelIds);
      const remaining = modelInstances.filter((instance) => !(instance.canonical && impactedSet.has(instance.modelId)));
      onReplaceCanonicalAssets(remaining);
    }
  };
  const getDirectAttachedStatIdsForModel = (modelId: string) => {
    const direct = runtimeModelSchemas.find((row) => row.modelId === modelId);
    if (!direct || direct.modelId.endsWith("stats")) return [] as string[];
    return [
      ...(direct.extendsModelId && direct.extendsModelId.endsWith("stats") ? [direct.extendsModelId] : []),
      ...(direct.attachedStatModelIds ?? []),
    ];
  };
  const handleDetachStatFromModelWithImpact = (modelId: string, oldStatId: string) => {
    const impactedModelIds = findImpactedModelsForStat(oldStatId, modelId);
    const impactedCanonicalCount = modelInstances.filter(
      (instance) => instance.canonical && impactedModelIds.includes(instance.modelId),
    ).length;
    openStatImpactDialog({
      oldStatId,
      impactedModelIds,
      impactedCanonicalCount,
      deleteStatModel: false,
      scopeModelId: modelId,
      title: `Detach ${oldStatId}`,
      description: `Detach from ${modelId}. Impacted models: ${impactedModelIds.length}. Canonical assets: ${impactedCanonicalCount}.`,
    });
  };
  const submitPendingStatImpactAction = () => {
    if (!pendingStatImpactAction) return;
    if (pendingStatImpactChoice === "replace") {
      const normalized = normalizeModelId(pendingStatImpactReplacementId);
      if (!normalized || !statModelIds.includes(normalized) || normalized === pendingStatImpactAction.oldStatId) return;
      applyStatRemovalStrategy(
        pendingStatImpactAction.oldStatId,
        pendingStatImpactAction.impactedModelIds,
        normalized,
        false,
        pendingStatImpactAction.deleteStatModel,
        pendingStatImpactAction.scopeModelId,
      );
      setPendingStatImpactAction(null);
      return;
    }
    applyStatRemovalStrategy(
      pendingStatImpactAction.oldStatId,
      pendingStatImpactAction.impactedModelIds,
      null,
      true,
      pendingStatImpactAction.deleteStatModel,
      pendingStatImpactAction.scopeModelId,
    );
    setPendingStatImpactAction(null);
  };
  const renderStatAttachDetachSubmenus = (targetModelId: string, keyPrefix: string) => {
    const directStatIds = getDirectAttachedStatIdsForModel(targetModelId);
    return (
      <>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <span className="inline-flex items-center gap-2">
              <BarChart3Icon className="h-3.5 w-3.5" />
              Attach Stat Set
            </span>
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="z-[240] max-h-64 overflow-auto">
            {statModelIds.length === 0 ? (
              <ContextMenuItem disabled>No stat sets available</ContextMenuItem>
            ) : (
              statModelIds.map((statModelId) => {
                const isChecked = directStatIds.includes(statModelId);
                return (
                  <ContextMenuCheckboxItem
                    key={`${keyPrefix}:attach:${targetModelId}:${statModelId}`}
                    checked={isChecked}
                    onSelect={(event) => {
                      event.preventDefault();
                      if (isChecked) return;
                      onAttachStatModelToModel(targetModelId, statModelId);
                    }}
                  >
                    {statModelId}
                  </ContextMenuCheckboxItem>
                );
              })
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <span className="inline-flex items-center gap-2">
              <Trash2Icon className="h-3.5 w-3.5" />
              Detach Stat Set
            </span>
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="z-[240] max-h-64 overflow-auto">
            {directStatIds.length === 0 ? (
              <ContextMenuItem disabled>No direct stat set attached</ContextMenuItem>
            ) : (
              directStatIds.map((statId) => (
                <ContextMenuCheckboxItem
                  key={`${keyPrefix}:detach:${targetModelId}:${statId}`}
                  checked
                  onSelect={(event) => {
                    event.preventDefault();
                    handleDetachStatFromModelWithImpact(targetModelId, statId);
                  }}
                >
                  {statId}
                </ContextMenuCheckboxItem>
              ))
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>
      </>
    );
  };
  const renderGroupContextMenuItems = (node: ModelTreeNode) => {
    if (node.nodeType !== "group") return null;
    if (node.id === "group:stats") {
      return (
        <ContextMenuItem onClick={() => createSchemaViaTree("stat")}>
          <span className="inline-flex items-center gap-2">
            <PlusIcon className="h-3.5 w-3.5" />
            Create Stat Set
          </span>
        </ContextMenuItem>
      );
    }
    if (node.id === "group:models") {
      return (
        <ContextMenuItem onClick={() => createSchemaViaTree("model")}>
          <span className="inline-flex items-center gap-2">
            <PlusIcon className="h-3.5 w-3.5" />
            Create Model
          </span>
        </ContextMenuItem>
      );
    }
    if (node.id === "group:canonical") {
      return <ContextMenuItem disabled>Canonical assets are managed in the Info Panel.</ContextMenuItem>;
    }
    return null;
  };
  const renderStatsModelDeleteItem = (modelId: string) => (
    <ContextMenuItem
      className="text-red-300 focus:text-red-200"
      onClick={() => {
        const impactedModelIds = findImpactedModelsForStat(modelId);
        const impactedCanonicalCount = modelInstances.filter(
          (instance) => instance.canonical && impactedModelIds.includes(instance.modelId),
        ).length;
        openStatImpactDialog({
          oldStatId: modelId,
          impactedModelIds,
          impactedCanonicalCount,
          deleteStatModel: true,
          title: `Delete ${modelId}`,
          description: `Delete stat set ${modelId}. Impacted models: ${impactedModelIds.length}. Canonical assets: ${impactedCanonicalCount}.`,
        });
      }}
    >
      <span className="inline-flex items-center gap-2">
        <Trash2Icon className="h-3.5 w-3.5" />
        Delete
      </span>
    </ContextMenuItem>
  );
  const renderModelDeleteItem = (modelId: string) => (
    <ContextMenuItem
      className="text-red-300 focus:text-red-200"
      onClick={() => {
        const linkedCanonicalCount = modelInstances.filter(
          (instance) => instance.modelId === modelId && instance.canonical,
        ).length;
        const warning = [
          `Delete model '${modelId}'?`,
          linkedCanonicalCount > 0
            ? `This will also delete ${linkedCanonicalCount} canonical object(s) that would be serialized for this model.`
            : "No canonical objects are linked to this model.",
          "Deleting models can orphan related content. Updating the model is usually safer.",
        ].join("\n");
        if (!window.confirm(warning)) return;
        onDeleteModelSchema(modelId);
      }}
    >
      <span className="inline-flex items-center gap-2">
        <Trash2Icon className="h-3.5 w-3.5" />
        Delete
      </span>
    </ContextMenuItem>
  );
  const toggleTreeNode = (nodeId: string) => {
    setExpandedTreeNodeIds((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };
  const isExpanded = (nodeId: string) => !!expandedTreeNodeIds[nodeId];
  const getEditorPath = () => {
    if (activeCodeFile) return activeCodeFile.label;
    if (selectedContentObject) return `objects/${selectedContentObject.type}/${selectedContentObject.id}.object.json`;
    return "";
  };
  const resetEditorCode = () => {
    if (activeCodeFile) {
      setObjectEditorCode(activeCodeFile.code);
      return;
    }
    setObjectEditorCode("");
  };
  const definitionCode = useMemo(() => {
    if (panelModelSchema && activeModelJsonSchema) return JSON.stringify(activeModelJsonSchema, null, 2);
    if (activeObjectDefinition) return JSON.stringify(activeObjectDefinition, null, 2);
    return "";
  }, [panelModelSchema, activeModelJsonSchema, activeObjectDefinition]);
  const marshalledObjectCode = useMemo(() => {
    if (activeObjectDefinition) return JSON.stringify(activeObjectDefinition, null, 2);
    if (!panelModelSchema) return "";
    const stats = Object.fromEntries(
      panelModelSchema.featureRefs.map((ref) => [
        ref.featureId,
        Number((ref.defaultValue ?? featureDefaultMap.get(ref.featureId) ?? 0).toFixed(3)),
      ]),
    );
    return JSON.stringify(
      {
        modelId: panelModelSchema.modelId,
        label: panelModelSchema.label,
        stats,
      },
      null,
      2,
    );
  }, [activeObjectDefinition, panelModelSchema, featureDefaultMap]);
  const codeTabs = useMemo(() => {
    const tabs: Array<{ id: string; label: string; code: string }> = [];
    const assetFileStem = toFileStem(
      panelModelInstance?.name ?? selectedContentObject?.name ?? panelModelSchema?.modelId ?? "asset",
    );
    if (panelModelSchema) {
      const tsFile = buildSingleSchemaFileForLanguage(
        panelModelSchema,
        runtimeModelSchemas,
        featureDefaultMap,
        "typescript",
        assetFileStem,
      );
      const cppFile = buildSingleSchemaFileForLanguage(
        panelModelSchema,
        runtimeModelSchemas,
        featureDefaultMap,
        "cpp",
        assetFileStem,
      );
      const csFile = buildSingleSchemaFileForLanguage(
        panelModelSchema,
        runtimeModelSchemas,
        featureDefaultMap,
        "csharp",
        assetFileStem,
      );
      if (tsFile) tabs.push({ id: "lang:typescript", label: tsFile.path, code: tsFile.code });
      if (cppFile) tabs.push({ id: "lang:cpp", label: cppFile.path, code: cppFile.code });
      if (csFile) tabs.push({ id: "lang:csharp", label: csFile.path, code: csFile.code });
    }
    if (definitionCode) tabs.push({ id: "json:schema", label: `${assetFileStem}.schema.json`, code: definitionCode });
    if (marshalledObjectCode) tabs.push({ id: "json:data", label: `${assetFileStem}.json`, code: marshalledObjectCode });
    return tabs;
  }, [panelModelSchema, panelModelInstance, selectedContentObject, runtimeModelSchemas, featureDefaultMap, definitionCode, marshalledObjectCode]);
  const activeCodeFile = useMemo(() => {
    if (codeTabs.length === 0) return null;
    return codeTabs.find((tab) => tab.id === activeCodeTabId) ?? codeTabs[0]!;
  }, [codeTabs, activeCodeTabId]);
  const hasCodePreview = !!activeCodeFile;
  useEffect(() => {
    if (codeTabs.length === 0) {
      setActiveCodeTabId("");
      return;
    }
    if (!activeCodeTabId || !codeTabs.some((tab) => tab.id === activeCodeTabId)) {
      setActiveCodeTabId(codeTabs[0]!.id);
    }
  }, [codeTabs, activeCodeTabId]);
  useEffect(() => {
    if (activeCodeFile) {
      setObjectEditorCode(activeCodeFile.code);
      return;
    }
    setObjectEditorCode("");
  }, [activeCodeFile]);

  const isStatsSelection =
    !!selectedTreeNode &&
    (selectedTreeNode.id === "group:stats" ||
      selectedTreeNode.id.startsWith("stats:") ||
      (!!selectedTreeNode.modelId && selectedTreeNode.modelId.endsWith("stats") && !selectedTreeNode.canonical));
  const isModelsSelection =
    !!selectedTreeNode &&
    (selectedTreeNode.id === "group:models" ||
      selectedTreeNode.id.startsWith("models:") ||
      selectedTreeNode.nodeType === "model-group" ||
      (!!selectedTreeNode.modelId && !selectedTreeNode.modelId.endsWith("stats") && !selectedTreeNode.canonical));
  const isCanonicalSelection =
    !!selectedTreeNode &&
    (selectedTreeNode.id === "group:canonical" ||
      selectedTreeNode.id.startsWith("canonical-model:") ||
      selectedTreeNode.canonical === true);
  useEffect(() => {
    if (!selectedTreeNode?.id.startsWith("canonical-model:")) return;
    setCanonicalTab("edit");
  }, [selectedTreeNode?.id]);
  useEffect(() => {
    if (!selectedTreeNode) return;
    if (
      selectedTreeNode.id === "group:canonical" ||
      selectedTreeNode.id.startsWith("canonical:") ||
      selectedTreeNode.id.startsWith("canonical-model:") ||
      selectedTreeNode.canonical
    ) {
      setObjectSectionTab("canonical");
      return;
    }
    setObjectSectionTab("models");
  }, [selectedTreeNode]);

  const statsInfoPanelContent = (
    <StatsInfoPanelContent
      selectedTreeNode={selectedTreeNode}
      panelModelSchema={panelModelSchema}
      runtimeFeatureSchema={runtimeFeatureSchema}
      featureDefaultMap={featureDefaultMap}
      newStatFeatureId={newStatFeatureId}
      newStatModelIdDraft={newStatModelIdDraft}
      newStatLabelDraft={newStatLabelDraft}
      newStatTemplateModelId={newStatTemplateModelId}
      onSetNewStatFeatureId={setNewStatFeatureId}
      onSetNewStatModelIdDraft={setNewStatModelIdDraft}
      onSetNewStatLabelDraft={setNewStatLabelDraft}
      onCreateModelSchema={onCreateModelSchema}
      onSelectTreeNodeId={setSelectedTreeNodeId}
      onAddFeatureRefToModel={onAddFeatureRefToModel}
      onRemoveFeatureRefFromModel={onRemoveFeatureRefFromModel}
      onUpdateFeatureRefDefaultValue={onUpdateFeatureRefDefaultValue}
      normalizeModelId={normalizeModelId}
    />
  );

  const modelsInfoPanelContent = (
    <ModelsInfoPanelContent
      selectedTreeNode={selectedTreeNode}
      canonicalAssetCount={modelInstances.filter((instance) => instance.canonical).length}
      modelDefinitionCount={runtimeModelSchemas.filter((row) => !row.modelId.endsWith("stats")).length}
    />
  );

  const modelInfoPanelContent = panelModelSchema ? (
    <div className="space-y-2 text-xs">
      <div className="rounded border border-border bg-muted/20 p-2">
        <div className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">Model</div>
        <div className="grid gap-2">
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Label
            <input
              type="text"
              value={modelLabelDraft}
              onChange={(event) => setModelLabelDraft(event.target.value)}
              className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
            />
          </label>
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Description
            <textarea
              value={modelDescriptionDraft}
              onChange={(event) => setModelDescriptionDraft(event.target.value)}
              className="mt-1 h-16 w-full resize-y rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                onUpdateModelMetadata(panelModelSchema.modelId, {
                  label: modelLabelDraft.trim() || panelModelSchema.modelId,
                  description: modelDescriptionDraft.trim(),
                })
              }
              className="rounded border border-border px-2 py-1 text-[10px] hover:bg-muted/30"
            >
              Save Model
            </button>
            <button
              type="button"
              onClick={() => {
                const linkedCanonicalCount = modelInstances.filter(
                  (instance) => instance.modelId === panelModelSchema.modelId && instance.canonical,
                ).length;
                const warning = [
                  `Delete model '${panelModelSchema.modelId}'?`,
                  linkedCanonicalCount > 0
                    ? `This will also delete ${linkedCanonicalCount} canonical object(s) that would be serialized for this model.`
                    : "No canonical objects are linked to this model.",
                  "Deleting models can orphan related content. Updating the model is usually safer.",
                ].join("\n");
                if (!window.confirm(warning)) return;
                onDeleteModelSchema(panelModelSchema.modelId);
              }}
              className="rounded border border-red-500/40 px-2 py-1 text-[10px] text-red-200 hover:bg-red-500/10"
            >
              Delete Model
            </button>
          </div>
        </div>
      </div>
      {panelModelSchema.description ? <p className="text-muted-foreground">{panelModelSchema.description}</p> : null}
      {migrationOps.length > 0 ? (
        <div className="group rounded border border-amber-400/40 bg-amber-500/10">
          <div className="flex items-center justify-between border-b border-amber-400/40 px-2 py-1 text-[10px] text-amber-100">
            <span>Migration Script ({migrationOps.length})</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(migrationScript);
                  setCopiedScript(true);
                  setTimeout(() => setCopiedScript(false), 1200);
                }}
                className="opacity-0 transition-opacity group-hover:opacity-100"
              >
                {copiedScript ? "Copied" : "Copy"}
              </button>
              <button type="button" onClick={clearMigrationOps} className="hover:text-amber-50">Clear</button>
            </div>
          </div>
          <pre className="max-h-44 overflow-auto p-2 font-mono text-[10px] text-amber-50">{migrationScript}</pre>
        </div>
      ) : null}
        <div>
          <div className="mb-1 text-[11px] font-medium uppercase text-muted-foreground">
          Stats ({panelResolvedFeatureRefs.length})
        </div>
        <div className="max-h-[36vh] overflow-auto rounded border border-border">
          {panelResolvedFeatureRefs.map((ref) => (
            <div
              key={`${panelModelSchema.modelId}-${ref.featureId}-${ref.spaces.join("|")}`}
              className="flex items-center justify-between border-b border-border px-2 py-1 text-[11px] last:border-b-0"
            >
              <span className="font-mono text-foreground">{ref.featureId}</span>
              <input
                type="text"
                value={(ref.defaultValue ?? featureDefaultMap.get(ref.featureId) ?? 0).toFixed(2)}
                disabled
                className="w-20 rounded border border-border bg-background px-1.5 py-0.5 text-right font-mono text-[10px] text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  ) : selectedContentObject ? (
    <div className="mb-2 rounded border border-border bg-muted/20 p-2 text-xs">
      <div className="font-mono text-foreground">{selectedContentObject.id}</div>
      <div className="text-muted-foreground">type: {selectedContentObject.type}</div>
      <div className="text-muted-foreground">branch: {selectedContentObject.branch}</div>
      <div className="text-muted-foreground">unlock radius: {selectedContentObject.unlockRadius ?? "n/a"}</div>
    </div>
  ) : (
    <p className="text-xs text-muted-foreground">Select a model node to inspect details.</p>
  );

  const sharedCodeBlockPanel = activeCodeFile ? (
    <div className="mt-2 rounded border border-border bg-background/40">
      <div className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1">
        {codeTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveCodeTabId(tab.id)}
            className={`rounded border px-2 py-0.5 text-[10px] font-mono ${
              activeCodeFile.id === tab.id
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:bg-muted/30"
            }`}
            title={
              tab.id === "lang:typescript"
                ? "TypeScript"
                : tab.id === "lang:cpp"
                  ? "C++"
                  : tab.id === "lang:csharp"
                    ? "C#"
                    : tab.id === "json:schema"
                      ? "Schema JSON"
                      : "Asset JSON"
            }
          >
            {tab.id === "lang:typescript" ? (
              <SiTypescript className="h-3.5 w-3.5" />
            ) : tab.id === "lang:cpp" ? (
              <SiCplusplus className="h-3.5 w-3.5" />
            ) : tab.id === "lang:csharp" ? (
              <SiSharp className="h-3.5 w-3.5" />
            ) : tab.id === "json:schema" ? (
              <SiJsonwebtokens className="h-3.5 w-3.5" />
            ) : (
              <BracesIcon className="h-3.5 w-3.5" />
            )}
          </button>
        ))}
      </div>
      <div className="group/code flex items-center justify-between border-b border-border px-2 py-1 text-[10px] text-muted-foreground">
        <span className="inline-flex min-w-0 items-center gap-1 font-mono">
          <FileCode2Icon className="h-3 w-3 shrink-0" />
          <span className="truncate">{activeCodeFile.label}</span>
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetEditorCode}
            className="opacity-0 transition-opacity group-hover/code:opacity-100 hover:text-foreground"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(objectEditorCode);
              setCopiedEditorCode(true);
              setTimeout(() => setCopiedEditorCode(false), 1200);
            }}
            className="opacity-0 transition-opacity group-hover/code:opacity-100 hover:text-foreground"
          >
            {copiedEditorCode ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <div className="h-72 overflow-auto">
        <SyntaxHighlighter
          language={codeLanguageForTabId(activeCodeFile.id)}
          style={oneDark}
          showLineNumbers
          wrapLongLines
          customStyle={{
            margin: 0,
            background: "transparent",
            fontSize: "10px",
            minHeight: "100%",
          }}
          lineNumberStyle={{
            minWidth: "2.5em",
            opacity: 0.5,
            paddingRight: "0.75em",
          }}
        >
          {objectEditorCode}
        </SyntaxHighlighter>
      </div>
    </div>
  ) : null;

  const canonicalInfoPanelContent = (
    <CanonicalInfoPanelContent
      panelModelSchema={panelModelSchema}
      panelModelInstance={panelModelInstance}
      panelResolvedFeatureRefs={panelResolvedFeatureRefs}
      featureDefaultMap={featureDefaultMap}
      canonicalTab={canonicalTab}
      canonicalCreateName={canonicalCreateName}
      canonicalCreateModelId={canonicalCreateModelId}
      canonicalNameDraft={canonicalNameDraft}
      sharedCodeBlockPanel={sharedCodeBlockPanel}
      onSetCanonicalTab={setCanonicalTab}
      onSetCanonicalCreateName={setCanonicalCreateName}
      onSetCanonicalNameDraft={setCanonicalNameDraft}
      onAddCanonicalAsset={addCanonicalAsset}
      onRenameModelInstance={renameModelInstance}
      onDeleteModelInstance={deleteModelInstance}
      onOpenCanonicalAssetInExplorer={onOpenCanonicalAssetInExplorer}
    />
  );

  const infoPanelName = !selectedTreeNode
    ? "none"
    : isCanonicalSelection
      ? "canonicalInfoPanelContent"
      : isStatsSelection
        ? "statsInfoPanelContent"
        : isModelsSelection && selectedTreeNode.id === "group:models"
          ? "modelsInfoPanelContent"
          : "modelInfoPanelContent";
  const infoPanelTone: "none" | "canonical" | "stats" | "models" =
    !selectedTreeNode
      ? "none"
      : isCanonicalSelection
        ? "canonical"
        : isStatsSelection
          ? "stats"
          : "models";
  const infoPanelToneClasses: Record<"none" | "canonical" | "stats" | "models", string> = {
    none: "border-border bg-background",
    canonical: "border-amber-400/40 bg-amber-500/5",
    stats: "border-cyan-400/40 bg-cyan-500/5",
    models: "border-indigo-400/40 bg-indigo-500/5",
  };
  const infoPanelHeaderToneClasses: Record<"none" | "canonical" | "stats" | "models", string> = {
    none: "border-border bg-transparent",
    canonical: "border-amber-400/40 bg-amber-500/10",
    stats: "border-cyan-400/40 bg-cyan-500/10",
    models: "border-indigo-400/40 bg-indigo-500/10",
  };

  const infoPanelContent = !selectedTreeNode ? (
    <p className="text-xs text-muted-foreground">Select a node to view details.</p>
  ) : isCanonicalSelection ? (
    canonicalInfoPanelContent
  ) : isStatsSelection ? (
    statsInfoPanelContent
  ) : isModelsSelection && selectedTreeNode.id === "group:models" ? (
    modelsInfoPanelContent
  ) : isModelsSelection ? (
    modelInfoPanelContent
  ) : (
    modelInfoPanelContent
  );

  if (!open) return null;
  type TreeSectionTone = "none" | "stats" | "models" | "canonical";
  const toneTextClasses: Record<TreeSectionTone, string> = {
    none: "text-muted-foreground hover:bg-muted/30",
    stats: "text-cyan-100 hover:bg-cyan-500/10",
    models: "text-indigo-100 hover:bg-indigo-500/10",
    canonical: "text-amber-100 hover:bg-amber-500/10",
  };
  const toneDepthRowClasses: Record<TreeSectionTone, string[]> = {
    none: ["", "", "", "", "", ""],
    stats: [
      "bg-cyan-500/5",
      "bg-cyan-500/10",
      "bg-cyan-500/15",
      "bg-cyan-500/20",
      "bg-cyan-500/25",
      "bg-cyan-500/30",
    ],
    models: [
      "bg-indigo-500/5",
      "bg-indigo-500/10",
      "bg-indigo-500/15",
      "bg-indigo-500/20",
      "bg-indigo-500/25",
      "bg-indigo-500/30",
    ],
    canonical: [
      "bg-amber-500/5",
      "bg-amber-500/10",
      "bg-amber-500/15",
      "bg-amber-500/20",
      "bg-amber-500/25",
      "bg-amber-500/30",
    ],
  };
  const toneExpandedBorderClasses: Record<TreeSectionTone, string> = {
    none: "",
    stats: "border-l border-cyan-400/30",
    models: "border-l border-indigo-400/30",
    canonical: "border-l border-amber-400/30",
  };
  const renderTreeNodes = (nodes: ModelTreeNode[], depth = 0, sectionTone: TreeSectionTone = "none") =>
    nodes.map((node) => {
      const hasChildren = !!node.children?.length;
      const expanded = hasChildren ? isExpanded(node.id) : false;
      const isCanonicalModelNode = node.nodeType === "model" && node.id.startsWith("canonical-model:");
      const isStatsModelNode = node.nodeType === "model" && !!node.modelId && node.modelId.endsWith("stats");
      const isModelsModelNode = node.nodeType === "model" && !!node.modelId && !node.modelId.endsWith("stats") && !isCanonicalModelNode;
      const isStatsNamespaceNode = node.nodeType === "model-group" && node.id.startsWith("stats:");
      const isModelsNamespaceNode = node.nodeType === "model-group" && node.id.startsWith("models:");
      const namespaceModelId =
        node.nodeType === "model-group" && node.id.includes(":")
          ? node.id.slice(node.id.indexOf(":") + 1)
          : null;
      const isCanonicalNamespaceModelNode =
        node.nodeType === "model-group" &&
        node.id.startsWith("canonical:") &&
        !!namespaceModelId &&
        runtimeModelSchemas.some((row) => row.modelId === namespaceModelId);
      const childCount = node.children?.length ?? 0;
      const statAttachmentModelId =
        node.modelId ??
        ((isModelsNamespaceNode || isCanonicalNamespaceModelNode) && namespaceModelId ? namespaceModelId : null);
      const attachedStatIds = statAttachmentModelId ? (attachedStatModelIdsByModelId.get(statAttachmentModelId) ?? []) : [];
      const nextTone: TreeSectionTone =
        node.id === "group:stats"
          ? "stats"
          : node.id === "group:models"
            ? "models"
          : node.id === "group:canonical"
              ? "canonical"
              : sectionTone;
      const depthIndex = Math.min(depth, 5);
      const depthClass = toneDepthRowClasses[nextTone][depthIndex] ?? "";
      const expandedClass = expanded ? `${toneExpandedBorderClasses[nextTone]} ${depthClass}` : "";
      const selected =
        node.instanceId != null
          ? node.instanceId === activeModelInstanceId
          : selectedTreeNodeId === node.id;
      const row = (
        <div
          key={node.id}
          className={`flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-xs ${
            selected ? "bg-primary/15 text-primary" : `${toneTextClasses[nextTone]} ${depthClass} ${expandedClass}`
          }`}
          style={{ paddingLeft: `${6 + depth * 14}px` }}
          onClick={() => {
            setSelectedTreeNodeId(node.id);
            if (
              node.nodeType === "group" ||
              node.nodeType === "model" ||
              node.nodeType === "object-group" ||
              node.nodeType === "model-group"
            ) {
              if (node.modelId) setActiveSelection(node.modelId, null);
              if (hasChildren) toggleTreeNode(node.id);
              return;
            }
            if (node.nodeType === "instance" && node.modelId) {
              setActiveSelection(node.modelId, node.instanceId ?? null);
            }
          }}
        >
          <button
            type="button"
            className={`inline-flex h-4 w-4 items-center justify-center rounded ${hasChildren ? "hover:bg-muted/40" : "opacity-0"}`}
            onClick={(event) => {
              event.stopPropagation();
              if (hasChildren) toggleTreeNode(node.id);
            }}
            tabIndex={-1}
          >
            {hasChildren ? (
              expanded ? <ChevronDownIcon className="h-3.5 w-3.5" /> : <ChevronRightIcon className="h-3.5 w-3.5" />
            ) : null}
          </button>
          {node.id === "group:stats" ? (
            <BarChart3Icon className="h-3.5 w-3.5" />
          ) : node.id === "group:models" ? (
            <BoxesIcon className="h-3.5 w-3.5" />
          ) : node.id === "group:canonical" ? (
            <PackageIcon className="h-3.5 w-3.5" />
          ) : isCanonicalModelNode ? (
            <FolderTreeIcon className="h-3.5 w-3.5" />
          ) : node.nodeType === "group" || node.nodeType === "object-group" || node.nodeType === "model-group" ? (
            <FolderTreeIcon className="h-3.5 w-3.5" />
          ) : node.nodeType === "object" ? (
            <BracesIcon className="h-3.5 w-3.5" />
          ) : (
            <FileCode2Icon className="h-3.5 w-3.5" />
          )}
          {isStatsModelNode ? (
            <span
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: statColorByModelId.get(node.modelId ?? "") ?? "hsl(195, 85%, 62%)" }}
              title={node.modelId ?? "stat"}
            />
          ) : null}
          <span className="truncate">{node.name}</span>
          <div className="ml-auto inline-flex items-center gap-1">
            {attachedStatIds.slice(0, 4).map((statId) => (
              <span
                key={`${node.id}:attached-stat:${statId}`}
                className="inline-block size-2 rounded-full border border-black/20"
                style={{ backgroundColor: statColorByModelId.get(statId) ?? "hsl(195, 85%, 62%)" }}
                title={`Attached stat set: ${statId}`}
              />
            ))}
            {attachedStatIds.length > 4 ? (
              <span className="rounded border border-border bg-background/60 px-1 text-[9px] font-mono text-muted-foreground">
                +{attachedStatIds.length - 4}
              </span>
            ) : null}
            {hasChildren ? (
              <span className="inline-flex min-w-5 items-center justify-center rounded border border-border bg-background/60 px-1 text-[10px] font-mono text-muted-foreground">
                {childCount}
              </span>
            ) : null}
            {node.nodeType === "instance" && node.canonical ? <span className="rounded bg-amber-500/20 px-1 text-[10px] text-amber-100">C</span> : null}
          </div>
        </div>
      );

      const wrappedRow =
        node.nodeType === "group" || node.nodeType === "model" || node.nodeType === "instance" || node.nodeType === "model-group" ? (
          <ContextMenu>
            <ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
            <TreeContextMenuContent
              node={node}
              namespaceModelId={namespaceModelId}
              isCanonicalModelNode={isCanonicalModelNode}
              isCanonicalNamespaceModelNode={isCanonicalNamespaceModelNode}
              isStatsNamespaceNode={isStatsNamespaceNode}
              isStatsModelNode={isStatsModelNode}
              isModelsNamespaceNode={isModelsNamespaceNode}
              isModelsModelNode={isModelsModelNode}
              renderGroupItems={renderGroupContextMenuItems}
              renderStatAttachDetachSubmenus={renderStatAttachDetachSubmenus}
              renderStatsModelDeleteItem={renderStatsModelDeleteItem}
              renderModelDeleteItem={renderModelDeleteItem}
              suggestDerivedStatId={suggestDerivedStatId}
              suggestDerivedModelId={suggestDerivedModelId}
              formatModelIdForUi={formatModelIdForUi}
              createSchemaViaTree={createSchemaViaTree}
              createCanonicalAsset={(modelId, nodeId) => {
                const suggested = `new_${toFileStem(modelId)}`;
                const nextName = window.prompt(`Canonical asset name for ${modelId}:`, suggested) ?? "";
                addCanonicalAsset(modelId, nextName.trim() || undefined);
                setSelectedTreeNodeId(nodeId);
                setCanonicalTab("edit");
              }}
            />
          </ContextMenu>
        ) : (
          row
        );

      return (
        <div key={`tree-node-${node.id}`}>
          {wrappedRow}
          {hasChildren && expanded ? (
            <div className={`${toneExpandedBorderClasses[nextTone]} ${depthClass} ml-1 rounded`}>
              {renderTreeNodes(node.children ?? [], depth + 1, nextTone)}
            </div>
          ) : null}
        </div>
      );
    });

  return (
    <>
      <div
        className="fixed inset-0 z-[210] flex items-center justify-center bg-black/60 p-4"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="h-[88vh] w-[96vw] max-w-[1500px] overflow-hidden rounded border border-border bg-card p-4 shadow-lg" onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderTreeIcon className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Content Creator</p>
            <HelpInfo
              tone="context"
              title="Content Creator"
              body="Create and manage model objects and canonical assets. Select nodes in the object tree to inspect metadata, stats, and code representations."
            />
          </div>
          <button type="button" className="rounded border border-border px-2 py-0.5 text-xs hover:bg-muted/30" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="grid h-[calc(88vh-88px)] min-h-0 gap-3 md:grid-cols-[380px_minmax(0,1fr)]">
          <div className="flex min-h-0 flex-col rounded border border-border p-2">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="text-[11px] font-medium uppercase text-muted-foreground">Object Tree</div>
              <div className="inline-flex items-center rounded border border-border bg-background/60 p-0.5">
                <button
                  type="button"
                  onClick={() => setObjectSectionTab("models")}
                  className={`rounded px-1.5 py-0.5 text-[10px] ${
                    objectSectionTab === "models" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/30"
                  }`}
                  title="Models section"
                >
                  Models
                </button>
                <button
                  type="button"
                  onClick={() => setObjectSectionTab("canonical")}
                  className={`rounded px-1.5 py-0.5 text-[10px] ${
                    objectSectionTab === "canonical" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/30"
                  }`}
                  title="Canonical assets section"
                >
                  Canonical Assets
                </button>
              </div>
            </div>
            <div className="mb-1 flex items-center justify-end">
              <div className="inline-flex items-center rounded border border-border bg-background/60 p-0.5">
                <button
                  type="button"
                  onClick={() => (objectSectionTab === "models" ? setModelsNavigatorMode("tree") : setCanonicalNavigatorMode("tree"))}
                  className={`rounded px-1.5 py-0.5 text-[10px] ${
                    activeNavigatorMode === "tree" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/30"
                  }`}
                  title="Tree view"
                >
                  <FolderTreeIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => (objectSectionTab === "models" ? setModelsNavigatorMode("json") : setCanonicalNavigatorMode("json"))}
                  className={`rounded px-1.5 py-0.5 text-[10px] ${
                    activeNavigatorMode === "json" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/30"
                  }`}
                  title="JSON schema view"
                >
                  <BracesIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="mb-1 rounded border border-border bg-muted/20 px-2 py-1 text-[10px] text-muted-foreground">
              Selected:{" "}
              <span className="font-mono text-foreground">
                {selectedTreeNode ? selectedTreeNode.name : "none"}
              </span>
            </div>
            <div className={`min-h-0 flex-1 rounded border border-border bg-background/40 p-1 ${activeNavigatorMode === "json" ? "overflow-auto" : "overflow-y-auto"}`}>
              {activeNavigatorMode === "tree" ? (
                renderTreeNodes(activeTreeData)
              ) : (
                <div className="space-y-2 p-1">
                  {jsonApplyError ? (
                    <div className="rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-[11px] text-red-200">{jsonApplyError}</div>
                  ) : null}
                  {objectSectionTab === "models" ? (
                    <>
                      <SchemaJsonSection
                        title="Models Schema"
                        open={jsonSectionOpen.models}
                        mode={jsonSectionEditorMode.models}
                        draft={modelsSchemaDraft}
                        deferredDraft={deferredModelsSchemaJson}
                        loadingText="Preparing models schema..."
                        syntaxMounted={jsonSyntaxMounted}
                        onOpenChange={(isOpen) => setJsonSectionOpen((prev) => ({ ...prev, models: isOpen }))}
                        onModeChange={(mode) => setJsonSectionEditorMode((prev) => ({ ...prev, models: mode }))}
                        onDraftChange={setModelsSchemaDraft}
                        onApply={applyModelsAndStatsSchemaDraft}
                      />
                      <SchemaJsonSection
                        title="Stats Schema"
                        open={jsonSectionOpen.stats}
                        mode={jsonSectionEditorMode.stats}
                        draft={statsSchemaDraft}
                        deferredDraft={deferredStatsSchemaJson}
                        loadingText="Preparing stats schema..."
                        syntaxMounted={jsonSyntaxMounted}
                        onOpenChange={(isOpen) => setJsonSectionOpen((prev) => ({ ...prev, stats: isOpen }))}
                        onModeChange={(mode) => setJsonSectionEditorMode((prev) => ({ ...prev, stats: mode }))}
                        onDraftChange={setStatsSchemaDraft}
                        onApply={applyModelsAndStatsSchemaDraft}
                      />
                    </>
                  ) : (
                    <SchemaJsonSection
                      title="Canonical Assets"
                      open={jsonSectionOpen.canonical}
                      mode={jsonSectionEditorMode.canonical}
                      draft={canonicalSchemaDraft}
                      deferredDraft={deferredCanonicalSchemaJson}
                      loadingText="Preparing canonical schema..."
                      syntaxMounted={jsonSyntaxMounted}
                      onOpenChange={(isOpen) => setJsonSectionOpen((prev) => ({ ...prev, canonical: isOpen }))}
                      onModeChange={(mode) => setJsonSectionEditorMode((prev) => ({ ...prev, canonical: mode }))}
                      onDraftChange={setCanonicalSchemaDraft}
                      onApply={applyCanonicalSchemaDraft}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
          <div className={`min-h-0 overflow-auto rounded border p-2 ${infoPanelToneClasses[infoPanelTone]}`}>
            <div className={`mb-2 flex items-start justify-between gap-2 border-b pb-2 ${infoPanelHeaderToneClasses[infoPanelTone]}`}>
              <div className="flex items-start gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-[10px] font-semibold text-muted-foreground">
                  i
                </span>
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-semibold">Info Panel</p>
                    <HelpInfo
                      tone="context"
                      title="Info Panel"
                      body="Inspect selected object tree nodes, view model metadata, review stats, and browse generated code/schema/data tabs."
                    />
                  </div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{infoPanelName}</p>
                </div>
              </div>
            </div>
            {infoPanelContent}
            {codePanelOpen ? sharedCodeBlockPanel : null}
          </div>
        </div>
        </div>
      </div>
      <Dialog
        open={!!pendingStatImpactAction}
        onOpenChange={(nextOpen: boolean) => {
          if (!nextOpen) setPendingStatImpactAction(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{pendingStatImpactAction?.title ?? "Confirm stat impact"}</DialogTitle>
            <DialogDescription>{pendingStatImpactAction?.description ?? ""}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1 text-xs">
            <label className="flex cursor-pointer items-start gap-2 rounded border border-border p-2">
              <input
                type="radio"
                name="stat-impact-strategy"
                checked={pendingStatImpactChoice === "delete"}
                onChange={() => setPendingStatImpactChoice("delete")}
                className="mt-0.5"
              />
              <span className="space-y-0.5">
                <span className="block font-medium text-foreground">Delete impacted canonical assets</span>
                <span className="block text-muted-foreground">
                  Delete canonical assets tied to impacted models
                  {pendingStatImpactAction ? ` (${pendingStatImpactAction.impactedCanonicalCount}).` : "."}
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 rounded border border-border p-2">
              <input
                type="radio"
                name="stat-impact-strategy"
                checked={pendingStatImpactChoice === "replace"}
                onChange={() => setPendingStatImpactChoice("replace")}
                className="mt-0.5"
              />
              <span className="flex-1 space-y-1">
                <span className="block font-medium text-foreground">Replace/remap to stat set</span>
                <span className="block text-muted-foreground">
                  Re-link impacted models to another stat set and remap feature refs.
                </span>
                <select
                  value={pendingStatImpactReplacementId}
                  onChange={(event) => setPendingStatImpactReplacementId(event.target.value)}
                  className="h-8 w-full rounded border border-border bg-background px-2 font-mono text-[11px] text-foreground"
                  disabled={pendingStatImpactChoice !== "replace"}
                >
                  <option value="">Select stat set</option>
                  {statModelIds
                    .filter((statModelId) => statModelId !== pendingStatImpactAction?.oldStatId)
                    .map((statModelId) => (
                      <option key={`replace-stat-option:${statModelId}`} value={statModelId}>
                        {statModelId}
                      </option>
                    ))}
                </select>
              </span>
            </label>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPendingStatImpactAction(null)}>
              Cancel
            </Button>
            <Button
              onClick={submitPendingStatImpactAction}
              disabled={pendingStatImpactChoice === "replace" && !pendingStatImpactReplacementId}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const PATCH_DRAFTS_STORAGE_KEY = "dungeonbreak.spacevectors.patch.drafts.v1";

const MODEL_PRESETS: ModelPreset[] = [
  {
    id: "entity.villager",
    label: "Entity Villager",
    model: {
      modelId: "entity.villager",
      label: "Entity Villager",
      description: "Dialogue-heavy civilian profile for social loops.",
      featureRefs: [
        { featureId: "Empathy", spaces: ["dialogue", "archetype"], required: true },
        { featureId: "Comprehension", spaces: ["dialogue", "skill"] },
        { featureId: "Awareness", spaces: ["entity", "dialogue"] },
        { featureId: "Fame", spaces: ["entity", "event"] },
      ],
    },
  },
  {
    id: "entity.hostile",
    label: "Entity Hostile",
    model: {
      modelId: "entity.hostile",
      label: "Entity Hostile",
      description: "Generic hostile profile used for enemy archetypes.",
      featureRefs: [
        { featureId: "Survival", spaces: ["combat", "event"], required: true },
        { featureId: "Constraint", spaces: ["combat"] },
        { featureId: "Direction", spaces: ["combat"] },
        { featureId: "Momentum", spaces: ["combat", "entity"], required: true },
      ],
    },
  },
  {
    id: "item.weapon",
    label: "Item Weapon",
    model: {
      modelId: "item.weapon",
      label: "Item Weapon",
      description: "Combat item profile.",
      featureRefs: [
        { featureId: "Constraint", spaces: ["combat"], required: true },
        { featureId: "Direction", spaces: ["combat"] },
        { featureId: "Survival", spaces: ["combat", "event"] },
        { featureId: "Momentum", spaces: ["combat", "entity"], required: true },
      ],
    },
  },
  {
    id: "room.rune_forge",
    label: "Room Rune Forge",
    model: {
      modelId: "room.rune_forge",
      label: "Room Rune Forge",
      description: "Crafting and upgrade room specialization.",
      featureRefs: [
        { featureId: "Construction", spaces: ["room", "skill"], required: true },
        { featureId: "Constraint", spaces: ["room", "skill"] },
        { featureId: "Projection", spaces: ["event", "skill"] },
        { featureId: "Effort", spaces: ["entity", "level"] },
      ],
    },
  },
  {
    id: "effect.dot",
    label: "Effect DOT",
    model: {
      modelId: "effect.dot",
      label: "Effect DOT",
      description: "Damage over time profile.",
      featureRefs: [
        { featureId: "Constraint", spaces: ["effect", "combat"], required: true },
        { featureId: "Survival", spaces: ["effect", "combat"], required: true },
        { featureId: "Momentum", spaces: ["combat", "event"] },
      ],
    },
  },
];

function validatePatchSchema(patch: SpaceVectorsPatchPayload): string[] {
  const errors: string[] = [];
  const featureIds = patch.featureSchema.map((row) => row.featureId.trim()).filter((id) => id.length > 0);
  const modelIds = patch.modelSchemas.map((row) => row.modelId.trim()).filter((id) => id.length > 0);
  const uniqueFeatureIds = new Set(featureIds);
  const uniqueModelIds = new Set(modelIds);
  if (featureIds.length !== uniqueFeatureIds.size) {
    errors.push("Duplicate featureId detected in featureSchema.");
  }
  if (modelIds.length !== uniqueModelIds.size) {
    errors.push("Duplicate modelId detected in modelSchemas.");
  }
  for (const model of patch.modelSchemas) {
    if (!model.modelId.trim()) {
      errors.push("modelSchemas contains an empty modelId.");
      continue;
    }
    if (model.featureRefs.length === 0 && !model.extendsModelId) {
      errors.push(`Model '${model.modelId}' has no featureRefs.`);
      continue;
    }
    for (const ref of model.featureRefs) {
      if (!uniqueFeatureIds.has(ref.featureId)) {
        errors.push(`Model '${model.modelId}' references unknown featureId '${ref.featureId}'.`);
      }
      if (!Array.isArray(ref.spaces) || ref.spaces.length === 0) {
        errors.push(`Model '${model.modelId}' has feature '${ref.featureId}' without spaces.`);
      }
    }
  }
  return [...new Set(errors)];
}

function makeNumberRecord<const T extends readonly string[]>(
	keys: T,
	value: number,
): Record<T[number], number> {
	return Object.fromEntries(keys.map((key) => [key, value])) as Record<T[number], number>;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeModelId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "_")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

function downloadJson(filename: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

type ContentPoint = {
  type: string;
  id: string;
  name: string;
  branch: string;
  vector: number[];
  vectorCombined?: number[];
  x: number;
  y: number;
  z: number;
  xCombined?: number;
  yCombined?: number;
  zCombined?: number;
  cluster?: number;
  unlockRadius?: number;
};

type SpaceData = {
  schemaVersion: string;
  traitNames: string[];
  featureNames: string[];
  pca?: { mean: number[]; components: number[][] };
  spaces?: {
    trait?: { pca: { mean: number[]; components: number[][] } };
    combined?: { pca: { mean: number[]; components: number[][] } };
  };
  content: ContentPoint[];
};

const EMPTY_SPACE_DATA: SpaceData = {
  schemaVersion: "space-data.empty.v1",
  traitNames: [...TRAIT_NAMES],
  featureNames: [...FEATURE_NAMES],
  content: [],
};

type SpaceMode = "trait" | "combined";
type ColorBy = "branch" | "type" | "cluster";
type RuntimeSpaceView =
  | "content-combined"
  | "content-skill"
  | "content-dialogue"
  | "content-archetype"
  | "action"
  | "event"
  | "effect";
type DistanceAlgorithm = "game-default" | "euclidean" | "cosine";

function isContentRuntimeView(runtimeSpaceView: RuntimeSpaceView): boolean {
  return (
    runtimeSpaceView === "content-combined" ||
    runtimeSpaceView === "content-skill" ||
    runtimeSpaceView === "content-dialogue" ||
    runtimeSpaceView === "content-archetype"
  );
}

function resolveEffectiveAlgorithm(runtimeSpaceView: RuntimeSpaceView, selected: DistanceAlgorithm): "euclidean" | "cosine" {
  if (selected === "game-default") {
    return isContentRuntimeView(runtimeSpaceView) ? "euclidean" : "cosine";
  }
  return selected;
}

const CLUSTER_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#a855f7", "#06b6d4"];
const CONTENT_SPACE_KEYS = ["content-combined", "content-dialogue", "content-skill", "content-archetype"] as const;
type ContentSpaceKey = (typeof CONTENT_SPACE_KEYS)[number];

const DEFAULT_SPACE_FEATURES: Record<ContentSpaceKey, string[]> = {
  "content-combined": [
    ...TRAIT_NAMES,
    ...FEATURE_NAMES,
    ...DEFAULT_STAT_FEATURES.map((row) => row.featureId),
    ...DEFAULT_CURRENCY_STAT_FEATURES.map((row) => row.featureId),
  ],
  "content-dialogue": ["Empathy", "Comprehension", "Constraint", "Projection", "Fame", "Awareness", "Guile"],
  "content-skill": ["Survival", "Direction", "Awareness", "Fame", "Guile", "Effort", "Momentum"],
  "content-archetype": ["Fame", "Guile", "Awareness", "Freedom", "Equilibrium", "Projection"],
};

const useSpaceExplorerUiStore = create<SpaceExplorerUiState>()(
  persist(
    immer<SpaceExplorerUiState>((set) => ({
      vizMode: "3d",
      colorBy: "branch",
      distanceAlgorithm: "game-default",
      nearestK: 10,
      runtimeSpaceView: "content-combined",
      spaceFeatureMap: DEFAULT_SPACE_FEATURES,
      customFeatureValues: {},
      customFeatureLabels: {},
      movementFeatureIds: [...MOVEMENT_CONTROL_NAMES],
      setVizMode: (next) => set((state) => { state.vizMode = next; }),
      setColorBy: (next) => set((state) => { state.colorBy = next; }),
      setDistanceAlgorithm: (next) => set((state) => { state.distanceAlgorithm = next; }),
      setNearestK: (next) => set((state) => { state.nearestK = next; }),
      setRuntimeSpaceView: (next) => set((state) => { state.runtimeSpaceView = next; }),
      setSpaceFeatureMap: (next) =>
        set((state) => {
          state.spaceFeatureMap = typeof next === "function" ? next(state.spaceFeatureMap) : next;
        }),
      setCustomFeatureValues: (next) =>
        set((state) => {
          state.customFeatureValues = typeof next === "function" ? next(state.customFeatureValues) : next;
        }),
      setCustomFeatureLabels: (next) =>
        set((state) => {
          state.customFeatureLabels = typeof next === "function" ? next(state.customFeatureLabels) : next;
        }),
      setMovementFeatureIds: (next) =>
        set((state) => {
          state.movementFeatureIds = typeof next === "function" ? next(state.movementFeatureIds) : next;
        }),
    })),
    {
      name: "space-explorer-ui-v1",
      partialize: (state) => ({
        vizMode: state.vizMode,
        colorBy: state.colorBy,
        distanceAlgorithm: state.distanceAlgorithm,
        nearestK: state.nearestK,
        runtimeSpaceView: state.runtimeSpaceView,
        spaceFeatureMap: state.spaceFeatureMap,
        customFeatureValues: state.customFeatureValues,
        customFeatureLabels: state.customFeatureLabels,
        movementFeatureIds: state.movementFeatureIds,
      }),
    },
  ),
);

const useContentDeliveryStore = create<ContentDeliveryState>()(
  persist(
    immer<ContentDeliveryState>((set) => ({
      versionDraft: `local-${new Date().toISOString().slice(0, 10)}`,
      pluginVersion: "1.0.0",
      runtimeVersion: "UE5.4",
      busy: false,
      lastPublishedVersion: null,
      lastPulledVersion: null,
      selection: null,
      setVersionDraft: (next) =>
        set((state) => {
          state.versionDraft = next;
        }),
      setPluginVersion: (next) =>
        set((state) => {
          state.pluginVersion = next;
        }),
      setRuntimeVersion: (next) =>
        set((state) => {
          state.runtimeVersion = next;
        }),
      setBusy: (next) =>
        set((state) => {
          state.busy = next;
        }),
      setLastPublishedVersion: (next) =>
        set((state) => {
          state.lastPublishedVersion = next;
        }),
      setLastPulledVersion: (next) =>
        set((state) => {
          state.lastPulledVersion = next;
        }),
      setSelection: (next) =>
        set((state) => {
          state.selection = next;
        }),
    })),
    {
      name: "space-explorer-delivery-v1",
      partialize: (state) => ({
        versionDraft: state.versionDraft,
        pluginVersion: state.pluginVersion,
        runtimeVersion: state.runtimeVersion,
        lastPublishedVersion: state.lastPublishedVersion,
        lastPulledVersion: state.lastPulledVersion,
      }),
    },
  ),
);

function projectPoint(
  vector: number[],
  mean: number[],
  components: number[][],
): [number, number, number] {
  const centered = vector.map((v, i) => v - (mean[i] ?? 0));
  const dims = Math.min(3, components.length);
  const result = [0, 0, 0];
  for (let d = 0; d < dims; d++) {
    const comp = components[d];
    if (!comp) continue;
    let sum = 0;
    for (let i = 0; i < centered.length; i++) {
      sum += centered[i] * (comp[i] ?? 0);
    }
    result[d] = sum;
  }
  return result as [number, number, number];
}

function euclideanDist(a: number[], b: number[]): number {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    sum += d * d;
  }
  return Math.sqrt(sum);
}

function hashToUnit(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function vectorToCoords(vector: number[]): { x: number; y: number; z: number } {
  let x = vector[0] ?? 0;
  let y = vector[1] ?? 0;
  let z = vector[2] ?? 0;
  for (let i = 3; i < vector.length; i++) {
    const weight = 0.18 / (i - 1);
    x += (vector[i] ?? 0) * weight;
    y += (vector[i] ?? 0) * weight * 0.8;
    z += (vector[i] ?? 0) * weight * 1.2;
  }
  return { x, y, z };
}

function flattenUnifiedVector(vector: UnifiedSpaceVector): number[] {
  return [
    ...TRAIT_NAMES.map((name) => Number(vector.traits[name] ?? 0)),
    ...FEATURE_NAMES.map((name) => Number(vector.features[name] ?? 0)),
    ...(INCLUDE_SEMANTIC_AXES_IN_SIMILARITY
      ? SEMANTIC_AXES.map((name) => Number(vector.semantics[name] ?? 0))
      : []),
  ];
}

function coordsFromUnifiedVector(vector: UnifiedSpaceVector): { x: number; y: number; z: number } {
  return {
    x: Number(vector.semantics.combatIntensity ?? 0) + Number(vector.semantics.risk ?? 0) * 0.5,
    y: Number(vector.semantics.socialIntensity ?? 0) + Number(vector.semantics.visibility ?? 0) * 0.5,
    z: Number(vector.semantics.explorationIntensity ?? 0) + Number(vector.semantics.craftingIntensity ?? 0) * 0.4,
  };
}

function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    magA += av * av;
    magB += bv * bv;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  if (denom <= 1e-8) return 0;
  return dot / denom;
}

type RuntimeVizPoint = {
  id: string;
  name: string;
  type: "action" | "event" | "effect";
  branch: string;
  vector: number[];
  coords: { x: number; y: number; z: number };
  similarity: number;
  netImpact?: number;
  behaviorStyle?: string;
};

const BRANCH_COLORS: Record<string, string> = {
  perception: "#3b82f6",
  combat: "#ef4444",
  craft: "#22c55e",
  dialogue: "#a855f7",
  archetype: "#f59e0b",
  default: "#6b7280",
};

const TYPE_COLORS: Record<string, string> = {
  skill: "#22c55e",
  archetype: "#f59e0b",
  dialogue: "#a855f7",
  default: "#6b7280",
};

function getPointColor(pt: ContentPoint, colorBy: ColorBy): string {
  if (colorBy === "branch") return BRANCH_COLORS[pt.branch] ?? BRANCH_COLORS.default;
  if (colorBy === "cluster")
    return pt.cluster != null ? CLUSTER_COLORS[pt.cluster % CLUSTER_COLORS.length]! : BRANCH_COLORS.default;
  return TYPE_COLORS[pt.type] ?? TYPE_COLORS.default;
}

function getPointCoords(pt: ContentPoint, space: SpaceMode): { x: number; y: number; z: number } {
  if (space === "combined" && pt.xCombined != null) {
    return { x: pt.xCombined, y: pt.yCombined!, z: pt.zCombined! };
  }
  return { x: pt.x, y: pt.y, z: pt.z };
}

function getTypeBadgeMeta(type: string): { Icon: ComponentType<{ className?: string }>; className: string } {
  switch (type) {
    case "action":
      return { Icon: SwordsIcon, className: "border-amber-400/60 bg-amber-500/20 text-amber-100" };
    case "event":
      return { Icon: SparklesIcon, className: "border-violet-400/60 bg-violet-500/20 text-violet-100" };
    case "effect":
      return { Icon: CrosshairIcon, className: "border-emerald-400/60 bg-emerald-500/20 text-emerald-100" };
    case "dialogue":
      return { Icon: SparklesIcon, className: "border-fuchsia-400/60 bg-fuchsia-500/20 text-fuchsia-100" };
    case "skill":
      return { Icon: CompassIcon, className: "border-cyan-400/60 bg-cyan-500/20 text-cyan-100" };
    default:
      return { Icon: CompassIcon, className: "border-slate-400/60 bg-slate-500/20 text-slate-100" };
  }
}

function getBranchBadgeClass(branch: string): string {
  switch (branch) {
    case "combat":
      return "border-red-400/60 bg-red-500/20 text-red-100";
    case "dialogue":
      return "border-purple-400/60 bg-purple-500/20 text-purple-100";
    case "craft":
      return "border-green-400/60 bg-green-500/20 text-green-100";
    default:
      return "border-border bg-muted/40 text-muted-foreground";
  }
}

type ActionTraceEntry = {
  playerTurn: number;
  action: { actionType: string; payload?: Record<string, unknown> };
};

function getPlayerStateAtTurn(
  seed: number,
  actionTrace: ActionTraceEntry[],
  upToTurn: number,
): { traits: Record<string, number>; features: Record<string, number> } | null {
  const engine = GameEngine.create(seed);
  for (let i = 0; i < upToTurn && i < actionTrace.length; i++) {
    engine.dispatch(actionTrace[i].action as PlayerAction);
  }
  const snapshot = engine.snapshot();
  const player = snapshot?.entities?.[snapshot.playerId];
  if (!player?.traits || !player?.features) return null;
  return {
    traits: { ...(player.traits as Record<string, number>) },
    features: { ...(player.features as Record<string, number>) },
  };
}

type ReportData = {
  seed: number;
  run: { actionTrace: ActionTraceEntry[] };
};

type PackIdentity = {
  source: string;
  packId: string;
  packVersion: string;
  packHash: string;
  schemaVersion: string;
  engineVersion: string;
  reportId?: string;
};

type ReportIdentity = {
  source: string;
  reportId?: string;
  packId?: string;
  packVersion?: string;
  packHash?: string;
  schemaVersion?: string;
  engineVersion?: string;
};

type PackSelectOption = {
  id: string;
  label: string;
  timestamp?: string;
  kind: "bundle" | "content-pack-report" | "uploaded";
  reportId?: string;
  overrides?: SpaceVectorPackOverrides;
  identity?: PackIdentity;
};

type ReportSelectOption = {
  id: string;
  label: string;
  kind: "api" | "session";
};

type BuiltBundlePayload = {
  schemaVersion?: string;
  patchName?: string;
  generatedAt?: string;
  hashes?: { overall?: string };
  enginePackage?: { version?: string };
  packs?: { spaceVectors?: SpaceVectorPackOverrides };
};

type DeliveryVersionRecord = {
  version: string;
  packId: string;
  packHash: string;
  publishedAt: string;
  artifacts: {
    bundleKey: string;
    manifestKey: string;
    reportKey?: string;
  };
};

type DeliveryPullResponse = {
  ok: boolean;
  version?: string;
  record?: DeliveryVersionRecord;
  downloads?: {
    bundle: string;
    manifest: string;
    report?: string | null;
  };
  error?: string;
};

function HelpInfo({
	title,
	body,
  tone = "content",
}: {
	title: string;
	body: string;
  tone?: "header" | "content" | "footer" | "context";
}) {
	const [open, setOpen] = useState(false);
  const toneClasses: Record<"header" | "content" | "footer" | "context", string> = {
    header: "border-sky-400/60 bg-sky-500/15 text-sky-100 hover:bg-sky-500/25",
    content: "border-violet-400/60 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25",
    footer: "border-emerald-400/60 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25",
    context: "border-amber-400/60 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25",
  };
  const toneDialogClasses: Record<"header" | "content" | "footer" | "context", string> = {
    header: "border-sky-400/60",
    content: "border-violet-400/60",
    footer: "border-emerald-400/60",
    context: "border-amber-400/60",
  };
  const toneHeaderClasses: Record<"header" | "content" | "footer" | "context", string> = {
    header: "bg-sky-500/10 text-sky-100",
    content: "bg-violet-500/10 text-violet-100",
    footer: "bg-emerald-500/10 text-emerald-100",
    context: "bg-amber-500/10 text-amber-100",
  };

	useEffect(() => {
		if (!open) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setOpen(false);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [open]);

	return (
		<>
			<button
				type="button"
				aria-label={`About ${title}`}
				onClick={(e) => {
					e.preventDefault();
					e.stopPropagation();
					setOpen(true);
				}}
				className={`ml-1 inline-flex size-5 items-center justify-center rounded-full border transition-colors ${toneClasses[tone]}`}
			>
				<CircleHelpIcon className="size-3.5" />
			</button>
			{open && (
				<div
					className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4"
					onMouseDown={(e) => {
						if (e.target === e.currentTarget) {
							setOpen(false);
						}
					}}
				>
					<div
						role="dialog"
						aria-modal="true"
						aria-label={title}
						className={`w-full max-w-md rounded border bg-card p-4 shadow-lg ${toneDialogClasses[tone]}`}
						onMouseDown={(e) => e.stopPropagation()}
					>
						<div className={`mb-2 flex items-center justify-between gap-3 rounded px-2 py-1 ${toneHeaderClasses[tone]}`}>
							<div className="text-sm font-semibold">{title}</div>
							<button
								type="button"
								aria-label="Close"
								className="rounded border border-border px-2 py-0.5 text-xs hover:bg-muted/30"
								onClick={() => setOpen(false)}
							>
								X
							</button>
						</div>
						<p className="text-sm text-muted-foreground">{body}</p>
						<div className="mt-4 text-right">
							<button
								type="button"
								className="rounded border border-border px-2 py-1 text-xs hover:bg-muted/30"
								onClick={() => setOpen(false)}
							>
								Close
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}

function GenerateReportButton({
  onGenerated,
  policyId,
  packIdentity,
  testModeEnabled,
  onRunQuickTestMode,
  quickTestBusy,
}: {
  onGenerated: (r: ReportData) => void;
  policyId: string;
  packIdentity: PackIdentity | null;
  testModeEnabled: boolean;
  onRunQuickTestMode: () => void;
  quickTestBusy: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const onClick = useCallback(() => {
    if (testModeEnabled) {
      onRunQuickTestMode();
      return;
    }
    setBusy(true);
    try {
      const report = runPlaythrough(undefined, 75, undefined, policyId);
      const reportWithBinding = {
        ...report,
      } as typeof report & { packBinding?: Record<string, string> };
      if (packIdentity) {
        reportWithBinding.packBinding = {
          packId: packIdentity.packId,
          packVersion: packIdentity.packVersion,
          packHash: packIdentity.packHash,
          schemaVersion: packIdentity.schemaVersion,
          engineVersion: packIdentity.engineVersion,
        };
      }
      const analysis = analyzeReport(report);
      const payload = { report: reportWithBinding, analysis };
      try {
        sessionStorage.setItem("dungeonbreak-browser-report", JSON.stringify(payload));
      } catch {
        // ignore
      }
      onGenerated({
        seed: report.seed,
        run: {
          actionTrace: report.run.actionTrace as ActionTraceEntry[],
        },
      });
    } finally {
      setBusy(false);
    }
  }, [onGenerated, policyId, packIdentity, testModeEnabled, onRunQuickTestMode]);
  return (
    <details className="rounded border bg-background" open>
      <summary className="cursor-pointer px-3 py-2 text-xs font-medium uppercase text-muted-foreground hover:bg-muted/50">
        Report
      </summary>
      <div className="border-t px-3 py-2">
        <p className="text-xs text-muted-foreground">No report loaded.</p>
        <button
          type="button"
          onClick={onClick}
          disabled={busy || quickTestBusy}
          className="mt-2 w-full rounded bg-primary px-2 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {testModeEnabled
            ? (quickTestBusy ? "Running quick test mode..." : "Run test mode build + playthrough")
            : (busy ? "Generating..." : "Generate report in browser")}
        </button>
        <a
          href="/play/reports"
          className="mt-2 block text-center text-xs text-primary underline"
        >
          View full report
        </a>
      </div>
    </details>
  );
}

type DeliveryControlsProps = {
  versionDraft: string;
  pluginVersion: string;
  runtimeVersion: string;
  busy: boolean;
  lastPublishedVersion: string | null;
  lastPulledVersion: string | null;
  selection: DeliveryPullResponse | null;
  onVersionDraftChange: (value: string) => void;
  onPluginVersionChange: (value: string) => void;
  onRuntimeVersionChange: (value: string) => void;
  onPublish: () => void;
  onPull: () => void;
};

function DeliveryControls({
  versionDraft,
  pluginVersion,
  runtimeVersion,
  busy,
  lastPublishedVersion,
  lastPulledVersion,
  selection,
  onVersionDraftChange,
  onPluginVersionChange,
  onRuntimeVersionChange,
  onPublish,
  onPull,
}: DeliveryControlsProps) {
  return (
    <>
      <div className="inline-flex items-center gap-1 rounded border border-border/60 bg-muted/20 px-1 py-1">
        <PackageIcon className="size-3.5 text-muted-foreground" />
        <Input
          value={versionDraft}
          onChange={(e) => onVersionDraftChange(e.target.value)}
          className="h-7 w-32 border-border/60 bg-background px-2 text-xs"
          placeholder="version"
          title="Delivery version to publish"
        />
        <Input
          value={pluginVersion}
          onChange={(e) => onPluginVersionChange(e.target.value)}
          className="h-7 w-20 border-border/60 bg-background px-2 text-xs"
          placeholder="plugin"
          title="Plugin compatibility version"
        />
        <Input
          value={runtimeVersion}
          onChange={(e) => onRuntimeVersionChange(e.target.value)}
          className="h-7 w-20 border-border/60 bg-background px-2 text-xs"
          placeholder="runtime"
          title="Runtime compatibility version"
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onPublish}
        disabled={busy}
        className="h-7 px-2 text-[11px]"
        title="Build and publish delivery artifacts"
      >
        <UploadIcon className="mr-1 size-3.5" />
        Publish
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onPull}
        disabled={busy}
        className="h-7 px-2 text-[11px]"
        title="Pull latest compatible delivery version"
      >
        <RefreshCwIcon className="mr-1 size-3.5" />
        Pull
      </Button>
      {lastPublishedVersion ? <Badge variant="secondary">Published {lastPublishedVersion}</Badge> : null}
      {lastPulledVersion ? <Badge variant="outline">Pulled {lastPulledVersion}</Badge> : null}
      {selection?.downloads?.bundle ? (
        <Button asChild type="button" variant="ghost" size="sm" className="h-7 px-2 text-[11px]">
          <a href={selection.downloads.bundle} target="_blank" rel="noreferrer" title="Download selected bundle">
            Bundle
          </a>
        </Button>
      ) : null}
      {selection?.downloads?.manifest ? (
        <Button asChild type="button" variant="ghost" size="sm" className="h-7 px-2 text-[11px]">
          <a href={selection.downloads.manifest} target="_blank" rel="noreferrer" title="Download selected manifest">
            Manifest
          </a>
        </Button>
      ) : null}
    </>
  );
}

export function SpaceExplorer() {
  const {
    vizMode,
    setVizMode,
    distanceAlgorithm,
    setDistanceAlgorithm,
    nearestK,
    setNearestK,
    runtimeSpaceView,
    setRuntimeSpaceView,
    spaceFeatureMap,
    setSpaceFeatureMap,
    customFeatureValues,
    setCustomFeatureValues,
    customFeatureLabels,
    setCustomFeatureLabels,
  } = useSpaceExplorerUiStore(
    useShallow((state) => ({
      vizMode: state.vizMode,
      setVizMode: state.setVizMode,
      distanceAlgorithm: state.distanceAlgorithm,
      setDistanceAlgorithm: state.setDistanceAlgorithm,
      nearestK: state.nearestK,
      setNearestK: state.setNearestK,
      runtimeSpaceView: state.runtimeSpaceView,
      setRuntimeSpaceView: state.setRuntimeSpaceView,
      spaceFeatureMap: state.spaceFeatureMap,
      setSpaceFeatureMap: state.setSpaceFeatureMap,
      customFeatureValues: state.customFeatureValues,
      setCustomFeatureValues: state.setCustomFeatureValues,
      customFeatureLabels: state.customFeatureLabels,
      setCustomFeatureLabels: state.setCustomFeatureLabels,
    })),
  );
  const [data, setData] = useState<SpaceData>(EMPTY_SPACE_DATA);
  const [error, setError] = useState<string | null>(null);
  const [spaceOverrides, setSpaceOverrides] = useState<SpaceVectorPackOverrides | undefined>();
  const [selectedPoint, setSelectedPoint] = useState<ContentPoint | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [selectedTurn, setSelectedTurn] = useState(0);
  const [vizInfoTabId, setVizInfoTabId] = useState("");
  const [vizInfoEditorCode, setVizInfoEditorCode] = useState("");
  const [vizInfoCopied, setVizInfoCopied] = useState(false);
  const [traits, setTraits] = useState<Record<(typeof TRAIT_NAMES)[number], number>>(
    () => makeNumberRecord(TRAIT_NAMES, 0),
  );
  const [features, setFeatures] = useState<Record<(typeof FEATURE_NAMES)[number], number>>(
    () => makeNumberRecord(FEATURE_NAMES, 0),
  );
  const [traitDeltas, setTraitDeltas] = useState<Record<(typeof TRAIT_NAMES)[number], number>>(
    () => makeNumberRecord(TRAIT_NAMES, 0),
  );
  const [featureDeltas, setFeatureDeltas] = useState<Record<(typeof FEATURE_NAMES)[number], number>>(
    () => makeNumberRecord(FEATURE_NAMES, 0),
  );
  const reportPolicyId =
    ACTION_POLICIES.policies.find((row) => row.policyId === "agent-play-default")?.policyId ??
    ACTION_POLICIES.policies[0]?.policyId ??
    "";
  const [modelSchemaModalOpen, setModelSchemaModalOpen] = useState(false);
  const modelInstances = useModelSchemaViewerStore((state) => state.modelInstances);
  const ensureKaelBinding = useModelSchemaViewerStore((state) => state.ensureKaelBinding);
  const replaceModelInstances = useModelSchemaViewerStore((state) => state.replaceModelInstances);
  const activeModelSchemaId = useModelSchemaViewerStore((state) => state.activeModelSchemaId);
  const activeModelInstanceId = useModelSchemaViewerStore((state) => state.activeModelInstanceId);
  const setActiveModelSelection = useModelSchemaViewerStore((state) => state.setActiveSelection);
  const [behaviorWindowSeconds, setBehaviorWindowSeconds] = useState(5);
  const [behaviorStepSeconds, setBehaviorStepSeconds] = useState(1);
  const [newFeatureId, setNewFeatureId] = useState("");
  const [newFeatureGroup, setNewFeatureGroup] = useState("content_features");
  const [newFeatureSpaces, setNewFeatureSpaces] = useState("dialogue,skill,event");
  const [newModelId, setNewModelId] = useState("custom.model");
  const [newModelLabel, setNewModelLabel] = useState("Custom Model");
  const [newModelSpaces, setNewModelSpaces] = useState("dialogue,event,entity");
  const [selectedModelFeatureIds, setSelectedModelFeatureIds] = useState<string[]>([]);
  const [enabledStatLevelById, setEnabledStatLevelById] = useState<Record<string, boolean>>({});
  const [baseSpaceVectors, setBaseSpaceVectors] = useState<SpaceVectorPackOverrides | undefined>();
  const [drafts, setDrafts] = useState<PatchDraft[]>([]);
  const [draftName, setDraftName] = useState("space-vectors-draft");
  const [selectedPresetId, setSelectedPresetId] = useState<string>(MODEL_PRESETS[0]?.id ?? "");
  const [builderMessage, setBuilderMessage] = useState<string>("");
  const [bundleBusy, setBundleBusy] = useState(false);
  const [quickTestBusy, setQuickTestBusy] = useState(false);
  const [testModeEnabled, setTestModeEnabled] = useState(true);
  const [testModeGeneratedAt, setTestModeGeneratedAt] = useState<string | null>(null);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [spaceDataLoading, setSpaceDataLoading] = useState(false);
  const [loadedPackIdentity, setLoadedPackIdentity] = useState<PackIdentity | null>(null);
  const [loadedReportIdentity, setLoadedReportIdentity] = useState<ReportIdentity | null>(null);
  const [packOptions, setPackOptions] = useState<PackSelectOption[]>([
    { id: "bundle-default", label: "Content Pack Bundle", kind: "bundle" },
  ]);
  const [selectedPackOptionId, setSelectedPackOptionId] = useState("bundle-default");
  const [reportOptions, setReportOptions] = useState<ReportSelectOption[]>([]);
  const [selectedReportOptionId, setSelectedReportOptionId] = useState("");
  const {
    deliveryBusy,
    deliveryVersionDraft,
    deliveryPluginVersion,
    deliveryRuntimeVersion,
    deliverySelection,
    lastPublishedVersion,
    lastPulledVersion,
    setDeliveryBusy,
    setDeliveryVersionDraft,
    setDeliveryPluginVersion,
    setDeliveryRuntimeVersion,
    setDeliverySelection,
    setLastPublishedVersion,
    setLastPulledVersion,
  } = useContentDeliveryStore(
    useShallow((state) => ({
      deliveryBusy: state.busy,
      deliveryVersionDraft: state.versionDraft,
      deliveryPluginVersion: state.pluginVersion,
      deliveryRuntimeVersion: state.runtimeVersion,
      deliverySelection: state.selection,
      lastPublishedVersion: state.lastPublishedVersion,
      lastPulledVersion: state.lastPulledVersion,
      setDeliveryBusy: state.setBusy,
      setDeliveryVersionDraft: state.setVersionDraft,
      setDeliveryPluginVersion: state.setPluginVersion,
      setDeliveryRuntimeVersion: state.setRuntimeVersion,
      setDeliverySelection: state.setSelection,
      setLastPublishedVersion: state.setLastPublishedVersion,
      setLastPulledVersion: state.setLastPulledVersion,
    })),
  );
  const packUploadInputRef = useRef<HTMLInputElement | null>(null);
  const markerColorBy: ColorBy = "branch";

  useEffect(() => {
    setData(EMPTY_SPACE_DATA);
    setSelectedPoint(null);
  }, []);

  const loadBundlePack = useCallback(() => {
    fetch("/game/content-pack.bundle.v1.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("bundle not found"))))
      .then((bundle) => {
        const overrides = (bundle?.packs?.spaceVectors ?? undefined) as SpaceVectorPackOverrides | undefined;
        if (overrides && typeof overrides === "object") {
          setSpaceOverrides(overrides);
          setBaseSpaceVectors(overrides);
          const instances = parseModelInstancesFromContentBindings(overrides);
          if (instances.length > 0) {
            replaceModelInstances(instances);
          }
        }
        setLoadedPackIdentity({
          source: "bundle:/game/content-pack.bundle.v1.json",
          packId: String(bundle?.patchName ?? "content-pack.bundle.v1"),
          packVersion: String(bundle?.generatedAt ?? "unknown"),
          packHash: String(bundle?.hashes?.overall ?? "unknown"),
          schemaVersion: String(bundle?.schemaVersion ?? "content-pack.bundle.v1"),
          engineVersion: String(bundle?.enginePackage?.version ?? "unknown"),
        });
        setPackOptions((prev) =>
          prev.map((row) =>
            row.id === "bundle-default"
              ? {
                  ...row,
                  label: String(bundle?.patchName ?? "content-pack.bundle.v1"),
                  timestamp: String(bundle?.generatedAt ?? "unknown"),
                }
              : row,
          ),
        );
      })
      .catch(() => {
        // optional
      });
  }, [replaceModelInstances]);

  const loadContentPackReport = useCallback((reportId: string) => {
    fetch(`/api/content-packs/reports?reportId=${encodeURIComponent(reportId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("content-pack report not found"))))
      .then((body) => {
        const overrides = body?.report?.bundle?.spaceVectors as SpaceVectorPackOverrides | undefined;
        if (!overrides || typeof overrides !== "object") {
          setBuilderMessage(`Report '${reportId}' does not include space vectors.`);
          return;
        }
        setSpaceOverrides(overrides);
        const instances = parseModelInstancesFromContentBindings(overrides);
        if (instances.length > 0) {
          replaceModelInstances(instances);
        }
        setLoadedPackIdentity({
          source: `content-pack-report:${String(body?.report?.sourceName ?? reportId)}`,
          reportId,
          packId: String(body?.report?.bundle?.patchName ?? body?.report?.sourceName ?? "content-pack.report"),
          packVersion: String(body?.report?.bundle?.generatedAt ?? body?.report?.generatedAt ?? "unknown"),
          packHash: String(body?.report?.bundle?.hashes?.overall ?? "unknown"),
          schemaVersion: String(body?.report?.bundle?.schemaVersion ?? "content-pack.bundle.v1"),
          engineVersion: String(body?.report?.bundle?.enginePackage?.version ?? "unknown"),
        });
        setBuilderMessage(`Loaded content-pack report '${reportId}' into Space Explorer.`);
      })
      .catch(() => {
        try {
          const raw = sessionStorage.getItem(`dungeonbreak-content-pack-report-${reportId}`);
          if (!raw) {
            setBuilderMessage(`content-pack report '${reportId}' not found.`);
            return;
          }
          const localReport = JSON.parse(raw) as {
            sourceName?: string;
            generatedAt?: string;
            bundle?: {
              patchName?: string;
              schemaVersion?: string;
              generatedAt?: string;
              hashes?: Record<string, string>;
              enginePackage?: { version?: string };
              spaceVectors?: SpaceVectorPackOverrides;
            };
          };
          const overrides = localReport?.bundle?.spaceVectors;
          if (!overrides || typeof overrides !== "object") {
            setBuilderMessage(`Report '${reportId}' does not include space vectors.`);
            return;
          }
          setSpaceOverrides(overrides);
          const instances = parseModelInstancesFromContentBindings(overrides);
          if (instances.length > 0) {
            replaceModelInstances(instances);
          }
          setLoadedPackIdentity({
            source: `content-pack-report:session:${String(localReport?.sourceName ?? reportId)}`,
            reportId,
            packId: String(localReport?.bundle?.patchName ?? localReport?.sourceName ?? "content-pack.report"),
            packVersion: String(localReport?.bundle?.generatedAt ?? localReport?.generatedAt ?? "unknown"),
            packHash: String(localReport?.bundle?.hashes?.overall ?? "unknown"),
            schemaVersion: String(localReport?.bundle?.schemaVersion ?? "content-pack.bundle.v1"),
            engineVersion: String(localReport?.bundle?.enginePackage?.version ?? "unknown"),
          });
          setBuilderMessage(`Loaded local content-pack report '${reportId}' into Space Explorer.`);
        } catch (e) {
          setBuilderMessage(e instanceof Error ? e.message : String(e));
        }
      });
  }, [replaceModelInstances]);

  const refreshPackOptions = useCallback(async () => {
    const next: PackSelectOption[] = [
      { id: "bundle-default", label: "Content Pack Bundle", kind: "bundle", timestamp: loadedPackIdentity?.packVersion },
    ];
    try {
      const response = await fetch("/api/content-packs/reports");
      if (response.ok) {
        const body = await response.json() as {
          ok?: boolean;
          entries?: Array<{ reportId: string; sourceName?: string; generatedAt?: string }>;
        };
        for (const entry of body.entries ?? []) {
          next.push({
            id: `content-pack-report:${entry.reportId}`,
            label: entry.sourceName || entry.reportId,
            timestamp: entry.generatedAt,
            kind: "content-pack-report",
            reportId: entry.reportId,
          });
        }
      }
    } catch {
      // ignore list fetch failures
    }
    try {
      for (let i = 0; i < sessionStorage.length; i += 1) {
        const key = sessionStorage.key(i);
        if (!key || !key.startsWith("dungeonbreak-content-pack-report-")) continue;
        const reportId = key.replace("dungeonbreak-content-pack-report-", "");
        if (next.some((row) => row.reportId === reportId)) continue;
        const raw = sessionStorage.getItem(key);
        if (!raw) continue;
        const localReport = JSON.parse(raw) as { sourceName?: string; generatedAt?: string; bundle?: { generatedAt?: string } };
        next.push({
          id: `content-pack-report:${reportId}`,
          label: localReport.sourceName || reportId,
          timestamp: localReport.bundle?.generatedAt ?? localReport.generatedAt,
          kind: "content-pack-report",
          reportId,
        });
      }
    } catch {
      // ignore session scan errors
    }
    setPackOptions((prev) => {
      const uploaded = prev.filter((row) => row.kind === "uploaded");
      const merged = [...uploaded, ...next];
      const seen = new Set<string>();
      return merged.filter((row) => {
        if (seen.has(row.id)) return false;
        seen.add(row.id);
        return true;
      });
    });
  }, [loadedPackIdentity?.packVersion]);

  const refreshReportOptions = useCallback(async () => {
    const next: ReportSelectOption[] = [];
    try {
      const response = await fetch("/api/play-reports");
      if (response.ok) {
        const body = await response.json() as {
          ok?: boolean;
          report?: { reportId?: string; seed?: number; generatedAt?: string };
        };
        if (body?.ok && body?.report) {
          next.push({
            id: "api-report",
            label: body.report.reportId
              ? `Playthrough Report - ${body.report.reportId}`
              : `Playthrough Report - Seed ${String(body.report.seed ?? "unknown")}`,
            kind: "api",
          });
        }
      }
    } catch {
      // ignore
    }
    try {
      const raw = sessionStorage.getItem("dungeonbreak-browser-report");
      if (raw) {
        const local = JSON.parse(raw) as { report?: { reportId?: string; seed?: number; generatedAt?: string } };
        next.push({
          id: "session-report",
          label: local?.report?.reportId
            ? `Playthrough Report - ${local.report.reportId}`
            : `Playthrough Report - Seed ${String(local?.report?.seed ?? "unknown")}`,
          kind: "session",
        });
      }
    } catch {
      // ignore
    }
    setReportOptions(next);
    setSelectedReportOptionId((prev) => {
      if (prev && next.some((row) => row.id === prev)) return prev;
      return next[0]?.id ?? "";
    });
  }, []);

  const handlePackUpload = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as {
        patchName?: string;
        generatedAt?: string;
        hashes?: { overall?: string };
        schemaVersion?: string;
        enginePackage?: { version?: string };
        packs?: { spaceVectors?: SpaceVectorPackOverrides };
        bundle?: {
          patchName?: string;
          generatedAt?: string;
          hashes?: { overall?: string };
          schemaVersion?: string;
          enginePackage?: { version?: string };
          spaceVectors?: SpaceVectorPackOverrides;
        };
      };
      const overrides = parsed?.packs?.spaceVectors ?? parsed?.bundle?.spaceVectors;
      if (!overrides || typeof overrides !== "object") {
        setBuilderMessage(`Uploaded file '${file.name}' has no space vector payload.`);
        return;
      }
      const identity: PackIdentity = {
        source: `upload:${file.name}`,
        packId: String(parsed.patchName ?? parsed.bundle?.patchName ?? file.name),
        packVersion: String(parsed.generatedAt ?? parsed.bundle?.generatedAt ?? new Date().toISOString()),
        packHash: String(parsed.hashes?.overall ?? parsed.bundle?.hashes?.overall ?? "uploaded"),
        schemaVersion: String(parsed.schemaVersion ?? parsed.bundle?.schemaVersion ?? "content-pack.bundle.v1"),
        engineVersion: String(parsed.enginePackage?.version ?? parsed.bundle?.enginePackage?.version ?? "unknown"),
      };
      const optionId = `uploaded:${Date.now()}`;
      setPackOptions((prev) => [
        {
          id: optionId,
          label: identity.packId,
          timestamp: identity.packVersion,
          kind: "uploaded",
          overrides,
          identity,
        },
        ...prev,
      ]);
      setSelectedPackOptionId(optionId);
      setSpaceOverrides(overrides);
      setBaseSpaceVectors(overrides);
      const instances = parseModelInstancesFromContentBindings(overrides);
      if (instances.length > 0) {
        replaceModelInstances(instances);
      }
      setLoadedPackIdentity(identity);
      setBuilderMessage(`Loaded uploaded content pack '${file.name}'.`);
    } catch (e) {
      setBuilderMessage(e instanceof Error ? e.message : String(e));
    } finally {
      if (event.target) event.target.value = "";
    }
  }, [replaceModelInstances]);

  useEffect(() => {
    loadBundlePack();
    void refreshPackOptions();
    void refreshReportOptions();
  }, [loadBundlePack, refreshPackOptions, refreshReportOptions]);

  useEffect(() => {
    const reportId = new URLSearchParams(window.location.search).get("contentPackReportId");
    if (!reportId) return;
    loadContentPackReport(reportId);
    const optionId = `content-pack-report:${reportId}`;
    setPackOptions((prev) =>
      prev.some((row) => row.id === optionId)
        ? prev
        : [
            ...prev,
            { id: optionId, label: reportId, kind: "content-pack-report", reportId },
          ],
    );
    setSelectedPackOptionId(optionId);
  }, [loadContentPackReport]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PATCH_DRAFTS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as PatchDraft[];
      if (Array.isArray(parsed)) {
        setDrafts(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PATCH_DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
    } catch {
      // ignore
    }
  }, [drafts]);

  const applyLoadedReport = useCallback((r: { seed: number; run: { actionTrace: unknown[] }; packBinding?: Record<string, unknown> }, source: string) => {
    if (r?.seed != null && Array.isArray(r.run?.actionTrace)) {
      setReport({
        seed: r.seed,
        run: { actionTrace: r.run.actionTrace as ActionTraceEntry[] },
      });
      const packBinding = r.packBinding;
      setLoadedReportIdentity({
        source,
        reportId: String((r as { reportId?: string }).reportId ?? ""),
        packId: packBinding ? String(packBinding.packId ?? "") : undefined,
        packVersion: packBinding ? String(packBinding.packVersion ?? "") : undefined,
        packHash: packBinding ? String(packBinding.packHash ?? "") : undefined,
        schemaVersion: packBinding ? String(packBinding.schemaVersion ?? "") : undefined,
        engineVersion: packBinding ? String(packBinding.engineVersion ?? "") : undefined,
      });
    }
  }, []);

  const loadReportFromApi = useCallback(() => {
    fetch("/api/play-reports")
      .then((r) => r.json())
      .then((body) => {
        if (body.ok && body.report) {
          applyLoadedReport(body.report, "api:/api/play-reports");
          return;
        }
        loadReportFromSession();
      })
      .catch(() => {
        loadReportFromSession();
      });
  }, [applyLoadedReport]);

  const loadReportFromSession = useCallback(() => {
    try {
      const stored = sessionStorage.getItem("dungeonbreak-browser-report");
      if (stored) {
        const { report: r } = JSON.parse(stored);
        if (r) applyLoadedReport(r, "session:browser-playthrough");
      }
    } catch {
      // ignore
    }
  }, [applyLoadedReport]);

  useEffect(() => {
    const selected = reportOptions.find((row) => row.id === selectedReportOptionId);
    if (!selected) return;
    if (selected.kind === "api") {
      loadReportFromApi();
      return;
    }
    loadReportFromSession();
  }, [selectedReportOptionId, reportOptions, loadReportFromApi, loadReportFromSession]);

  const playerStateAtTurn = useMemo(() => {
    if (!report || selectedTurn < 0) return null;
    return getPlayerStateAtTurn(report.seed, report.run.actionTrace, selectedTurn);
  }, [report, selectedTurn]);

  useEffect(() => {
    if (!playerStateAtTurn || !report) return;
    const traitUpdates: Record<string, number> = {};
    const featureUpdates: Record<string, number> = {};
    for (const t of TRAIT_NAMES) {
      traitUpdates[t] = Number(playerStateAtTurn.traits[t] ?? 0);
    }
    for (const f of FEATURE_NAMES) {
      featureUpdates[f] = Number(playerStateAtTurn.features[f] ?? 0);
    }
    setTraits(traitUpdates);
    setFeatures(featureUpdates);
    setTraitDeltas(makeNumberRecord(TRAIT_NAMES, 0));
    setFeatureDeltas(makeNumberRecord(FEATURE_NAMES, 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync only when turn/playerState changes
  }, [playerStateAtTurn, report]);

  const traitVector = useMemo(
    () =>
      TRAIT_NAMES.map((t) => Number(traits[t] ?? 0) + Number(traitDeltas[t] ?? 0)).map((v) =>
        Math.max(-1, Math.min(1, v)),
      ),
    [traits, traitDeltas],
  );
  const featureVector = useMemo(
    () => FEATURE_NAMES.map((f) => Number(features[f] ?? 0) + Number(featureDeltas[f] ?? 0)),
    [features, featureDeltas],
  );
  const navigationFeatureVector = useMemo(
    () =>
      NAVIGATION_FEATURE_NAMES.map(
        (f) => Number(features[f] ?? 0) + Number(featureDeltas[f] ?? 0),
      ),
    [features, featureDeltas],
  );
  const movementControlVector = useMemo(
    () =>
      MOVEMENT_CONTROL_NAMES.map((f) =>
        Math.max(0, Number(features[f] ?? 0) + Number(featureDeltas[f] ?? 0)),
      ),
    [features, featureDeltas],
  );
  const debouncedTraitVector = useDebouncedValue(traitVector, 120);
  const debouncedFeatureVector = useDebouncedValue(navigationFeatureVector, 120);
  const combinedVector = useMemo(
    () => [...debouncedTraitVector, ...debouncedFeatureVector],
    [debouncedTraitVector, debouncedFeatureVector],
  );
  const movementBudget = useMemo(() => {
    const effort = movementControlVector[0] ?? 0;
    const momentum = movementControlVector[1] ?? 0;
    return (effort + momentum) / 2;
  }, [movementControlVector]);

  const unifiedModel = useMemo(() => {
    const runtime = EngineRuntime as unknown as {
      buildUnifiedSpaceModel?: (overrides?: SpaceVectorPackOverrides) => RuntimeUnifiedModel;
    };
    const merged: SpaceVectorPackOverrides = {
      ...(spaceOverrides ?? {}),
      behaviorDefaults: {
        ...(spaceOverrides?.behaviorDefaults ?? {}),
        windowSeconds: behaviorWindowSeconds,
        stepSeconds: behaviorStepSeconds,
      },
    };
    if (typeof runtime.buildUnifiedSpaceModel === "function") {
      return runtime.buildUnifiedSpaceModel(merged);
    }
    return {
      actionSpace: [],
      eventSpace: [],
      effectSpace: [],
    } satisfies RuntimeUnifiedModel;
  }, [spaceOverrides, behaviorWindowSeconds, behaviorStepSeconds]);

  const runtimeFeatureSchema = useMemo((): RuntimeFeatureSchemaRow[] => {
    const runtime = EngineRuntime as unknown as {
      getFeatureSchema?: (overrides?: SpaceVectorPackOverrides) => RuntimeFeatureSchemaRow[];
    };
    const baseRows =
      typeof runtime.getFeatureSchema === "function"
        ? runtime.getFeatureSchema(spaceOverrides)
        : [
            ...TRAIT_NAMES.map((featureId) => ({
              featureId,
              label: featureId,
              groups: ["content_features"],
              spaces: ["dialogue", "skill", "archetype", "event"],
            })),
            ...FEATURE_NAMES.map((featureId) => ({
              featureId,
              label: featureId,
              groups: ["power_features"],
              spaces: ["entity", "event", "level"],
            })),
          ];
    return ensureStatFeatureSchemaRows(baseRows);
  }, [spaceOverrides]);

  const runtimeModelSchemas = useMemo((): RuntimeModelSchemaRow[] => {
    const runtime = EngineRuntime as unknown as {
      getModelSchemas?: (overrides?: SpaceVectorPackOverrides) => RuntimeModelSchemaRow[];
    };
    const baseRows = typeof runtime.getModelSchemas === "function" ? runtime.getModelSchemas(spaceOverrides) : [];
    return ensureCombatStatsModelSchemas(baseRows, runtimeFeatureSchema);
  }, [spaceOverrides, runtimeFeatureSchema]);
  const featureDefaultsById = useMemo(
    () => new Map(runtimeFeatureSchema.map((row) => [row.featureId, row.defaultValue ?? 0] as const)),
    [runtimeFeatureSchema],
  );

  const knownSpaceIds = useMemo(
    () =>
      [...new Set(runtimeFeatureSchema.flatMap((row) => row.spaces))]
        .filter((space) => !!space)
        .sort((a, b) => a.localeCompare(b)),
    [runtimeFeatureSchema],
  );

  const inferredKaelModelId = useMemo(() => {
    const ids = runtimeModelSchemas.map((row) => row.modelId);
    if (ids.includes("entity.kael")) return "entity.kael";
    if (ids.includes("entity.player")) return "entity.player";
    if (ids.includes("entity")) return "entity";
    const firstEntity = ids.find((id) => id.startsWith("entity."));
    return firstEntity ?? ids[0] ?? "none";
  }, [runtimeModelSchemas]);

  const canonicalModelIds = useMemo(
    () => [...new Set(modelInstances.filter((row) => row.canonical).map((row) => row.modelId))],
    [modelInstances],
  );
  const selectableModelSchemas = useMemo(() => {
    const canonicalRows = canonicalModelIds
      .map((modelId) => runtimeModelSchemas.find((row) => row.modelId === modelId))
      .filter((row): row is RuntimeModelSchemaRow => !!row);
    return canonicalRows.length > 0 ? canonicalRows : runtimeModelSchemas;
  }, [canonicalModelIds, runtimeModelSchemas]);

  const selectedModelForSpaceView = useMemo(
    () => {
      if (!activeModelSchemaId || activeModelSchemaId === NO_MODEL_SELECTED) return null;
      return selectableModelSchemas.find((row) => row.modelId === activeModelSchemaId) ?? null;
    },
    [selectableModelSchemas, activeModelSchemaId],
  );
  const selectedModelForSpaceViewId = selectedModelForSpaceView?.modelId ?? "";
  const modelOptions = useMemo(
    () => [...selectableModelSchemas].sort((a, b) => a.modelId.localeCompare(b.modelId)),
    [selectableModelSchemas],
  );
  const canonicalAssetOptions = useMemo(
    () =>
      modelInstances
        .filter((row) => row.canonical)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [modelInstances],
  );
  const selectedInfoModelSchema = useMemo(
    () => runtimeModelSchemas.find((row) => row.modelId === activeModelSchemaId) ?? null,
    [runtimeModelSchemas, activeModelSchemaId],
  );
  const selectedInfoAsset = useMemo(
    () => modelInstances.find((row) => row.id === activeModelInstanceId) ?? null,
    [modelInstances, activeModelInstanceId],
  );
  const infoSchemaTabs = useMemo(() => {
    if (!selectedInfoModelSchema) return [] as Array<{ id: string; label: string; code: string }>;
    const assetFileStem = toFileStem(selectedInfoAsset?.name ?? selectedInfoModelSchema.modelId);
    const tsFile = buildSingleSchemaFileForLanguage(
      selectedInfoModelSchema,
      runtimeModelSchemas,
      featureDefaultsById,
      "typescript",
      assetFileStem,
    );
    const cppFile = buildSingleSchemaFileForLanguage(
      selectedInfoModelSchema,
      runtimeModelSchemas,
      featureDefaultsById,
      "cpp",
      assetFileStem,
    );
    const csFile = buildSingleSchemaFileForLanguage(
      selectedInfoModelSchema,
      runtimeModelSchemas,
      featureDefaultsById,
      "csharp",
      assetFileStem,
    );
    const schemaJson = buildJsonSchemaForModel(selectedInfoModelSchema, runtimeModelSchemas, featureDefaultsById);
    const dataJson = {
      modelId: selectedInfoModelSchema.modelId,
      assetId: selectedInfoAsset?.id ?? null,
      assetName: selectedInfoAsset?.name ?? null,
      stats: Object.fromEntries(
        selectedInfoModelSchema.featureRefs.map((ref) => [
          ref.featureId,
          Number((ref.defaultValue ?? featureDefaultsById.get(ref.featureId) ?? 0).toFixed(3)),
        ]),
      ),
    };
    const tabs: Array<{ id: string; label: string; code: string }> = [];
    if (tsFile) tabs.push({ id: "info:ts", label: tsFile.path, code: tsFile.code });
    if (cppFile) tabs.push({ id: "info:cpp", label: cppFile.path, code: cppFile.code });
    if (csFile) tabs.push({ id: "info:csharp", label: csFile.path, code: csFile.code });
    tabs.push({ id: "info:schema", label: `${assetFileStem}.schema.json`, code: JSON.stringify(schemaJson, null, 2) });
    tabs.push({ id: "info:data", label: `${assetFileStem}.json`, code: JSON.stringify(dataJson, null, 2) });
    return tabs;
  }, [selectedInfoModelSchema, selectedInfoAsset, runtimeModelSchemas, featureDefaultsById]);
  const activeInfoSchemaTab = useMemo(
    () => infoSchemaTabs.find((tab) => tab.id === vizInfoTabId) ?? infoSchemaTabs[0] ?? null,
    [infoSchemaTabs, vizInfoTabId],
  );
  const selectedCanonicalAsset = useMemo(
    () => canonicalAssetOptions.find((row) => row.id === activeModelInstanceId) ?? null,
    [canonicalAssetOptions, activeModelInstanceId],
  );
  useEffect(() => {
    if (infoSchemaTabs.length === 0) {
      setVizInfoTabId("");
      setVizInfoEditorCode("");
      return;
    }
    if (!vizInfoTabId || !infoSchemaTabs.some((tab) => tab.id === vizInfoTabId)) {
      setVizInfoTabId(infoSchemaTabs[0]!.id);
    }
  }, [infoSchemaTabs, vizInfoTabId]);
  useEffect(() => {
    setVizInfoEditorCode(activeInfoSchemaTab?.code ?? "");
  }, [activeInfoSchemaTab]);

  useEffect(() => {
    if (activeModelSchemaId === NO_MODEL_SELECTED || !activeModelSchemaId) return;
    if (modelOptions.some((row) => row.modelId === activeModelSchemaId)) return;
    setActiveModelSelection(NO_MODEL_SELECTED, null);
  }, [modelOptions, activeModelSchemaId, setActiveModelSelection]);

  const selectedModelInheritanceChain = useMemo(() => {
    if (!selectedModelForSpaceView) return [] as RuntimeModelSchemaRow[];
    const byId = new Map(runtimeModelSchemas.map((row) => [row.modelId, row] as const));
    const idSet = new Set(runtimeModelSchemas.map((row) => row.modelId));
    const chain: RuntimeModelSchemaRow[] = [];
    const visited = new Set<string>();
    let cursor: RuntimeModelSchemaRow | undefined = selectedModelForSpaceView;
    while (cursor && !visited.has(cursor.modelId)) {
      chain.unshift(cursor);
      visited.add(cursor.modelId);
      const parentId = resolveParentModelId(cursor.modelId, idSet, byId);
      cursor = parentId ? byId.get(parentId) : undefined;
    }
    return chain;
  }, [selectedModelForSpaceView, runtimeModelSchemas]);
  const statContentLevels = useMemo(
    () =>
      selectedModelInheritanceChain
        .filter((schema) => schema.modelId.endsWith("stats"))
        .map((schema, index) => {
          const hue = Math.round(hashToUnit(`stat-level:${schema.modelId}`) * 360);
          const featureIds = [...new Set(schema.featureRefs.map((row) => row.featureId))];
          return {
            modelId: schema.modelId,
            featureIds,
            depth: index,
            color: `hsl(${hue}, 82%, 62%)`,
            colorBorder: `hsla(${hue}, 82%, 62%, 0.46)`,
            colorSoft: `hsla(${hue}, 82%, 62%, 0.13)`,
          };
        }),
    [selectedModelInheritanceChain],
  );

  useEffect(() => {
    setEnabledStatLevelById((prev) => {
      if (statContentLevels.length === 0) {
        if (Object.keys(prev).length === 0) return prev;
        return {};
      }
      const next: Record<string, boolean> = {};
      let changed = false;
      for (const level of statContentLevels) {
        next[level.modelId] = prev[level.modelId] ?? true;
      }
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (prevKeys.length !== nextKeys.length) {
        changed = true;
      } else {
        for (const key of nextKeys) {
          if (prev[key] !== next[key]) {
            changed = true;
            break;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [statContentLevels]);

  const enabledStatFeatureIdSet = useMemo(() => {
    const set = new Set<string>();
    for (const level of statContentLevels) {
      if (!(enabledStatLevelById[level.modelId] ?? true)) continue;
      for (const featureId of level.featureIds) {
        set.add(featureId);
      }
    }
    return set;
  }, [statContentLevels, enabledStatLevelById]);

  useEffect(() => {
    if (runtimeSpaceView !== "content-combined") {
      setRuntimeSpaceView("content-combined");
    }
  }, [runtimeSpaceView, setRuntimeSpaceView]);

  const createModelSchemaFromTree = useCallback((modelIdRaw: string, labelRaw?: string, templateModelId?: string) => {
    const modelId = normalizeModelId(modelIdRaw);
    if (!modelId) return;
    if (runtimeModelSchemas.some((row) => row.modelId === modelId)) return;
    const template =
      runtimeModelSchemas.find((row) => row.modelId === templateModelId) ??
      runtimeModelSchemas.find((row) => row.modelId === selectedModelForSpaceViewId) ??
      runtimeModelSchemas.find((row) => row.modelId === inferredKaelModelId) ??
      runtimeModelSchemas[0];
    const featureRefs =
      template?.featureRefs?.map((ref) => ({
        ...ref,
        spaces: [...ref.spaces],
      })) ??
      runtimeFeatureSchema.slice(0, 4).map((row) => ({
        featureId: row.featureId,
        spaces: row.spaces.length > 0 ? [...row.spaces] : ["entity"],
        required: false,
        defaultValue: row.defaultValue,
      }));
    if (featureRefs.length === 0) return;
    const newRow: RuntimeModelSchemaRow = {
      modelId,
      label: labelRaw?.trim() || modelId,
      description: `Generated in Space Explorer (${new Date().toISOString()})`,
      extendsModelId:
        template && template.modelId !== modelId
          ? template.modelId
          : undefined,
      featureRefs,
    };
    setSpaceOverrides((prev) => ({
      ...(prev ?? {}),
      modelSchemas: [...runtimeModelSchemas, newRow],
    }));
    setActiveModelSelection(modelId, null);
  }, [runtimeModelSchemas, runtimeFeatureSchema, selectedModelForSpaceViewId, inferredKaelModelId, setActiveModelSelection]);

  useEffect(() => {
    if (!inferredKaelModelId || inferredKaelModelId === "none") return;
    ensureKaelBinding(inferredKaelModelId);
  }, [inferredKaelModelId, ensureKaelBinding]);

  useEffect(() => {
    setActiveModelSelection(NO_MODEL_SELECTED, null);
  }, [setActiveModelSelection]);

  useEffect(() => {
    if (selectedModelFeatureIds.length > 0) return;
    setSelectedModelFeatureIds(runtimeFeatureSchema.slice(0, 4).map((row) => row.featureId));
  }, [runtimeFeatureSchema, selectedModelFeatureIds.length]);

  const addFeatureToSchema = useCallback(() => {
    const id = slugify(newFeatureId);
    if (!id) return;
    const spaces = newFeatureSpaces
      .split(",")
      .map((row) => row.trim())
      .filter((row) => row.length > 0);
    if (spaces.length === 0) return;
    const featureRow = {
      featureId: id,
      label: newFeatureId.trim() || id,
      groups: [newFeatureGroup],
      spaces,
      defaultValue: 0,
    };
    const current = runtimeFeatureSchema.filter((row) => row.featureId !== id);
    setSpaceOverrides((prev) => ({
      ...(prev ?? {}),
      featureSchema: [...current, featureRow],
    }));
    setSelectedModelFeatureIds((prev) => [...new Set([...prev, id])]);
    setNewFeatureId("");
  }, [newFeatureGroup, newFeatureId, newFeatureSpaces, runtimeFeatureSchema]);

  const addModelSchema = useCallback(() => {
    const modelId = slugify(newModelId);
    if (!modelId || selectedModelFeatureIds.length === 0) return;
    const spaces = newModelSpaces
      .split(",")
      .map((row) => row.trim())
      .filter((row) => row.length > 0);
    const featureRefs = selectedModelFeatureIds.map((featureId) => ({
      featureId,
      spaces,
      required: false,
      defaultValue: runtimeFeatureSchema.find((row) => row.featureId === featureId)?.defaultValue,
    }));
    const row: RuntimeModelSchemaRow = {
      modelId,
      label: newModelLabel.trim() || modelId,
      description: `Generated in Space Explorer (${new Date().toISOString()})`,
      featureRefs,
    };
    const current = runtimeModelSchemas.filter((model) => model.modelId !== modelId);
    setSpaceOverrides((prev) => ({
      ...(prev ?? {}),
      modelSchemas: [...current, row],
    }));
  }, [newModelId, newModelLabel, newModelSpaces, runtimeModelSchemas, selectedModelFeatureIds, runtimeFeatureSchema]);

  const addFeatureRefToModel = useCallback((modelId: string, featureId: string) => {
    if (!modelId || !featureId) return;
    const model = runtimeModelSchemas.find((row) => row.modelId === modelId);
    if (!model) return;
    if (model.featureRefs.some((row) => row.featureId === featureId)) return;
    const schemaRow = runtimeFeatureSchema.find((row) => row.featureId === featureId);
    const spaces = schemaRow?.spaces?.length ? schemaRow.spaces : ["entity"];
    const defaultValue = schemaRow?.defaultValue;
    const nextModels = runtimeModelSchemas.map((row) =>
      row.modelId === modelId
        ? { ...row, featureRefs: [...row.featureRefs, { featureId, spaces, required: false, defaultValue }] }
        : row,
    );
    setSpaceOverrides((prev) => ({
      ...(prev ?? {}),
      modelSchemas: nextModels,
    }));
  }, [runtimeModelSchemas, runtimeFeatureSchema]);

  const removeFeatureRefFromModel = useCallback((modelId: string, featureId: string) => {
    if (!modelId || !featureId) return;
    const nextModels = runtimeModelSchemas.map((row) =>
      row.modelId === modelId
        ? { ...row, featureRefs: row.featureRefs.filter((ref) => ref.featureId !== featureId) }
        : row,
    );
    setSpaceOverrides((prev) => ({
      ...(prev ?? {}),
      modelSchemas: nextModels,
    }));
  }, [runtimeModelSchemas]);

  const updateFeatureRefDefaultValue = useCallback((modelId: string, featureId: string, defaultValue: number | null) => {
    if (!modelId || !featureId) return;
    const nextModels = runtimeModelSchemas.map((row) => {
      if (row.modelId !== modelId) return row;
      return {
        ...row,
        featureRefs: row.featureRefs.map((ref) =>
          ref.featureId === featureId
            ? { ...ref, defaultValue: defaultValue == null || Number.isNaN(defaultValue) ? undefined : defaultValue }
            : ref,
        ),
      };
    });
    setSpaceOverrides((prev) => ({
      ...(prev ?? {}),
      modelSchemas: nextModels,
    }));
  }, [runtimeModelSchemas]);

  const attachStatModelToModel = useCallback(
    (modelId: string, statModelId: string) => {
      if (!modelId || !statModelId) return;
      const byId = new Map(runtimeModelSchemas.map((row) => [row.modelId, row] as const));
      const targetModel = byId.get(modelId);
      const statModel = byId.get(statModelId);
      if (!targetModel || !statModel) return;
      if (targetModel.modelId.endsWith("stats")) return;
      if (!statModel.modelId.endsWith("stats")) return;
      const idSet = new Set(runtimeModelSchemas.map((row) => row.modelId));
      const statChain: RuntimeModelSchemaRow[] = [];
      const visited = new Set<string>();
      let cursor: RuntimeModelSchemaRow | undefined = statModel;
      while (cursor && !visited.has(cursor.modelId)) {
        visited.add(cursor.modelId);
        statChain.unshift(cursor);
        const parentId = resolveParentModelId(cursor.modelId, idSet, byId);
        if (!parentId) break;
        const parent = byId.get(parentId);
        if (!parent || !parent.modelId.endsWith("stats")) break;
        cursor = parent;
      }
      const nextModels = runtimeModelSchemas.map((row) => {
        if (row.modelId !== modelId) return row;
        const existing = new Map(row.featureRefs.map((ref) => [ref.featureId, ref] as const));
        for (const statLayer of statChain) {
          for (const ref of statLayer.featureRefs) {
            if (!existing.has(ref.featureId)) {
              existing.set(ref.featureId, {
                featureId: ref.featureId,
                spaces: [...ref.spaces],
                required: ref.required,
                defaultValue: ref.defaultValue,
              });
            }
          }
        }
        return {
          ...row,
          featureRefs: Array.from(existing.values()),
          attachedStatModelIds: [...new Set([...(row.attachedStatModelIds ?? []), statModelId])],
        };
      });
      setSpaceOverrides((prev) => ({
        ...(prev ?? {}),
        modelSchemas: nextModels,
      }));
    },
    [runtimeModelSchemas],
  );

  const updateModelMetadata = useCallback(
    (modelId: string, updates: { label?: string; description?: string }) => {
      if (!modelId) return;
      const nextModels = runtimeModelSchemas.map((row) => {
        if (row.modelId !== modelId) return row;
        return {
          ...row,
          label: updates.label ?? row.label,
          description: updates.description ?? row.description,
        };
      });
      setSpaceOverrides((prev) => ({
        ...(prev ?? {}),
        modelSchemas: nextModels,
      }));
    },
    [runtimeModelSchemas],
  );

  const deleteModelSchema = useCallback(
    (modelId: string) => {
      if (!modelId) return;
      const nextModels = runtimeModelSchemas.filter((row) => row.modelId !== modelId);
      const nextInstances = modelInstances.filter((row) => row.modelId !== modelId);
      setSpaceOverrides((prev) => ({
        ...(prev ?? {}),
        modelSchemas: nextModels,
      }));
      replaceModelInstances(nextInstances);
      setActiveModelSelection(NO_MODEL_SELECTED, null);
    },
    [runtimeModelSchemas, modelInstances, replaceModelInstances, setActiveModelSelection],
  );
  const replaceModelSchemas = useCallback((models: RuntimeModelSchemaRow[]) => {
    setSpaceOverrides((prev) => ({
      ...(prev ?? {}),
      modelSchemas: models,
    }));
  }, []);
  const replaceCanonicalAssets = useCallback((assets: ModelInstanceBinding[]) => {
    const sanitized = assets.map((row) => ({
      id: row.id,
      name: row.name,
      modelId: normalizeModelId(row.modelId),
      canonical: true,
    }));
    replaceModelInstances(sanitized);
  }, [replaceModelInstances]);

  const applyPreset = useCallback(() => {
    const preset = MODEL_PRESETS.find((row) => row.id === selectedPresetId);
    if (!preset) return;
    const presetModel = preset.model;
    const current = runtimeModelSchemas.filter((model) => model.modelId !== presetModel.modelId);
    setSpaceOverrides((prev) => ({
      ...(prev ?? {}),
      modelSchemas: [...current, presetModel],
    }));
    setBuilderMessage(`Applied preset: ${preset.label}`);
  }, [runtimeModelSchemas, selectedPresetId]);

  const packPatch = useMemo(
    () => ({
      schemaVersion: "content-pack.space-vectors.patch/v1",
      generatedAt: new Date().toISOString(),
      spaceVectorsPatch: {
        featureSchema: runtimeFeatureSchema,
        modelSchemas: runtimeModelSchemas,
      },
      contentBindings: {
        modelInstances,
        canonicalModelInstances: modelInstances.filter((row) => row.canonical),
      },
    }),
    [runtimeFeatureSchema, runtimeModelSchemas, modelInstances],
  );

  const patchValidationErrors = useMemo(
    () =>
      validatePatchSchema({
        featureSchema: runtimeFeatureSchema,
        modelSchemas: runtimeModelSchemas,
      }),
    [runtimeFeatureSchema, runtimeModelSchemas],
  );

  const diffSummary = useMemo(() => {
    const baseFeatures = new Set(
      (((baseSpaceVectors?.featureSchema as RuntimeFeatureSchemaRow[] | undefined) ?? []).map((row) => row.featureId)),
    );
    const currentFeatures = new Set(runtimeFeatureSchema.map((row) => row.featureId));
    const baseModels = new Set(
      (((baseSpaceVectors?.modelSchemas as RuntimeModelSchemaRow[] | undefined) ?? []).map((row) => row.modelId)),
    );
    const currentModels = new Set(runtimeModelSchemas.map((row) => row.modelId));
    const featureAdded = [...currentFeatures].filter((id) => !baseFeatures.has(id)).length;
    const featureRemoved = [...baseFeatures].filter((id) => !currentFeatures.has(id)).length;
    const modelAdded = [...currentModels].filter((id) => !baseModels.has(id)).length;
    const modelRemoved = [...baseModels].filter((id) => !currentModels.has(id)).length;
    return { featureAdded, featureRemoved, modelAdded, modelRemoved };
  }, [baseSpaceVectors, runtimeFeatureSchema, runtimeModelSchemas]);

  const saveDraft = useCallback(() => {
    const name = draftName.trim() || `space-vectors-draft-${drafts.length + 1}`;
    const draft: PatchDraft = {
      id: `${slugify(name)}-${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      patch: {
        featureSchema: runtimeFeatureSchema,
        modelSchemas: runtimeModelSchemas,
      },
    };
    setDrafts((prev) => [draft, ...prev].slice(0, 30));
    setBuilderMessage(`Saved draft: ${name}`);
  }, [draftName, drafts.length, runtimeFeatureSchema, runtimeModelSchemas]);

  const loadDraft = useCallback((draft: PatchDraft) => {
    setSpaceOverrides((prev) => ({
      ...(prev ?? {}),
      featureSchema: draft.patch.featureSchema,
      modelSchemas: draft.patch.modelSchemas,
    }));
    setBuilderMessage(`Loaded draft: ${draft.name}`);
  }, []);

  const deleteDraft = useCallback((draftId: string) => {
    setDrafts((prev) => prev.filter((row) => row.id !== draftId));
  }, []);

  const downloadReleaseBundle = useCallback(async () => {
    if (patchValidationErrors.length > 0) {
      setBuilderMessage("Fix validation errors before building full bundle.");
      return;
    }
    setBundleBusy(true);
    try {
      const response = await fetch("/api/content-packs/build-bundle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          patchName: draftName.trim() || "space-vectors.patch",
          spaceVectorsPatch: {
            featureSchema: runtimeFeatureSchema,
            modelSchemas: runtimeModelSchemas,
            contentBindings: {
              modelInstances,
              canonicalModelInstances: modelInstances.filter((row) => row.canonical),
            },
          },
        }),
      });
      const body = (await response.json()) as { ok: boolean; bundle?: unknown; manifest?: unknown; error?: string };
      if (!body.ok || !body.bundle) {
        setBuilderMessage(body.error ?? "Bundle build failed.");
        return;
      }
      const outName = `${slugify(draftName.trim() || "space-vectors")}.content-pack.bundle.v1.json`;
      downloadJson(outName, body.bundle);
      if (body.manifest) {
        const manifestName = `${slugify(draftName.trim() || "space-vectors")}.content-pack.manifest.v1.json`;
        downloadJson(manifestName, body.manifest);
      }
      setBuilderMessage(`Built and downloaded full bundle: ${outName}`);
    } catch (error) {
      setBuilderMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBundleBusy(false);
    }
  }, [draftName, patchValidationErrors.length, runtimeFeatureSchema, runtimeModelSchemas, modelInstances]);

  const runQuickTestMode = useCallback(async () => {
    if (patchValidationErrors.length > 0) {
      setBuilderMessage("Fix validation errors before running test mode.");
      return;
    }
    setQuickTestBusy(true);
    setPipelineLoading(true);
    setTestModeGeneratedAt(null);
    try {
      const response = await fetch("/api/content-packs/build-bundle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          patchName: `test-mode-${slugify(draftName.trim() || "content-schema")}`,
          spaceVectorsPatch: {
            featureSchema: runtimeFeatureSchema,
            modelSchemas: runtimeModelSchemas,
            contentBindings: {
              modelInstances,
              canonicalModelInstances: modelInstances.filter((row) => row.canonical),
            },
          },
        }),
      });
      const body = (await response.json()) as { ok: boolean; bundle?: BuiltBundlePayload; error?: string };
      if (!body.ok || !body.bundle) {
        setBuilderMessage(body.error ?? "Failed to build test mode bundle.");
        return;
      }
      const bundle = body.bundle;
      const overrides = bundle.packs?.spaceVectors;
      if (overrides) {
        setSpaceOverrides(overrides);
        setBaseSpaceVectors(overrides);
        const instances = parseModelInstancesFromContentBindings(overrides);
        if (instances.length > 0) {
          replaceModelInstances(instances);
        }
      }
      const identity: PackIdentity = {
        source: "test-mode:space-explorer",
        packId: String(bundle.patchName ?? "test-mode.content-pack.bundle.v1"),
        packVersion: String(bundle.generatedAt ?? new Date().toISOString()),
        packHash: String(bundle.hashes?.overall ?? "unknown"),
        schemaVersion: String(bundle.schemaVersion ?? "content-pack.bundle.v1"),
        engineVersion: String(bundle.enginePackage?.version ?? "unknown"),
      };
      setLoadedPackIdentity(identity);
      setLoadedReportIdentity({
        source: "test-mode:browser-playthrough",
        packId: identity.packId,
        packVersion: identity.packVersion,
        packHash: identity.packHash,
        schemaVersion: identity.schemaVersion,
        engineVersion: identity.engineVersion,
      });
      const report = runPlaythrough(undefined, 75, undefined, reportPolicyId);
      const reportWithBinding = {
        ...report,
        packBinding: {
          packId: identity.packId,
          packVersion: identity.packVersion,
          packHash: identity.packHash,
          schemaVersion: identity.schemaVersion,
          engineVersion: identity.engineVersion,
        },
      };
      const analysis = analyzeReport(reportWithBinding as Parameters<typeof analyzeReport>[0]);
      try {
        sessionStorage.setItem("dungeonbreak-browser-report", JSON.stringify({ report: reportWithBinding, analysis }));
      } catch {
        // ignore session storage failures
      }
      setReport({
        seed: report.seed,
        run: {
          actionTrace: report.run.actionTrace as ActionTraceEntry[],
        },
      });
      setSelectedTurn(0);
      setTestModeEnabled(true);
      setTestModeGeneratedAt(new Date().toISOString());
      setBuilderMessage("Test mode complete: bundle built, report generated, and visualization bound to fresh object content.");
    } catch (error) {
      setBuilderMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setPipelineLoading(false);
      setQuickTestBusy(false);
    }
  }, [
    patchValidationErrors.length,
    draftName,
    runtimeFeatureSchema,
    runtimeModelSchemas,
    modelInstances,
    reportPolicyId,
    replaceModelInstances,
  ]);

  const publishDeliveryVersion = useCallback(async () => {
    if (patchValidationErrors.length > 0) {
      setBuilderMessage("Fix validation errors before publishing.");
      return;
    }
    const nextVersion = deliveryVersionDraft.trim();
    if (!nextVersion) {
      setBuilderMessage("Set a version before publishing.");
      return;
    }
    setDeliveryBusy(true);
    try {
      const buildResponse = await fetch("/api/content-packs/build-bundle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          patchName: `delivery-${slugify(nextVersion)}`,
          spaceVectorsPatch: {
            featureSchema: runtimeFeatureSchema,
            modelSchemas: runtimeModelSchemas,
            contentBindings: {
              modelInstances,
              canonicalModelInstances: modelInstances.filter((row) => row.canonical),
            },
          },
        }),
      });
      const buildBody = (await buildResponse.json()) as {
        ok: boolean;
        bundle?: BuiltBundlePayload;
        error?: string;
      };
      if (!buildBody.ok || !buildBody.bundle) {
        setBuilderMessage(buildBody.error ?? "Failed to build bundle for publish.");
        return;
      }
      const publishResponse = await fetch("/api/content-packs/delivery/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          version: nextVersion,
          bundle: buildBody.bundle,
          compatibility: {
            pluginVersion: deliveryPluginVersion.trim() || "*",
            runtimeVersion: deliveryRuntimeVersion.trim() || "*",
            contentSchemaVersion: String(buildBody.bundle.schemaVersion ?? "content-pack.bundle.v1"),
          },
        }),
      });
      const publishBody = (await publishResponse.json()) as {
        ok: boolean;
        version?: string;
        record?: DeliveryVersionRecord;
        error?: string;
      };
      if (!publishBody.ok || !publishBody.record) {
        setBuilderMessage(publishBody.error ?? "Publish failed.");
        return;
      }
      setLastPublishedVersion(publishBody.version ?? publishBody.record.version);
      setBuilderMessage(
        `Published delivery version '${publishBody.version}' (${publishBody.record.packId} @ ${publishBody.record.packHash.slice(0, 10)}...).`,
      );
    } catch (error) {
      setBuilderMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setDeliveryBusy(false);
    }
  }, [
    patchValidationErrors.length,
    deliveryVersionDraft,
    runtimeFeatureSchema,
    runtimeModelSchemas,
    modelInstances,
    deliveryPluginVersion,
    deliveryRuntimeVersion,
    setLastPublishedVersion,
  ]);

  const pullDeliveryVersion = useCallback(async () => {
    setDeliveryBusy(true);
    try {
      const response = await fetch("/api/content-packs/delivery/pull", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          compatibility: {
            pluginVersion: deliveryPluginVersion.trim() || undefined,
            runtimeVersion: deliveryRuntimeVersion.trim() || undefined,
          },
        }),
      });
      const body = (await response.json()) as DeliveryPullResponse;
      if (!body.ok || !body.record || !body.downloads) {
        setBuilderMessage(body.error ?? "No matching delivery version found.");
        return;
      }
      setDeliverySelection(body);
      setLastPulledVersion(body.record.version);
      setBuilderMessage(`Pulled delivery version '${body.record.version}'. Use links to fetch bundle/manifest.`);
    } catch (error) {
      setBuilderMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setDeliveryBusy(false);
    }
  }, [deliveryPluginVersion, deliveryRuntimeVersion, setLastPulledVersion, setDeliverySelection]);

  const applyAuthoringOperations = useCallback(
    async (operations: AuthoringChatOperation[]): Promise<AuthoringApplyResult> => {
      if (!Array.isArray(operations) || operations.length === 0) {
        return { ok: false, summary: "No operations were proposed." };
      }

      const nextFeatureSchema = runtimeFeatureSchema.map((row) => ({
        ...row,
        groups: [...row.groups],
        spaces: [...row.spaces],
      }));
      const nextModelSchemas = runtimeModelSchemas.map((row) => ({
        ...row,
        featureRefs: row.featureRefs.map((ref) => ({ ...ref, spaces: [...ref.spaces] })),
      }));
      const nextModelInstances = modelInstances.map((row) => ({ ...row }));

      const errors: string[] = [];
      const applied: string[] = [];
      let nextSelection: { modelId: string; instanceId: string | null } | null = null;
      let buildRequest: { patchName?: string; download?: boolean } | null = null;

      for (const operation of operations) {
        switch (operation.op) {
          case "add_feature_schema": {
            const featureId = slugify(operation.featureId);
            const spaces = operation.spaces.map((row) => row.trim()).filter((row) => row.length > 0);
            if (!featureId || spaces.length === 0) {
              errors.push(`Invalid add_feature_schema operation for '${operation.featureId}'.`);
              break;
            }
            const nextRow: RuntimeFeatureSchemaRow = {
              featureId,
              label: operation.label?.trim() || featureId,
              groups:
                operation.groups?.map((row) => row.trim()).filter((row) => row.length > 0) ?? ["content_features"],
              spaces,
              defaultValue: Number.isFinite(operation.defaultValue) ? operation.defaultValue : 0,
            };
            const existingIndex = nextFeatureSchema.findIndex((row) => row.featureId === featureId);
            if (existingIndex >= 0) {
              nextFeatureSchema[existingIndex] = nextRow;
            } else {
              nextFeatureSchema.push(nextRow);
            }
            applied.push(`feature:${featureId}`);
            break;
          }
          case "set_feature_default": {
            const featureId = slugify(operation.featureId);
            const featureRow = nextFeatureSchema.find((row) => row.featureId === featureId);
            if (!featureRow) {
              errors.push(`Feature '${featureId}' not found for set_feature_default.`);
              break;
            }
            featureRow.defaultValue = operation.defaultValue;
            applied.push(`feature-default:${featureId}`);
            break;
          }
          case "create_model_schema": {
            const modelId = normalizeModelId(operation.modelId);
            if (!modelId) {
              errors.push(`Invalid modelId '${operation.modelId}' for create_model_schema.`);
              break;
            }
            if (nextModelSchemas.some((row) => row.modelId === modelId)) {
              errors.push(`Model '${modelId}' already exists.`);
              break;
            }
            const featureIds =
              operation.featureIds
                ?.map((row) => slugify(row))
                .filter((row) => row.length > 0) ?? nextFeatureSchema.slice(0, 4).map((row) => row.featureId);
            const dedupedFeatureIds = [...new Set(featureIds)];
            if (dedupedFeatureIds.length === 0) {
              errors.push(`Model '${modelId}' has no feature refs.`);
              break;
            }
            const defaultSpaces = operation.spaces?.map((row) => row.trim()).filter((row) => row.length > 0);
            const featureRefs = dedupedFeatureIds
              .map((featureId) => {
                const featureRow = nextFeatureSchema.find((row) => row.featureId === featureId);
                if (!featureRow) return null;
                return {
                  featureId,
                  spaces: defaultSpaces && defaultSpaces.length > 0 ? [...defaultSpaces] : [...featureRow.spaces],
                  required: false,
                  defaultValue: featureRow.defaultValue,
                };
              })
              .filter((row): row is NonNullable<typeof row> => Boolean(row));
            if (featureRefs.length === 0) {
              errors.push(`Model '${modelId}' only referenced unknown features.`);
              break;
            }
            nextModelSchemas.push({
              modelId,
              label: operation.label?.trim() || modelId,
              description: operation.description?.trim() || `Created via authoring chat (${new Date().toISOString()})`,
              extendsModelId: operation.extendsModelId ? normalizeModelId(operation.extendsModelId) : undefined,
              featureRefs,
            });
            nextSelection = { modelId, instanceId: null };
            applied.push(`model:${modelId}`);
            break;
          }
          case "update_model_metadata": {
            const modelId = normalizeModelId(operation.modelId);
            const modelRow = nextModelSchemas.find((row) => row.modelId === modelId);
            if (!modelRow) {
              errors.push(`Model '${modelId}' not found for update_model_metadata.`);
              break;
            }
            if (operation.label) modelRow.label = operation.label.trim() || modelRow.label;
            if (operation.description) modelRow.description = operation.description.trim();
            applied.push(`model-metadata:${modelId}`);
            break;
          }
          case "add_model_feature_ref": {
            const modelId = normalizeModelId(operation.modelId);
            const featureId = slugify(operation.featureId);
            const modelRow = nextModelSchemas.find((row) => row.modelId === modelId);
            const featureRow = nextFeatureSchema.find((row) => row.featureId === featureId);
            if (!modelRow || !featureRow) {
              errors.push(`Could not add feature ref '${featureId}' to model '${modelId}'.`);
              break;
            }
            const existingRef = modelRow.featureRefs.find((ref) => ref.featureId === featureId);
            const spaces = operation.spaces?.map((row) => row.trim()).filter((row) => row.length > 0);
            if (existingRef) {
              existingRef.spaces = spaces && spaces.length > 0 ? spaces : existingRef.spaces;
              if (typeof operation.required === "boolean") existingRef.required = operation.required;
              if (Number.isFinite(operation.defaultValue)) existingRef.defaultValue = operation.defaultValue;
            } else {
              modelRow.featureRefs.push({
                featureId,
                spaces: spaces && spaces.length > 0 ? spaces : [...featureRow.spaces],
                required: operation.required ?? false,
                defaultValue: Number.isFinite(operation.defaultValue) ? operation.defaultValue : featureRow.defaultValue,
              });
            }
            applied.push(`model-feature:${modelId}.${featureId}`);
            break;
          }
          case "remove_model_feature_ref": {
            const modelId = normalizeModelId(operation.modelId);
            const featureId = slugify(operation.featureId);
            const modelRow = nextModelSchemas.find((row) => row.modelId === modelId);
            if (!modelRow) {
              errors.push(`Model '${modelId}' not found for remove_model_feature_ref.`);
              break;
            }
            modelRow.featureRefs = modelRow.featureRefs.filter((row) => row.featureId !== featureId);
            applied.push(`remove-model-feature:${modelId}.${featureId}`);
            break;
          }
          case "create_canonical_asset": {
            const modelId = normalizeModelId(operation.modelId);
            if (!nextModelSchemas.some((row) => row.modelId === modelId)) {
              errors.push(`Model '${modelId}' not found for create_canonical_asset.`);
              break;
            }
            const base = modelId.replace(/\./g, "_");
            const index = nextModelInstances.filter((row) => row.modelId === modelId).length + 1;
            nextModelInstances.push({
              id: `${base}-asset-${Date.now()}-${index}`,
              name: operation.name?.trim() || `${modelId.split(".")[0] ?? "asset"}_asset_${index}`,
              modelId,
              canonical: true,
            });
            applied.push(`canonical-asset:${modelId}`);
            break;
          }
          case "rename_model_instance": {
            const row = nextModelInstances.find((item) => item.id === operation.instanceId);
            if (!row) {
              errors.push(`Model instance '${operation.instanceId}' not found for rename_model_instance.`);
              break;
            }
            const nextName = operation.name.trim();
            if (!nextName) {
              errors.push(`Model instance '${operation.instanceId}' rename cannot be empty.`);
              break;
            }
            row.name = nextName;
            applied.push(`rename-instance:${operation.instanceId}`);
            break;
          }
          case "set_canonical_state": {
            const row = nextModelInstances.find((item) => item.id === operation.instanceId);
            if (!row) {
              errors.push(`Model instance '${operation.instanceId}' not found for set_canonical_state.`);
              break;
            }
            row.canonical = operation.canonical;
            applied.push(`canonical-state:${operation.instanceId}`);
            break;
          }
          case "set_active_selection": {
            const modelId = normalizeModelId(operation.modelId);
            if (!nextModelSchemas.some((row) => row.modelId === modelId)) {
              errors.push(`Model '${modelId}' not found for set_active_selection.`);
              break;
            }
            const instanceId = operation.instanceId ?? null;
            if (instanceId && !nextModelInstances.some((row) => row.id === instanceId)) {
              errors.push(`Instance '${instanceId}' not found for set_active_selection.`);
              break;
            }
            nextSelection = { modelId, instanceId };
            applied.push(`select:${modelId}`);
            break;
          }
          case "build_bundle":
            buildRequest = { patchName: operation.patchName, download: operation.download };
            applied.push("build-bundle");
            break;
          default:
            errors.push("Unsupported operation.");
        }
      }

      setSpaceOverrides((prev) => ({
        ...(prev ?? {}),
        featureSchema: nextFeatureSchema,
        modelSchemas: nextModelSchemas,
        contentBindings: {
          ...((prev as { contentBindings?: Record<string, unknown> } | undefined)?.contentBindings ?? {}),
          modelInstances: nextModelInstances,
          canonicalModelInstances: nextModelInstances.filter((row) => row.canonical),
        },
      }));
      replaceModelInstances(nextModelInstances);
      if (nextSelection) {
        setActiveModelSelection(nextSelection.modelId, nextSelection.instanceId);
      }

      const validationErrors = validatePatchSchema({
        featureSchema: nextFeatureSchema,
        modelSchemas: nextModelSchemas,
      });

      if (buildRequest && validationErrors.length === 0) {
        try {
          const patchName = buildRequest.patchName?.trim() || draftName.trim() || "space-vectors.patch";
          const response = await fetch("/api/content-packs/build-bundle", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              patchName,
              spaceVectorsPatch: {
                featureSchema: nextFeatureSchema,
                modelSchemas: nextModelSchemas,
                contentBindings: {
                  modelInstances: nextModelInstances,
                  canonicalModelInstances: nextModelInstances.filter((row) => row.canonical),
                },
              },
            }),
          });
          const body = (await response.json()) as {
            ok: boolean;
            bundle?: BuiltBundlePayload;
            manifest?: {
              canonicalAssets?: unknown[];
              models?: unknown[];
              features?: unknown[];
            };
            error?: string;
          };
          if (!body.ok || !body.bundle) {
            errors.push(body.error ?? "Bundle build failed.");
          } else {
            const canonicalCount = Array.isArray(body.manifest?.canonicalAssets) ? body.manifest.canonicalAssets.length : 0;
            const modelCount = Array.isArray(body.manifest?.models) ? body.manifest.models.length : nextModelSchemas.length;
            const featureCount = Array.isArray(body.manifest?.features) ? body.manifest.features.length : nextFeatureSchema.length;
            setBuilderMessage(
              `Chat bundle build complete: models ${modelCount}, features ${featureCount}, canonical assets ${canonicalCount}.`,
            );
            if (buildRequest.download) {
              const outName = `${slugify(patchName)}.content-pack.bundle.v1.json`;
              downloadJson(outName, body.bundle);
              if (body.manifest) {
                downloadJson(`${slugify(patchName)}.content-pack.manifest.v1.json`, body.manifest);
              }
            }
            const overrides = body.bundle.packs?.spaceVectors;
            if (overrides && typeof overrides === "object") {
              setBaseSpaceVectors(overrides);
            }
          }
        } catch (error) {
          errors.push(error instanceof Error ? error.message : String(error));
        }
      } else if (buildRequest && validationErrors.length > 0) {
        errors.push(`Bundle build skipped due to validation errors (${validationErrors.length}).`);
      }

      if (errors.length > 0) {
        return {
          ok: false,
          summary: `Applied ${applied.length} operation(s) with ${errors.length} issue(s).`,
          validationErrors: [...validationErrors, ...errors],
        };
      }
      return {
        ok: true,
        summary: `Applied ${applied.length} operation(s).`,
        validationErrors,
      };
    },
    [
      runtimeFeatureSchema,
      runtimeModelSchemas,
      modelInstances,
      setSpaceOverrides,
      replaceModelInstances,
      setActiveModelSelection,
      draftName,
      setBuilderMessage,
      setBaseSpaceVectors,
    ],
  );

  const playerUnified = useMemo(() => {
    const runtime = EngineRuntime as unknown as {
      projectEntitySpaceVector?: (
        input: { traits: Record<string, number>; features: Record<string, number>; health?: number; energy?: number; reputation?: number },
        overrides?: SpaceVectorPackOverrides,
      ) => UnifiedSpaceVector;
    };
    const traitRecord = Object.fromEntries(TRAIT_NAMES.map((name, i) => [name, traitVector[i] ?? 0])) as Record<string, number>;
    const featureRecord = Object.fromEntries(FEATURE_NAMES.map((name, i) => [name, featureVector[i] ?? 0])) as Record<string, number>;
    if (typeof runtime.projectEntitySpaceVector === "function") {
      return runtime.projectEntitySpaceVector(
        {
          traits: traitRecord,
          features: featureRecord,
        },
        spaceOverrides,
      );
    }
    return {
      traits: traitRecord,
      features: featureRecord,
      semantics: Object.fromEntries(SEMANTIC_AXES.map((axis) => [axis, 0])) as Record<string, number>,
    } satisfies UnifiedSpaceVector;
  }, [traitVector, featureVector, spaceOverrides]);

  const eventEffectKnn = useMemo(() => {
    const source = flattenUnifiedVector(playerUnified);
    const nearestEvents = unifiedModel.eventSpace
      .map((event) => ({
        eventId: event.eventId,
        kind: event.kind,
        score: cosineSimilarity(source, flattenUnifiedVector(event.vector)),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    const nearestEffects = unifiedModel.effectSpace
      .map((effect) => ({
        effectId: effect.effectId,
        sourceType: effect.sourceType,
        score: cosineSimilarity(source, flattenUnifiedVector(effect.delta)),
        behaviorStyle: effect.behavior.style,
        netImpact: effect.behavior.aggregates.netImpact,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    return { nearestEvents, nearestEffects };
  }, [playerUnified, unifiedModel]);

  const runtimeVizPoints = useMemo((): RuntimeVizPoint[] => {
    const source = flattenUnifiedVector(playerUnified);
    const actionRows: RuntimeVizPoint[] = unifiedModel.actionSpace.map((row) => ({
      id: row.actionType,
      name: row.actionType,
      type: "action",
      branch: "action",
      vector: flattenUnifiedVector(row.vector),
      coords: coordsFromUnifiedVector(row.vector),
      similarity: cosineSimilarity(source, flattenUnifiedVector(row.vector)),
    }));
    const eventRows: RuntimeVizPoint[] = unifiedModel.eventSpace.map((row) => ({
      id: row.eventId,
      name: row.eventId,
      type: "event",
      branch: row.kind,
      vector: flattenUnifiedVector(row.vector),
      coords: coordsFromUnifiedVector(row.vector),
      similarity: cosineSimilarity(source, flattenUnifiedVector(row.vector)),
    }));
    const effectRows: RuntimeVizPoint[] = unifiedModel.effectSpace.map((row) => ({
      id: row.effectId,
      name: row.effectId,
      type: "effect",
      branch: row.sourceType,
      vector: flattenUnifiedVector(row.delta),
      coords: coordsFromUnifiedVector(row.delta),
      similarity: cosineSimilarity(source, flattenUnifiedVector(row.delta)),
      netImpact: row.behavior.aggregates.netImpact,
      behaviorStyle: row.behavior.style,
    }));
    if (runtimeSpaceView === "action") return actionRows;
    if (runtimeSpaceView === "event") return eventRows;
    if (runtimeSpaceView === "effect") return effectRows;
    return [];
  }, [playerUnified, unifiedModel, runtimeSpaceView]);

  const contentTypeFilter = useMemo(() => {
    if (runtimeSpaceView === "content-skill") return (_pt: ContentPoint) => true;
    if (runtimeSpaceView === "content-dialogue") return (_pt: ContentPoint) => true;
    if (runtimeSpaceView === "content-archetype") return (_pt: ContentPoint) => true;
    return (_pt: ContentPoint) => true;
  }, [runtimeSpaceView]);

  const getFeatureValue = useCallback(
    (featureId: string): number => {
      if ((TRAIT_NAMES as readonly string[]).includes(featureId)) {
        return traits[featureId as (typeof TRAIT_NAMES)[number]] ?? 0;
      }
      if ((FEATURE_NAMES as readonly string[]).includes(featureId)) {
        return features[featureId as (typeof FEATURE_NAMES)[number]] ?? 0;
      }
      return customFeatureValues[featureId] ?? 0;
    },
    [traits, features, customFeatureValues],
  );

  const setFeatureValue = useCallback((featureId: string, nextValue: number) => {
    if ((TRAIT_NAMES as readonly string[]).includes(featureId)) {
      setTraits((prev) => ({ ...prev, [featureId as (typeof TRAIT_NAMES)[number]]: nextValue }));
      return;
    }
    if ((FEATURE_NAMES as readonly string[]).includes(featureId)) {
      setFeatures((prev) => ({ ...prev, [featureId as (typeof FEATURE_NAMES)[number]]: nextValue }));
      return;
    }
    setCustomFeatureValues((prev) => ({ ...prev, [featureId]: nextValue }));
  }, []);

  const runtimeSpaceFeatureIds = useMemo(() => {
    if (
      runtimeSpaceView === "content-combined" ||
      runtimeSpaceView === "content-dialogue" ||
      runtimeSpaceView === "content-skill" ||
      runtimeSpaceView === "content-archetype"
    ) {
      return spaceFeatureMap[runtimeSpaceView] ?? [];
    }
    return [];
  }, [runtimeSpaceView, spaceFeatureMap]);
  const contentSpaceFeatureIds = useMemo(() => {
    if (statContentLevels.length === 0) return [];
    return runtimeSpaceFeatureIds.filter((featureId) => enabledStatFeatureIdSet.has(featureId));
  }, [runtimeSpaceFeatureIds, statContentLevels, enabledStatFeatureIdSet]);

  const normalizeFeatureValue = useCallback((featureId: string, value: number): number => {
    if ((FEATURE_NAMES as readonly string[]).includes(featureId)) {
      return Number(value) / 100;
    }
    return Number(value);
  }, []);

  const getContentPointFeatureValue = useCallback((point: ContentPoint, featureId: string): number => {
    const traitIndex = TRAIT_NAMES.findIndex((name) => name === featureId);
    if (traitIndex >= 0) {
      return Number(point.vector[traitIndex] ?? 0);
    }
    if ((FEATURE_NAMES as readonly string[]).includes(featureId)) {
      return hashToUnit(`${point.id}:${point.branch}:${featureId}`) * 100;
    }
    return (hashToUnit(`${point.id}:${point.type}:${point.branch}:${featureId}`) * 2) - 1;
  }, []);

  const playerSpaceVector = useMemo(() => {
    if (!isContentRuntimeView(runtimeSpaceView) || runtimeSpaceView === "content-combined") {
      return combinedVector;
    }
    return contentSpaceFeatureIds.map((featureId) => normalizeFeatureValue(featureId, getFeatureValue(featureId)));
  }, [runtimeSpaceView, combinedVector, contentSpaceFeatureIds, normalizeFeatureValue, getFeatureValue]);

  const selectedModelSpacePoints = useMemo<ModelSpaceOverlayPoint[]>(() => {
    const selectedSchemas = selectedModelInheritanceChain;
    if (selectedSchemas.length === 0) return [];
    const getModelDefault = (schema: RuntimeModelSchemaRow, featureId: string): number => {
      const ref = schema.featureRefs.find((row) => row.featureId === featureId);
      return ref?.defaultValue ?? featureDefaultsById.get(featureId) ?? 0;
    };
    if (isContentRuntimeView(runtimeSpaceView)) {
      const featureIds = contentSpaceFeatureIds;
      if (featureIds.length === 0) return [];
      return selectedSchemas.map((schema, index) => {
        const vector = featureIds.map((featureId) =>
          normalizeFeatureValue(featureId, getModelDefault(schema, featureId)),
        );
        const coords = vectorToCoords(vector);
        const levelLabel = index === 0 ? "parent" : `derived-${index}`;
        return {
          id: `model-space:${schema.modelId}`,
          name: `${formatModelIdForUi(schema.modelId)} [${levelLabel}]`,
          coords,
          vector,
        };
      });
    }
    return selectedSchemas.map((schema, index) => {
      const traitRecord = Object.fromEntries(
        TRAIT_NAMES.map((featureId) => [featureId, getModelDefault(schema, featureId)]),
      ) as Record<string, number>;
      const featureRecord = Object.fromEntries(
        FEATURE_NAMES.map((featureId) => [featureId, getModelDefault(schema, featureId)]),
      ) as Record<string, number>;
      const unified = {
        traits: traitRecord,
        features: featureRecord,
        semantics: Object.fromEntries(SEMANTIC_AXES.map((axis) => [axis, 0])) as Record<string, number>,
      } satisfies UnifiedSpaceVector;
      const levelLabel = index === 0 ? "parent" : `derived-${index}`;
      return {
        id: `model-space:${schema.modelId}`,
        name: `${formatModelIdForUi(schema.modelId)} [${levelLabel}]`,
        coords: coordsFromUnifiedVector(unified),
        vector: flattenUnifiedVector(unified),
      };
    });
  }, [
    selectedModelInheritanceChain,
    featureDefaultsById,
    runtimeSpaceView,
    contentSpaceFeatureIds,
    normalizeFeatureValue,
  ]);

  const activeContentSpace = useMemo<SpaceMode | null>(() => {
    if (!isContentRuntimeView(runtimeSpaceView)) return null;
    return runtimeSpaceView === "content-combined" ? "combined" : "trait";
  }, [runtimeSpaceView]);

  const pca = useMemo(() => {
    if (!data) return null;
    if (runtimeSpaceView !== "content-combined") return null;
    if (!activeContentSpace) return null;
    const s = data.spaces?.[activeContentSpace];
    if (s?.pca) return s.pca;
    if (data.pca && activeContentSpace === "trait") return data.pca;
    return null;
  }, [data, activeContentSpace, runtimeSpaceView]);

  const { player3d, knn, content, contentCoords, reachability } = useMemo(() => {
    if (!isContentRuntimeView(runtimeSpaceView)) {
      const runtimeKnn = [...runtimeVizPoints]
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 10)
        .map((row) => ({
          id: row.id,
          name: row.name,
          type: row.type,
          branch: row.branch,
          vector: [],
          x: row.coords.x,
          y: row.coords.y,
          z: row.coords.z,
          distance: 1 - row.similarity,
        })) as (ContentPoint & { distance: number })[];
      return {
        player3d: [coordsFromUnifiedVector(playerUnified).x, coordsFromUnifiedVector(playerUnified).y, coordsFromUnifiedVector(playerUnified).z] as [number, number, number],
        knn: runtimeKnn,
        content: runtimeKnn.map((row) => ({
          ...row,
          cluster: undefined,
          unlockRadius: undefined,
        })) as ContentPoint[],
        contentCoords: runtimeKnn.map((row) => ({ x: row.x, y: row.y, z: row.z })),
        reachability: {
          skillsInRange: 0,
          skillsTotal: 0,
          minDistanceToSkill: runtimeKnn[0]?.distance ?? 0,
          meanDistanceToNearest5:
            runtimeKnn.length > 0
              ? runtimeKnn.slice(0, 5).reduce((sum, row) => sum + row.distance, 0) / Math.max(1, Math.min(5, runtimeKnn.length))
              : 0,
          reachableIds: runtimeKnn.slice(0, 5).map((row) => row.id),
          rangeBonus: 0,
        },
      };
    }
    if (!data?.content || !activeContentSpace) {
      return {
        player3d: [0, 0, 0] as [number, number, number],
        knn: [] as (ContentPoint & { distance: number })[],
        content: [] as ContentPoint[],
        contentCoords: [] as { x: number; y: number; z: number }[],
        reachability: {
          skillsInRange: 0,
          skillsTotal: 0,
          minDistanceToSkill: 0,
          meanDistanceToNearest5: 0,
          reachableIds: [] as string[],
          rangeBonus: 0,
        },
      };
    }
    const filteredContent = data.content.filter(contentTypeFilter);
    const playerVec = runtimeSpaceView === "content-combined" ? combinedVector : playerSpaceVector;
    const contentWithVectors = filteredContent.map((pt) => {
      if (runtimeSpaceView === "content-combined") {
        return {
          ...pt,
          runtimeVector: pt.vectorCombined ?? pt.vector,
          runtimeCoords: getPointCoords(pt, "combined"),
        };
      }
      const runtimeVector = contentSpaceFeatureIds.map((featureId) =>
        normalizeFeatureValue(featureId, getContentPointFeatureValue(pt, featureId)),
      );
      return {
        ...pt,
        runtimeVector,
        runtimeCoords: vectorToCoords(runtimeVector),
      };
    });
    const player3d =
      runtimeSpaceView === "content-combined" && pca
        ? projectPoint(playerVec, pca.mean, pca.components)
        : ([vectorToCoords(playerVec).x, vectorToCoords(playerVec).y, vectorToCoords(playerVec).z] as [number, number, number]);
    const contentCoords = contentWithVectors.map((pt) => ({ x: pt.runtimeCoords.x, y: pt.runtimeCoords.y, z: pt.runtimeCoords.z }));
    const distances = contentWithVectors.map((pt) => ({
      ...pt,
      vector: pt.runtimeVector,
      distance: euclideanDist(playerVec, pt.runtimeVector),
    }));
    distances.sort((a, b) => a.distance - b.distance);
    const knn = distances.slice(0, 10);

    const skills = data.content.filter((p) => p.type === "skill");
    const skillsWithDist = skills
      .map((s) => ({
        ...s,
        distance:
          runtimeSpaceView === "content-combined"
            ? euclideanDist(playerVec, s.vectorCombined ?? s.vector)
            : euclideanDist(
                playerVec,
                contentSpaceFeatureIds.map((featureId) =>
                  normalizeFeatureValue(featureId, getContentPointFeatureValue(s, featureId)),
                ),
              ),
      }))
      .sort((a, b) => a.distance - b.distance);
    const rangeBonus = movementBudget * 0.02;
    const inRange = skillsWithDist.filter((s) => s.distance <= (s.unlockRadius ?? 2) + rangeBonus);
    const nearest5 = skillsWithDist.slice(0, 5);
    const meanDist5 = nearest5.length ? nearest5.reduce((s, x) => s + x.distance, 0) / nearest5.length : 0;
    const minDist = skillsWithDist.length ? Math.min(...skillsWithDist.map((s) => s.distance)) : 0;

    const reachability = {
      skillsInRange: inRange.length,
      skillsTotal: skills.length,
      minDistanceToSkill: minDist,
      meanDistanceToNearest5: meanDist5,
      reachableIds: inRange.map((s) => s.id),
      rangeBonus,
    };

    return { player3d, knn, content: distances as ContentPoint[], contentCoords, reachability };
  }, [data, pca, combinedVector, activeContentSpace, movementBudget, runtimeSpaceView, runtimeVizPoints, playerUnified, contentTypeFilter, playerSpaceVector, contentSpaceFeatureIds, getContentPointFeatureValue, normalizeFeatureValue]);

  const effectiveAlgorithm = useMemo(
    () => resolveEffectiveAlgorithm(runtimeSpaceView, distanceAlgorithm),
    [runtimeSpaceView, distanceAlgorithm],
  );

  const nearestRows = useMemo(() => {
    const k = Math.max(1, Math.min(50, nearestK));
    if (isContentRuntimeView(runtimeSpaceView)) {
      if (!data?.content || !activeContentSpace) return [];
      const source = runtimeSpaceView === "content-combined" ? combinedVector : playerSpaceVector;
      return data.content
        .filter(contentTypeFilter)
        .map((row) => {
          const target =
            runtimeSpaceView === "content-combined"
              ? (row.vectorCombined ?? row.vector)
              : contentSpaceFeatureIds.map((featureId) =>
                  normalizeFeatureValue(featureId, getContentPointFeatureValue(row, featureId)),
                );
          const score =
            effectiveAlgorithm === "cosine"
              ? 1 - cosineSimilarity(source, target)
              : euclideanDist(source, target);
          return {
            id: row.id,
            name: row.name,
            type: row.type,
            branch: row.branch,
            score,
          };
        })
        .sort((a, b) => a.score - b.score)
        .slice(0, k);
    }
    const source = flattenUnifiedVector(playerUnified);
    return [...runtimeVizPoints]
      .map((row) => {
        const score =
          effectiveAlgorithm === "cosine"
            ? 1 - cosineSimilarity(source, row.vector)
            : euclideanDist(source, row.vector);
        return {
          id: row.id,
          name: row.name,
          type: row.type,
          branch: row.branch,
          score,
        };
      })
      .sort((a, b) => a.score - b.score)
      .slice(0, k);
  }, [runtimeSpaceView, nearestK, playerUnified, runtimeVizPoints, effectiveAlgorithm, data, activeContentSpace, combinedVector, contentTypeFilter, playerSpaceVector, contentSpaceFeatureIds, getContentPointFeatureValue, normalizeFeatureValue]);

  const PlotlyComponent = useMemo(
    () =>
      dynamic(
        () =>
          import("react-plotly.js").then((mod) => {
            const Plot = mod.default;
            return function Plotly3D({
              content,
              contentCoords,
              player3d,
              modelSpacePoints,
              colorBy,
              selectedId,
              onSelect,
            }: {
              content: ContentPoint[];
              contentCoords: { x: number; y: number; z: number }[];
              player3d: [number, number, number];
              modelSpacePoints: ModelSpaceOverlayPoint[];
              colorBy: ColorBy;
              selectedId: string | null;
              onSelect: (id: string) => void;
            }) {
              const traceContent = {
                x: contentCoords.map((c) => c.x),
                y: contentCoords.map((c) => c.y),
                z: contentCoords.map((c) => c.z),
                text: content.map(
                  (p) =>
                    `<b>${p.name}</b> (${p.type})<br>branch: ${p.branch}<br>${p.vector.map((v, i) => v.toFixed(2)).join(", ")}`,
                ),
                mode: "markers" as const,
                type: "scatter3d" as const,
                marker: {
                  size: content.map((p) => (selectedId === p.id ? 12 : 6)),
                  color: content.map((p) => getPointColor(p, colorBy)),
                  opacity: content.map((p) => (selectedId === p.id ? 1 : 0.85)),
                },
                hovertemplate: "%{text}<extra></extra>",
                hoverinfo: "text" as const,
              };
              const tracePlayer = {
                x: [player3d[0]],
                y: [player3d[1]],
                z: [player3d[2]],
                text: ["You"],
                mode: "markers" as const,
                type: "scatter3d" as const,
                marker: { size: 14, color: "#eab308", symbol: "diamond" },
                hovertemplate: "You<extra></extra>",
              };
              const traceModels = {
                x: modelSpacePoints.map((row) => row.coords.x),
                y: modelSpacePoints.map((row) => row.coords.y),
                z: modelSpacePoints.map((row) => row.coords.z),
                text: modelSpacePoints.map((row) => `<b>${row.name}</b><br>model space overlay`),
                mode: "markers+text" as const,
                type: "scatter3d" as const,
                marker: {
                  size: 8,
                  color: modelSpacePoints.map((row) => `hsl(${Math.round(hashToUnit(row.id) * 360)}, 85%, 65%)`),
                  symbol: "cross",
                },
                textposition: "top center" as const,
                textfont: { size: 10, color: "#e5e7eb" },
                hovertemplate: "%{text}<extra></extra>",
              };
              return (
                <Plot
                  data={[traceContent, tracePlayer, traceModels]}
                  layout={{
                    margin: { l: 0, r: 0, t: 24, b: 0 },
                    paper_bgcolor: "transparent",
                    plot_bgcolor: "rgba(0,0,0,0.1)",
                    scene: {
                      xaxis: { gridcolor: "rgba(128,128,128,0.2)" },
                      yaxis: { gridcolor: "rgba(128,128,128,0.2)" },
                      zaxis: { gridcolor: "rgba(128,128,128,0.2)" },
                      dragmode: "orbit",
                      hovermode: "closest",
                    },
                    showlegend: false,
                  }}
                  config={{
                    responsive: true,
                    scrollZoom: true,
                    displayModeBar: true,
                    modeBarButtonsToAdd: ["hoverclosest", "hovercompare"],
                  }}
                  style={{ width: "100%", height: "100%" }}
                  useResizeHandler
                  onClick={(event: { points?: Array<{ curveNumber?: number; pointIndex?: number }> }) => {
                    const pts = event.points;
                    if (pts?.[0] && pts[0].curveNumber === 0) {
                      const idx = pts[0].pointIndex;
                      if (typeof idx === "number" && content[idx]) onSelect(content[idx].id);
                    }
                  }}
                />
              );
            };
          }),
        {
          ssr: false,
          loading: () => (
            <div className="flex h-full items-center justify-center">Loading 3D…</div>
          ),
        },
      ),
    [],
  );

  const activeFeatureSpace = useMemo<ContentSpaceKey | null>(
    () => (CONTENT_SPACE_KEYS.includes(runtimeSpaceView as ContentSpaceKey) ? (runtimeSpaceView as ContentSpaceKey) : null),
    [runtimeSpaceView],
  );

  const featuresByInheritanceGroup = useMemo(() => {
    if (!activeFeatureSpace) {
      return [] as Array<{
        modelId: string;
        isBase: boolean;
        isEnabled: boolean;
        color: string;
        colorBorder: string;
        colorSoft: string;
        featureIds: string[];
      }>;
    }
    const allowed = new Set(runtimeSpaceFeatureIds);
    return statContentLevels
      .map((level, index) => {
        const featureIds = level.featureIds.filter((featureId) => allowed.has(featureId));
        return {
          modelId: level.modelId,
          isBase: index === 0,
          isEnabled: enabledStatLevelById[level.modelId] ?? true,
          color: level.color,
          colorBorder: level.colorBorder,
          colorSoft: level.colorSoft,
          featureIds,
        };
      })
      .filter((row) => row.featureIds.length > 0);
  }, [activeFeatureSpace, runtimeSpaceFeatureIds, statContentLevels, enabledStatLevelById]);

  useEffect(() => {
    const statIds = [...DEFAULT_STAT_FEATURES, ...DEFAULT_CURRENCY_STAT_FEATURES].map((row) => row.featureId);
    setSpaceFeatureMap((prev) => {
      const current = prev["content-combined"] ?? [];
      const merged = [...new Set([...current, ...statIds])];
      if (merged.length === current.length) return prev;
      return {
        ...prev,
        "content-combined": merged,
      };
    });
  }, [setSpaceFeatureMap]);

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <p className="text-amber-500">{error}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Run <code>pnpm --dir docs-site run space:precompute</code> to generate space-data.json
        </p>
      </div>
    );
  }

  if (spaceDataLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
        <p className="text-sm text-muted-foreground">Loading Space Explorer data…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted-foreground">Loading space data…</p>
      </div>
    );
  }

  const maxTurn = report?.run.actionTrace.length ?? 0;
  const resetDeltas = () => {
    setTraitDeltas(makeNumberRecord(TRAIT_NAMES, 0));
    setFeatureDeltas(makeNumberRecord(FEATURE_NAMES, 0));
  };
  const authoringChatContext = {
    activeModelSchemaId,
    activeModelInstanceId,
    activeSpaceView: runtimeSpaceView,
    selectedTurn,
    modelSchemaCount: runtimeModelSchemas.length,
    featureSchemaCount: runtimeFeatureSchema.length,
    canonicalAssetCount: canonicalAssetOptions.length,
    reportLoaded: Boolean(report),
    selectedModel: selectedModelForSpaceViewId || "none",
    modelIds: runtimeModelSchemas.map((row) => row.modelId),
    featureIds: runtimeFeatureSchema.map((row) => row.featureId),
    canonicalAssets: canonicalAssetOptions.map((row) => ({ id: row.id, name: row.name, modelId: row.modelId })),
    validationErrors: patchValidationErrors,
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <MultiStepLoader
        loadingStates={TEST_MODE_LOADING_STATES.map((row) => ({ text: row.text }))}
        loading={pipelineLoading}
        duration={900}
        loop={false}
      />
      <section
        id="panel-content-space-explorer"
        data-ui-id="panel-content-space-explorer"
        data-theme-context="header"
        className={`overflow-hidden rounded border bg-background ${
          testModeEnabled ? "border-emerald-400/50 shadow-[0_0_0_1px_rgba(16,185,129,0.18)]" : "border-border"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">Content Space Explorer</p>
              <button
                id="btn-model-schema-popup"
                data-ui-id="btn-model-schema-popup"
                type="button"
                onClick={() => setModelSchemaModalOpen(true)}
                className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] text-foreground hover:bg-muted/30"
                title="Open Content Creator"
              >
                <FolderTreeIcon className="size-3.5" />
                Content Creator
              </button>
              <Button
                type="button"
                variant="secondary"
                size="icon-xs"
                onClick={() => {
                  void runQuickTestMode();
                }}
                disabled={quickTestBusy || pipelineLoading}
                title="Build content pack bundle and generate report"
                aria-label="Build content pack bundle and generate report"
              >
                <SparklesIcon className="size-3.5" />
              </Button>
            </div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">ID: panel-content-space-explorer</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground" title="Current pack timestamp">
              <Clock3Icon className="size-3.5" />
              <span className="font-mono text-foreground">{loadedPackIdentity?.packVersion ?? "unknown"}</span>
            </div>
            {testModeEnabled ? (
              <>
                <span className="inline-flex items-center gap-1 rounded border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-100">
                  <PackageIcon className="size-3.5" />
                  Browser-generated bundle/report
                </span>
                {testModeGeneratedAt ? (
                  <span className="inline-flex items-center gap-1 rounded border border-emerald-400/50 bg-emerald-500/20 px-2 py-1 text-[11px] text-emerald-50">
                    <CircleCheckIcon className="size-3.5" />
                    Generated
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded border border-amber-400/40 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-100">
                    <FileTextIcon className="size-3.5" />
                    Not generated
                  </span>
                )}
              </>
            ) : (
              <>
                <label className="inline-flex items-center gap-1 text-[11px] text-muted-foreground" title="Select pack source">
                  <PackageIcon className="size-3.5" />
                  <select
                    value={selectedPackOptionId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setSelectedPackOptionId(nextId);
                      const selected = packOptions.find((row) => row.id === nextId);
                      if (!selected) return;
                      if (selected.kind === "bundle") {
                        loadBundlePack();
                        return;
                      }
                      if (selected.kind === "content-pack-report" && selected.reportId) {
                        loadContentPackReport(selected.reportId);
                        return;
                      }
                      if (selected.kind === "uploaded" && selected.overrides && selected.identity) {
                        setSpaceOverrides(selected.overrides);
                        setBaseSpaceVectors(selected.overrides);
                        const instances = parseModelInstancesFromContentBindings(selected.overrides);
                        if (instances.length > 0) {
                          replaceModelInstances(instances);
                        }
                        setLoadedPackIdentity(selected.identity);
                      }
                    }}
                    className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
                  >
                    {packOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => packUploadInputRef.current?.click()}
                  className="inline-flex items-center justify-center rounded border border-border px-2 py-1 text-[11px] hover:bg-muted/30"
                  title="Upload content pack"
                  aria-label="Upload content pack"
                >
                  <UploadIcon className="size-3.5" />
                </button>
                <input
                  ref={packUploadInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handlePackUpload}
                  className="hidden"
                />
                <label className="inline-flex items-center gap-1 text-[11px] text-muted-foreground" title="Select report source">
                  <FileTextIcon className="size-3.5" />
                  <select
                    value={selectedReportOptionId}
                    onChange={(e) => setSelectedReportOptionId(e.target.value)}
                    className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
                  >
                    {reportOptions.length === 0 ? (
                      <option value="">No reports available</option>
                    ) : (
                      reportOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))
                    )}
                  </select>
                </label>
                <DeliveryControls
                  versionDraft={deliveryVersionDraft}
                  pluginVersion={deliveryPluginVersion}
                  runtimeVersion={deliveryRuntimeVersion}
                  busy={deliveryBusy || bundleBusy || quickTestBusy || pipelineLoading}
                  lastPublishedVersion={lastPublishedVersion}
                  lastPulledVersion={lastPulledVersion}
                  selection={deliverySelection}
                  onVersionDraftChange={setDeliveryVersionDraft}
                  onPluginVersionChange={setDeliveryPluginVersion}
                  onRuntimeVersionChange={setDeliveryRuntimeVersion}
                  onPublish={() => {
                    void publishDeliveryVersion();
                  }}
                  onPull={() => {
                    void pullDeliveryVersion();
                  }}
                />
              </>
            )}
            <label className="inline-flex items-center gap-1 rounded border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-100" title="Toggle fresh-data test mode">
              <FlaskConicalIcon className="size-3.5" />
              <span className="uppercase tracking-wide">Test</span>
              <Switch
                checked={testModeEnabled}
                onCheckedChange={setTestModeEnabled}
                size="sm"
                aria-label="Toggle test mode"
              />
            </label>
            <HelpInfo
              tone="header"
              title="Content Space Explorer"
              body="Primary authoring and analysis controls. Use this panel to choose views, tune vectors, and inspect reachability or deltas."
            />
          </div>
        </div>
        {testModeEnabled ? (
          <div className="border-b border-emerald-400/40 bg-emerald-500/10 px-3 py-1.5 text-[11px] text-emerald-100">
            Test mode active: browser-only session, no database persistence.
          </div>
        ) : null}
        <div className="grid gap-0 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div id="panel-controls-left" data-ui-id="panel-controls-left" className="space-y-3 border-b border-border p-3 xl:border-r xl:border-b-0">
          <div id="panel-control-header" data-ui-id="panel-control-header" className="flex items-center gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold">
                {selectedCanonicalAsset ? selectedCanonicalAsset.name : "No Asset Selected"}
              </h2>
            </div>
            <label className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
              Asset
              <select
                value={activeModelInstanceId ?? ""}
                onChange={(e) => {
                  const instanceId = e.target.value;
                  if (!instanceId) {
                    setActiveModelSelection(NO_MODEL_SELECTED, null);
                    setSelectedPoint(null);
                    return;
                  }
                  const instance = canonicalAssetOptions.find((row) => row.id === instanceId);
                  if (!instance) return;
                  setActiveModelSelection(instance.modelId, instance.id);
                }}
                className="ml-1 rounded border border-border bg-background px-2 py-1 text-[11px] text-foreground"
              >
                <option value="">None</option>
                {canonicalAssetOptions.map((asset) => (
                  <option key={`asset-option-${asset.id}`} value={asset.id}>
                    {asset.name}
                  </option>
                ))}
              </select>
            </label>
            <HelpInfo
              tone="header"
              title="Control Panel Header"
              body="This is the control panel identity header. Use this section as the reference point for control-side changes."
            />
          </div>
          <details id="panel-content-vector-controls" data-ui-id="panel-content-vector-controls" open className="rounded border border-border bg-background/50">
            <summary className="cursor-pointer px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Stat Control
                <HelpInfo
                tone="header"
                title="Stat Control"
                body="Content levels are stat-model layers inherited by the loaded asset. Toggle levels on/off to expand or collapse the active space."
              />
            </summary>
            <div className="space-y-3 border-t p-2">
              <div id="panel-content-features-base" data-ui-id="panel-content-features-base" className="space-y-2">
                <div className="text-[11px] font-medium uppercase text-muted-foreground">
                  Stats
                  <HelpInfo
                    tone="content"
                    title="Stats"
                    body="All stat sets inherited by the loaded asset. Each set is a content level with its own color and on/off switch."
                  />
                </div>
                {activeFeatureSpace ? (
                  <>
                    {featuresByInheritanceGroup.length > 0 ? (
                      featuresByInheritanceGroup.map((group) => (
                        <div
                          key={`feature-group-${group.modelId}`}
                          className={`rounded border p-2 transition-opacity ${group.isEnabled ? "opacity-100" : "opacity-55"}`}
                          style={{ borderColor: group.colorBorder, backgroundColor: group.colorSoft }}
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="min-w-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                              <span className="inline-block size-2 rounded-full align-middle" style={{ backgroundColor: group.color }} />
                              <span className="ml-1 align-middle">
                                {formatModelIdForUi(group.modelId)}
                                {group.isBase ? " (parent)" : " (derived)"}
                              </span>
                            </div>
                            <Switch
                              checked={group.isEnabled}
                              onCheckedChange={(checked) => {
                                setEnabledStatLevelById((prev) => ({ ...prev, [group.modelId]: checked }));
                              }}
                              size="sm"
                              aria-label={`Toggle ${group.modelId} content level`}
                            />
                          </div>
                          <div className="space-y-2">
                            {group.featureIds.map((featureId) => {
                              const isFeature = (FEATURE_NAMES as readonly string[]).includes(featureId);
                              const min = isFeature ? 0 : -1;
                              const max = isFeature ? 100 : 1;
                              const step = isFeature ? 1 : 0.01;
                              const value = getFeatureValue(featureId);
                              return (
                                <label key={`${group.modelId}-${featureId}`} className="grid grid-cols-[1fr_120px_56px] items-center gap-2">
                                  <span className="truncate text-[11px] text-muted-foreground">{featureId}</span>
                                  <input
                                    type="range"
                                    min={min}
                                    max={max}
                                    step={step}
                                    value={value}
                                    onChange={(e) => setFeatureValue(featureId, Number(e.target.value))}
                                    className="w-full"
                                    style={{ accentColor: group.color }}
                                    disabled={!group.isEnabled}
                                  />
                                  <span className="font-mono text-[10px] text-muted-foreground">{isFeature ? value.toFixed(0) : value.toFixed(2)}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        Loaded asset does not expose stat-model levels for this space.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-[11px] text-muted-foreground">Select a content space to edit model stats.</p>
                )}
              </div>

            </div>
          </details>
        </div>

        <div id="panel-summary-right" data-ui-id="panel-summary-right" className="p-3">
          <section
            id="panel-visualization"
            data-ui-id="panel-visualization"
            data-theme-context="content"
            className="mt-4 min-h-[420px] rounded border border-border bg-background"
          >
            <div className="border-b border-border px-3 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-semibold">Visualization Panel</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">ID: panel-visualization</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="flex items-center rounded border border-border bg-background">
                      <input
                        type="number"
                        min={0}
                        max={maxTurn}
                        value={selectedTurn}
                        onChange={(e) => setSelectedTurn(Math.max(0, Math.min(maxTurn, Number(e.target.value) || 0)))}
                        className="w-16 border-0 bg-transparent px-2 py-1 text-xs text-foreground outline-none"
                        title="Jump to a specific turn from the loaded report."
                      />
                      <div className="flex flex-col border-l border-border">
                        <button
                          type="button"
                          onClick={() => setSelectedTurn((t) => Math.min(maxTurn, t + 1))}
                          className="px-1 py-0.5 text-muted-foreground hover:bg-muted/30"
                          disabled={selectedTurn >= maxTurn}
                          title="Next turn"
                        >
                          <ChevronUpIcon className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedTurn((t) => Math.max(0, t - 1))}
                          className="border-t border-border px-1 py-0.5 text-muted-foreground hover:bg-muted/30"
                          disabled={selectedTurn <= 0}
                          title="Previous turn"
                        >
                          <ChevronDownIcon className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!data?.content?.length) return;
                        const next = recomputeSpaceData(
                          data.content.map((p) => ({
                            type: p.type,
                            id: p.id,
                            name: p.name,
                            branch: p.branch,
                            vector: p.vector,
                            vectorCombined: p.vectorCombined,
                            unlockRadius: p.unlockRadius,
                          })),
                          data.traitNames ?? [],
                        ) as SpaceData;
                        setData(next);
                      }}
                      className="inline-flex items-center justify-center rounded border border-border p-1 text-muted-foreground hover:bg-muted/30"
                      title="Refresh PCA/clusters from current data."
                    >
                      <RefreshCwIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <HelpInfo
                  tone="content"
                  title="Visualization Panel"
                  body="Main plotting surface. Toggle 3D, JSON, and Stat Modifiers views. Header badges show top-K reachable entries for the current space."
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="rounded border border-sky-400/50 bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-100">
                  Reachability
                </span>
                <span className="rounded border border-border bg-muted/20 px-2 py-0.5 text-[10px] text-muted-foreground">
                  Algo: <span className="font-semibold text-foreground">{effectiveAlgorithm}</span>
                </span>
                <span className="rounded border border-border bg-muted/20 px-2 py-0.5 text-[10px] text-muted-foreground">
                  K: <span className="font-semibold text-foreground">{nearestRows.length}</span>
                </span>
                {nearestRows.length > 0 ? (
                  nearestRows.slice(0, 8).map((row) => {
                    const { Icon, className } = getTypeBadgeMeta(row.type);
                    return (
                      <span
                        key={`header-reach-${row.type}-${row.id}`}
                        className={`inline-flex max-w-[240px] items-center gap-1 rounded border px-2 py-0.5 text-[10px] ${className}`}
                        title={`${row.name} (${row.type}/${row.branch}) score=${row.score.toFixed(3)}`}
                      >
                        <Icon className="size-3 shrink-0" />
                        <span className={`rounded border px-1 py-[1px] uppercase ${getBranchBadgeClass(row.branch)}`}>{row.branch}</span>
                        <span className="truncate">{row.name}</span>
                      </span>
                    );
                  })
                ) : null}
              </div>
            </div>
            <div id="panel-visualization-toolbar" data-ui-id="panel-visualization-toolbar" className="flex flex-wrap items-center gap-2 border-b border-border px-2 py-2">
              <button
                id="btn-viz-3d"
                data-ui-id="btn-viz-3d"
                type="button"
                onClick={() => setVizMode("3d")}
                className={`rounded px-3 py-1.5 text-xs font-semibold ${vizMode === "3d" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/30"}`}
                title="Interactive 3D projection of current content vectors."
              >
                3D
              </button>
              <button
                id="btn-viz-info"
                data-ui-id="btn-viz-info"
                type="button"
                onClick={() => setVizMode("json")}
                className={`rounded px-3 py-1.5 text-xs font-semibold ${vizMode === "json" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/30"}`}
                title="Info panel with code/schema/data tabs."
              >
                Info
              </button>
              <button
                id="btn-viz-deltas"
                data-ui-id="btn-viz-deltas"
                type="button"
                onClick={() => setVizMode("deltas")}
                className={`rounded px-3 py-1.5 text-xs font-semibold ${vizMode === "deltas" ? "bg-violet-500/20 text-violet-100" : "text-muted-foreground hover:bg-muted/30"}`}
                title="Adjust temporary stat modifiers."
              >
                Stat Modifiers
              </button>
              <div className="ml-auto flex items-center gap-2">
                <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  Distance Algorithm
                  <select
                    value={distanceAlgorithm}
                    onChange={(e) => setDistanceAlgorithm(e.target.value as DistanceAlgorithm)}
                    className="rounded border border-border bg-background px-1.5 py-1 text-xs text-foreground"
                  >
                    <option value="game-default">Game default</option>
                    <option value="euclidean">Euclidean</option>
                    <option value="cosine">Cosine</option>
                  </select>
                </label>
                <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  K
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={nearestK}
                    onChange={(e) => setNearestK(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                    className="w-14 rounded border border-border bg-background px-1.5 py-1 text-xs text-foreground"
                  />
                </label>
              </div>
            </div>
            <div id="panel-visualization-content" data-ui-id="panel-visualization-content" className="min-h-[420px] p-2">
              {vizMode === "3d" ? (
                <div className="h-full min-h-[400px] w-full">
                  {testModeEnabled && !testModeGeneratedAt ? (
                    <div className="flex h-full min-h-[400px] items-center justify-center rounded border border-dashed border-emerald-400/40 bg-emerald-500/5">
                      <div className="flex flex-col items-center gap-2 text-center">
                        <FlaskConicalIcon className="size-6 text-emerald-200" />
                        <p className="text-sm font-medium text-emerald-100">Empty 3D Test Space</p>
                        <p className="max-w-md text-xs text-emerald-200/80">
                          Generate a bundle + report from the header spark button to populate visualization.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <PlotlyComponent
                      content={content}
                      contentCoords={contentCoords}
                      player3d={player3d}
                      modelSpacePoints={selectedModelSpacePoints}
                      colorBy={markerColorBy}
                      selectedId={selectedPoint?.id ?? null}
                      onSelect={(id) => {
                        const pt = content.find((p) => p.id === id);
                        setSelectedPoint(pt ?? null);
                      }}
                    />
                  )}
                </div>
              ) : vizMode === "json" ? (
                <div className="h-full min-h-[400px] w-full">
                  {selectedInfoModelSchema ? (
                    <div className="group/code flex h-full min-h-[400px] flex-col rounded border border-border bg-muted/10">
                      <div className="flex items-center justify-between border-b border-border px-2 py-1 text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-1">
                          {infoSchemaTabs.map((tab) => (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setVizInfoTabId(tab.id)}
                              className={`inline-flex items-center justify-center rounded border p-1 ${
                                activeInfoSchemaTab?.id === tab.id
                                  ? "border-primary/60 bg-primary/15 text-primary"
                                  : "border-border text-muted-foreground hover:bg-muted/30"
                              }`}
                              title={
                                tab.id === "info:ts"
                                  ? "TypeScript"
                                  : tab.id === "info:cpp"
                                    ? "C++"
                                    : tab.id === "info:csharp"
                                      ? "C#"
                                      : tab.id === "info:schema"
                                        ? "JSON Schema"
                                        : "Marshalled JSON Data"
                              }
                            >
                              {tab.id === "info:ts" ? (
                                <SiTypescript className="h-3.5 w-3.5" />
                              ) : tab.id === "info:cpp" ? (
                                <SiCplusplus className="h-3.5 w-3.5" />
                              ) : tab.id === "info:csharp" ? (
                                <SiSharp className="h-3.5 w-3.5" />
                              ) : tab.id === "info:schema" ? (
                                <SiJsonwebtokens className="h-3.5 w-3.5" />
                              ) : (
                                <BracesIcon className="h-3.5 w-3.5" />
                              )}
                            </button>
                          ))}
                        </div>
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="inline-flex min-w-0 items-center gap-1 font-mono">
                            <FileCode2Icon className="h-3 w-3 shrink-0" />
                            <span className="truncate">{activeInfoSchemaTab?.label ?? ""}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setVizInfoEditorCode(activeInfoSchemaTab?.code ?? "")}
                            className="opacity-0 transition-opacity group-hover/code:opacity-100 hover:text-foreground"
                          >
                            Reset
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await navigator.clipboard.writeText(vizInfoEditorCode);
                              setVizInfoCopied(true);
                              setTimeout(() => setVizInfoCopied(false), 1200);
                            }}
                            className="opacity-0 transition-opacity group-hover/code:opacity-100 hover:text-foreground"
                          >
                            {vizInfoCopied ? "Copied" : "Copy"}
                          </button>
                        </div>
                      </div>
                      <div className="h-full min-h-[360px] flex-1 overflow-auto">
                        <SyntaxHighlighter
                          language={codeLanguageForTabId(activeInfoSchemaTab?.id ?? "")}
                          style={oneDark}
                          showLineNumbers
                          wrapLongLines
                          customStyle={{
                            margin: 0,
                            background: "transparent",
                            fontSize: "10px",
                            minHeight: "100%",
                          }}
                          lineNumberStyle={{
                            minWidth: "2.5em",
                            opacity: 0.5,
                            paddingRight: "0.75em",
                          }}
                        >
                          {vizInfoEditorCode}
                        </SyntaxHighlighter>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full min-h-[360px] items-center justify-center text-xs text-muted-foreground">
                      No model selected. Choose an asset or model to inspect info.
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full min-h-[400px] overflow-auto rounded border border-border bg-muted/10 p-2">
                  <div className="space-y-3">
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="rounded border border-border bg-muted/20 p-2">
                        <div className="mb-2 text-[11px] font-medium uppercase text-muted-foreground">Content Feature Deltas</div>
                        <div className="space-y-2">
                          {TRAIT_NAMES.map((key) => (
                            <label key={key} className="grid grid-cols-[1fr_120px_44px] items-center gap-2">
                              <span className="truncate text-[11px] text-muted-foreground">{key}</span>
                              <input
                                type="range"
                                min={-0.5}
                                max={0.5}
                                step={0.01}
                                value={traitDeltas[key]}
                                onChange={(e) => setTraitDeltas((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                                className="w-full accent-primary"
                              />
                              <span className="font-mono text-[10px] text-muted-foreground">{traitDeltas[key].toFixed(2)}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="rounded border border-border bg-muted/20 p-2">
                        <div className="mb-2 text-[11px] font-medium uppercase text-muted-foreground">Navigation + Movement Deltas</div>
                        <div className="space-y-2">
                          {FEATURE_NAMES.map((key) => (
                            <label key={key} className="grid grid-cols-[1fr_120px_44px] items-center gap-2">
                              <span className="truncate text-[11px] text-muted-foreground">{key}</span>
                              <input
                                type="range"
                                min={-20}
                                max={20}
                                step={1}
                                value={featureDeltas[key]}
                                onChange={(e) => setFeatureDeltas((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                                className="w-full accent-primary"
                              />
                              <span className="font-mono text-[10px] text-muted-foreground">{featureDeltas[key].toFixed(0)}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={resetDeltas}
                      className="rounded border border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/40"
                    >
                      Reset All Deltas
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
        </div>
      </section>

      <ModelSchemaViewerModal
        open={modelSchemaModalOpen}
        onClose={() => setModelSchemaModalOpen(false)}
        inferredKaelModelId={inferredKaelModelId}
        runtimeModelSchemas={runtimeModelSchemas}
        runtimeFeatureSchema={runtimeFeatureSchema}
        runtimeContentObjects={data.content ?? []}
        onUpdateModelMetadata={updateModelMetadata}
        onDeleteModelSchema={deleteModelSchema}
        onCreateModelSchema={createModelSchemaFromTree}
        onAddFeatureRefToModel={addFeatureRefToModel}
        onRemoveFeatureRefFromModel={removeFeatureRefFromModel}
        onUpdateFeatureRefDefaultValue={updateFeatureRefDefaultValue}
        onAttachStatModelToModel={attachStatModelToModel}
        onReplaceModelSchemas={replaceModelSchemas}
        onReplaceCanonicalAssets={replaceCanonicalAssets}
        onOpenCanonicalAssetInExplorer={({ modelId, instanceId }) => {
          setActiveModelSelection(modelId, instanceId);
          setModelSchemaModalOpen(false);
        }}
      />
      <AuthoringAssistantWidget
        endpoint="/api/ai/space-authoring-chat"
        context={authoringChatContext}
        onApplyOperations={applyAuthoringOperations}
      />

    </div>
  );
}


