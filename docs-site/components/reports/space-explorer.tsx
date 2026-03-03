"use client";

import { ACTION_POLICIES, GameEngine, type PlayerAction } from "@dungeonbreak/engine";
import * as EngineRuntime from "@dungeonbreak/engine";
import type { LucideIcon } from "lucide-react";
import { CircleHelpIcon, CompassIcon, CrosshairIcon, PlusIcon, SparklesIcon, SwordsIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { type CSSProperties, type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Tree, type NodeApi } from "react-arborist";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { useShallow } from "zustand/react/shallow";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { runPlaythrough } from "@/lib/playthrough-runner";
import { analyzeReport } from "@/lib/playthrough-analyzer";
import { recomputeSpaceData } from "@/lib/space-recompute";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { JsonView, allExpanded, darkStyles } from "react-json-view-lite";

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

type ModelTreeNode = {
  id: string;
  name: string;
  nodeType: "group" | "model" | "instance";
  modelId?: string;
  baseModelId?: string;
  instanceId?: string;
  canonical?: boolean;
  children?: ModelTreeNode[];
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

const useModelSchemaViewerStore = create<ModelSchemaViewerState>()(
  persist(
    immer<ModelSchemaViewerState>((set) => ({
      activeModelSchemaId: "",
      activeModelInstanceId: null,
      schemaLanguage: "typescript",
      modelInstances: [],
      migrationOps: [],
      initFromSchemas: (schemas, inferredKaelModelId) =>
        set((state) => {
          if (!state.activeModelSchemaId || !schemas.some((row) => row.modelId === state.activeModelSchemaId)) {
            state.activeModelSchemaId = inferredKaelModelId;
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
    const parentCandidate = [...parts.slice(0, depth), "base"].join(".");
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
  for (const modelId of ["entity.base", "item.base"]) {
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
    const group = modelParts[0] ?? "model";
    const name = modelParts.slice(1).join("-") || modelParts[0] || "schema";
    const typeName = `${toTypeName(schema.modelId)}Schema`;
    const parentTypeName = parent ? `${toTypeName(parent.modelId)}Schema` : null;
    const defaultsName = `${toConstName(schema.modelId)}_DEFAULTS`;
    const parentDefaultsName = parent ? `${toConstName(parent.modelId)}_DEFAULTS` : null;

    if (language === "cpp") {
      const filePath = `cpp/${group}/${name}.schema.hpp`;
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
      const filePath = `csharp/${group}/${toTypeName(name)}Schema.cs`;
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

    const filePath = `typescript/${group}/${name}.schema.ts`;
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

function ModelSchemaViewerModal({
  open,
  onClose,
  inferredKaelModelId,
  runtimeModelSchemas,
  runtimeFeatureSchema,
  onUpdateModelFeatureDefault,
  onCreateModelSchema,
}: {
  open: boolean;
  onClose: () => void;
  inferredKaelModelId: string;
  runtimeModelSchemas: RuntimeModelSchemaRow[];
  runtimeFeatureSchema: RuntimeFeatureSchemaRow[];
  onUpdateModelFeatureDefault: (modelId: string, featureId: string, defaultValue: number | null) => void;
  onCreateModelSchema: (modelId: string, label?: string, templateModelId?: string) => void;
}) {
  const {
    activeModelSchemaId,
    activeModelInstanceId,
    schemaLanguage,
    modelInstances,
    initFromSchemas,
    setActiveSelection,
    setSchemaLanguage,
    addCanonicalAsset,
    toggleCanonical,
    moveInstancesToModel,
    migrationOps,
    clearMigrationOps,
  } = useModelSchemaViewerStore(
    useShallow((state) => ({
      activeModelSchemaId: state.activeModelSchemaId,
      activeModelInstanceId: state.activeModelInstanceId,
      schemaLanguage: state.schemaLanguage,
      modelInstances: state.modelInstances,
      initFromSchemas: state.initFromSchemas,
      setActiveSelection: state.setActiveSelection,
      setSchemaLanguage: state.setSchemaLanguage,
      addCanonicalAsset: state.addCanonicalAsset,
      toggleCanonical: state.toggleCanonical,
      moveInstancesToModel: state.moveInstancesToModel,
      migrationOps: state.migrationOps,
      clearMigrationOps: state.clearMigrationOps,
    })),
  );
  const [copiedScript, setCopiedScript] = useState(false);
  const [selectedSchemaFilePath, setSelectedSchemaFilePath] = useState("");
  const [infoModelId, setInfoModelId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    initFromSchemas(runtimeModelSchemas, inferredKaelModelId);
  }, [open, runtimeModelSchemas, inferredKaelModelId, initFromSchemas]);

  const activeModelSchema = useMemo(
    () => runtimeModelSchemas.find((row) => row.modelId === activeModelSchemaId) ?? null,
    [runtimeModelSchemas, activeModelSchemaId],
  );

  const activeModelInstance = useMemo(
    () => modelInstances.find((row) => row.id === activeModelInstanceId) ?? null,
    [modelInstances, activeModelInstanceId],
  );
  const modelDescriptionById = useMemo(
    () => new Map(runtimeModelSchemas.map((row) => [row.modelId, row.description ?? row.label] as const)),
    [runtimeModelSchemas],
  );

  const modelSchemaTreeData = useMemo<ModelTreeNode[]>(() => {
    const modelById = new Map(runtimeModelSchemas.map((row) => [row.modelId, row] as const));
    const idSet = new Set(runtimeModelSchemas.map((row) => row.modelId));
    const stats = runtimeModelSchemas.filter((row) => row.modelId.endsWith("stats"));
    const models = runtimeModelSchemas.filter((row) => !row.modelId.endsWith("stats"));
    const isStatId = (id: string) => id.endsWith("stats");

    const childrenByParent = new Map<string, RuntimeModelSchemaRow[]>();
    const resolveParent = (modelId: string): string | null => {
      const explicit = modelById.get(modelId)?.extendsModelId;
      if (explicit && explicit !== modelId && idSet.has(explicit)) return explicit;
      return resolveParentModelId(modelId, idSet, modelById);
    };
    for (const row of runtimeModelSchemas) {
      const parentId = resolveParent(row.modelId);
      if (!parentId) continue;
      childrenByParent.set(parentId, [...(childrenByParent.get(parentId) ?? []), row]);
    }

    const buildModelNode = (model: RuntimeModelSchemaRow): ModelTreeNode => {
      const childModelNodes = (childrenByParent.get(model.modelId) ?? [])
        .filter((row) => row.modelId !== model.modelId)
        .sort((a, b) => a.modelId.localeCompare(b.modelId))
        .map((child) => buildModelNode(child));
      const instanceNodes = modelInstances
        .filter((instance) => instance.modelId === model.modelId)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((instance) => ({
          id: `instance:${instance.id}`,
          name: instance.name,
          nodeType: "instance" as const,
          modelId: instance.modelId,
          instanceId: instance.id,
          canonical: instance.canonical,
        }));
      return {
        id: `model:${model.modelId}`,
        name: model.modelId,
        nodeType: "model",
        modelId: model.modelId,
        children: [
          {
            id: `model-schema:${model.modelId}`,
            name: "[schema]",
            nodeType: "instance",
            modelId: model.modelId,
            instanceId: `model-schema:${model.modelId}`,
            canonical: false,
          },
          ...instanceNodes,
          ...childModelNodes,
        ],
      };
    };

    const statRoots = stats
      .filter((row) => {
        const parentId = resolveParent(row.modelId);
        return !parentId || !isStatId(parentId);
      })
      .sort((a, b) => a.modelId.localeCompare(b.modelId))
      .map((row) => buildModelNode(row));

    const modelRoots = models
      .filter((row) => {
        const parentId = resolveParent(row.modelId);
        if (!parentId) return true;
        return isStatId(parentId);
      })
      .sort((a, b) => a.modelId.localeCompare(b.modelId))
      .map((row) => buildModelNode(row));

    return [
      {
        id: "group:stats",
        name: "stats",
        nodeType: "group",
        children: statRoots,
      },
      {
        id: "group:models",
        name: "models",
        nodeType: "group",
        children: modelRoots,
      },
    ];
  }, [runtimeModelSchemas, modelInstances]);

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
  const schemaFiles = useMemo(
    () =>
      activeModelSchema
        ? buildSchemaFilesForLanguage(activeModelSchema, runtimeModelSchemas, featureDefaultMap, schemaLanguage)
        : [],
    [activeModelSchema, runtimeModelSchemas, featureDefaultMap, schemaLanguage],
  );
  const activeSchemaFile = useMemo(() => {
    if (schemaFiles.length === 0) return null;
    return schemaFiles.find((file) => file.path === selectedSchemaFilePath) ?? schemaFiles[0]!;
  }, [schemaFiles, selectedSchemaFilePath]);

  useEffect(() => {
    if (!activeSchemaFile) {
      setSelectedSchemaFilePath("");
      return;
    }
    if (!selectedSchemaFilePath || !schemaFiles.some((file) => file.path === selectedSchemaFilePath)) {
      setSelectedSchemaFilePath(activeSchemaFile.path);
    }
  }, [activeSchemaFile, schemaFiles, selectedSchemaFilePath]);

  if (!open) return null;

  const createSchemaViaTree = (kind: "model" | "stat", templateModelId?: string) => {
    const suggested = kind === "stat" ? "newstats" : "entity.new_model";
    const raw = window.prompt(
      kind === "stat" ? "New stat set id (example: combatstats2):" : "New model id (example: entity.magicdog):",
      suggested,
    );
    const nextId = normalizeModelId(raw ?? "");
    if (!nextId) return;
    const modelId = kind === "stat" && !nextId.endsWith("stats") ? `${nextId}.stats` : nextId;
    onCreateModelSchema(modelId, modelId, templateModelId ?? activeModelSchema?.modelId);
  };

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="h-[88vh] w-[96vw] max-w-[1500px] overflow-hidden rounded border border-border bg-card p-4 shadow-lg" onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Model Schema Viewer</p>
            <p className="text-[11px] text-muted-foreground">
              Active Kael model: <span className="font-mono text-foreground">{inferredKaelModelId}</span>
            </p>
          </div>
          <button type="button" className="rounded border border-border px-2 py-0.5 text-xs hover:bg-muted/30" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="grid h-[calc(88vh-88px)] gap-3 md:grid-cols-[380px_minmax(0,1fr)]">
          <div className="rounded border border-border p-2">
            <div className="mb-1 text-[11px] font-medium uppercase text-muted-foreground">Model Tree</div>
            <div className="h-full rounded border border-border bg-background/40 p-1">
              <Tree<ModelTreeNode>
                data={modelSchemaTreeData}
                width={360}
                height={620}
                rowHeight={30}
                indent={16}
                openByDefault={false}
                disableDrop={({ parentNode }) => !parentNode || parentNode.data.nodeType !== "model"}
                onMove={({ dragIds, parentId }) => {
                  if (!parentId?.startsWith("model:")) return;
                  const targetModelId = parentId.replace("model:", "");
                  const instanceIds = dragIds
                    .filter((id) => id.startsWith("instance:"))
                    .map((id) => id.replace("instance:", ""));
                  if (instanceIds.length === 0) return;
                  moveInstancesToModel(instanceIds, targetModelId);
                }}
              >
                {({ node, style }: { node: NodeApi<ModelTreeNode>; style: CSSProperties }) => {
                  const selected =
                    node.data.instanceId != null
                      ? node.data.instanceId === activeModelInstanceId ||
                        (node.data.instanceId.startsWith("model-schema:") &&
                          node.data.modelId === activeModelSchemaId &&
                          activeModelInstanceId == null)
                      : !!(
                          node.data.nodeType === "group" &&
                          node.data.baseModelId === activeModelSchemaId &&
                          activeModelInstanceId == null
                        );
                  return (
                    <ContextMenu>
                      <ContextMenuTrigger asChild>
                        <div
                          style={style}
                          onClick={() => {
                            if (node.data.nodeType === "group" || node.data.nodeType === "model") {
                              node.toggle();
                              return;
                            }
                            if (!node.data.modelId) return;
                            setActiveSelection(
                              node.data.modelId,
                              node.data.instanceId && !node.data.instanceId.startsWith("model-schema:")
                                ? node.data.instanceId
                                : null,
                            );
                          }}
                          className={`flex cursor-pointer items-center gap-1 rounded px-2 text-xs ${
                            selected ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/30"
                          }`}
                        >
                          <span className="w-3">
                            {node.data.nodeType === "group" || node.data.nodeType === "model"
                              ? (node.isOpen ? "v" : ">")
                              : (node.data.canonical ? "C" : "*")}
                          </span>
                          <span className="truncate">{node.data.name}</span>
                          {node.data.nodeType === "group" && node.data.id === "group:stats" ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                createSchemaViaTree("stat");
                              }}
                              className="ml-auto rounded border border-cyan-400/40 bg-cyan-500/10 px-1 text-cyan-100 hover:bg-cyan-500/20"
                              title="Create stat set"
                            >
                              <PlusIcon className="h-3 w-3" />
                            </button>
                          ) : null}
                          {node.data.nodeType === "model" && node.data.modelId ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setInfoModelId(node.data.modelId!);
                              }}
                              className="rounded border border-border px-1 text-[10px] text-muted-foreground hover:bg-muted/30"
                              title="Model description"
                            >
                              i
                            </button>
                          ) : null}
                        </div>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        {node.data.nodeType === "group" && node.data.id === "group:stats" ? (
                          <ContextMenuItem onClick={() => createSchemaViaTree("stat")}>Create Stat Set</ContextMenuItem>
                        ) : null}
                        {node.data.nodeType === "group" && node.data.id === "group:models" ? (
                          <ContextMenuItem onClick={() => createSchemaViaTree("model")}>Create Model</ContextMenuItem>
                        ) : null}
                        {node.data.nodeType === "model" && node.data.modelId ? (
                          <>
                            <ContextMenuItem onClick={() => createSchemaViaTree("model", node.data.modelId)}>
                              Create Subclass Model
                            </ContextMenuItem>
                            <ContextMenuItem onClick={() => addCanonicalAsset(node.data.modelId!)}>
                              Create Canonical Asset
                            </ContextMenuItem>
                            <ContextMenuItem onClick={() => setInfoModelId(node.data.modelId!)}>
                              Model Info
                            </ContextMenuItem>
                          </>
                        ) : null}
                      </ContextMenuContent>
                    </ContextMenu>
                  );
                }}
              </Tree>
            </div>
          </div>
          <div className="overflow-auto rounded border border-border p-2">
            {activeModelSchema ? (
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-1">
                  {(["typescript", "cpp", "csharp"] as const).map((language) => (
                    <button
                      key={`schema-language-${language}`}
                      type="button"
                      onClick={() => setSchemaLanguage(language)}
                      className={`rounded border px-2 py-0.5 text-[10px] ${
                        schemaLanguage === language
                          ? "border-primary/60 bg-primary/15 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted/30"
                      }`}
                    >
                      {language === "typescript" ? "TypeScript" : language === "cpp" ? "C++" : "C#"}
                    </button>
                  ))}
                </div>
                <div className="group rounded border border-border bg-muted/20">
                  <div className="border-b border-border px-2 py-1 text-[10px] text-muted-foreground">Schema Files</div>
                  <div className="grid min-h-[260px] grid-cols-[220px_minmax(0,1fr)]">
                    <div className="border-r border-border p-1">
                      {schemaFiles.map((file) => (
                        <button
                          key={file.path}
                          type="button"
                          onClick={() => setSelectedSchemaFilePath(file.path)}
                          className={`block w-full truncate rounded px-2 py-1 text-left font-mono text-[10px] ${
                            activeSchemaFile?.path === file.path
                              ? "bg-primary/15 text-primary"
                              : "text-muted-foreground hover:bg-muted/30"
                          }`}
                          title={file.path}
                        >
                          {file.path}
                        </button>
                      ))}
                    </div>
                    <div className="group/file p-1">
                      {activeSchemaFile ? (
                        <div className="rounded border border-border bg-background/40">
                          <div className="flex items-center justify-between border-b border-border px-2 py-1 text-[10px] text-muted-foreground">
                            <span className="font-mono">{activeSchemaFile.path}</span>
                            <button
                              type="button"
                              onClick={async () => {
                                await navigator.clipboard.writeText(activeSchemaFile.code);
                                setCopiedScript(true);
                                setTimeout(() => setCopiedScript(false), 1200);
                              }}
                              className="opacity-0 transition-opacity group-hover/file:opacity-100 hover:text-foreground"
                            >
                              {copiedScript ? "Copied" : "Copy"}
                            </button>
                          </div>
                          <pre className="max-h-72 overflow-auto p-2 font-mono text-[10px] text-cyan-100">
                            {activeSchemaFile.code}
                          </pre>
                        </div>
                      ) : (
                        <div className="px-2 py-3 text-[11px] text-muted-foreground">No representative files for this schema.</div>
                      )}
                    </div>
                  </div>
                </div>
                {activeModelInstance ? (
                  <div className="rounded border border-amber-400/40 bg-amber-500/10 px-2 py-1 text-[11px]">
                    <div className="uppercase text-amber-100">Selected Instance</div>
                    <div className="font-mono text-amber-50">{activeModelInstance.name}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleCanonical(activeModelInstance.id)}
                        className={`rounded border px-2 py-0.5 text-[10px] ${
                          activeModelInstance.canonical
                            ? "border-amber-300/60 bg-amber-500/25 text-amber-50"
                            : "border-border text-muted-foreground hover:bg-muted/30"
                        }`}
                      >
                        {activeModelInstance.canonical ? "Canonical: On" : "Canonical: Off"}
                      </button>
                      <span className="text-muted-foreground">Serialized in patch export</span>
                    </div>
                  </div>
                ) : null}
                {activeModelSchema.description ? (
                  <p className="text-muted-foreground">{activeModelSchema.description}</p>
                ) : null}
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
                    Stats ({activeModelSchema.featureRefs.length})
                  </div>
                  <div className="max-h-[36vh] overflow-auto rounded border border-border">
                    {activeModelSchema.featureRefs.map((ref) => (
                      <div key={`${activeModelSchema.modelId}-${ref.featureId}-${ref.spaces.join("|")}`} className="border-b border-border px-2 py-1 text-[11px] last:border-b-0">
                        <div className="min-w-0">
                          <div className="font-mono">{ref.featureId}</div>
                          <div className="text-muted-foreground">spaces: {ref.spaces.join(", ")}</div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Default</span>
                            <input
                              type="number"
                              step={0.01}
                              value={ref.defaultValue ?? ""}
                              placeholder={`${(featureDefaultMap.get(ref.featureId) ?? 0).toFixed(2)}`}
                              onChange={(event) => {
                                const raw = event.target.value.trim();
                                onUpdateModelFeatureDefault(
                                  activeModelSchema.modelId,
                                  ref.featureId,
                                  raw.length === 0 ? null : Number(raw),
                                );
                              }}
                              className="w-24 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]"
                              title="Leave blank to inherit feature-level default."
                            />
                            <span className="text-[10px] text-muted-foreground">
                              feature default: {(featureDefaultMap.get(ref.featureId) ?? 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No model schema available.</p>
            )}
          </div>
        </div>
        {infoModelId ? (
          <div
            className="fixed inset-0 z-[220] flex items-center justify-center bg-black/50 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setInfoModelId(null);
            }}
          >
            <div className="w-full max-w-md rounded border border-border bg-card p-3" onMouseDown={(event) => event.stopPropagation()}>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">{infoModelId}</p>
                <button
                  type="button"
                  onClick={() => setInfoModelId(null)}
                  className="rounded border border-border px-2 py-0.5 text-xs hover:bg-muted/30"
                >
                  Close
                </button>
              </div>
              <p className="text-xs text-muted-foreground">{modelDescriptionById.get(infoModelId) ?? "No model description available."}</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
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

function getTypeBadgeMeta(type: string): { Icon: LucideIcon; className: string } {
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
}: {
  onGenerated: (r: ReportData) => void;
  policyId: string;
  packIdentity: PackIdentity | null;
}) {
  const [busy, setBusy] = useState(false);
  const onClick = useCallback(() => {
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
  }, [onGenerated, policyId, packIdentity]);
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
          disabled={busy}
          className="mt-2 w-full rounded bg-primary px-2 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? "Generating…" : "Generate report in browser"}
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
  const [data, setData] = useState<SpaceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [spaceOverrides, setSpaceOverrides] = useState<SpaceVectorPackOverrides | undefined>();
  const [selectedPoint, setSelectedPoint] = useState<ContentPoint | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [selectedTurn, setSelectedTurn] = useState(0);
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
  const [statSpaceModelId, setStatSpaceModelId] = useState("");
  const [baseSpaceVectors, setBaseSpaceVectors] = useState<SpaceVectorPackOverrides | undefined>();
  const [drafts, setDrafts] = useState<PatchDraft[]>([]);
  const [draftName, setDraftName] = useState("space-vectors-draft");
  const [selectedPresetId, setSelectedPresetId] = useState<string>(MODEL_PRESETS[0]?.id ?? "");
  const [builderMessage, setBuilderMessage] = useState<string>("");
  const [bundleBusy, setBundleBusy] = useState(false);
  const [spaceDataLoading, setSpaceDataLoading] = useState(true);
  const [loadedPackIdentity, setLoadedPackIdentity] = useState<PackIdentity | null>(null);
  const [loadedReportIdentity, setLoadedReportIdentity] = useState<ReportIdentity | null>(null);
  const [packOptions, setPackOptions] = useState<PackSelectOption[]>([
    { id: "bundle-default", label: "Content Pack Bundle", kind: "bundle" },
  ]);
  const [selectedPackOptionId, setSelectedPackOptionId] = useState("bundle-default");
  const [reportOptions, setReportOptions] = useState<ReportSelectOption[]>([]);
  const [selectedReportOptionId, setSelectedReportOptionId] = useState("");
  const packUploadInputRef = useRef<HTMLInputElement | null>(null);
  const markerColorBy: ColorBy = "branch";

  useEffect(() => {
    setSpaceDataLoading(true);
    fetch("/space-data.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Not found"))))
      .then(setData)
      .catch((e) => setError(String(e)))
      .finally(() => setSpaceDataLoading(false));
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
    if (ids.includes("entity.base")) return "entity.base";
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
    () =>
      selectableModelSchemas.find((row) => row.modelId === activeModelSchemaId) ??
      selectableModelSchemas.find((row) => row.modelId === inferredKaelModelId) ??
      selectableModelSchemas[0] ??
      null,
    [selectableModelSchemas, activeModelSchemaId, inferredKaelModelId],
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

  useEffect(() => {
    if (modelOptions.length === 0) return;
    if (modelOptions.some((row) => row.modelId === activeModelSchemaId)) return;
    setActiveModelSelection(modelOptions[0]!.modelId, null);
  }, [modelOptions, activeModelSchemaId, setActiveModelSelection]);

  useEffect(() => {
    if (!selectedModelForSpaceViewId) return;
    if (!statSpaceModelId || !runtimeModelSchemas.some((row) => row.modelId === statSpaceModelId)) {
      setStatSpaceModelId(selectedModelForSpaceViewId);
    }
  }, [selectedModelForSpaceViewId, statSpaceModelId, runtimeModelSchemas]);

  const statClassByModelId = useMemo(() => {
    const byId = new Map(runtimeModelSchemas.map((row) => [row.modelId, row] as const));
    const idSet = new Set(runtimeModelSchemas.map((row) => row.modelId));
    const map = new Map<string, string>();
    for (const row of runtimeModelSchemas) {
      let cursor: RuntimeModelSchemaRow | undefined = row;
      let resolved = row.modelId;
      const visited = new Set<string>();
      while (cursor && !visited.has(cursor.modelId)) {
        visited.add(cursor.modelId);
        if (cursor.modelId.endsWith("stats")) {
          resolved = cursor.modelId;
          break;
        }
        const parentId = resolveParentModelId(cursor.modelId, idSet, byId);
        if (!parentId) break;
        cursor = byId.get(parentId);
      }
      map.set(row.modelId, resolved);
    }
    return map;
  }, [runtimeModelSchemas]);

  const selectedStatsClassId = statClassByModelId.get(statSpaceModelId || selectedModelForSpaceViewId) ?? "";
  const relatedStatSpaceModels = useMemo(
    () =>
      modelOptions.filter((row) => {
        if (!selectedStatsClassId) return row.modelId === (statSpaceModelId || selectedModelForSpaceViewId);
        return statClassByModelId.get(row.modelId) === selectedStatsClassId;
      }),
    [modelOptions, selectedStatsClassId, statClassByModelId, statSpaceModelId, selectedModelForSpaceViewId],
  );
  const activeStatSpaceModel = useMemo(
    () =>
      runtimeModelSchemas.find((row) => row.modelId === statSpaceModelId) ??
      runtimeModelSchemas.find((row) => row.modelId === selectedModelForSpaceViewId) ??
      null,
    [runtimeModelSchemas, statSpaceModelId, selectedModelForSpaceViewId],
  );

  const selectedModelInheritanceChain = useMemo(() => {
    if (!activeStatSpaceModel) return [] as RuntimeModelSchemaRow[];
    const byId = new Map(runtimeModelSchemas.map((row) => [row.modelId, row] as const));
    const idSet = new Set(runtimeModelSchemas.map((row) => row.modelId));
    const chain: RuntimeModelSchemaRow[] = [];
    const visited = new Set<string>();
    let cursor: RuntimeModelSchemaRow | undefined = activeStatSpaceModel;
    while (cursor && !visited.has(cursor.modelId)) {
      chain.unshift(cursor);
      visited.add(cursor.modelId);
      const parentId = resolveParentModelId(cursor.modelId, idSet, byId);
      cursor = parentId ? byId.get(parentId) : undefined;
    }
    return chain;
  }, [activeStatSpaceModel, runtimeModelSchemas]);

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

  const contentSpaceFeatureIds = useMemo(() => {
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
        const levelLabel = schema.modelId.endsWith(".base") ? "base" : `class-${index}`;
        return {
          id: `model-space:${schema.modelId}`,
          name: `${schema.modelId} [${levelLabel}]`,
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
      const levelLabel = schema.modelId.endsWith(".base") ? "base" : `class-${index}`;
      return {
        id: `model-space:${schema.modelId}`,
        name: `${schema.modelId} [${levelLabel}]`,
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

  const jsonData = useMemo(
    () => ({
      player: {
        traits: Object.fromEntries(TRAIT_NAMES.map((t, i) => [t, traitVector[i]])),
        features: Object.fromEntries(FEATURE_NAMES.map((f, i) => [f, featureVector[i]])),
        navigationFeatures: Object.fromEntries(
          NAVIGATION_FEATURE_NAMES.map((f, i) => [f, debouncedFeatureVector[i]]),
        ),
        movementControls: Object.fromEntries(
          MOVEMENT_CONTROL_NAMES.map((f, i) => [f, movementControlVector[i]]),
        ),
        position3d: player3d,
      },
      reachability: {
        skillsInRange: reachability.skillsInRange,
        skillsTotal: reachability.skillsTotal,
        minDistanceToSkill: Math.round(reachability.minDistanceToSkill * 100) / 100,
        meanDistanceToNearest5: Math.round(reachability.meanDistanceToNearest5 * 100) / 100,
        rangeBonus: Math.round(reachability.rangeBonus * 100) / 100,
        reachableIds: reachability.reachableIds,
      },
      knn: knn.map(({ id, name, type, branch, distance }) => ({ id, name, type, branch, distance })),
      selected: selectedPoint
        ? {
            id: selectedPoint.id,
            name: selectedPoint.name,
            type: selectedPoint.type,
            branch: selectedPoint.branch,
            vector: selectedPoint.vector,
          }
        : null,
      schema: {
        featureCount: runtimeFeatureSchema.length,
        modelCount: runtimeModelSchemas.length,
        spaces: knownSpaceIds,
      },
      generatedPackPatch: packPatch,
      contentCount: content.length,
    }),
    [
      traitVector,
      featureVector,
      debouncedFeatureVector,
      movementControlVector,
      player3d,
      knn,
      selectedPoint,
      runtimeFeatureSchema,
      runtimeModelSchemas,
      knownSpaceIds,
      packPatch,
      content.length,
      reachability,
    ],
  );

  const activeFeatureSpace = useMemo<ContentSpaceKey | null>(
    () => (CONTENT_SPACE_KEYS.includes(runtimeSpaceView as ContentSpaceKey) ? (runtimeSpaceView as ContentSpaceKey) : null),
    [runtimeSpaceView],
  );

  const activeSpaceFeatureIds = useMemo(
    () => (activeFeatureSpace ? [...new Set(spaceFeatureMap[activeFeatureSpace] ?? [])] : []),
    [activeFeatureSpace, spaceFeatureMap],
  );
  const featuresByInheritanceGroup = useMemo(() => {
    if (!activeFeatureSpace) return [] as Array<{ modelId: string; isBase: boolean; featureIds: string[] }>;
    const allowed = new Set(activeSpaceFeatureIds);
    return selectedModelInheritanceChain
      .map((schema) => {
        const featureIds = schema.featureRefs
          .map((row) => row.featureId)
          .filter((featureId, index, all) => allowed.has(featureId) && all.indexOf(featureId) === index);
        return {
          modelId: schema.modelId,
          isBase: schema.modelId.endsWith(".base"),
          featureIds,
        };
      })
      .filter((row) => row.featureIds.length > 0);
  }, [activeFeatureSpace, activeSpaceFeatureIds, selectedModelInheritanceChain]);

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

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <section
        id="panel-content-space-explorer"
        data-ui-id="panel-content-space-explorer"
        data-theme-context="header"
        className="overflow-hidden rounded border border-border bg-background"
      >
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div>
            <p className="text-sm font-semibold">Content Space Explorer</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">ID: panel-content-space-explorer</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-[11px] text-muted-foreground">
              <span className="uppercase tracking-wide">Timestamp</span>:{" "}
              <span className="font-mono text-foreground">
                {loadedPackIdentity?.packVersion ?? "unknown"}
              </span>
            </div>
            <label className="text-[11px] text-muted-foreground">
              Pack
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
                className="ml-1 rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
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
              className="rounded border border-border px-2 py-1 text-[11px] hover:bg-muted/30"
            >
              Upload Pack
            </button>
            <input
              ref={packUploadInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handlePackUpload}
              className="hidden"
            />
            <label className="text-[11px] text-muted-foreground">
              Report
              <select
                value={selectedReportOptionId}
                onChange={(e) => setSelectedReportOptionId(e.target.value)}
                className="ml-1 rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
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
            <HelpInfo
              tone="header"
              title="Content Space Explorer"
              body="Primary authoring and analysis controls. Use this panel to choose views, tune vectors, and inspect reachability or deltas."
            />
          </div>
        </div>
        <div className="grid gap-0 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div id="panel-controls-left" data-ui-id="panel-controls-left" className="space-y-3 border-b border-border p-3 xl:border-r xl:border-b-0">
          <div id="panel-control-header" data-ui-id="panel-control-header" className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Kael</h2>
            {canonicalAssetOptions.length > 0 ? (
              <label className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                Asset
                <select
                  value={activeModelInstanceId ?? ""}
                  onChange={(e) => {
                    const instanceId = e.target.value;
                    const instance = canonicalAssetOptions.find((row) => row.id === instanceId);
                    if (!instance) return;
                    setActiveModelSelection(instance.modelId, instance.id);
                    setStatSpaceModelId(instance.modelId);
                  }}
                  className="ml-1 rounded border border-border bg-background px-2 py-1 text-[11px] text-foreground"
                >
                  {canonicalAssetOptions.map((asset) => (
                    <option key={`asset-option-${asset.id}`} value={asset.id}>
                      {asset.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <HelpInfo
              tone="header"
              title="Control Panel Header"
              body="This is the control panel identity header (Kael). Use this section as the reference point for control-side changes."
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                id="btn-model-schema-popup"
                data-ui-id="btn-model-schema-popup"
                type="button"
                onClick={() => setModelSchemaModalOpen(true)}
                className="rounded border border-border px-2 py-1 text-xs hover:bg-muted/30"
              >
                Model Schema
              </button>
            </div>
          </div>
          <details id="panel-content-vector-controls" data-ui-id="panel-content-vector-controls" open className="rounded border border-border bg-background/50">
            <summary className="cursor-pointer px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Stat Control
              <HelpInfo
                tone="header"
                title="Stat Control"
                body="Stats are model vectors. They are grouped by inheritance level so you can tune base and class layers."
              />
            </summary>
            <div className="space-y-3 border-t p-2">
              <div className="grid gap-2">
                <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Related Stat Spaces
                  <select
                    value={statSpaceModelId || selectedModelForSpaceViewId}
                    onChange={(e) => setStatSpaceModelId(e.target.value)}
                    className="mt-1 block w-full rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                  >
                    {relatedStatSpaceModels.map((model) => (
                      <option key={`related-space-${model.modelId}`} value={model.modelId}>
                        {model.modelId}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedStatsClassId ? (
                  <p className="text-[10px] text-muted-foreground">
                    Stats class: <span className="font-mono text-foreground">{selectedStatsClassId}</span>
                  </p>
                ) : null}
              </div>
              <div id="panel-content-features-base" data-ui-id="panel-content-features-base" className="space-y-2">
                <div className="text-[11px] font-medium uppercase text-muted-foreground">
                  Stats
                  <HelpInfo
                    tone="content"
                    title="Stats"
                    body="Model stats used by the selected space, grouped by inheritance layers."
                  />
                </div>
                {activeFeatureSpace ? (
                  <>
                    {featuresByInheritanceGroup.length > 0 ? (
                      featuresByInheritanceGroup.map((group) => (
                        <div key={`feature-group-${group.modelId}`} className="rounded border border-border bg-background/30 p-2">
                          <div className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                            {group.modelId}{group.isBase ? " (base)" : " (class)"}
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
                                    className="w-full accent-primary"
                                  />
                                  <span className="font-mono text-[10px] text-muted-foreground">{isFeature ? value.toFixed(0) : value.toFixed(2)}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    ) : (
                      activeSpaceFeatureIds.map((featureId) => {
                        const isFeature = (FEATURE_NAMES as readonly string[]).includes(featureId);
                        const min = isFeature ? 0 : -1;
                        const max = isFeature ? 100 : 1;
                        const step = isFeature ? 1 : 0.01;
                        const value = getFeatureValue(featureId);
                        return (
                          <label key={`${activeFeatureSpace}-${featureId}`} className="grid grid-cols-[1fr_120px_56px] items-center gap-2">
                            <span className="truncate text-[11px] text-muted-foreground">{featureId}</span>
                            <input
                              type="range"
                              min={min}
                              max={max}
                              step={step}
                              value={value}
                              onChange={(e) => setFeatureValue(featureId, Number(e.target.value))}
                              className="w-full accent-primary"
                            />
                            <span className="font-mono text-[10px] text-muted-foreground">{isFeature ? value.toFixed(0) : value.toFixed(2)}</span>
                          </label>
                        );
                      })
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
                <div>
                  <p className="text-sm font-semibold">Visualization Panel</p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">ID: panel-visualization</p>
                </div>
                <HelpInfo
                  tone="content"
                  title="Visualization Panel"
                  body="Main plotting surface. Toggle 3D, JSON, and Deltas views. Header badges show top-K reachable entries for the current space."
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
                ) : (
                  <span className="text-[11px] text-muted-foreground">No reachable entries for this selection.</span>
                )}
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
                id="btn-viz-json"
                data-ui-id="btn-viz-json"
                type="button"
                onClick={() => setVizMode("json")}
                className={`rounded px-3 py-1.5 text-xs font-semibold ${vizMode === "json" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/30"}`}
                title="Raw computed state for debugging and verification."
              >
                JSON
              </button>
              <button
                id="btn-viz-deltas"
                data-ui-id="btn-viz-deltas"
                type="button"
                onClick={() => setVizMode("deltas")}
                className={`rounded px-3 py-1.5 text-xs font-semibold ${vizMode === "deltas" ? "bg-violet-500/20 text-violet-100" : "text-muted-foreground hover:bg-muted/30"}`}
                title="Adjust temporary vector deltas."
              >
                Deltas
              </button>
              <label className="ml-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                Algorithm
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
              <div className="ml-auto flex items-center gap-2">
                <label className="text-[11px] text-muted-foreground">Turn</label>
                <button
                  type="button"
                  onClick={() => setSelectedTurn((t) => Math.max(0, t - 1))}
                  className="rounded border border-border px-2 py-1 text-xs"
                  disabled={selectedTurn <= 0}
                >
                  -
                </button>
                <input
                  type="number"
                  min={0}
                  max={maxTurn}
                  value={selectedTurn}
                  onChange={(e) => setSelectedTurn(Math.max(0, Math.min(maxTurn, Number(e.target.value) || 0)))}
                  className="w-20 rounded border border-border bg-background px-2 py-1 text-xs"
                  title="Jump to a specific turn from the loaded report."
                />
                <button
                  type="button"
                  onClick={() => setSelectedTurn((t) => Math.min(maxTurn, t + 1))}
                  className="rounded border border-border px-2 py-1 text-xs"
                  disabled={selectedTurn >= maxTurn}
                >
                  +
                </button>
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
                  className="rounded border border-border px-2 py-1 text-xs"
                  title="Refresh PCA/clusters from current data."
                >
                  Refresh
                </button>
              </div>
            </div>
            <div id="panel-visualization-content" data-ui-id="panel-visualization-content" className="min-h-[420px] p-2">
              {vizMode === "3d" ? (
                <div className="h-full min-h-[400px] w-full">
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
                </div>
              ) : vizMode === "json" ? (
                <div className="h-full min-h-[400px] overflow-auto rounded bg-muted/20 p-3">
                  <JsonView data={jsonData} shouldExpandNode={allExpanded} style={darkStyles} />
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

      {report && report.run.actionTrace.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Report loaded: turn {selectedTurn} / {report.run.actionTrace.length}. Slider state is synced from entity state at selected turn.
        </p>
      ) : (
        <GenerateReportButton
          onGenerated={(next) => {
            setReport(next);
            setLoadedReportIdentity({
              source: "session:browser-playthrough",
              packId: loadedPackIdentity?.packId,
              packVersion: loadedPackIdentity?.packVersion,
              packHash: loadedPackIdentity?.packHash,
              schemaVersion: loadedPackIdentity?.schemaVersion,
              engineVersion: loadedPackIdentity?.engineVersion,
            });
          }}
          policyId={reportPolicyId}
          packIdentity={loadedPackIdentity}
        />
      )}

      <ModelSchemaViewerModal
        open={modelSchemaModalOpen}
        onClose={() => setModelSchemaModalOpen(false)}
        inferredKaelModelId={inferredKaelModelId}
        runtimeModelSchemas={runtimeModelSchemas}
        runtimeFeatureSchema={runtimeFeatureSchema}
        onUpdateModelFeatureDefault={updateFeatureRefDefaultValue}
        onCreateModelSchema={createModelSchemaFromTree}
      />

    </div>
  );
}

