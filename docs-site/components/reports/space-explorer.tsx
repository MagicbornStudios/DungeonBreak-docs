"use client";

import {
  ACTION_POLICIES,
  GameEngine,
  type PlayerAction,
} from "@dungeonbreak/engine";
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
import {
  type ChangeEvent,
  type ComponentType,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { useShallow } from "zustand/react/shallow";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { runPlaythrough } from "@/lib/playthrough-runner";
import { analyzeReport } from "@/lib/playthrough-analyzer";
import { recomputeSpaceData } from "@/lib/space-recompute";
import {
  writeActiveContentPackSnapshot,
  type ActiveContentPackIdentity,
} from "@/lib/active-content-pack";
import {
  buildModelGraph,
  buildScopedContentDimensions,
  type ContentDimensionLayerId,
  type ContentDimensionModelGraph,
  type ContentDimensionNode,
} from "@/lib/content-dimension";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { MultiStepLoader } from "@/components/ui/multi-step-loader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuthoringAssistantWidget } from "@/components/ai/authoring-assistant-widget";
import {
  type AuthoringApplyResult,
  type AuthoringChatOperation,
} from "@/components/ai/authoring-chat-panel";
import { useDevToolsStore } from "@/components/app-content/dev-tools-store";
import { buildSchemaVersionSnapshot } from "@/components/reports/content-creator/schema-versioning";
import { useSchemaEditorState } from "@/components/reports/content-creator/use-schema-editor-state";
import { useStatImpactDialogState } from "@/components/reports/content-creator/use-stat-impact-dialog-state";
import { TreeStatModifierSubmenu } from "@/components/reports/content-creator/tree-stat-modifier-submenu";
import { useContentCreatorCodeEditorState } from "@/components/reports/content-creator/use-content-creator-code-editor-state";
import { useMigrationScriptClipboard } from "@/components/reports/content-creator/use-migration-script-clipboard";
import { useContentCreatorActions } from "@/components/reports/content-creator/use-content-creator-actions";
import { ContentCreatorSidebarPanel } from "@/components/reports/content-creator/sidebar-panel";
import { ContentCreatorSidebarContent } from "@/components/reports/content-creator/sidebar-content";
import { ContentCreatorInfoPanelShell } from "@/components/reports/content-creator/info-panel-shell";
import { StatImpactDialog } from "@/components/reports/content-creator/stat-impact-dialog";
import { ContentCreatorModalShell } from "@/components/reports/content-creator/modal-shell";
import { useSchemaApplyActions } from "@/components/reports/content-creator/use-schema-apply-actions";
import { useContentCreatorMenuActions } from "@/components/reports/content-creator/use-content-creator-menu-actions";
import { useContentCreatorCodeTabs } from "@/components/reports/content-creator/use-content-creator-code-tabs";
import { useContentCreatorDrafts } from "@/components/reports/content-creator/use-content-creator-drafts";
import { useContentCreatorSelectionEffects } from "@/components/reports/content-creator/use-content-creator-selection-effects";
import { useContentCreatorSelectionSync } from "@/components/reports/content-creator/use-content-creator-selection-sync";
import { useContentCreatorStatImpactActions } from "@/components/reports/content-creator/use-content-creator-stat-impact-actions";
import { useContentCreatorCodePayloads } from "@/components/reports/content-creator/use-content-creator-code-payloads";
import { useContentCreatorInfoPanel } from "@/components/reports/content-creator/use-content-creator-info-panel";
import { usePanelResolvedFeatureRefs } from "@/components/reports/content-creator/use-panel-resolved-feature-refs";
import { useContentCreatorSidebarProps } from "@/components/reports/content-creator/use-content-creator-sidebar-props";
import { useContentCreatorDerivedData } from "@/components/reports/content-creator/use-content-creator-derived-data";
import { useContentCreatorModalController } from "@/components/reports/content-creator/use-content-creator-modal-controller";
import { buildMigrationScript } from "@/components/reports/content-creator/migration-script";
import { useContentCreatorCounts } from "@/components/reports/content-creator/use-content-creator-counts";
import { useContentCreatorStatSubmenus } from "@/components/reports/content-creator/use-content-creator-stat-submenus";
import { isCanonicalSelection as resolveIsCanonicalSelection } from "@/components/reports/content-creator/selection-utils";

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

const FEATURE_NAMES = [
  "Fame",
  "Effort",
  "Awareness",
  "Guile",
  "Momentum",
] as const;
const DEFAULT_STAT_FEATURES = [
  {
    featureId: "Health",
    label: "Health",
    groups: ["stats"],
    spaces: ["combat", "entity", "item"],
    defaultValue: 100,
  },
  {
    featureId: "Stamina",
    label: "Stamina",
    groups: ["stats"],
    spaces: ["combat", "entity", "item"],
    defaultValue: 60,
  },
  {
    featureId: "Attack",
    label: "Attack",
    groups: ["stats"],
    spaces: ["combat", "entity", "item"],
    defaultValue: 12,
  },
  {
    featureId: "Defense",
    label: "Defense",
    groups: ["stats"],
    spaces: ["combat", "entity", "item"],
    defaultValue: 8,
  },
  {
    featureId: "Speed",
    label: "Speed",
    groups: ["stats"],
    spaces: ["combat", "entity", "item"],
    defaultValue: 6,
  },
  {
    featureId: "CritChance",
    label: "Crit Chance",
    groups: ["stats"],
    spaces: ["combat", "entity", "item"],
    defaultValue: 5,
  },
] as const;
const DEFAULT_CURRENCY_STAT_FEATURES = [
  {
    featureId: "Mana",
    label: "Mana",
    groups: ["stats", "currency"],
    spaces: ["currency", "entity", "item"],
    defaultValue: 100,
  },
  {
    featureId: "Gold",
    label: "Gold",
    groups: ["stats", "currency"],
    spaces: ["currency", "entity", "item"],
    defaultValue: 25,
  },
  {
    featureId: "Income",
    label: "Income",
    groups: ["stats", "currency"],
    spaces: ["currency", "entity", "item"],
    defaultValue: 3,
  },
  {
    featureId: "Upkeep",
    label: "Upkeep",
    groups: ["stats", "currency"],
    spaces: ["currency", "entity", "item"],
    defaultValue: 1,
  },
  {
    featureId: "TradeRate",
    label: "Trade Rate",
    groups: ["stats", "currency"],
    spaces: ["currency", "entity", "item"],
    defaultValue: 1,
  },
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
const DIMENSION_LAYER_CONFIG: Record<
  ContentDimensionLayerId,
  { label: string; color: string; enabledByDefault: boolean }
> = {
  "schema-model": {
    label: "Schema Models",
    color: "#60a5fa",
    enabledByDefault: true,
  },
  "canonical-asset": {
    label: "Canonical Assets",
    color: "#34d399",
    enabledByDefault: true,
  },
};

type SpaceVectorPackOverrides = Record<string, unknown>;

type UnifiedSpaceVector = {
  traits: Record<string, number>;
  features: Record<string, number>;
  semantics: Record<string, number>;
};

type RuntimeUnifiedModel = {
  actionSpace: Array<{ actionType: string; vector: UnifiedSpaceVector }>;
  eventSpace: Array<{
    eventId: string;
    kind: string;
    vector: UnifiedSpaceVector;
  }>;
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
  statModifiers?: Array<{
    modifierStatModelId: string;
    mappings: Array<{ modifierFeatureId: string; targetFeatureId: string }>;
  }>;
  featureRefs: Array<{
    featureId: string;
    spaces: string[];
    required?: boolean;
    defaultValue?: number;
  }>;
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

type PackScopeTreeNode = {
  id: string;
  modelId: string;
  label: string;
  depth: number;
  children: PackScopeTreeNode[];
  canonicalAssets: ModelInstanceBinding[];
};

type StatSpaceOverlay = {
  id: string;
  xCenter: number;
  width: number;
  height: number;
  color: string;
};

type LayerSpaceOverlay = {
  id: string;
  xCenter: number;
  width: number;
  yMin: number;
  yMax: number;
  zMin: number;
  zMax: number;
  color: string;
};

type ModelSchemaViewerState = {
  activeModelSchemaId: string;
  activeModelInstanceId: string | null;
  schemaLanguage: SchemaLanguage;
  modelInstances: ModelInstanceBinding[];
  migrationOps: ModelMigrationOp[];
  initFromSchemas: (
    schemas: RuntimeModelSchemaRow[],
    inferredKaelModelId: string
  ) => void;
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
  vizMode: "3d" | "2d" | "json" | "deltas";
  colorBy: ColorBy;
  distanceAlgorithm: DistanceAlgorithm;
  nearestK: number;
  runtimeSpaceView: RuntimeSpaceView;
  spaceFeatureMap: Record<ContentSpaceKey, string[]>;
  customFeatureValues: Record<string, number>;
  customFeatureLabels: Record<string, string>;
  movementFeatureIds: string[];
  scopeRootModelId: string | null;
  hiddenModelIds: string[];
  collapsedDepths: number[];
  setVizMode: (next: "3d" | "2d" | "json" | "deltas") => void;
  setColorBy: (next: ColorBy) => void;
  setDistanceAlgorithm: (next: DistanceAlgorithm) => void;
  setNearestK: (next: number) => void;
  setRuntimeSpaceView: (next: RuntimeSpaceView) => void;
  setSpaceFeatureMap: (
    next:
      | Record<ContentSpaceKey, string[]>
      | ((
          prev: Record<ContentSpaceKey, string[]>
        ) => Record<ContentSpaceKey, string[]>)
  ) => void;
  setCustomFeatureValues: (
    next:
      | Record<string, number>
      | ((prev: Record<string, number>) => Record<string, number>)
  ) => void;
  setCustomFeatureLabels: (
    next:
      | Record<string, string>
      | ((prev: Record<string, string>) => Record<string, string>)
  ) => void;
  setMovementFeatureIds: (
    next: string[] | ((prev: string[]) => string[])
  ) => void;
  setScopeRootModelId: (next: string | null) => void;
  setHiddenModelIds: (next: string[] | ((prev: string[]) => string[])) => void;
  setCollapsedDepths: (next: number[] | ((prev: number[]) => number[])) => void;
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

function canonicalizeModelIdRaw(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "_")
    .replace(/\.base(?=\.|$)/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

function migrateModelSchemasAwayFromBase(
  rows: RuntimeModelSchemaRow[]
): RuntimeModelSchemaRow[] {
  const mergedById = new Map<string, RuntimeModelSchemaRow>();
  for (const row of rows) {
    const modelId = canonicalizeModelIdRaw(row.modelId);
    if (!modelId) continue;
    const extendsModelId = row.extendsModelId
      ? canonicalizeModelIdRaw(row.extendsModelId)
      : undefined;
    const attachedStatModelIds = (row.attachedStatModelIds ?? [])
      .map((id) => canonicalizeModelIdRaw(id))
      .filter((id): id is string => Boolean(id));
    const nextFeatureRefs = row.featureRefs.map((ref) => ({
      featureId: ref.featureId,
      spaces: [...ref.spaces],
      required: ref.required,
      defaultValue: ref.defaultValue,
    }));
    const statModifiers = (row.statModifiers ?? []).map((modifier) => ({
      modifierStatModelId: canonicalizeModelIdRaw(modifier.modifierStatModelId),
      mappings: (modifier.mappings ?? [])
        .filter((mapping) => mapping?.modifierFeatureId && mapping?.targetFeatureId)
        .map((mapping) => ({
          modifierFeatureId: mapping.modifierFeatureId,
          targetFeatureId: mapping.targetFeatureId,
        })),
    }));
    const existing = mergedById.get(modelId);
    if (!existing) {
      mergedById.set(modelId, {
        modelId,
        label: row.label || modelId,
        description: row.description,
        extendsModelId:
          extendsModelId && extendsModelId !== modelId ? extendsModelId : undefined,
        attachedStatModelIds:
          attachedStatModelIds.length > 0
            ? [...new Set(attachedStatModelIds.filter((id) => id !== modelId))]
            : undefined,
        statModifiers:
          statModifiers.filter((modifier) => modifier.modifierStatModelId && modifier.modifierStatModelId !== modelId)
            .length > 0
            ? statModifiers.filter((modifier) => modifier.modifierStatModelId && modifier.modifierStatModelId !== modelId)
            : undefined,
        featureRefs: nextFeatureRefs,
      });
      continue;
    }
    const featureMap = new Map(
      existing.featureRefs.map((ref) => [ref.featureId, ref] as const)
    );
    for (const ref of nextFeatureRefs) {
      if (!featureMap.has(ref.featureId)) featureMap.set(ref.featureId, ref);
    }
    existing.featureRefs = Array.from(featureMap.values());
    if (!existing.label && row.label) existing.label = row.label;
    if (!existing.description && row.description)
      existing.description = row.description;
    if (
      !existing.extendsModelId &&
      extendsModelId &&
      extendsModelId !== modelId
    ) {
      existing.extendsModelId = extendsModelId;
    }
    const mergedAttached = [
      ...new Set([...(existing.attachedStatModelIds ?? []), ...attachedStatModelIds]),
    ].filter((id) => id !== modelId);
    existing.attachedStatModelIds =
      mergedAttached.length > 0 ? mergedAttached : undefined;
    const existingModifiers = new Map(
      (existing.statModifiers ?? []).map((modifier) => [modifier.modifierStatModelId, modifier] as const)
    );
    for (const modifier of statModifiers) {
      if (!modifier.modifierStatModelId || modifier.modifierStatModelId === modelId) continue;
      if (!existingModifiers.has(modifier.modifierStatModelId)) {
        existingModifiers.set(modifier.modifierStatModelId, modifier);
      }
    }
    existing.statModifiers =
      existingModifiers.size > 0 ? Array.from(existingModifiers.values()) : undefined;
  }
  return Array.from(mergedById.values());
}

const useModelSchemaViewerStore = create<ModelSchemaViewerState>()(
  devtools(
    persist(
      immer<ModelSchemaViewerState>((set) => ({
        activeModelSchemaId: "",
        activeModelInstanceId: null,
        schemaLanguage: "typescript",
        modelInstances: [],
        migrationOps: [],
        initFromSchemas: (schemas, _inferredKaelModelId) =>
          set((state) => {
            state.modelInstances = state.modelInstances.map((row) => ({
              ...row,
              modelId: canonicalizeModelIdRaw(row.modelId),
            }));
            if (
              !state.activeModelSchemaId ||
              (state.activeModelSchemaId !== NO_MODEL_SELECTED &&
                !schemas.some(
                  (row) => row.modelId === state.activeModelSchemaId
                ))
            ) {
              state.activeModelSchemaId = NO_MODEL_SELECTED;
              state.activeModelInstanceId = null;
            }
          }),
        ensureKaelBinding: (modelId) =>
          set((state) => {
            if (!modelId || modelId === "none") return;
            const idx = state.modelInstances.findIndex(
              (row) => row.id === "entity-instance.kael"
            );
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
            const index =
              state.modelInstances.filter((row) => row.modelId === modelId)
                .length + 1;
            state.modelInstances.push({
              id: `${base}-asset-${Date.now()}-${index}`,
              name:
                name?.trim() ||
                `${modelId.split(".")[0] ?? "asset"}_asset_${index}`,
              modelId,
              canonical: true,
            });
          }),
        toggleCanonical: (instanceId) =>
          set((state) => {
            const row = state.modelInstances.find(
              (item) => item.id === instanceId
            );
            if (!row) return;
            row.canonical = !row.canonical;
          }),
        renameModelInstance: (instanceId, name) =>
          set((state) => {
            const row = state.modelInstances.find(
              (item) => item.id === instanceId
            );
            if (!row) return;
            const nextName = name.trim();
            if (!nextName) return;
            row.name = nextName;
          }),
        deleteModelInstance: (instanceId) =>
          set((state) => {
            state.modelInstances = state.modelInstances.filter(
              (item) => item.id !== instanceId
            );
            if (state.activeModelInstanceId === instanceId)
              state.activeModelInstanceId = null;
          }),
        moveInstancesToModel: (instanceIds, toModelId) =>
          set((state) => {
            for (const instanceId of instanceIds) {
              const row = state.modelInstances.find(
                (item) => item.id === instanceId
              );
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
            state.modelInstances = instances.map((row) => ({
              ...row,
              modelId: canonicalizeModelIdRaw(row.modelId),
            }));
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
      }
    ),
    { name: "space-explorer-model-schema-viewer-store" }
  )
);

function toTypeName(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join("");
}

function parseModelInstancesFromContentBindings(
  spaceVectors: SpaceVectorPackOverrides | undefined
): ModelInstanceBinding[] {
  if (!spaceVectors || typeof spaceVectors !== "object") return [];
  const row = spaceVectors as { contentBindings?: unknown };
  if (!row.contentBindings || typeof row.contentBindings !== "object")
    return [];
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
    const parsed = item as {
      id?: unknown;
      name?: unknown;
      modelId?: unknown;
      canonical?: unknown;
    };
    const id = String(parsed.id ?? "").trim();
    const modelId = canonicalizeModelIdRaw(String(parsed.modelId ?? ""));
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

function codeLanguageForTabId(
  tabId: string
): "typescript" | "cpp" | "csharp" | "json" {
  if (tabId.includes("cpp")) return "cpp";
  if (tabId.includes("csharp")) return "csharp";
  if (tabId.includes("ts")) return "typescript";
  return "json";
}

function formatModelIdForUi(modelId: string): string {
  return canonicalizeModelIdRaw(modelId);
}

function resolveParentModelId(
  modelId: string,
  modelIdSet: Set<string>,
  modelById?: Map<string, RuntimeModelSchemaRow>
): string | null {
  const explicitParent = modelById?.get(modelId)?.extendsModelId;
  if (
    explicitParent &&
    explicitParent !== modelId &&
    modelIdSet.has(explicitParent)
  ) {
    return explicitParent;
  }
  const parts = modelId.split(".");
  if (parts.length < 2) return null;
  for (let depth = parts.length - 1; depth >= 1; depth -= 1) {
    const parentCandidate = parts.slice(0, depth).join(".");
    if (parentCandidate !== modelId && modelIdSet.has(parentCandidate))
      return parentCandidate;
    const baseCandidate = `${parentCandidate}.base`;
    if (baseCandidate !== modelId && modelIdSet.has(baseCandidate))
      return baseCandidate;
  }
  return null;
}

function buildDefaultStatModifierMappings(
  targetStat: RuntimeModelSchemaRow,
  modifierStat: RuntimeModelSchemaRow
): Array<{ modifierFeatureId: string; targetFeatureId: string }> {
  const targetIds = targetStat.featureRefs.map((ref) => ref.featureId);
  const modifierIds = modifierStat.featureRefs.map((ref) => ref.featureId);
  if (modifierIds.length === 0) return [];
  if (targetIds.length === 0) {
    return modifierIds.map((modifierFeatureId) => ({
      modifierFeatureId,
      targetFeatureId: modifierFeatureId,
    }));
  }
  return modifierIds.map((modifierFeatureId, index) => ({
    modifierFeatureId,
    targetFeatureId: targetIds[index % targetIds.length] ?? targetIds[0]!,
  }));
}

function ensureStatFeatureSchemaRows(
  rows: RuntimeFeatureSchemaRow[]
): RuntimeFeatureSchemaRow[] {
  const byId = new Map(rows.map((row) => [row.featureId, row] as const));
  const next = [...rows];
  for (const stat of [
    ...DEFAULT_STAT_FEATURES,
    ...DEFAULT_CURRENCY_STAT_FEATURES,
  ]) {
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
  featureRows: RuntimeFeatureSchemaRow[]
): RuntimeModelSchemaRow[] {
  const byId = new Map(rows.map((row) => [row.modelId, row] as const));
  const featureDefaults = new Map(
    featureRows.map((row) => [row.featureId, row.defaultValue ?? 0] as const)
  );
  const next = rows.map((row) => ({
    ...row,
    featureRefs: row.featureRefs.map((ref) => ({
      ...ref,
      spaces: [...ref.spaces],
    })),
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
      description:
        "Shared reusable combat stat vector defaults for entity and item inheritance.",
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
      description:
        "Reusable currency stat vector defaults for currency-bearing models.",
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
        description:
          next[idx]!.description ??
          "Currency model that extends CurrencyStats defaults.",
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
  language: SchemaLanguage
): SchemaFile[] {
  const modelById = new Map(
    allSchemas.map((row) => [row.modelId, row] as const)
  );
  const modelIdSet = new Set(allSchemas.map((row) => row.modelId));
  const chain: RuntimeModelSchemaRow[] = [];
  const visited = new Set<string>();
  let cursor: RuntimeModelSchemaRow | undefined = activeModel;
  while (cursor && !visited.has(cursor.modelId)) {
    chain.unshift(cursor);
    visited.add(cursor.modelId);
    const parentId = resolveParentModelId(
      cursor.modelId,
      modelIdSet,
      modelById
    );
    cursor = parentId ? modelById.get(parentId) : undefined;
  }

  return chain.map((schema) => {
    const parentId = resolveParentModelId(
      schema.modelId,
      modelIdSet,
      modelById
    );
    const parent = parentId ? modelById.get(parentId) : null;
    const modelParts = schema.modelId.split(".");
    const name =
      modelParts.length === 2 && modelParts[1] === "base"
        ? modelParts[0] || "schema"
        : modelParts.slice(1).join("-") || modelParts[0] || "schema";
    const fileStem =
      schema.modelId
        .replace(/\.base\b/g, "")
        .replace(/\.+/g, "-")
        .replace(/^-+|-+$/g, "") || "model";
    const typeName = `${toTypeName(schema.modelId)}Schema`;
    const parentTypeName = parent
      ? `${toTypeName(parent.modelId)}Schema`
      : null;
    const defaultsName = `${toConstName(schema.modelId)}_DEFAULTS`;
    const parentDefaultsName = parent
      ? `${toConstName(parent.modelId)}_DEFAULTS`
      : null;

    if (language === "cpp") {
      const filePath = `${fileStem}.hpp`;
      const code = [
        "#pragma once",
        "",
        `struct ${typeName}${parentTypeName ? ` : ${parentTypeName}` : ""} {`,
        ...schema.featureRefs.map(
          (ref) => `  float ${toMemberName(ref.featureId)} = 0.0f;`
        ),
        "};",
        "",
        `inline ${typeName} ${toTypeName(schema.modelId)}Defaults() {`,
        `  ${typeName} value{};`,
        ...(parentDefaultsName
          ? [`  value = ${toTypeName(parent!.modelId)}Defaults();`]
          : []),
        ...schema.featureRefs.map((ref) => {
          const nextDefault =
            ref.defaultValue ?? featureDefaults.get(ref.featureId) ?? 0;
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
          const nextDefault =
            ref.defaultValue ?? featureDefaults.get(ref.featureId) ?? 0;
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
        const nextDefault =
          ref.defaultValue ?? featureDefaults.get(ref.featureId) ?? 0;
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
  outputStem: string
): SchemaFile | null {
  const files = buildSchemaFilesForLanguage(
    activeModel,
    allSchemas,
    featureDefaults,
    language
  );
  if (files.length === 0) return null;
  const ext =
    language === "typescript" ? "ts" : language === "cpp" ? "hpp" : "cs";
  const code = files
    .map((file) => `// ${file.path}\n${file.code}`)
    .join("\n\n");
  return {
    path: `${outputStem}.${ext}`,
    code,
  };
}

function buildJsonSchemaForModel(
  activeModel: RuntimeModelSchemaRow,
  allSchemas: RuntimeModelSchemaRow[],
  featureDefaults: Map<string, number>
): Record<string, unknown> {
  const modelById = new Map(
    allSchemas.map((row) => [row.modelId, row] as const)
  );
  const modelIdSet = new Set(allSchemas.map((row) => row.modelId));
  const chain: RuntimeModelSchemaRow[] = [];
  const visited = new Set<string>();
  let cursor: RuntimeModelSchemaRow | undefined = activeModel;
  while (cursor && !visited.has(cursor.modelId)) {
    chain.unshift(cursor);
    visited.add(cursor.modelId);
    const parentId = resolveParentModelId(
      cursor.modelId,
      modelIdSet,
      modelById
    );
    cursor = parentId ? modelById.get(parentId) : undefined;
  }

  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `dungeonbreak://object-definition/${activeModel.modelId}.object.json`,
    title: `${activeModel.label || activeModel.modelId} Object Definition`,
    description:
      activeModel.description ?? `Object definition for ${activeModel.modelId}`,
    type: "object",
    "x-modelId": activeModel.modelId,
    "x-extendsModelId": activeModel.extendsModelId ?? null,
    "x-implements": ["content-model"],
    allOf: chain.map((schema) => {
      const statProperties: Record<string, unknown> = {};
      const requiredStats: string[] = [];
      for (const ref of schema.featureRefs) {
        const nextDefault =
          ref.defaultValue ?? featureDefaults.get(ref.featureId) ?? 0;
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
  onToggleStatModifierForStatSet,
  onUpdateStatModifierMapping,
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
  onUpdateModelMetadata: (
    modelId: string,
    updates: { label?: string; description?: string }
  ) => void;
  onDeleteModelSchema: (modelId: string) => void;
  onCreateModelSchema: (
    modelId: string,
    label?: string,
    templateModelId?: string
  ) => void;
  onAddFeatureRefToModel: (modelId: string, featureId: string) => void;
  onRemoveFeatureRefFromModel: (modelId: string, featureId: string) => void;
  onUpdateFeatureRefDefaultValue: (
    modelId: string,
    featureId: string,
    defaultValue: number | null
  ) => void;
  onAttachStatModelToModel: (modelId: string, statModelId: string) => void;
  onToggleStatModifierForStatSet: (
    targetStatModelId: string,
    modifierStatModelId: string,
    enabled: boolean
  ) => void;
  onUpdateStatModifierMapping: (
    targetStatModelId: string,
    modifierStatModelId: string,
    modifierFeatureId: string,
    targetFeatureId: string
  ) => void;
  onReplaceModelSchemas: (models: RuntimeModelSchemaRow[]) => void;
  onReplaceCanonicalAssets: (assets: ModelInstanceBinding[]) => void;
  onOpenCanonicalAssetInExplorer: (selection: {
    modelId: string;
    instanceId: string | null;
  }) => void;
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
    }))
  );
  const { copiedScript, copyMigrationScript } = useMigrationScriptClipboard();
  const {
    selectedTreeNodeId,
    setSelectedTreeNodeId,
    toggleTreeNode,
    isExpanded,
    codePanelOpen,
    canonicalTab,
    setCanonicalTab,
    objectSectionTab,
    setObjectSectionTab,
    modelsNavigatorMode,
    canonicalNavigatorMode,
    setNavigatorMode,
    canonicalCreateName,
    setCanonicalCreateName,
    newStatFeatureId,
    setNewStatFeatureId,
    newStatModelIdDraft,
    setNewStatModelIdDraft,
    newStatLabelDraft,
    setNewStatLabelDraft,
    newStatTemplateModelId,
    setNewStatTemplateModelId,
  } = useContentCreatorModalController();

  useEffect(() => {
    if (!open) return;
    initFromSchemas(runtimeModelSchemas, inferredKaelModelId);
  }, [open, runtimeModelSchemas, inferredKaelModelId, initFromSchemas]);

  const activeModelSchema = useMemo(
    () =>
      runtimeModelSchemas.find((row) => row.modelId === activeModelSchemaId) ??
      null,
    [runtimeModelSchemas, activeModelSchemaId]
  );

  const migrationScript = useMemo(
    () => buildMigrationScript(migrationOps),
    [migrationOps]
  );
  const {
    activeNavigatorMode,
    activeTreeData,
    featureDefaultMap,
    modelTreeNodeById,
    statModelIds,
    statColorByModelId,
    attachedStatModelIdsByModelId,
    modelsSchemaJson,
    statsSchemaJson,
    canonicalAssetsSchemaJson,
  } = useContentCreatorDerivedData({
    runtimeModelSchemas,
    runtimeFeatureSchema,
    modelInstances,
    objectSectionTab,
    modelsNavigatorMode,
    canonicalNavigatorMode,
    formatModelIdForUi,
    hashToUnit,
  });
  const selectedTreeNode = useMemo(
    () =>
      selectedTreeNodeId
        ? (modelTreeNodeById.get(selectedTreeNodeId) ?? null)
        : null,
    [selectedTreeNodeId, modelTreeNodeById]
  );
  const contentObjectById = useMemo(
    () =>
      new Map(
        runtimeContentObjects.map(
          (objectPoint) => [objectPoint.id, objectPoint] as const
        )
      ),
    [runtimeContentObjects]
  );
  const {
    jsonSyntaxMounted,
    jsonSectionOpen,
    jsonSectionEditorMode,
    modelsSchemaDraft,
    statsSchemaDraft,
    canonicalSchemaDraft,
    jsonApplyError,
    deferredModelsSchemaJson,
    deferredStatsSchemaJson,
    deferredCanonicalSchemaJson,
    setJsonSectionOpen,
    setJsonSectionEditorMode,
    setModelsSchemaDraft,
    setStatsSchemaDraft,
    setCanonicalSchemaDraft,
    setJsonApplyError,
  } = useSchemaEditorState({
    modelsSchemaJson,
    statsSchemaJson,
    canonicalSchemaJson: canonicalAssetsSchemaJson,
    activeNavigatorMode,
    objectSectionTab,
  });
  const currentSchemaSnapshot = useMemo(
    () =>
      buildSchemaVersionSnapshot({
        modelsJson: modelsSchemaJson,
        statsJson: statsSchemaJson,
        canonicalJson: canonicalAssetsSchemaJson,
      }),
    [modelsSchemaJson, statsSchemaJson, canonicalAssetsSchemaJson]
  );
  const {
    pendingStatImpactAction,
    pendingStatImpactChoice,
    pendingStatImpactReplacementId,
    openStatImpactDialog,
    closeStatImpactDialog,
    setPendingStatImpactChoice,
    setPendingStatImpactReplacementId,
  } = useStatImpactDialogState(statModelIds);
  const { applyModelsAndStatsSchemaDraft, applyCanonicalSchemaDraft } =
    useSchemaApplyActions({
      modelsSchemaDraft,
      statsSchemaDraft,
      canonicalSchemaDraft,
      currentSchemaSnapshot,
      runtimeModelSchemas,
      normalizeModelId,
      formatModelIdForUi,
      onReplaceModelSchemas,
      onReplaceCanonicalAssets,
      onSetJsonApplyError: setJsonApplyError,
    });
  const selectedContentObject = useMemo(() => {
    if (selectedTreeNode?.nodeType !== "object" || !selectedTreeNode.objectId)
      return null;
    return contentObjectById.get(selectedTreeNode.objectId) ?? null;
  }, [selectedTreeNode, contentObjectById]);
  const panelModelId =
    selectedTreeNode?.modelId ?? activeModelSchema?.modelId ?? null;
  const panelModelSchema = useMemo(
    () =>
      panelModelId
        ? (runtimeModelSchemas.find((row) => row.modelId === panelModelId) ??
          null)
        : null,
    [runtimeModelSchemas, panelModelId]
  );
  const panelResolvedFeatureRefs = usePanelResolvedFeatureRefs({
    panelModelSchema,
    runtimeModelSchemas,
    featureDefaultMap,
    normalizeModelId,
  });
  const panelStatGroups = useMemo(() => {
    if (!panelModelSchema)
      return [] as Array<{
        statModelId: string;
        label: string;
        color: string;
        features: RuntimeModelSchemaRow["featureRefs"];
      }>;
    const byId = new Map(
      runtimeModelSchemas.map((row) => [row.modelId, row] as const)
    );
    const idSet = new Set(runtimeModelSchemas.map((row) => row.modelId));
    const modelChain: RuntimeModelSchemaRow[] = [];
    const visitedModels = new Set<string>();
    let modelCursor: RuntimeModelSchemaRow | undefined = panelModelSchema;
    while (modelCursor && !visitedModels.has(modelCursor.modelId)) {
      visitedModels.add(modelCursor.modelId);
      modelChain.unshift(modelCursor);
      const parentId = resolveParentModelId(modelCursor.modelId, idSet, byId);
      modelCursor = parentId ? byId.get(parentId) : undefined;
    }
    const statModelIds: string[] = [];
    const seenStatIds = new Set<string>();
    for (const model of modelChain) {
      const candidates = [
        ...(model.extendsModelId && model.extendsModelId.endsWith("stats")
          ? [model.extendsModelId]
          : []),
        ...(model.attachedStatModelIds ?? []).filter((id) =>
          id.endsWith("stats")
        ),
      ];
      for (const candidate of candidates) {
        const normalized = normalizeModelId(candidate);
        if (!normalized || seenStatIds.has(normalized) || !byId.has(normalized))
          continue;
        seenStatIds.add(normalized);
        statModelIds.push(normalized);
      }
    }
    const groups: Array<{
      statModelId: string;
      label: string;
      color: string;
      features: RuntimeModelSchemaRow["featureRefs"];
    }> = [];
    const consumedFeatureIds = new Set<string>();
    for (const statModelId of statModelIds) {
      const statFeatureIds = new Set<string>();
      const visitedStats = new Set<string>();
      let statCursor: RuntimeModelSchemaRow | undefined = byId.get(statModelId);
      while (statCursor && !visitedStats.has(statCursor.modelId)) {
        visitedStats.add(statCursor.modelId);
        for (const ref of statCursor.featureRefs) {
          statFeatureIds.add(ref.featureId);
        }
        const parentId = resolveParentModelId(statCursor.modelId, idSet, byId);
        const parent = parentId ? byId.get(parentId) : undefined;
        statCursor =
          parent && parent.modelId.endsWith("stats") ? parent : undefined;
      }
      const features = panelResolvedFeatureRefs.filter((ref) => {
        if (!statFeatureIds.has(ref.featureId)) return false;
        if (consumedFeatureIds.has(ref.featureId)) return false;
        consumedFeatureIds.add(ref.featureId);
        return true;
      });
      if (features.length === 0) continue;
      groups.push({
        statModelId,
        label: formatModelIdForUi(statModelId),
        color: statColorByModelId.get(statModelId) ?? "hsl(195, 85%, 62%)",
        features,
      });
    }
    const remainder = panelResolvedFeatureRefs.filter(
      (ref) => !consumedFeatureIds.has(ref.featureId)
    );
    if (remainder.length > 0) {
      groups.push({
        statModelId: "__model__",
        label: "model",
        color: "hsl(220, 8%, 60%)",
        features: remainder,
      });
    }
    return groups;
  }, [
    panelModelSchema,
    panelResolvedFeatureRefs,
    runtimeModelSchemas,
    normalizeModelId,
    statColorByModelId,
  ]);
  const panelModelInstance = useMemo(() => {
    if (!selectedTreeNode?.instanceId) return null;
    return (
      modelInstances.find((row) => row.id === selectedTreeNode.instanceId) ??
      null
    );
  }, [selectedTreeNode, modelInstances]);
  const activeModelJsonSchema = useMemo(
    () =>
      panelModelSchema
        ? buildJsonSchemaForModel(
            panelModelSchema,
            runtimeModelSchemas,
            featureDefaultMap
          )
        : null,
    [panelModelSchema, runtimeModelSchemas, featureDefaultMap]
  );
  const { activeObjectDefinition, definitionCode, marshalledObjectCode } =
    useContentCreatorCodePayloads({
      panelModelSchema,
      activeModelJsonSchema,
      selectedContentObject,
      featureDefaultMap,
    });
  useContentCreatorSelectionSync({
    open,
    activeModelSchemaId,
    activeModelInstanceId,
    selectedTreeNodeId,
    modelTreeNodeById,
    onSetSelectedTreeNodeId: setSelectedTreeNodeId,
    noModelSelectedId: NO_MODEL_SELECTED,
  });
  const {
    modelLabelDraft,
    modelDescriptionDraft,
    canonicalNameDraft,
    setModelLabelDraft,
    setModelDescriptionDraft,
    setCanonicalNameDraft,
  } = useContentCreatorDrafts(panelModelSchema, panelModelInstance);
  const canonicalCreateModelId = panelModelSchema?.modelId ?? "";
  const {
    suggestDerivedModelId,
    suggestDerivedStatId,
    createSchemaViaTree,
    promptCreateCanonicalAsset,
  } = useContentCreatorActions({
    activeModelSchemaId: activeModelSchema?.modelId ?? null,
    normalizeModelId,
    formatModelIdForUi,
    toFileStem,
    onCreateModelSchema,
    onAddCanonicalAsset: addCanonicalAsset,
    onSetNewStatModelIdDraft: setNewStatModelIdDraft,
    onSetNewStatLabelDraft: setNewStatLabelDraft,
    onSetNewStatTemplateModelId: setNewStatTemplateModelId,
    onSetSelectedTreeNodeId: setSelectedTreeNodeId,
    onSetObjectSectionTab: setObjectSectionTab,
    onSetCanonicalTab: setCanonicalTab,
  });
  const { handleDetachStatFromModelWithImpact, submitPendingStatImpactAction } =
    useContentCreatorStatImpactActions({
      runtimeModelSchemas,
      modelInstances,
      statModelIds,
      pendingStatImpactAction,
      pendingStatImpactChoice,
      pendingStatImpactReplacementId,
      normalizeModelId,
      onReplaceModelSchemas,
      onReplaceCanonicalAssets,
      onOpenStatImpactDialog: openStatImpactDialog,
      onCloseStatImpactDialog: closeStatImpactDialog,
    });
  const renderStatAttachDetachSubmenus = useContentCreatorStatSubmenus({
    runtimeModelSchemas,
    statModelIds,
    statColorByModelId,
    onAttachStatModelToModel,
    onDetachStatFromModelWithImpact: handleDetachStatFromModelWithImpact,
  });
  const toggleStatModifierForStatSet = useCallback(
    (targetStatModelId: string, modifierStatModelId: string, enabled: boolean) => {
      if (!targetStatModelId || !modifierStatModelId) return;
      if (targetStatModelId === modifierStatModelId) return;
      const byId = new Map(
        runtimeModelSchemas.map((row) => [row.modelId, row] as const)
      );
      const targetStat = byId.get(targetStatModelId);
      const modifierStat = byId.get(modifierStatModelId);
      if (!targetStat || !modifierStat) return;
      if (!targetStat.modelId.endsWith("stats")) return;
      if (!modifierStat.modelId.endsWith("stats")) return;
      const nextModels = runtimeModelSchemas.map((row) => {
        if (row.modelId !== targetStatModelId) return row;
        const current = row.statModifiers ?? [];
        if (enabled) {
          if (
            current.some(
              (modifier) =>
                modifier.modifierStatModelId === modifierStatModelId
            )
          ) {
            return row;
          }
          return {
            ...row,
            statModifiers: [
              ...current,
              {
                modifierStatModelId,
                mappings: buildDefaultStatModifierMappings(
                  targetStat,
                  modifierStat
                ),
              },
            ],
          };
        }
        return {
          ...row,
          statModifiers: current.filter(
            (modifier) => modifier.modifierStatModelId !== modifierStatModelId
          ),
        };
      });
      onReplaceModelSchemas(nextModels);
    },
    [runtimeModelSchemas, onReplaceModelSchemas]
  );
  const renderStatModifierSubmenu = useCallback(
    (targetStatModelId: string, keyPrefix: string) => {
      const target = runtimeModelSchemas.find(
        (row) => row.modelId === targetStatModelId
      );
      if (!target || !target.modelId.endsWith("stats")) return null;
      const activeModifierIds = (target.statModifiers ?? [])
        .map((modifier) => normalizeModelId(modifier.modifierStatModelId))
        .filter((id) => id.endsWith("stats"));
      return (
        <TreeStatModifierSubmenu
          targetStatModelId={targetStatModelId}
          keyPrefix={keyPrefix}
          statModelIds={statModelIds}
          activeModifierIds={activeModifierIds}
          statColorByModelId={statColorByModelId}
          onToggleModifier={(modifierStatModelId, enabled) =>
            onToggleStatModifierForStatSet(
              targetStatModelId,
              modifierStatModelId,
              enabled
            )
          }
        />
      );
    },
    [
      normalizeModelId,
      onToggleStatModifierForStatSet,
      runtimeModelSchemas,
      statColorByModelId,
      statModelIds,
    ]
  );
  const {
      renderGroupContextMenuItems,
      renderStatsModelDeleteItem,
      renderModelDeleteItem,
  } = useContentCreatorMenuActions({
    runtimeModelSchemas,
    modelInstances,
    createSchemaViaTree,
    onDeleteModelSchema,
    onOpenStatImpactDialog: openStatImpactDialog,
  });
  const codeTabs = useContentCreatorCodeTabs({
    panelModelSchema,
    panelModelInstance,
    selectedContentObject,
    runtimeModelSchemas,
    featureDefaultMap,
    definitionCode,
    marshalledObjectCode,
    toFileStem,
    buildSingleSchemaFileForLanguage,
  });
  const {
    activeCodeTabId,
    activeCodeFile,
    objectEditorCode,
    copiedEditorCode,
    setActiveCodeTabId,
    resetEditorCode,
    copyEditorCode,
  } = useContentCreatorCodeEditorState(codeTabs);
  const hasCodePreview = !!activeCodeFile;
  const { canonicalAssetCount, modelDefinitionCount, linkedCanonicalCount } =
    useContentCreatorCounts({
      runtimeModelSchemas,
      modelInstances,
      panelModelId: panelModelSchema?.modelId,
    });

  const isCanonicalSelection = resolveIsCanonicalSelection(selectedTreeNode);
  useContentCreatorSelectionEffects({
    selectedTreeNode,
    onSetCanonicalTab: setCanonicalTab,
    onSetObjectSectionTab: setObjectSectionTab,
  });
  const {
    infoPanelName,
    infoPanelTone,
    infoPanelContent,
    sharedCodeBlockPanel,
  } = useContentCreatorInfoPanel({
    selectedTreeNode,
    statsProps: {
      selectedTreeNode,
      panelModelSchema,
      runtimeModelSchemas,
      runtimeFeatureSchema,
      statColorByModelId,
      featureDefaultMap,
      newStatFeatureId,
      newStatModelIdDraft,
      newStatLabelDraft,
      newStatTemplateModelId,
      onSetNewStatFeatureId: setNewStatFeatureId,
      onSetNewStatModelIdDraft: setNewStatModelIdDraft,
      onSetNewStatLabelDraft: setNewStatLabelDraft,
      onCreateModelSchema,
      onSelectTreeNodeId: setSelectedTreeNodeId,
      onAddFeatureRefToModel,
      onRemoveFeatureRefFromModel,
      onUpdateFeatureRefDefaultValue,
      onDeleteModelSchema,
      onUpdateStatModifierMapping,
      normalizeModelId,
    },
    modelsProps: {
      selectedTreeNode,
      canonicalAssetCount,
      modelDefinitionCount,
    },
    modelProps: {
      panelModelSchema,
      selectedContentObject,
      modelLabelDraft,
      modelDescriptionDraft,
      panelResolvedFeatureRefs,
      statGroups: panelStatGroups,
      featureDefaultMap,
      linkedCanonicalCount,
      migrationOpsCount: migrationOps.length,
      migrationScript,
      copiedScript,
      onSetModelLabelDraft: setModelLabelDraft,
      onSetModelDescriptionDraft: setModelDescriptionDraft,
      onUpdateModelMetadata,
      onDeleteModelSchema,
      onCopyMigrationScript: () => copyMigrationScript(migrationScript),
      onClearMigrationOps: clearMigrationOps,
    },
    canonicalProps: {
      panelModelSchema,
      panelModelInstance,
      panelResolvedFeatureRefs,
      featureDefaultMap,
      canonicalTab,
      canonicalCreateName,
      canonicalCreateModelId,
      canonicalNameDraft,
      onSetCanonicalTab: setCanonicalTab,
      onSetCanonicalCreateName: setCanonicalCreateName,
      onSetCanonicalNameDraft: setCanonicalNameDraft,
      onAddCanonicalAsset: addCanonicalAsset,
      onRenameModelInstance: renameModelInstance,
      onDeleteModelInstance: deleteModelInstance,
      onOpenCanonicalAssetInExplorer,
    },
    codePanelProps: {
      codeTabs,
      activeCodeFile,
      activeCodeTabId,
      objectEditorCode,
      copiedEditorCode,
      onSelectCodeTab: setActiveCodeTabId,
      onResetCode: resetEditorCode,
      onCopyCode: copyEditorCode,
      codeLanguageForTabId,
    },
  });
  const sidebarContentProps = useContentCreatorSidebarProps({
    activeNavigatorMode,
    treeProps: {
      nodes: activeTreeData,
      runtimeModelSchemas,
      attachedStatModelIdsByModelId,
      statColorByModelId,
      activeModelInstanceId,
      selectedTreeNodeId,
      isExpanded,
      toggleTreeNode,
      setSelectedTreeNodeId,
      setActiveSelection,
      renderGroupItems: renderGroupContextMenuItems,
      renderStatAttachDetachSubmenus,
      renderStatModifierSubmenu,
      renderStatsModelDeleteItem,
      renderModelDeleteItem,
      suggestDerivedStatId,
      suggestDerivedModelId,
      formatModelIdForUi,
      createSchemaViaTree,
      onCreateCanonicalAsset: promptCreateCanonicalAsset,
    },
    schemaEditorProps: {
      objectSectionTab,
      jsonApplyError,
      jsonSectionOpen,
      jsonSectionEditorMode,
      modelsSchemaDraft,
      statsSchemaDraft,
      canonicalSchemaDraft,
      deferredModelsSchemaJson,
      deferredStatsSchemaJson,
      deferredCanonicalSchemaJson,
      jsonSyntaxMounted,
      onSetJsonSectionOpen: setJsonSectionOpen,
      onSetJsonSectionEditorMode: setJsonSectionEditorMode,
      onSetModelsSchemaDraft: setModelsSchemaDraft,
      onSetStatsSchemaDraft: setStatsSchemaDraft,
      onSetCanonicalSchemaDraft: setCanonicalSchemaDraft,
      onApplyModelsAndStatsSchemaDraft: applyModelsAndStatsSchemaDraft,
      onApplyCanonicalSchemaDraft: applyCanonicalSchemaDraft,
    },
  });

  if (!open) return null;
  return (
    <>
      <ContentCreatorModalShell
        onClose={onClose}
        helpNode={
          <HelpInfo
            tone="context"
            title="Content Creator"
            body="Create and manage model objects and canonical assets. Select nodes in the object tree to inspect metadata, stats, and code representations."
          />
        }
        sidebar={
          <ContentCreatorSidebarPanel
            objectSectionTab={objectSectionTab}
            activeNavigatorMode={activeNavigatorMode}
            selectedLabel={selectedTreeNode ? selectedTreeNode.name : "none"}
            onSetObjectSectionTab={setObjectSectionTab}
            onSetNavigatorMode={setNavigatorMode}
          >
            <ContentCreatorSidebarContent {...sidebarContentProps} />
          </ContentCreatorSidebarPanel>
        }
        infoPanel={
          <ContentCreatorInfoPanelShell
            infoPanelTone={infoPanelTone}
            infoPanelName={infoPanelName}
            infoPanelContent={infoPanelContent}
            codePanelOpen={codePanelOpen}
            sharedCodeBlockPanel={sharedCodeBlockPanel}
            helpNode={
              <HelpInfo
                tone="context"
                title="Info Panel"
                body="Inspect selected object tree nodes, view model metadata, review stats, and browse generated code/schema/data tabs."
              />
            }
          />
        }
      />
      <StatImpactDialog
        pendingStatImpactAction={pendingStatImpactAction}
        pendingStatImpactChoice={pendingStatImpactChoice}
        pendingStatImpactReplacementId={pendingStatImpactReplacementId}
        statModelIds={statModelIds}
        onSetPendingStatImpactChoice={setPendingStatImpactChoice}
        onSetPendingStatImpactReplacementId={setPendingStatImpactReplacementId}
        onClose={closeStatImpactDialog}
        onSubmit={submitPendingStatImpactAction}
      />
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
        {
          featureId: "Empathy",
          spaces: ["dialogue", "archetype"],
          required: true,
        },
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
        {
          featureId: "Construction",
          spaces: ["room", "skill"],
          required: true,
        },
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
        {
          featureId: "Constraint",
          spaces: ["effect", "combat"],
          required: true,
        },
        { featureId: "Survival", spaces: ["effect", "combat"], required: true },
        { featureId: "Momentum", spaces: ["combat", "event"] },
      ],
    },
  },
];

function validatePatchSchema(patch: SpaceVectorsPatchPayload): string[] {
  const errors: string[] = [];
  const featureIds = patch.featureSchema
    .map((row) => row.featureId.trim())
    .filter((id) => id.length > 0);
  const modelIds = patch.modelSchemas
    .map((row) => row.modelId.trim())
    .filter((id) => id.length > 0);
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
        errors.push(
          `Model '${model.modelId}' references unknown featureId '${ref.featureId}'.`
        );
      }
      if (!Array.isArray(ref.spaces) || ref.spaces.length === 0) {
        errors.push(
          `Model '${model.modelId}' has feature '${ref.featureId}' without spaces.`
        );
      }
    }
  }
  return [...new Set(errors)];
}

function makeNumberRecord<const T extends readonly string[]>(
  keys: T,
  value: number
): Record<T[number], number> {
  return Object.fromEntries(keys.map((key) => [key, value])) as Record<
    T[number],
    number
  >;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeModelId(value: string): string {
  return canonicalizeModelIdRaw(value);
}

function downloadJson(filename: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
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

function resolveEffectiveAlgorithm(
  runtimeSpaceView: RuntimeSpaceView,
  selected: DistanceAlgorithm
): "euclidean" | "cosine" {
  if (selected === "game-default") {
    return isContentRuntimeView(runtimeSpaceView) ? "euclidean" : "cosine";
  }
  return selected;
}

const CLUSTER_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#06b6d4",
];
const CONTENT_SPACE_KEYS = [
  "content-combined",
  "content-dialogue",
  "content-skill",
  "content-archetype",
] as const;
type ContentSpaceKey = (typeof CONTENT_SPACE_KEYS)[number];

const DEFAULT_SPACE_FEATURES: Record<ContentSpaceKey, string[]> = {
  "content-combined": [
    ...TRAIT_NAMES,
    ...FEATURE_NAMES,
    ...DEFAULT_STAT_FEATURES.map((row) => row.featureId),
    ...DEFAULT_CURRENCY_STAT_FEATURES.map((row) => row.featureId),
  ],
  "content-dialogue": [
    "Empathy",
    "Comprehension",
    "Constraint",
    "Projection",
    "Fame",
    "Awareness",
    "Guile",
  ],
  "content-skill": [
    "Survival",
    "Direction",
    "Awareness",
    "Fame",
    "Guile",
    "Effort",
    "Momentum",
  ],
  "content-archetype": [
    "Fame",
    "Guile",
    "Awareness",
    "Freedom",
    "Equilibrium",
    "Projection",
  ],
};

const useSpaceExplorerUiStore = create<SpaceExplorerUiState>()(
  devtools(
    persist(
      immer<SpaceExplorerUiState>((set) => ({
        vizMode: "2d",
        colorBy: "branch",
        distanceAlgorithm: "game-default",
        nearestK: 10,
        runtimeSpaceView: "content-combined",
        spaceFeatureMap: DEFAULT_SPACE_FEATURES,
        customFeatureValues: {},
        customFeatureLabels: {},
        movementFeatureIds: [...MOVEMENT_CONTROL_NAMES],
        scopeRootModelId: null,
        hiddenModelIds: [],
        collapsedDepths: [],
        setVizMode: (next) =>
          set((state) => {
            state.vizMode = next;
          }),
        setColorBy: (next) =>
          set((state) => {
            state.colorBy = next;
          }),
        setDistanceAlgorithm: (next) =>
          set((state) => {
            state.distanceAlgorithm = next;
          }),
        setNearestK: (next) =>
          set((state) => {
            state.nearestK = next;
          }),
        setRuntimeSpaceView: (next) =>
          set((state) => {
            state.runtimeSpaceView = next;
          }),
        setSpaceFeatureMap: (next) =>
          set((state) => {
            state.spaceFeatureMap =
              typeof next === "function" ? next(state.spaceFeatureMap) : next;
          }),
        setCustomFeatureValues: (next) =>
          set((state) => {
            state.customFeatureValues =
              typeof next === "function"
                ? next(state.customFeatureValues)
                : next;
          }),
        setCustomFeatureLabels: (next) =>
          set((state) => {
            state.customFeatureLabels =
              typeof next === "function"
                ? next(state.customFeatureLabels)
                : next;
          }),
        setMovementFeatureIds: (next) =>
          set((state) => {
            state.movementFeatureIds =
              typeof next === "function"
                ? next(state.movementFeatureIds)
                : next;
          }),
        setScopeRootModelId: (next) =>
          set((state) => {
            state.scopeRootModelId = next;
          }),
        setHiddenModelIds: (next) =>
          set((state) => {
            state.hiddenModelIds =
              typeof next === "function" ? next(state.hiddenModelIds) : next;
          }),
        setCollapsedDepths: (next) =>
          set((state) => {
            state.collapsedDepths =
              typeof next === "function" ? next(state.collapsedDepths) : next;
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
          scopeRootModelId: state.scopeRootModelId,
          hiddenModelIds: state.hiddenModelIds,
          collapsedDepths: state.collapsedDepths,
        }),
      }
    ),
    { name: "space-explorer-ui-store" }
  )
);

const useContentDeliveryStore = create<ContentDeliveryState>()(
  devtools(
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
      }
    ),
    { name: "space-explorer-delivery-store" }
  )
);

function projectPoint(
  vector: number[],
  mean: number[],
  components: number[][]
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

function modelSurfaceHue(modelRootId: string): number {
  return Math.round(hashToUnit(modelRootId) * 360);
}

function modelSurfaceColor(modelRootId: string, depth: number): string {
  const hue = modelSurfaceHue(modelRootId);
  const saturation = Math.max(40, 86 - depth * 7);
  const lightness = Math.min(72, 45 + depth * 5);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function rotatedHue(index: number): number {
  return Math.round((index * 137.508) % 360);
}

function overlayColorByDepth(
  baseHue: number,
  depthIndex: number,
  alpha = 0.24,
  lightness = 56
): string {
  const hue = (baseHue + depthIndex * 113) % 360;
  const sat = Math.max(70, 88 - depthIndex * 2);
  return `hsla(${hue}, ${sat}%, ${lightness}%, ${alpha})`;
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

function coordsFromUnifiedVector(vector: UnifiedSpaceVector): {
  x: number;
  y: number;
  z: number;
} {
  return {
    x:
      Number(vector.semantics.combatIntensity ?? 0) +
      Number(vector.semantics.risk ?? 0) * 0.5,
    y:
      Number(vector.semantics.socialIntensity ?? 0) +
      Number(vector.semantics.visibility ?? 0) * 0.5,
    z:
      Number(vector.semantics.explorationIntensity ?? 0) +
      Number(vector.semantics.craftingIntensity ?? 0) * 0.4,
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
  if (colorBy === "branch")
    return BRANCH_COLORS[pt.branch] ?? BRANCH_COLORS.default;
  if (colorBy === "cluster")
    return pt.cluster != null
      ? CLUSTER_COLORS[pt.cluster % CLUSTER_COLORS.length]!
      : BRANCH_COLORS.default;
  return TYPE_COLORS[pt.type] ?? TYPE_COLORS.default;
}

function getPointCoords(
  pt: ContentPoint,
  space: SpaceMode
): { x: number; y: number; z: number } {
  if (space === "combined" && pt.xCombined != null) {
    return { x: pt.xCombined, y: pt.yCombined!, z: pt.zCombined! };
  }
  return { x: pt.x, y: pt.y, z: pt.z };
}

function getTypeBadgeMeta(type: string): {
  Icon: ComponentType<{ className?: string }>;
  className: string;
} {
  switch (type) {
    case "action":
      return {
        Icon: SwordsIcon,
        className: "border-amber-400/60 bg-amber-500/20 text-amber-100",
      };
    case "event":
      return {
        Icon: SparklesIcon,
        className: "border-violet-400/60 bg-violet-500/20 text-violet-100",
      };
    case "effect":
      return {
        Icon: CrosshairIcon,
        className: "border-emerald-400/60 bg-emerald-500/20 text-emerald-100",
      };
    case "dialogue":
      return {
        Icon: SparklesIcon,
        className: "border-fuchsia-400/60 bg-fuchsia-500/20 text-fuchsia-100",
      };
    case "skill":
      return {
        Icon: CompassIcon,
        className: "border-cyan-400/60 bg-cyan-500/20 text-cyan-100",
      };
    default:
      return {
        Icon: CompassIcon,
        className: "border-slate-400/60 bg-slate-500/20 text-slate-100",
      };
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
  upToTurn: number
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
  const toneClasses: Record<
    "header" | "content" | "footer" | "context",
    string
  > = {
    header: "border-sky-400/60 bg-sky-500/15 text-sky-100 hover:bg-sky-500/25",
    content:
      "border-violet-400/60 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25",
    footer:
      "border-emerald-400/60 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25",
    context:
      "border-amber-400/60 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25",
  };
  const toneDialogClasses: Record<
    "header" | "content" | "footer" | "context",
    string
  > = {
    header: "border-sky-400/60",
    content: "border-violet-400/60",
    footer: "border-emerald-400/60",
    context: "border-amber-400/60",
  };
  const toneHeaderClasses: Record<
    "header" | "content" | "footer" | "context",
    string
  > = {
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
            <div
              className={`mb-2 flex items-center justify-between gap-3 rounded px-2 py-1 ${toneHeaderClasses[tone]}`}
            >
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
        sessionStorage.setItem(
          "dungeonbreak-browser-report",
          JSON.stringify(payload)
        );
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
  }, [
    onGenerated,
    policyId,
    packIdentity,
    testModeEnabled,
    onRunQuickTestMode,
  ]);
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
            ? quickTestBusy
              ? "Running quick test mode..."
              : "Run test mode build + playthrough"
            : busy
              ? "Generating..."
              : "Generate report in browser"}
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
      {lastPublishedVersion ? (
        <Badge variant="secondary">Published {lastPublishedVersion}</Badge>
      ) : null}
      {lastPulledVersion ? (
        <Badge variant="outline">Pulled {lastPulledVersion}</Badge>
      ) : null}
      {selection?.downloads?.bundle ? (
        <Button
          asChild
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[11px]"
        >
          <a
            href={selection.downloads.bundle}
            target="_blank"
            rel="noreferrer"
            title="Download selected bundle"
          >
            Bundle
          </a>
        </Button>
      ) : null}
      {selection?.downloads?.manifest ? (
        <Button
          asChild
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[11px]"
        >
          <a
            href={selection.downloads.manifest}
            target="_blank"
            rel="noreferrer"
            title="Download selected manifest"
          >
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
    scopeRootModelId,
    setScopeRootModelId,
    hiddenModelIds,
    setHiddenModelIds,
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
      scopeRootModelId: state.scopeRootModelId,
      setScopeRootModelId: state.setScopeRootModelId,
      hiddenModelIds: state.hiddenModelIds,
      setHiddenModelIds: state.setHiddenModelIds,
    }))
  );
  const [data, setData] = useState<SpaceData>(EMPTY_SPACE_DATA);
  const [error, setError] = useState<string | null>(null);
  const [spaceOverrides, setSpaceOverrides] = useState<
    SpaceVectorPackOverrides | undefined
  >();
  const [selectedPoint, setSelectedPoint] = useState<ContentPoint | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [selectedTurn, setSelectedTurn] = useState(0);
  const [vizInfoTabId, setVizInfoTabId] = useState("");
  const [vizInfoEditorCode, setVizInfoEditorCode] = useState("");
  const [vizInfoCopied, setVizInfoCopied] = useState(false);
  const [showLayerOverlays, setShowLayerOverlays] = useState(true);
  const [vizRefreshTick, setVizRefreshTick] = useState(0);
  const [vizRefreshedAt, setVizRefreshedAt] = useState<string | null>(null);
  const [visualizationScope, setVisualizationScope] = useState<
    "asset" | "content-pack"
  >("asset");
  const [packTreeView, setPackTreeView] = useState<"models" | "stats">(
    "models"
  );
  const [enabledStatSpaces, setEnabledStatSpaces] = useState<
    Record<string, boolean>
  >({});
  const [expandedPackTreeModelIds, setExpandedPackTreeModelIds] = useState<
    Record<string, boolean>
  >({});
  const [traits, setTraits] = useState<
    Record<(typeof TRAIT_NAMES)[number], number>
  >(() => makeNumberRecord(TRAIT_NAMES, 0));
  const [features, setFeatures] = useState<
    Record<(typeof FEATURE_NAMES)[number], number>
  >(() => makeNumberRecord(FEATURE_NAMES, 0));
  const [traitDeltas, setTraitDeltas] = useState<
    Record<(typeof TRAIT_NAMES)[number], number>
  >(() => makeNumberRecord(TRAIT_NAMES, 0));
  const [featureDeltas, setFeatureDeltas] = useState<
    Record<(typeof FEATURE_NAMES)[number], number>
  >(() => makeNumberRecord(FEATURE_NAMES, 0));
  const reportPolicyId =
    ACTION_POLICIES.policies.find(
      (row) => row.policyId === "agent-play-default"
    )?.policyId ??
    ACTION_POLICIES.policies[0]?.policyId ??
    "";
  const [modelSchemaModalOpen, setModelSchemaModalOpen] = useState(false);
  const modelInstances = useModelSchemaViewerStore(
    (state) => state.modelInstances
  );
  const ensureKaelBinding = useModelSchemaViewerStore(
    (state) => state.ensureKaelBinding
  );
  const replaceModelInstances = useModelSchemaViewerStore(
    (state) => state.replaceModelInstances
  );
  const activeModelSchemaId = useModelSchemaViewerStore(
    (state) => state.activeModelSchemaId
  );
  const activeModelInstanceId = useModelSchemaViewerStore(
    (state) => state.activeModelInstanceId
  );
  const setActiveModelSelection = useModelSchemaViewerStore(
    (state) => state.setActiveSelection
  );
  const [behaviorWindowSeconds, setBehaviorWindowSeconds] = useState(5);
  const [behaviorStepSeconds, setBehaviorStepSeconds] = useState(1);
  const [newFeatureId, setNewFeatureId] = useState("");
  const [newFeatureGroup, setNewFeatureGroup] = useState("content_features");
  const [newFeatureSpaces, setNewFeatureSpaces] = useState(
    "dialogue,skill,event"
  );
  const [newModelId, setNewModelId] = useState("custom.model");
  const [newModelLabel, setNewModelLabel] = useState("Custom Model");
  const [newModelSpaces, setNewModelSpaces] = useState("dialogue,event,entity");
  const [selectedModelFeatureIds, setSelectedModelFeatureIds] = useState<
    string[]
  >([]);
  const [enabledStatLevelById, setEnabledStatLevelById] = useState<
    Record<string, boolean>
  >({});
  const [baseSpaceVectors, setBaseSpaceVectors] = useState<
    SpaceVectorPackOverrides | undefined
  >();
  const [drafts, setDrafts] = useState<PatchDraft[]>([]);
  const [draftName, setDraftName] = useState("space-vectors-draft");
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    MODEL_PRESETS[0]?.id ?? ""
  );
  const [builderMessage, setBuilderMessage] = useState<string>("");
  const [bundleBusy, setBundleBusy] = useState(false);
  const [quickTestBusy, setQuickTestBusy] = useState(false);
  const [testModeGeneratedAt, setTestModeGeneratedAt] = useState<string | null>(
    null
  );
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [spaceDataLoading, setSpaceDataLoading] = useState(false);
  const [loadedPackIdentity, setLoadedPackIdentity] =
    useState<PackIdentity | null>(null);
  const [loadedReportIdentity, setLoadedReportIdentity] =
    useState<ReportIdentity | null>(null);
  const lastAutoVizPackKeyRef = useRef<string>("");
  const [packOptions, setPackOptions] = useState<PackSelectOption[]>([
    { id: "bundle-default", label: "Content Pack Bundle", kind: "bundle" },
  ]);
  const [selectedPackOptionId, setSelectedPackOptionId] =
    useState("bundle-default");
  const [reportOptions, setReportOptions] = useState<ReportSelectOption[]>([]);
  const [selectedReportOptionId, setSelectedReportOptionId] = useState("");
  const testModeAllowed = process.env.NODE_ENV === "development";
  const storedTestModeEnabled = useDevToolsStore(
    (state) => state.testModeEnabled
  );
  const testModeBundleSource = useDevToolsStore(
    (state) => state.testModeBundleSource
  );
  const showUiIds = useDevToolsStore((state) => state.showUiIds);
  const setTestModeEnabled = useDevToolsStore(
    (state) => state.setTestModeEnabled
  );
  const testModeEnabled = testModeAllowed && storedTestModeEnabled;
  const persistActivePackSnapshot = useCallback(
    (identity: PackIdentity, bundle?: Record<string, unknown>) => {
      const nextIdentity: ActiveContentPackIdentity = {
        source: identity.source,
        packId: identity.packId,
        packVersion: identity.packVersion,
        packHash: identity.packHash,
        schemaVersion: identity.schemaVersion,
        engineVersion: identity.engineVersion,
        reportId: identity.reportId,
      };
      writeActiveContentPackSnapshot({
        updatedAt: new Date().toISOString(),
        identity: nextIdentity,
        bundle,
      });
    },
    []
  );
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
    }))
  );
  const packUploadInputRef = useRef<HTMLInputElement | null>(null);
  const markerColorBy: ColorBy = "branch";

  useEffect(() => {
    if (!loadedPackIdentity) {
      return;
    }
    const packKey = [
      loadedPackIdentity.source,
      loadedPackIdentity.packId,
      loadedPackIdentity.packVersion,
      loadedPackIdentity.reportId ?? "",
    ].join("|");
    if (lastAutoVizPackKeyRef.current === packKey) {
      return;
    }
    lastAutoVizPackKeyRef.current = packKey;
    setVizMode("2d");
    setVisualizationScope("content-pack");
  }, [loadedPackIdentity, setVizMode, setVisualizationScope]);

  useEffect(() => {
    setData(EMPTY_SPACE_DATA);
    setSelectedPoint(null);
  }, []);

  const loadBundlePack = useCallback(() => {
    fetch("/game/content-pack.bundle.v1.json")
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error("bundle not found"))
      )
      .then((bundle) => {
        const overrides = (bundle?.packs?.spaceVectors ?? undefined) as
          | SpaceVectorPackOverrides
          | undefined;
        if (overrides && typeof overrides === "object") {
          setSpaceOverrides(overrides);
          setBaseSpaceVectors(overrides);
          const instances = parseModelInstancesFromContentBindings(overrides);
          if (instances.length > 0) {
            replaceModelInstances(instances);
          }
        }
        const identity: PackIdentity = {
          source: "bundle:/game/content-pack.bundle.v1.json",
          packId: String(bundle?.patchName ?? "content-pack.bundle.v1"),
          packVersion: String(bundle?.generatedAt ?? "unknown"),
          packHash: String(bundle?.hashes?.overall ?? "unknown"),
          schemaVersion: String(
            bundle?.schemaVersion ?? "content-pack.bundle.v1"
          ),
          engineVersion: String(bundle?.enginePackage?.version ?? "unknown"),
        };
        setLoadedPackIdentity(identity);
        persistActivePackSnapshot(identity, bundle as Record<string, unknown>);
        setPackOptions((prev) =>
          prev.map((row) =>
            row.id === "bundle-default"
              ? {
                  ...row,
                  label: String(bundle?.patchName ?? "content-pack.bundle.v1"),
                  timestamp: String(bundle?.generatedAt ?? "unknown"),
                }
              : row
          )
        );
      })
      .catch(() => {
        // optional
      });
  }, [persistActivePackSnapshot, replaceModelInstances]);

  const loadDefaultTestModeBundle = useCallback(() => {
    fetch("/api/content-packs/test-mode-default")
      .then((r) =>
        r.ok
          ? r.json()
          : Promise.reject(new Error("default test-mode bundle not found"))
      )
      .then((body) => {
        const bundle = body?.bundle as BuiltBundlePayload | undefined;
        if (!bundle) return;
        const overrides = (bundle?.packs?.spaceVectors ?? undefined) as
          | SpaceVectorPackOverrides
          | undefined;
        if (overrides && typeof overrides === "object") {
          setSpaceOverrides(overrides);
          setBaseSpaceVectors(overrides);
          const instances = parseModelInstancesFromContentBindings(overrides);
          replaceModelInstances(instances);
        }
        const identity: PackIdentity = {
          source: "test-mode-default:encrypted",
          packId: String(
            bundle.patchName ?? "test-mode.default.content-pack.bundle.v1"
          ),
          packVersion: String(bundle.generatedAt ?? "unknown"),
          packHash: String(bundle.hashes?.overall ?? "unknown"),
          schemaVersion: String(
            bundle.schemaVersion ?? "content-pack.bundle.v1"
          ),
          engineVersion: String(bundle.enginePackage?.version ?? "unknown"),
        };
        setLoadedPackIdentity(identity);
        persistActivePackSnapshot(identity, bundle as Record<string, unknown>);
        setPackOptions((prev) =>
          prev.map((row) =>
            row.id === "bundle-default"
              ? {
                  ...row,
                  label: String(bundle?.patchName ?? "Test Mode Default"),
                  timestamp: String(bundle?.generatedAt ?? "unknown"),
                }
              : row
          )
        );
        setSelectedPackOptionId("bundle-default");
      })
      .catch((error) => {
        setBuilderMessage(
          error instanceof Error ? error.message : String(error)
        );
      });
  }, [persistActivePackSnapshot, replaceModelInstances]);

  const loadEmptyTestModeBundle = useCallback(() => {
    setSpaceOverrides(undefined);
    setBaseSpaceVectors(undefined);
    replaceModelInstances([]);
    const identity: PackIdentity = {
      source: "test-mode-empty",
      packId: "test-mode.empty.content-pack.bundle.v1",
      packVersion: new Date().toISOString(),
      packHash: "empty",
      schemaVersion: "content-pack.bundle.v1",
      engineVersion: "dev",
    };
    setLoadedPackIdentity(identity);
    persistActivePackSnapshot(identity, {
      schemaVersion: "content-pack.bundle.v1",
      patchName: identity.packId,
      generatedAt: identity.packVersion,
      hashes: { overall: identity.packHash },
      enginePackage: { version: identity.engineVersion },
      packs: {},
    });
    setSelectedPackOptionId("bundle-default");
    setBuilderMessage("Test mode empty bundle active: runtime defaults only.");
  }, [persistActivePackSnapshot, replaceModelInstances]);

  const loadContentPackReport = useCallback(
    (reportId: string) => {
      fetch(
        `/api/content-packs/reports?reportId=${encodeURIComponent(reportId)}`
      )
        .then((r) =>
          r.ok
            ? r.json()
            : Promise.reject(new Error("content-pack report not found"))
        )
        .then((body) => {
          const overrides = body?.report?.bundle?.spaceVectors as
            | SpaceVectorPackOverrides
            | undefined;
          if (!overrides || typeof overrides !== "object") {
            setBuilderMessage(
              `Report '${reportId}' does not include space vectors.`
            );
            return;
          }
          setSpaceOverrides(overrides);
          const instances = parseModelInstancesFromContentBindings(overrides);
          if (instances.length > 0) {
            replaceModelInstances(instances);
          }
          const identity: PackIdentity = {
            source: `content-pack-report:${String(body?.report?.sourceName ?? reportId)}`,
            reportId,
            packId: String(
              body?.report?.bundle?.patchName ??
                body?.report?.sourceName ??
                "content-pack.report"
            ),
            packVersion: String(
              body?.report?.bundle?.generatedAt ??
                body?.report?.generatedAt ??
                "unknown"
            ),
            packHash: String(
              body?.report?.bundle?.hashes?.overall ?? "unknown"
            ),
            schemaVersion: String(
              body?.report?.bundle?.schemaVersion ?? "content-pack.bundle.v1"
            ),
            engineVersion: String(
              body?.report?.bundle?.enginePackage?.version ?? "unknown"
            ),
          };
          setLoadedPackIdentity(identity);
          persistActivePackSnapshot(
            identity,
            (body?.report?.bundle as Record<string, unknown> | undefined) ??
              undefined
          );
          setBuilderMessage(
            `Loaded content-pack report '${reportId}' into Space Explorer.`
          );
        })
        .catch(() => {
          try {
            const raw = sessionStorage.getItem(
              `dungeonbreak-content-pack-report-${reportId}`
            );
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
              setBuilderMessage(
                `Report '${reportId}' does not include space vectors.`
              );
              return;
            }
            setSpaceOverrides(overrides);
            const instances = parseModelInstancesFromContentBindings(overrides);
            if (instances.length > 0) {
              replaceModelInstances(instances);
            }
            const identity: PackIdentity = {
              source: `content-pack-report:session:${String(localReport?.sourceName ?? reportId)}`,
              reportId,
              packId: String(
                localReport?.bundle?.patchName ??
                  localReport?.sourceName ??
                  "content-pack.report"
              ),
              packVersion: String(
                localReport?.bundle?.generatedAt ??
                  localReport?.generatedAt ??
                  "unknown"
              ),
              packHash: String(
                localReport?.bundle?.hashes?.overall ?? "unknown"
              ),
              schemaVersion: String(
                localReport?.bundle?.schemaVersion ?? "content-pack.bundle.v1"
              ),
              engineVersion: String(
                localReport?.bundle?.enginePackage?.version ?? "unknown"
              ),
            };
            setLoadedPackIdentity(identity);
            persistActivePackSnapshot(
              identity,
              (localReport?.bundle as Record<string, unknown> | undefined) ??
                undefined
            );
            setBuilderMessage(
              `Loaded local content-pack report '${reportId}' into Space Explorer.`
            );
          } catch (e) {
            setBuilderMessage(e instanceof Error ? e.message : String(e));
          }
        });
    },
    [persistActivePackSnapshot, replaceModelInstances]
  );

  const refreshPackOptions = useCallback(async () => {
    const next: PackSelectOption[] = [
      {
        id: "bundle-default",
        label: "Content Pack Bundle",
        kind: "bundle",
        timestamp: loadedPackIdentity?.packVersion,
      },
    ];
    try {
      const response = await fetch("/api/content-packs/reports");
      if (response.ok) {
        const body = (await response.json()) as {
          ok?: boolean;
          entries?: Array<{
            reportId: string;
            sourceName?: string;
            generatedAt?: string;
          }>;
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
        if (!key || !key.startsWith("dungeonbreak-content-pack-report-"))
          continue;
        const reportId = key.replace("dungeonbreak-content-pack-report-", "");
        if (next.some((row) => row.reportId === reportId)) continue;
        const raw = sessionStorage.getItem(key);
        if (!raw) continue;
        const localReport = JSON.parse(raw) as {
          sourceName?: string;
          generatedAt?: string;
          bundle?: { generatedAt?: string };
        };
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
        const body = (await response.json()) as {
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
        const local = JSON.parse(raw) as {
          report?: { reportId?: string; seed?: number; generatedAt?: string };
        };
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

  const handlePackUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
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
        const overrides =
          parsed?.packs?.spaceVectors ?? parsed?.bundle?.spaceVectors;
        if (!overrides || typeof overrides !== "object") {
          setBuilderMessage(
            `Uploaded file '${file.name}' has no space vector payload.`
          );
          return;
        }
        const identity: PackIdentity = {
          source: `upload:${file.name}`,
          packId: String(
            parsed.patchName ?? parsed.bundle?.patchName ?? file.name
          ),
          packVersion: String(
            parsed.generatedAt ??
              parsed.bundle?.generatedAt ??
              new Date().toISOString()
          ),
          packHash: String(
            parsed.hashes?.overall ??
              parsed.bundle?.hashes?.overall ??
              "uploaded"
          ),
          schemaVersion: String(
            parsed.schemaVersion ??
              parsed.bundle?.schemaVersion ??
              "content-pack.bundle.v1"
          ),
          engineVersion: String(
            parsed.enginePackage?.version ??
              parsed.bundle?.enginePackage?.version ??
              "unknown"
          ),
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
        const bundlePayload =
          parsed &&
          typeof parsed === "object" &&
          parsed.bundle &&
          typeof parsed.bundle === "object"
            ? (parsed.bundle as Record<string, unknown>)
            : (parsed as Record<string, unknown>);
        persistActivePackSnapshot(identity, bundlePayload);
        setBuilderMessage(`Loaded uploaded content pack '${file.name}'.`);
      } catch (e) {
        setBuilderMessage(e instanceof Error ? e.message : String(e));
      } finally {
        if (event.target) event.target.value = "";
      }
    },
    [persistActivePackSnapshot, replaceModelInstances]
  );

  useEffect(() => {
    if (testModeEnabled) {
      if (testModeBundleSource === "default") {
        loadDefaultTestModeBundle();
      } else {
        loadEmptyTestModeBundle();
      }
      return;
    }
    loadBundlePack();
  }, [
    testModeEnabled,
    testModeBundleSource,
    loadBundlePack,
    loadDefaultTestModeBundle,
    loadEmptyTestModeBundle,
  ]);

  useEffect(() => {
    void refreshPackOptions();
    void refreshReportOptions();
  }, [refreshPackOptions, refreshReportOptions]);

  useEffect(() => {
    const reportId = new URLSearchParams(window.location.search).get(
      "contentPackReportId"
    );
    if (!reportId) return;
    loadContentPackReport(reportId);
    const optionId = `content-pack-report:${reportId}`;
    setPackOptions((prev) =>
      prev.some((row) => row.id === optionId)
        ? prev
        : [
            ...prev,
            {
              id: optionId,
              label: reportId,
              kind: "content-pack-report",
              reportId,
            },
          ]
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

  const applyLoadedReport = useCallback(
    (
      r: {
        seed: number;
        run: { actionTrace: unknown[] };
        packBinding?: Record<string, unknown>;
      },
      source: string
    ) => {
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
          packVersion: packBinding
            ? String(packBinding.packVersion ?? "")
            : undefined,
          packHash: packBinding
            ? String(packBinding.packHash ?? "")
            : undefined,
          schemaVersion: packBinding
            ? String(packBinding.schemaVersion ?? "")
            : undefined,
          engineVersion: packBinding
            ? String(packBinding.engineVersion ?? "")
            : undefined,
        });
      }
    },
    []
  );

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
    const selected = reportOptions.find(
      (row) => row.id === selectedReportOptionId
    );
    if (!selected) return;
    if (selected.kind === "api") {
      loadReportFromApi();
      return;
    }
    loadReportFromSession();
  }, [
    selectedReportOptionId,
    reportOptions,
    loadReportFromApi,
    loadReportFromSession,
  ]);

  const playerStateAtTurn = useMemo(() => {
    if (!report || selectedTurn < 0) return null;
    return getPlayerStateAtTurn(
      report.seed,
      report.run.actionTrace,
      selectedTurn
    );
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
      TRAIT_NAMES.map(
        (t) => Number(traits[t] ?? 0) + Number(traitDeltas[t] ?? 0)
      ).map((v) => Math.max(-1, Math.min(1, v))),
    [traits, traitDeltas]
  );
  const featureVector = useMemo(
    () =>
      FEATURE_NAMES.map(
        (f) => Number(features[f] ?? 0) + Number(featureDeltas[f] ?? 0)
      ),
    [features, featureDeltas]
  );
  const navigationFeatureVector = useMemo(
    () =>
      NAVIGATION_FEATURE_NAMES.map(
        (f) => Number(features[f] ?? 0) + Number(featureDeltas[f] ?? 0)
      ),
    [features, featureDeltas]
  );
  const movementControlVector = useMemo(
    () =>
      MOVEMENT_CONTROL_NAMES.map((f) =>
        Math.max(0, Number(features[f] ?? 0) + Number(featureDeltas[f] ?? 0))
      ),
    [features, featureDeltas]
  );
  const debouncedTraitVector = useDebouncedValue(traitVector, 120);
  const debouncedFeatureVector = useDebouncedValue(
    navigationFeatureVector,
    120
  );
  const combinedVector = useMemo(
    () => [...debouncedTraitVector, ...debouncedFeatureVector],
    [debouncedTraitVector, debouncedFeatureVector]
  );
  const movementBudget = useMemo(() => {
    const effort = movementControlVector[0] ?? 0;
    const momentum = movementControlVector[1] ?? 0;
    return (effort + momentum) / 2;
  }, [movementControlVector]);

  const unifiedModel = useMemo(() => {
    const runtime = EngineRuntime as unknown as {
      buildUnifiedSpaceModel?: (
        overrides?: SpaceVectorPackOverrides
      ) => RuntimeUnifiedModel;
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
      getFeatureSchema?: (
        overrides?: SpaceVectorPackOverrides
      ) => RuntimeFeatureSchemaRow[];
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
      getModelSchemas?: (
        overrides?: SpaceVectorPackOverrides
      ) => RuntimeModelSchemaRow[];
    };
    const baseRows =
      typeof runtime.getModelSchemas === "function"
        ? runtime.getModelSchemas(spaceOverrides)
        : [];
    const migratedRows = migrateModelSchemasAwayFromBase(baseRows);
    return ensureCombatStatsModelSchemas(migratedRows, runtimeFeatureSchema);
  }, [spaceOverrides, runtimeFeatureSchema]);
  const featureDefaultsById = useMemo(
    () =>
      new Map(
        runtimeFeatureSchema.map(
          (row) => [row.featureId, row.defaultValue ?? 0] as const
        )
      ),
    [runtimeFeatureSchema]
  );

  const knownSpaceIds = useMemo(
    () =>
      [...new Set(runtimeFeatureSchema.flatMap((row) => row.spaces))]
        .filter((space) => !!space)
        .sort((a, b) => a.localeCompare(b)),
    [runtimeFeatureSchema]
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
    () => [
      ...new Set(
        modelInstances.filter((row) => row.canonical).map((row) => row.modelId)
      ),
    ],
    [modelInstances]
  );
  const selectableModelSchemas = useMemo(() => {
    const canonicalRows = canonicalModelIds
      .map((modelId) =>
        runtimeModelSchemas.find((row) => row.modelId === modelId)
      )
      .filter((row): row is RuntimeModelSchemaRow => !!row);
    return canonicalRows.length > 0 ? canonicalRows : runtimeModelSchemas;
  }, [canonicalModelIds, runtimeModelSchemas]);

  const selectedModelForSpaceView = useMemo(() => {
    if (!activeModelSchemaId || activeModelSchemaId === NO_MODEL_SELECTED)
      return null;
    return (
      selectableModelSchemas.find(
        (row) => row.modelId === activeModelSchemaId
      ) ?? null
    );
  }, [selectableModelSchemas, activeModelSchemaId]);
  const selectedModelForSpaceViewId = selectedModelForSpaceView?.modelId ?? "";
  const modelOptions = useMemo(
    () =>
      [...selectableModelSchemas].sort((a, b) =>
        a.modelId.localeCompare(b.modelId)
      ),
    [selectableModelSchemas]
  );
  const canonicalAssetOptions = useMemo(
    () =>
      modelInstances
        .filter((row) => row.canonical)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [modelInstances]
  );
  const visualizationModelSchemas = useMemo(() => {
    const idSet = new Set(runtimeModelSchemas.map((row) => row.modelId));
    return runtimeModelSchemas.map((row) => {
      if (row.extendsModelId && idSet.has(row.extendsModelId)) {
        return row;
      }
      const dotIndex = row.modelId.lastIndexOf(".");
      if (dotIndex > 0) {
        const namespaceParent = row.modelId.slice(0, dotIndex);
        if (idSet.has(namespaceParent)) {
          return {
            ...row,
            extendsModelId: namespaceParent,
          };
        }
      }
      return row;
    });
  }, [runtimeModelSchemas]);
  const modelGraph = useMemo<ContentDimensionModelGraph>(
    () => buildModelGraph(visualizationModelSchemas),
    [visualizationModelSchemas]
  );
  const modelSchemaById = useMemo(
    () => new Map(visualizationModelSchemas.map((row) => [row.modelId, row] as const)),
    [visualizationModelSchemas]
  );
  const modelHueById = useMemo(() => {
    const map = new Map<string, number>();
    visualizationModelSchemas.forEach((row, index) => {
      map.set(row.modelId, rotatedHue(index));
    });
    return map;
  }, [visualizationModelSchemas]);
  const effectiveScopeRootModelId = scopeRootModelId;
  const canonicalAssetsByModelId = useMemo(() => {
    const map = new Map<string, ModelInstanceBinding[]>();
    for (const asset of canonicalAssetOptions) {
      const bucket = map.get(asset.modelId) ?? [];
      bucket.push(asset);
      map.set(asset.modelId, bucket);
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => a.name.localeCompare(b.name));
    }
    return map;
  }, [canonicalAssetOptions]);
  const packTreeRoots = useMemo<PackScopeTreeNode[]>(() => {
    const modelOrder = runtimeModelSchemas.map((row) => row.modelId);
    const roots = modelOrder.filter((modelId) => {
      const parentId = modelGraph.parentById.get(modelId) ?? null;
      return !parentId || !modelGraph.modelById.has(parentId);
    });
    const rootIds = roots.length > 0 ? roots : modelOrder;
    const visited = new Set<string>();
    const buildNode = (
      modelId: string,
      depth: number,
      parentModelId: string | null
    ): PackScopeTreeNode => {
      visited.add(modelId);
      const childIds = [...(modelGraph.childrenById.get(modelId) ?? [])].sort(
        (a, b) => a.localeCompare(b)
      );
      const shortLabel =
        parentModelId && modelId.startsWith(`${parentModelId}.`)
          ? modelId.slice(parentModelId.length + 1)
          : modelId;
      return {
        id: `model:${modelId}`,
        modelId,
        label: formatModelIdForUi(shortLabel),
        depth,
        children: childIds
          .filter((childId) => !visited.has(childId))
          .map((childId) => buildNode(childId, depth + 1, modelId)),
        canonicalAssets: canonicalAssetsByModelId.get(modelId) ?? [],
      };
    };
    return rootIds.map((rootId) => buildNode(rootId, 1, null));
  }, [runtimeModelSchemas, modelGraph, canonicalAssetsByModelId]);
  useEffect(() => {
    if (packTreeRoots.length === 0) {
      return;
    }
    setExpandedPackTreeModelIds((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const root of packTreeRoots) {
        if (!next[root.modelId]) {
          next[root.modelId] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [packTreeRoots]);
  const togglePackTreeModel = useCallback((modelId: string) => {
    setExpandedPackTreeModelIds((prev) => ({
      ...prev,
      [modelId]: !prev[modelId],
    }));
  }, []);
  const statSpaceIdsByModelId = useMemo(() => {
    const map = new Map<string, string[]>();
    const modelIds = visualizationModelSchemas.map((row) => row.modelId);
    for (const modelId of modelIds) {
      const statIds = new Set<string>();
      const visited = new Set<string>();
      let cursor: string | null = modelId;
      while (cursor && !visited.has(cursor)) {
        visited.add(cursor);
        const row = modelSchemaById.get(cursor);
        if (!row) break;
        if (row.modelId.endsWith("stats")) {
          statIds.add(row.modelId);
        }
        for (const attachedId of row.attachedStatModelIds ?? []) {
          if (attachedId.endsWith("stats")) statIds.add(attachedId);
        }
        const nextParentId: string | null =
          modelGraph.parentById.get(cursor) ?? null;
        cursor = nextParentId;
      }
      map.set(modelId, [...statIds]);
    }
    return map;
  }, [visualizationModelSchemas, modelSchemaById, modelGraph.parentById]);
  const selectedAssetStatSpaceIds = useMemo(() => {
    const selectedAsset =
      canonicalAssetOptions.find((row) => row.id === activeModelInstanceId) ??
      null;
    if (!selectedAsset) return [] as string[];
    return statSpaceIdsByModelId.get(selectedAsset.modelId) ?? [];
  }, [canonicalAssetOptions, activeModelInstanceId, statSpaceIdsByModelId]);
  const selectedScopeStatSpaceIds = useMemo(() => {
    if (!effectiveScopeRootModelId) return [] as string[];
    if (effectiveScopeRootModelId.endsWith("stats")) {
      return [effectiveScopeRootModelId];
    }
    return [] as string[];
  }, [effectiveScopeRootModelId]);
  const effectiveStatSpaceIds = useMemo(
    () =>
      selectedAssetStatSpaceIds.length > 0
        ? selectedAssetStatSpaceIds
        : selectedScopeStatSpaceIds,
    [selectedAssetStatSpaceIds, selectedScopeStatSpaceIds]
  );
  useEffect(() => {
    if (effectiveStatSpaceIds.length === 0) {
      return;
    }
    setEnabledStatSpaces((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const id of effectiveStatSpaceIds) {
        if (next[id] === undefined) {
          next[id] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [effectiveStatSpaceIds]);
  const activeSelectedAssetStatSpaceIds = useMemo(
    () =>
      effectiveStatSpaceIds.filter((id) => enabledStatSpaces[id] !== false),
    [effectiveStatSpaceIds, enabledStatSpaces]
  );
  const dimensionNodes = useMemo<ContentDimensionNode[]>(
    () => {
      const baseNodes = buildScopedContentDimensions(
        visualizationModelSchemas,
        canonicalAssetOptions,
        {
          scopeRootModelId: effectiveScopeRootModelId,
          hiddenModelIds,
        }
      );
      if (activeSelectedAssetStatSpaceIds.length === 0) {
        return baseNodes;
      }
      const allowed = new Set(activeSelectedAssetStatSpaceIds);
      return baseNodes.filter((node) => {
        const statSpaces = statSpaceIdsByModelId.get(node.modelId) ?? [];
        if (statSpaces.length === 0) return false;
        return statSpaces.some((id) => allowed.has(id));
      });
    },
    [
      visualizationModelSchemas,
      canonicalAssetOptions,
      effectiveScopeRootModelId,
      hiddenModelIds,
      activeSelectedAssetStatSpaceIds,
      statSpaceIdsByModelId,
    ]
  );
  const scopedSchemaNodes = useMemo(
    () => dimensionNodes.filter((row) => row.layerId === "schema-model"),
    [dimensionNodes]
  );
  const scopedCanonicalNodes = useMemo(
    () => dimensionNodes.filter((row) => row.layerId === "canonical-asset"),
    [dimensionNodes]
  );
  const statSpaceOverlays = useMemo<StatSpaceOverlay[]>(() => {
    if (activeSelectedAssetStatSpaceIds.length === 0) return [];
    const overlays: StatSpaceOverlay[] = [];
    for (const statSpaceId of activeSelectedAssetStatSpaceIds) {
      const nodes = scopedSchemaNodes.filter((node) => {
        const spaces = statSpaceIdsByModelId.get(node.modelId) ?? [];
        return spaces.includes(statSpaceId);
      });
      if (nodes.length === 0) continue;
      const minX = Math.min(...nodes.map((n) => n.modelIndex));
      const maxX = Math.max(...nodes.map((n) => n.modelIndex));
      const maxY = Math.max(...nodes.map((n) => n.surface.height));
      const hue = modelHueById.get(statSpaceId) ?? modelSurfaceHue(statSpaceId);
      overlays.push({
        id: statSpaceId,
        xCenter: (minX + maxX) / 2,
        width: Math.max(0.9, maxX - minX + 0.9),
        height: Math.max(1, maxY),
        color: overlayColorByDepth(hue, 0, 0.22, 52),
      });
    }
    return overlays;
  }, [
    activeSelectedAssetStatSpaceIds,
    scopedSchemaNodes,
    statSpaceIdsByModelId,
    modelHueById,
  ]);
  const layerSpaceOverlays = useMemo<LayerSpaceOverlay[]>(() => {
    if (activeSelectedAssetStatSpaceIds.length === 0) return [];
    const overlays: LayerSpaceOverlay[] = [];
    const layers: Array<{
      id: ContentDimensionLayerId;
      zMin: number;
      zMax: number;
      lightness: number;
    }> = [
      { id: "schema-model", zMin: 0.82, zMax: 1.18, lightness: 56 },
      { id: "canonical-asset", zMin: 1.82, zMax: 2.18, lightness: 68 },
    ];
    for (const statSpaceId of activeSelectedAssetStatSpaceIds) {
      const baseHue = modelHueById.get(statSpaceId) ?? modelSurfaceHue(statSpaceId);
      for (const [layerIndex, layer] of layers.entries()) {
        const nodes = dimensionNodes.filter((node) => {
          if (node.layerId !== layer.id) return false;
          const spaces = statSpaceIdsByModelId.get(node.modelId) ?? [];
          return spaces.includes(statSpaceId);
        });
        if (nodes.length === 0) continue;
        const minX = Math.min(...nodes.map((n) => n.modelIndex));
        const maxX = Math.max(...nodes.map((n) => n.modelIndex));
        const minY = Math.min(...nodes.map((n) => n.coords.y));
        const maxY = Math.max(...nodes.map((n) => n.coords.y));
        overlays.push({
          id: `${statSpaceId}:${layer.id}`,
          xCenter: (minX + maxX) / 2,
          width: Math.max(0.7, maxX - minX + 0.7),
          yMin: Math.max(0, minY - 0.18),
          yMax: Math.max(minY + 0.1, maxY + 0.18),
          zMin: layer.zMin,
          zMax: layer.zMax,
          color: overlayColorByDepth(
            baseHue,
            layerIndex + 1,
            0.24,
            layer.lightness
          ),
        });
      }
    }
    return overlays;
  }, [
    activeSelectedAssetStatSpaceIds,
    dimensionNodes,
    statSpaceIdsByModelId,
    modelHueById,
  ]);
  const scopePathCrumbs = useMemo(() => {
    const crumbs: Array<{ label: string; modelId: string | null }> = [
      { label: "Pack Root", modelId: null },
    ];
    if (!effectiveScopeRootModelId) {
      return crumbs;
    }
    const pathModelIds: string[] = [];
    const visited = new Set<string>();
    let cursor: string | null = effectiveScopeRootModelId;
    while (cursor && !visited.has(cursor)) {
      visited.add(cursor);
      pathModelIds.unshift(cursor);
      cursor = modelGraph.parentById.get(cursor) ?? null;
    }
    for (const modelId of pathModelIds) {
      crumbs.push({ label: formatModelIdForUi(modelId), modelId });
    }
    return crumbs;
  }, [effectiveScopeRootModelId, modelGraph.parentById]);
  const resolveAssetScopeRootModelId = useCallback(
    (modelId: string) => modelGraph.parentById.get(modelId) ?? modelId,
    [modelGraph.parentById]
  );
  const selectCanonicalAssetInPackScope = useCallback(
    (asset: ModelInstanceBinding) => {
      const nextScopeRoot = resolveAssetScopeRootModelId(asset.modelId);
      setScopeRootModelId(nextScopeRoot);
      // Force a state transition so re-selecting the same asset remains reliable.
      setActiveModelSelection(asset.modelId, null);
      requestAnimationFrame(() => {
        setActiveModelSelection(asset.modelId, asset.id);
      });
    },
    [resolveAssetScopeRootModelId, setScopeRootModelId, setActiveModelSelection]
  );
  const selectedScopeTreeNodeId = effectiveScopeRootModelId
    ? `model:${effectiveScopeRootModelId}`
    : "pack-root";
  const groupedPackTreeRoots = useMemo(
    () => ({
      stats: packTreeRoots.filter((node) => node.modelId.endsWith("stats")),
      models: packTreeRoots.filter((node) => !node.modelId.endsWith("stats")),
    }),
    [packTreeRoots]
  );
  const statsRootHueByModelId = useMemo(() => {
    // Intentionally high-contrast order so adjacent groups are visually distinct.
    const palette = [196, 312, 146, 252, 334, 176, 286];
    const map = new Map<string, number>();
    groupedPackTreeRoots.stats.forEach((node, index) => {
      map.set(node.modelId, palette[index % palette.length] ?? 214);
    });
    return map;
  }, [groupedPackTreeRoots.stats]);
  const modelSectionRootById = useMemo(() => {
    const map = new Map<string, string>();
    const modelIds = runtimeModelSchemas.map((row) => row.modelId);
    for (const modelId of modelIds) {
      const visited = new Set<string>();
      let cursor: string | null = modelId;
      let root = modelId;
      while (cursor && !visited.has(cursor)) {
        visited.add(cursor);
        root = cursor;
        cursor = modelGraph.parentById.get(cursor) ?? null;
      }
      map.set(modelId, root);
    }
    return map;
  }, [runtimeModelSchemas, modelGraph.parentById]);
  const renderPackScopeTree = useCallback(
    (nodes: PackScopeTreeNode[], tone: "stats" | "models"): ReactNode =>
      nodes.map((node) => {
        const expanded =
          expandedPackTreeModelIds[node.modelId] ?? node.depth <= 2;
        const selected = selectedScopeTreeNodeId === node.id;
        const hasChildren = node.children.length > 0;
        const hasAssets = node.canonicalAssets.length > 0;
        const hidden = hiddenModelIds.includes(node.modelId);
        const sectionRootModelId =
          modelSectionRootById.get(node.modelId) ?? node.modelId;
        const parentHue =
          tone === "stats"
            ? (statsRootHueByModelId.get(sectionRootModelId) ??
              (190 + Math.round(hashToUnit(sectionRootModelId) * 130)))
            : (modelHueById.get(sectionRootModelId) ??
              modelSurfaceHue(sectionRootModelId));
        const nodeHue = modelHueById.get(node.modelId) ?? modelSurfaceHue(node.modelId);
        const rowBorder = `hsla(${parentHue}, 85%, 62%, ${selected ? 0.58 : 0.34})`;
        const rowBg = `hsla(${parentHue}, 85%, 45%, ${selected ? 0.26 : Math.min(0.2, 0.08 + node.depth * 0.03)})`;
        const textColor = `hsl(${parentHue}, 92%, 85%)`;
        const nodeChipColor = `hsl(${nodeHue}, 84%, 58%)`;
        return (
          <div key={node.id} className="space-y-1">
            <div
              className="flex items-center gap-1 rounded border px-1.5 py-1 text-[11px]"
              style={{
                marginLeft: `${(node.depth - 1) * 10}px`,
                borderColor: rowBorder,
                backgroundColor: rowBg,
              }}
            >
              {(hasChildren || hasAssets) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="size-4 text-muted-foreground"
                  onClick={() => togglePackTreeModel(node.modelId)}
                  aria-label={`Toggle ${node.modelId}`}
                >
                  {expanded ? (
                    <ChevronDownIcon className="size-3" />
                  ) : (
                    <ChevronRightIcon className="size-3" />
                  )}
                </Button>
              )}
              <button
                type="button"
                className={`min-w-0 flex-1 truncate text-left ${hidden ? "text-muted-foreground line-through" : ""}`}
                style={hidden ? undefined : { color: textColor }}
                onClick={() => {
                  setScopeRootModelId(node.modelId);
                  setActiveModelSelection(node.modelId, null);
                }}
                title={`Scope to ${node.modelId} and descendants`}
              >
                <span className="inline-flex items-center gap-1">
                  <span
                    className="inline-block size-1.5 rounded-full"
                    style={{ backgroundColor: nodeChipColor }}
                    aria-hidden="true"
                  />
                  <span className="truncate">{node.label}</span>
                </span>
              </button>
              <Switch
                checked={!hidden}
                onCheckedChange={(checked) => {
                  setHiddenModelIds((prev) => {
                    if (checked) return prev.filter((id) => id !== node.modelId);
                    if (prev.includes(node.modelId)) return prev;
                    return [...prev, node.modelId];
                  });
                }}
                size="sm"
                aria-label={`Toggle model visibility ${node.modelId}`}
              />
            </div>
            {expanded && hasAssets
              ? node.canonicalAssets.map((asset) => (
                  (() => {
                    const assetHue = Math.round(hashToUnit(asset.id) * 360);
                    const isSelectedAsset = activeModelInstanceId === asset.id;
                    const parentHue = modelSurfaceHue(sectionRootModelId);
                    return (
                      <div
                        key={`scope-asset-${asset.id}`}
                        className="rounded border px-2 py-1 text-[11px]"
                        style={{
                          marginLeft: `${(node.depth - 1) * 10 + 26}px`,
                          borderColor: `hsla(${assetHue}, 85%, 60%, ${isSelectedAsset ? 0.72 : 0.4})`,
                          backgroundColor: `hsla(${parentHue}, 75%, 30%, ${isSelectedAsset ? 0.28 : 0.16})`,
                          color: `hsl(${assetHue}, 94%, 86%)`,
                        }}
                      >
                    <button
                      type="button"
                      className="inline-flex w-full items-center gap-1 text-left"
                      onClick={() => {
                        selectCanonicalAssetInPackScope(asset);
                      }}
                      title={`Scope to ${node.modelId} from canonical asset ${asset.name}`}
                    >
                      <span
                        className="inline-block size-1.5 rounded-full"
                        style={{ backgroundColor: `hsl(${assetHue}, 86%, 60%)` }}
                        aria-hidden="true"
                      />
                      <span className="text-[10px] uppercase tracking-wide text-foreground/80">
                        canonical
                      </span>
                      <span className="truncate">{asset.name}</span>
                    </button>
                  </div>
                    );
                  })()
                ))
              : null}
            {expanded && hasChildren
              ? renderPackScopeTree(node.children, tone)
              : null}
          </div>
        );
      }),
    [
      expandedPackTreeModelIds,
      hiddenModelIds,
      activeModelInstanceId,
      selectedScopeTreeNodeId,
      modelHueById,
      statsRootHueByModelId,
      togglePackTreeModel,
      setScopeRootModelId,
      setActiveModelSelection,
      selectCanonicalAssetInPackScope,
      setHiddenModelIds,
    ]
  );
  const topScopedContributors = useMemo(
    () =>
      [...scopedSchemaNodes]
        .sort((a, b) => b.contentSharePct - a.contentSharePct)
        .slice(0, 5),
    [scopedSchemaNodes]
  );
  const dimensionNodesByLayer = useMemo(
    () =>
      Object.keys(DIMENSION_LAYER_CONFIG).map((layerId) => {
        const typedLayerId = layerId as ContentDimensionLayerId;
        return {
          layerId: typedLayerId,
          label: DIMENSION_LAYER_CONFIG[typedLayerId].label,
          color: DIMENSION_LAYER_CONFIG[typedLayerId].color,
          nodes: dimensionNodes.filter(
            (node) => node.layerId === typedLayerId
          ),
        };
      }),
    [dimensionNodes]
  );
  const selectedInfoModelSchema = useMemo(
    () =>
      runtimeModelSchemas.find((row) => row.modelId === activeModelSchemaId) ??
      null,
    [runtimeModelSchemas, activeModelSchemaId]
  );
  const selectedInfoAsset = useMemo(
    () =>
      modelInstances.find((row) => row.id === activeModelInstanceId) ?? null,
    [modelInstances, activeModelInstanceId]
  );
  const infoSchemaTabs = useMemo(() => {
    if (!selectedInfoModelSchema)
      return [] as Array<{ id: string; label: string; code: string }>;
    const assetFileStem = toFileStem(
      selectedInfoAsset?.name ?? selectedInfoModelSchema.modelId
    );
    const tsFile = buildSingleSchemaFileForLanguage(
      selectedInfoModelSchema,
      runtimeModelSchemas,
      featureDefaultsById,
      "typescript",
      assetFileStem
    );
    const cppFile = buildSingleSchemaFileForLanguage(
      selectedInfoModelSchema,
      runtimeModelSchemas,
      featureDefaultsById,
      "cpp",
      assetFileStem
    );
    const csFile = buildSingleSchemaFileForLanguage(
      selectedInfoModelSchema,
      runtimeModelSchemas,
      featureDefaultsById,
      "csharp",
      assetFileStem
    );
    const schemaJson = buildJsonSchemaForModel(
      selectedInfoModelSchema,
      runtimeModelSchemas,
      featureDefaultsById
    );
    const dataJson = {
      modelId: selectedInfoModelSchema.modelId,
      assetId: selectedInfoAsset?.id ?? null,
      assetName: selectedInfoAsset?.name ?? null,
      stats: Object.fromEntries(
        selectedInfoModelSchema.featureRefs.map((ref) => [
          ref.featureId,
          Number(
            (
              ref.defaultValue ??
              featureDefaultsById.get(ref.featureId) ??
              0
            ).toFixed(3)
          ),
        ])
      ),
    };
    const tabs: Array<{ id: string; label: string; code: string }> = [];
    if (tsFile)
      tabs.push({ id: "info:ts", label: tsFile.path, code: tsFile.code });
    if (cppFile)
      tabs.push({ id: "info:cpp", label: cppFile.path, code: cppFile.code });
    if (csFile)
      tabs.push({ id: "info:csharp", label: csFile.path, code: csFile.code });
    tabs.push({
      id: "info:schema",
      label: `${assetFileStem}.schema.json`,
      code: JSON.stringify(schemaJson, null, 2),
    });
    tabs.push({
      id: "info:data",
      label: `${assetFileStem}.json`,
      code: JSON.stringify(dataJson, null, 2),
    });
    return tabs;
  }, [
    selectedInfoModelSchema,
    selectedInfoAsset,
    runtimeModelSchemas,
    featureDefaultsById,
  ]);
  const activeInfoSchemaTab = useMemo(
    () =>
      infoSchemaTabs.find((tab) => tab.id === vizInfoTabId) ??
      infoSchemaTabs[0] ??
      null,
    [infoSchemaTabs, vizInfoTabId]
  );
  const selectedCanonicalAsset = useMemo(
    () =>
      canonicalAssetOptions.find((row) => row.id === activeModelInstanceId) ??
      null,
    [canonicalAssetOptions, activeModelInstanceId]
  );
  const contentPackInfoEnabled = !(
    visualizationScope === "content-pack" && !selectedCanonicalAsset
  );
  useEffect(() => {
    if (vizMode !== "json") return;
    if (contentPackInfoEnabled) return;
    setVizMode("2d");
  }, [vizMode, contentPackInfoEnabled, setVizMode]);
  useEffect(() => {
    if (infoSchemaTabs.length === 0) {
      setVizInfoTabId("");
      setVizInfoEditorCode("");
      return;
    }
    if (
      !vizInfoTabId ||
      !infoSchemaTabs.some((tab) => tab.id === vizInfoTabId)
    ) {
      setVizInfoTabId(infoSchemaTabs[0]!.id);
    }
  }, [infoSchemaTabs, vizInfoTabId]);
  useEffect(() => {
    setVizInfoEditorCode(activeInfoSchemaTab?.code ?? "");
  }, [activeInfoSchemaTab]);

  useEffect(() => {
    if (activeModelSchemaId === NO_MODEL_SELECTED || !activeModelSchemaId)
      return;
    if (modelOptions.some((row) => row.modelId === activeModelSchemaId)) return;
    setActiveModelSelection(NO_MODEL_SELECTED, null);
  }, [modelOptions, activeModelSchemaId, setActiveModelSelection]);

  const selectedModelInheritanceChain = useMemo(() => {
    if (!selectedModelForSpaceView) return [] as RuntimeModelSchemaRow[];
    const byId = new Map(
      runtimeModelSchemas.map((row) => [row.modelId, row] as const)
    );
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
          const hue = Math.round(
            hashToUnit(`stat-level:${schema.modelId}`) * 360
          );
          const featureIds = [
            ...new Set(schema.featureRefs.map((row) => row.featureId)),
          ];
          return {
            modelId: schema.modelId,
            featureIds,
            depth: index,
            color: `hsl(${hue}, 82%, 62%)`,
            colorBorder: `hsla(${hue}, 82%, 62%, 0.46)`,
            colorSoft: `hsla(${hue}, 82%, 62%, 0.13)`,
          };
        }),
    [selectedModelInheritanceChain]
  );
  const statSchemaById = useMemo(
    () => new Map(runtimeModelSchemas.map((row) => [row.modelId, row] as const)),
    [runtimeModelSchemas]
  );
  const selectedAssetStatLevelSchemas = useMemo(
    () =>
      statContentLevels
        .map((level) => ({
          level,
          schema: statSchemaById.get(level.modelId) ?? null,
        }))
        .filter(
          (
            row
          ): row is { level: (typeof statContentLevels)[number]; schema: RuntimeModelSchemaRow } =>
            row.schema !== null
        ),
    [statContentLevels, statSchemaById]
  );
  const statModifiersEnabled = Boolean(
    selectedCanonicalAsset && selectedAssetStatLevelSchemas.length > 0
  );
  useEffect(() => {
    if (vizMode !== "deltas") return;
    if (statModifiersEnabled) return;
    setVizMode("2d");
  }, [vizMode, statModifiersEnabled, setVizMode]);

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

  const createModelSchemaFromTree = useCallback(
    (modelIdRaw: string, labelRaw?: string, templateModelId?: string) => {
      const modelId = normalizeModelId(modelIdRaw);
      if (!modelId) return;
      if (runtimeModelSchemas.some((row) => row.modelId === modelId)) return;
      const template =
        runtimeModelSchemas.find((row) => row.modelId === templateModelId) ??
        runtimeModelSchemas.find(
          (row) => row.modelId === selectedModelForSpaceViewId
        ) ??
        runtimeModelSchemas.find(
          (row) => row.modelId === inferredKaelModelId
        ) ??
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
    },
    [
      runtimeModelSchemas,
      runtimeFeatureSchema,
      selectedModelForSpaceViewId,
      inferredKaelModelId,
      setActiveModelSelection,
    ]
  );

  useEffect(() => {
    if (!inferredKaelModelId || inferredKaelModelId === "none") return;
    ensureKaelBinding(inferredKaelModelId);
  }, [inferredKaelModelId, ensureKaelBinding]);

  useEffect(() => {
    setActiveModelSelection(NO_MODEL_SELECTED, null);
  }, [setActiveModelSelection]);

  useEffect(() => {
    if (selectedModelFeatureIds.length > 0) return;
    setSelectedModelFeatureIds(
      runtimeFeatureSchema.slice(0, 4).map((row) => row.featureId)
    );
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
      defaultValue: runtimeFeatureSchema.find(
        (row) => row.featureId === featureId
      )?.defaultValue,
    }));
    const row: RuntimeModelSchemaRow = {
      modelId,
      label: newModelLabel.trim() || modelId,
      description: `Generated in Space Explorer (${new Date().toISOString()})`,
      featureRefs,
    };
    const current = runtimeModelSchemas.filter(
      (model) => model.modelId !== modelId
    );
    setSpaceOverrides((prev) => ({
      ...(prev ?? {}),
      modelSchemas: [...current, row],
    }));
  }, [
    newModelId,
    newModelLabel,
    newModelSpaces,
    runtimeModelSchemas,
    selectedModelFeatureIds,
    runtimeFeatureSchema,
  ]);

  const addFeatureRefToModel = useCallback(
    (modelId: string, featureId: string) => {
      if (!modelId || !featureId) return;
      const model = runtimeModelSchemas.find((row) => row.modelId === modelId);
      if (!model) return;
      if (model.featureRefs.some((row) => row.featureId === featureId)) return;
      const schemaRow = runtimeFeatureSchema.find(
        (row) => row.featureId === featureId
      );
      const spaces = schemaRow?.spaces?.length ? schemaRow.spaces : ["entity"];
      const defaultValue = schemaRow?.defaultValue;
      const nextModels = runtimeModelSchemas.map((row) =>
        row.modelId === modelId
          ? {
              ...row,
              featureRefs: [
                ...row.featureRefs,
                { featureId, spaces, required: false, defaultValue },
              ],
            }
          : row
      );
      setSpaceOverrides((prev) => ({
        ...(prev ?? {}),
        modelSchemas: nextModels,
      }));
    },
    [runtimeModelSchemas, runtimeFeatureSchema]
  );

  const removeFeatureRefFromModel = useCallback(
    (modelId: string, featureId: string) => {
      if (!modelId || !featureId) return;
      const nextModels = runtimeModelSchemas.map((row) =>
        row.modelId === modelId
          ? {
              ...row,
              featureRefs: row.featureRefs.filter(
                (ref) => ref.featureId !== featureId
              ),
            }
          : row
      );
      setSpaceOverrides((prev) => ({
        ...(prev ?? {}),
        modelSchemas: nextModels,
      }));
    },
    [runtimeModelSchemas]
  );

  const updateStatModifierMapping = useCallback(
    (
      targetStatModelId: string,
      modifierStatModelId: string,
      modifierFeatureId: string,
      targetFeatureId: string
    ) => {
      if (!targetStatModelId || !modifierStatModelId || !modifierFeatureId || !targetFeatureId) return;
      const byId = new Map(runtimeModelSchemas.map((row) => [row.modelId, row] as const));
      const targetStat = byId.get(targetStatModelId);
      const modifierStat = byId.get(modifierStatModelId);
      if (!targetStat || !modifierStat) return;
      if (!targetStat.modelId.endsWith("stats")) return;
      if (!modifierStat.modelId.endsWith("stats")) return;
      if (!targetStat.featureRefs.some((ref) => ref.featureId === targetFeatureId)) return;
      if (!modifierStat.featureRefs.some((ref) => ref.featureId === modifierFeatureId)) return;

      const nextModels = runtimeModelSchemas.map((row) => {
        if (row.modelId !== targetStatModelId) return row;
        const current = row.statModifiers ?? [];
        const modifier = current.find((entry) => entry.modifierStatModelId === modifierStatModelId);
        if (!modifier) return row;
        const mappingByFeature = new Map(
          modifier.mappings.map((mapping) => [mapping.modifierFeatureId, mapping.targetFeatureId] as const)
        );
        mappingByFeature.set(modifierFeatureId, targetFeatureId);
        const nextMappings = modifierStat.featureRefs.map((ref) => ({
          modifierFeatureId: ref.featureId,
          targetFeatureId: mappingByFeature.get(ref.featureId) ?? targetFeatureId,
        }));
        return {
          ...row,
          statModifiers: current.map((entry) =>
            entry.modifierStatModelId === modifierStatModelId ? { ...entry, mappings: nextMappings } : entry
          ),
        };
      });

      setSpaceOverrides((prev) => ({
        ...(prev ?? {}),
        modelSchemas: nextModels,
      }));
    },
    [runtimeModelSchemas]
  );

  const updateFeatureRefDefaultValue = useCallback(
    (modelId: string, featureId: string, defaultValue: number | null) => {
      if (!modelId || !featureId) return;
      const nextModels = runtimeModelSchemas.map((row) => {
        if (row.modelId !== modelId) return row;
        return {
          ...row,
          featureRefs: row.featureRefs.map((ref) =>
            ref.featureId === featureId
              ? {
                  ...ref,
                  defaultValue:
                    defaultValue == null || Number.isNaN(defaultValue)
                      ? undefined
                      : defaultValue,
                }
              : ref
          ),
        };
      });
      setSpaceOverrides((prev) => ({
        ...(prev ?? {}),
        modelSchemas: nextModels,
      }));
    },
    [runtimeModelSchemas]
  );

  const attachStatModelToModel = useCallback(
    (modelId: string, statModelId: string) => {
      if (!modelId || !statModelId) return;
      const byId = new Map(
        runtimeModelSchemas.map((row) => [row.modelId, row] as const)
      );
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
        const existing = new Map(
          row.featureRefs.map((ref) => [ref.featureId, ref] as const)
        );
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
          attachedStatModelIds: [
            ...new Set([...(row.attachedStatModelIds ?? []), statModelId]),
          ],
        };
      });
      setSpaceOverrides((prev) => ({
        ...(prev ?? {}),
        modelSchemas: nextModels,
      }));
    },
    [runtimeModelSchemas]
  );

  const toggleStatModifierForStatSet = useCallback(
    (targetStatModelId: string, modifierStatModelId: string, enabled: boolean) => {
      if (!targetStatModelId || !modifierStatModelId) return;
      if (targetStatModelId === modifierStatModelId) return;
      const byId = new Map(
        runtimeModelSchemas.map((row) => [row.modelId, row] as const)
      );
      const targetStat = byId.get(targetStatModelId);
      const modifierStat = byId.get(modifierStatModelId);
      if (!targetStat || !modifierStat) return;
      if (!targetStat.modelId.endsWith("stats")) return;
      if (!modifierStat.modelId.endsWith("stats")) return;
      const nextModels = runtimeModelSchemas.map((row) => {
        if (row.modelId !== targetStatModelId) return row;
        const current = row.statModifiers ?? [];
        if (enabled) {
          if (
            current.some(
              (modifier) =>
                modifier.modifierStatModelId === modifierStatModelId
            )
          ) {
            return row;
          }
          return {
            ...row,
            statModifiers: [
              ...current,
              {
                modifierStatModelId,
                mappings: buildDefaultStatModifierMappings(
                  targetStat,
                  modifierStat
                ),
              },
            ],
          };
        }
        return {
          ...row,
          statModifiers: current.filter(
            (modifier) => modifier.modifierStatModelId !== modifierStatModelId
          ),
        };
      });
      setSpaceOverrides((prev) => ({
        ...(prev ?? {}),
        modelSchemas: nextModels,
      }));
    },
    [runtimeModelSchemas]
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
    [runtimeModelSchemas]
  );

  const deleteModelSchema = useCallback(
    (modelId: string) => {
      if (!modelId) return;
      const nextModels = runtimeModelSchemas.filter(
        (row) => row.modelId !== modelId
      );
      const nextInstances = modelInstances.filter(
        (row) => row.modelId !== modelId
      );
      setSpaceOverrides((prev) => ({
        ...(prev ?? {}),
        modelSchemas: nextModels,
      }));
      replaceModelInstances(nextInstances);
      setActiveModelSelection(NO_MODEL_SELECTED, null);
    },
    [
      runtimeModelSchemas,
      modelInstances,
      replaceModelInstances,
      setActiveModelSelection,
    ]
  );
  const replaceModelSchemas = useCallback((models: RuntimeModelSchemaRow[]) => {
    setSpaceOverrides((prev) => ({
      ...(prev ?? {}),
      modelSchemas: models,
    }));
  }, []);
  const replaceCanonicalAssets = useCallback(
    (assets: ModelInstanceBinding[]) => {
      const sanitized = assets.map((row) => ({
        id: row.id,
        name: row.name,
        modelId: normalizeModelId(row.modelId),
        canonical: true,
      }));
      replaceModelInstances(sanitized);
    },
    [replaceModelInstances]
  );

  const applyPreset = useCallback(() => {
    const preset = MODEL_PRESETS.find((row) => row.id === selectedPresetId);
    if (!preset) return;
    const presetModel = preset.model;
    const current = runtimeModelSchemas.filter(
      (model) => model.modelId !== presetModel.modelId
    );
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
    [runtimeFeatureSchema, runtimeModelSchemas, modelInstances]
  );

  const patchValidationErrors = useMemo(
    () =>
      validatePatchSchema({
        featureSchema: runtimeFeatureSchema,
        modelSchemas: runtimeModelSchemas,
      }),
    [runtimeFeatureSchema, runtimeModelSchemas]
  );

  const diffSummary = useMemo(() => {
    const baseFeatures = new Set(
      (
        (baseSpaceVectors?.featureSchema as
          | RuntimeFeatureSchemaRow[]
          | undefined) ?? []
      ).map((row) => row.featureId)
    );
    const currentFeatures = new Set(
      runtimeFeatureSchema.map((row) => row.featureId)
    );
    const baseModels = new Set(
      (
        (baseSpaceVectors?.modelSchemas as
          | RuntimeModelSchemaRow[]
          | undefined) ?? []
      ).map((row) => row.modelId)
    );
    const currentModels = new Set(
      runtimeModelSchemas.map((row) => row.modelId)
    );
    const featureAdded = [...currentFeatures].filter(
      (id) => !baseFeatures.has(id)
    ).length;
    const featureRemoved = [...baseFeatures].filter(
      (id) => !currentFeatures.has(id)
    ).length;
    const modelAdded = [...currentModels].filter(
      (id) => !baseModels.has(id)
    ).length;
    const modelRemoved = [...baseModels].filter(
      (id) => !currentModels.has(id)
    ).length;
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
              canonicalModelInstances: modelInstances.filter(
                (row) => row.canonical
              ),
            },
          },
        }),
      });
      const body = (await response.json()) as {
        ok: boolean;
        bundle?: unknown;
        manifest?: unknown;
        error?: string;
      };
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
  }, [
    draftName,
    patchValidationErrors.length,
    runtimeFeatureSchema,
    runtimeModelSchemas,
    modelInstances,
  ]);

  const runQuickTestMode = useCallback(async () => {
    if (!testModeAllowed) {
      setBuilderMessage("Test mode is only available in development.");
      return;
    }
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
              canonicalModelInstances: modelInstances.filter(
                (row) => row.canonical
              ),
            },
          },
        }),
      });
      const body = (await response.json()) as {
        ok: boolean;
        bundle?: BuiltBundlePayload;
        error?: string;
      };
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
      persistActivePackSnapshot(identity, bundle as Record<string, unknown>);
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
      const analysis = analyzeReport(
        reportWithBinding as Parameters<typeof analyzeReport>[0]
      );
      try {
        sessionStorage.setItem(
          "dungeonbreak-browser-report",
          JSON.stringify({ report: reportWithBinding, analysis })
        );
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
      setBuilderMessage(
        "Test mode complete: bundle built, report generated, and visualization bound to fresh object content."
      );
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
    persistActivePackSnapshot,
    replaceModelInstances,
    testModeAllowed,
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
              canonicalModelInstances: modelInstances.filter(
                (row) => row.canonical
              ),
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
        setBuilderMessage(
          buildBody.error ?? "Failed to build bundle for publish."
        );
        return;
      }
      const publishResponse = await fetch(
        "/api/content-packs/delivery/publish",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            version: nextVersion,
            bundle: buildBody.bundle,
            compatibility: {
              pluginVersion: deliveryPluginVersion.trim() || "*",
              runtimeVersion: deliveryRuntimeVersion.trim() || "*",
              contentSchemaVersion: String(
                buildBody.bundle.schemaVersion ?? "content-pack.bundle.v1"
              ),
            },
          }),
        }
      );
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
      setLastPublishedVersion(
        publishBody.version ?? publishBody.record.version
      );
      setBuilderMessage(
        `Published delivery version '${publishBody.version}' (${publishBody.record.packId} @ ${publishBody.record.packHash.slice(0, 10)}...).`
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
      setBuilderMessage(
        `Pulled delivery version '${body.record.version}'. Use links to fetch bundle/manifest.`
      );
    } catch (error) {
      setBuilderMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setDeliveryBusy(false);
    }
  }, [
    deliveryPluginVersion,
    deliveryRuntimeVersion,
    setLastPulledVersion,
    setDeliverySelection,
  ]);

  const applyAuthoringOperations = useCallback(
    async (
      operations: AuthoringChatOperation[]
    ): Promise<AuthoringApplyResult> => {
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
        featureRefs: row.featureRefs.map((ref) => ({
          ...ref,
          spaces: [...ref.spaces],
        })),
      }));
      const nextModelInstances = modelInstances.map((row) => ({ ...row }));

      const errors: string[] = [];
      const applied: string[] = [];
      let nextSelection: { modelId: string; instanceId: string | null } | null =
        null;
      let buildRequest: { patchName?: string; download?: boolean } | null =
        null;

      for (const operation of operations) {
        switch (operation.op) {
          case "add_feature_schema": {
            const featureId = slugify(operation.featureId);
            const spaces = operation.spaces
              .map((row) => row.trim())
              .filter((row) => row.length > 0);
            if (!featureId || spaces.length === 0) {
              errors.push(
                `Invalid add_feature_schema operation for '${operation.featureId}'.`
              );
              break;
            }
            const nextRow: RuntimeFeatureSchemaRow = {
              featureId,
              label: operation.label?.trim() || featureId,
              groups: operation.groups
                ?.map((row) => row.trim())
                .filter((row) => row.length > 0) ?? ["content_features"],
              spaces,
              defaultValue: Number.isFinite(operation.defaultValue)
                ? operation.defaultValue
                : 0,
            };
            const existingIndex = nextFeatureSchema.findIndex(
              (row) => row.featureId === featureId
            );
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
            const featureRow = nextFeatureSchema.find(
              (row) => row.featureId === featureId
            );
            if (!featureRow) {
              errors.push(
                `Feature '${featureId}' not found for set_feature_default.`
              );
              break;
            }
            featureRow.defaultValue = operation.defaultValue;
            applied.push(`feature-default:${featureId}`);
            break;
          }
          case "create_model_schema": {
            const modelId = normalizeModelId(operation.modelId);
            if (!modelId) {
              errors.push(
                `Invalid modelId '${operation.modelId}' for create_model_schema.`
              );
              break;
            }
            if (nextModelSchemas.some((row) => row.modelId === modelId)) {
              errors.push(`Model '${modelId}' already exists.`);
              break;
            }
            const featureIds =
              operation.featureIds
                ?.map((row) => slugify(row))
                .filter((row) => row.length > 0) ??
              nextFeatureSchema.slice(0, 4).map((row) => row.featureId);
            const dedupedFeatureIds = [...new Set(featureIds)];
            if (dedupedFeatureIds.length === 0) {
              errors.push(`Model '${modelId}' has no feature refs.`);
              break;
            }
            const defaultSpaces = operation.spaces
              ?.map((row) => row.trim())
              .filter((row) => row.length > 0);
            const featureRefs = dedupedFeatureIds
              .map((featureId) => {
                const featureRow = nextFeatureSchema.find(
                  (row) => row.featureId === featureId
                );
                if (!featureRow) return null;
                return {
                  featureId,
                  spaces:
                    defaultSpaces && defaultSpaces.length > 0
                      ? [...defaultSpaces]
                      : [...featureRow.spaces],
                  required: false,
                  defaultValue: featureRow.defaultValue,
                };
              })
              .filter((row): row is NonNullable<typeof row> => Boolean(row));
            if (featureRefs.length === 0) {
              errors.push(
                `Model '${modelId}' only referenced unknown features.`
              );
              break;
            }
            nextModelSchemas.push({
              modelId,
              label: operation.label?.trim() || modelId,
              description:
                operation.description?.trim() ||
                `Created via authoring chat (${new Date().toISOString()})`,
              extendsModelId: operation.extendsModelId
                ? normalizeModelId(operation.extendsModelId)
                : undefined,
              featureRefs,
            });
            nextSelection = { modelId, instanceId: null };
            applied.push(`model:${modelId}`);
            break;
          }
          case "update_model_metadata": {
            const modelId = normalizeModelId(operation.modelId);
            const modelRow = nextModelSchemas.find(
              (row) => row.modelId === modelId
            );
            if (!modelRow) {
              errors.push(
                `Model '${modelId}' not found for update_model_metadata.`
              );
              break;
            }
            if (operation.label)
              modelRow.label = operation.label.trim() || modelRow.label;
            if (operation.description)
              modelRow.description = operation.description.trim();
            applied.push(`model-metadata:${modelId}`);
            break;
          }
          case "add_model_feature_ref": {
            const modelId = normalizeModelId(operation.modelId);
            const featureId = slugify(operation.featureId);
            const modelRow = nextModelSchemas.find(
              (row) => row.modelId === modelId
            );
            const featureRow = nextFeatureSchema.find(
              (row) => row.featureId === featureId
            );
            if (!modelRow || !featureRow) {
              errors.push(
                `Could not add feature ref '${featureId}' to model '${modelId}'.`
              );
              break;
            }
            const existingRef = modelRow.featureRefs.find(
              (ref) => ref.featureId === featureId
            );
            const spaces = operation.spaces
              ?.map((row) => row.trim())
              .filter((row) => row.length > 0);
            if (existingRef) {
              existingRef.spaces =
                spaces && spaces.length > 0 ? spaces : existingRef.spaces;
              if (typeof operation.required === "boolean")
                existingRef.required = operation.required;
              if (Number.isFinite(operation.defaultValue))
                existingRef.defaultValue = operation.defaultValue;
            } else {
              modelRow.featureRefs.push({
                featureId,
                spaces:
                  spaces && spaces.length > 0 ? spaces : [...featureRow.spaces],
                required: operation.required ?? false,
                defaultValue: Number.isFinite(operation.defaultValue)
                  ? operation.defaultValue
                  : featureRow.defaultValue,
              });
            }
            applied.push(`model-feature:${modelId}.${featureId}`);
            break;
          }
          case "remove_model_feature_ref": {
            const modelId = normalizeModelId(operation.modelId);
            const featureId = slugify(operation.featureId);
            const modelRow = nextModelSchemas.find(
              (row) => row.modelId === modelId
            );
            if (!modelRow) {
              errors.push(
                `Model '${modelId}' not found for remove_model_feature_ref.`
              );
              break;
            }
            modelRow.featureRefs = modelRow.featureRefs.filter(
              (row) => row.featureId !== featureId
            );
            applied.push(`remove-model-feature:${modelId}.${featureId}`);
            break;
          }
          case "create_canonical_asset": {
            const modelId = normalizeModelId(operation.modelId);
            if (!nextModelSchemas.some((row) => row.modelId === modelId)) {
              errors.push(
                `Model '${modelId}' not found for create_canonical_asset.`
              );
              break;
            }
            const base = modelId.replace(/\./g, "_");
            const index =
              nextModelInstances.filter((row) => row.modelId === modelId)
                .length + 1;
            nextModelInstances.push({
              id: `${base}-asset-${Date.now()}-${index}`,
              name:
                operation.name?.trim() ||
                `${modelId.split(".")[0] ?? "asset"}_asset_${index}`,
              modelId,
              canonical: true,
            });
            applied.push(`canonical-asset:${modelId}`);
            break;
          }
          case "rename_model_instance": {
            const row = nextModelInstances.find(
              (item) => item.id === operation.instanceId
            );
            if (!row) {
              errors.push(
                `Model instance '${operation.instanceId}' not found for rename_model_instance.`
              );
              break;
            }
            const nextName = operation.name.trim();
            if (!nextName) {
              errors.push(
                `Model instance '${operation.instanceId}' rename cannot be empty.`
              );
              break;
            }
            row.name = nextName;
            applied.push(`rename-instance:${operation.instanceId}`);
            break;
          }
          case "set_canonical_state": {
            const row = nextModelInstances.find(
              (item) => item.id === operation.instanceId
            );
            if (!row) {
              errors.push(
                `Model instance '${operation.instanceId}' not found for set_canonical_state.`
              );
              break;
            }
            row.canonical = operation.canonical;
            applied.push(`canonical-state:${operation.instanceId}`);
            break;
          }
          case "set_active_selection": {
            const modelId = normalizeModelId(operation.modelId);
            if (!nextModelSchemas.some((row) => row.modelId === modelId)) {
              errors.push(
                `Model '${modelId}' not found for set_active_selection.`
              );
              break;
            }
            const instanceId = operation.instanceId ?? null;
            if (
              instanceId &&
              !nextModelInstances.some((row) => row.id === instanceId)
            ) {
              errors.push(
                `Instance '${instanceId}' not found for set_active_selection.`
              );
              break;
            }
            nextSelection = { modelId, instanceId };
            applied.push(`select:${modelId}`);
            break;
          }
          case "build_bundle":
            buildRequest = {
              patchName: operation.patchName,
              download: operation.download,
            };
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
          ...((
            prev as { contentBindings?: Record<string, unknown> } | undefined
          )?.contentBindings ?? {}),
          modelInstances: nextModelInstances,
          canonicalModelInstances: nextModelInstances.filter(
            (row) => row.canonical
          ),
        },
      }));
      replaceModelInstances(nextModelInstances);
      if (nextSelection) {
        setActiveModelSelection(
          nextSelection.modelId,
          nextSelection.instanceId
        );
      }

      const validationErrors = validatePatchSchema({
        featureSchema: nextFeatureSchema,
        modelSchemas: nextModelSchemas,
      });

      if (buildRequest && validationErrors.length === 0) {
        try {
          const patchName =
            buildRequest.patchName?.trim() ||
            draftName.trim() ||
            "space-vectors.patch";
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
                  canonicalModelInstances: nextModelInstances.filter(
                    (row) => row.canonical
                  ),
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
            const canonicalCount = Array.isArray(body.manifest?.canonicalAssets)
              ? body.manifest.canonicalAssets.length
              : 0;
            const modelCount = Array.isArray(body.manifest?.models)
              ? body.manifest.models.length
              : nextModelSchemas.length;
            const featureCount = Array.isArray(body.manifest?.features)
              ? body.manifest.features.length
              : nextFeatureSchema.length;
            setBuilderMessage(
              `Chat bundle build complete: models ${modelCount}, features ${featureCount}, canonical assets ${canonicalCount}.`
            );
            if (buildRequest.download) {
              const outName = `${slugify(patchName)}.content-pack.bundle.v1.json`;
              downloadJson(outName, body.bundle);
              if (body.manifest) {
                downloadJson(
                  `${slugify(patchName)}.content-pack.manifest.v1.json`,
                  body.manifest
                );
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
        errors.push(
          `Bundle build skipped due to validation errors (${validationErrors.length}).`
        );
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
    ]
  );

  const playerUnified = useMemo(() => {
    const runtime = EngineRuntime as unknown as {
      projectEntitySpaceVector?: (
        input: {
          traits: Record<string, number>;
          features: Record<string, number>;
          health?: number;
          energy?: number;
          reputation?: number;
        },
        overrides?: SpaceVectorPackOverrides
      ) => UnifiedSpaceVector;
    };
    const traitRecord = Object.fromEntries(
      TRAIT_NAMES.map((name, i) => [name, traitVector[i] ?? 0])
    ) as Record<string, number>;
    const featureRecord = Object.fromEntries(
      FEATURE_NAMES.map((name, i) => [name, featureVector[i] ?? 0])
    ) as Record<string, number>;
    if (typeof runtime.projectEntitySpaceVector === "function") {
      return runtime.projectEntitySpaceVector(
        {
          traits: traitRecord,
          features: featureRecord,
        },
        spaceOverrides
      );
    }
    return {
      traits: traitRecord,
      features: featureRecord,
      semantics: Object.fromEntries(
        SEMANTIC_AXES.map((axis) => [axis, 0])
      ) as Record<string, number>,
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
    const actionRows: RuntimeVizPoint[] = unifiedModel.actionSpace.map(
      (row) => ({
        id: row.actionType,
        name: row.actionType,
        type: "action",
        branch: "action",
        vector: flattenUnifiedVector(row.vector),
        coords: coordsFromUnifiedVector(row.vector),
        similarity: cosineSimilarity(source, flattenUnifiedVector(row.vector)),
      })
    );
    const eventRows: RuntimeVizPoint[] = unifiedModel.eventSpace.map((row) => ({
      id: row.eventId,
      name: row.eventId,
      type: "event",
      branch: row.kind,
      vector: flattenUnifiedVector(row.vector),
      coords: coordsFromUnifiedVector(row.vector),
      similarity: cosineSimilarity(source, flattenUnifiedVector(row.vector)),
    }));
    const effectRows: RuntimeVizPoint[] = unifiedModel.effectSpace.map(
      (row) => ({
        id: row.effectId,
        name: row.effectId,
        type: "effect",
        branch: row.sourceType,
        vector: flattenUnifiedVector(row.delta),
        coords: coordsFromUnifiedVector(row.delta),
        similarity: cosineSimilarity(source, flattenUnifiedVector(row.delta)),
        netImpact: row.behavior.aggregates.netImpact,
        behaviorStyle: row.behavior.style,
      })
    );
    if (runtimeSpaceView === "action") return actionRows;
    if (runtimeSpaceView === "event") return eventRows;
    if (runtimeSpaceView === "effect") return effectRows;
    return [];
  }, [playerUnified, unifiedModel, runtimeSpaceView]);

  const contentTypeFilter = useMemo(() => {
    if (runtimeSpaceView === "content-skill")
      return (_pt: ContentPoint) => true;
    if (runtimeSpaceView === "content-dialogue")
      return (_pt: ContentPoint) => true;
    if (runtimeSpaceView === "content-archetype")
      return (_pt: ContentPoint) => true;
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
    [traits, features, customFeatureValues]
  );

  const setFeatureValue = useCallback(
    (featureId: string, nextValue: number) => {
      if ((TRAIT_NAMES as readonly string[]).includes(featureId)) {
        setTraits((prev) => ({
          ...prev,
          [featureId as (typeof TRAIT_NAMES)[number]]: nextValue,
        }));
        return;
      }
      if ((FEATURE_NAMES as readonly string[]).includes(featureId)) {
        setFeatures((prev) => ({
          ...prev,
          [featureId as (typeof FEATURE_NAMES)[number]]: nextValue,
        }));
        return;
      }
      setCustomFeatureValues((prev) => ({ ...prev, [featureId]: nextValue }));
    },
    []
  );

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
    return runtimeSpaceFeatureIds.filter((featureId) =>
      enabledStatFeatureIdSet.has(featureId)
    );
  }, [runtimeSpaceFeatureIds, statContentLevels, enabledStatFeatureIdSet]);

  const normalizeFeatureValue = useCallback(
    (featureId: string, value: number): number => {
      if ((FEATURE_NAMES as readonly string[]).includes(featureId)) {
        return Number(value) / 100;
      }
      return Number(value);
    },
    []
  );

  const getContentPointFeatureValue = useCallback(
    (point: ContentPoint, featureId: string): number => {
      const traitIndex = TRAIT_NAMES.findIndex((name) => name === featureId);
      if (traitIndex >= 0) {
        return Number(point.vector[traitIndex] ?? 0);
      }
      if ((FEATURE_NAMES as readonly string[]).includes(featureId)) {
        return hashToUnit(`${point.id}:${point.branch}:${featureId}`) * 100;
      }
      return (
        hashToUnit(`${point.id}:${point.type}:${point.branch}:${featureId}`) *
          2 -
        1
      );
    },
    []
  );

  const playerSpaceVector = useMemo(() => {
    if (
      !isContentRuntimeView(runtimeSpaceView) ||
      runtimeSpaceView === "content-combined"
    ) {
      return combinedVector;
    }
    return contentSpaceFeatureIds.map((featureId) =>
      normalizeFeatureValue(featureId, getFeatureValue(featureId))
    );
  }, [
    runtimeSpaceView,
    combinedVector,
    contentSpaceFeatureIds,
    normalizeFeatureValue,
    getFeatureValue,
  ]);

  const selectedModelSpacePoints = useMemo<ModelSpaceOverlayPoint[]>(() => {
    const selectedSchemas = selectedModelInheritanceChain;
    if (selectedSchemas.length === 0) return [];
    const getModelDefault = (
      schema: RuntimeModelSchemaRow,
      featureId: string
    ): number => {
      const ref = schema.featureRefs.find((row) => row.featureId === featureId);
      return ref?.defaultValue ?? featureDefaultsById.get(featureId) ?? 0;
    };
    if (isContentRuntimeView(runtimeSpaceView)) {
      const featureIds = contentSpaceFeatureIds;
      if (featureIds.length === 0) return [];
      return selectedSchemas.map((schema, index) => {
        const vector = featureIds.map((featureId) =>
          normalizeFeatureValue(featureId, getModelDefault(schema, featureId))
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
        TRAIT_NAMES.map((featureId) => [
          featureId,
          getModelDefault(schema, featureId),
        ])
      ) as Record<string, number>;
      const featureRecord = Object.fromEntries(
        FEATURE_NAMES.map((featureId) => [
          featureId,
          getModelDefault(schema, featureId),
        ])
      ) as Record<string, number>;
      const unified = {
        traits: traitRecord,
        features: featureRecord,
        semantics: Object.fromEntries(
          SEMANTIC_AXES.map((axis) => [axis, 0])
        ) as Record<string, number>,
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

  const { player3d, knn, content, contentCoords, reachability } =
    useMemo(() => {
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
          player3d: [
            coordsFromUnifiedVector(playerUnified).x,
            coordsFromUnifiedVector(playerUnified).y,
            coordsFromUnifiedVector(playerUnified).z,
          ] as [number, number, number],
          knn: runtimeKnn,
          content: runtimeKnn.map((row) => ({
            ...row,
            cluster: undefined,
            unlockRadius: undefined,
          })) as ContentPoint[],
          contentCoords: runtimeKnn.map((row) => ({
            x: row.x,
            y: row.y,
            z: row.z,
          })),
          reachability: {
            skillsInRange: 0,
            skillsTotal: 0,
            minDistanceToSkill: runtimeKnn[0]?.distance ?? 0,
            meanDistanceToNearest5:
              runtimeKnn.length > 0
                ? runtimeKnn
                    .slice(0, 5)
                    .reduce((sum, row) => sum + row.distance, 0) /
                  Math.max(1, Math.min(5, runtimeKnn.length))
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
      const playerVec =
        runtimeSpaceView === "content-combined"
          ? combinedVector
          : playerSpaceVector;
      const contentWithVectors = filteredContent.map((pt) => {
        if (runtimeSpaceView === "content-combined") {
          return {
            ...pt,
            runtimeVector: pt.vectorCombined ?? pt.vector,
            runtimeCoords: getPointCoords(pt, "combined"),
          };
        }
        const runtimeVector = contentSpaceFeatureIds.map((featureId) =>
          normalizeFeatureValue(
            featureId,
            getContentPointFeatureValue(pt, featureId)
          )
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
          : ([
              vectorToCoords(playerVec).x,
              vectorToCoords(playerVec).y,
              vectorToCoords(playerVec).z,
            ] as [number, number, number]);
      const contentCoords = contentWithVectors.map((pt) => ({
        x: pt.runtimeCoords.x,
        y: pt.runtimeCoords.y,
        z: pt.runtimeCoords.z,
      }));
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
                    normalizeFeatureValue(
                      featureId,
                      getContentPointFeatureValue(s, featureId)
                    )
                  )
                ),
        }))
        .sort((a, b) => a.distance - b.distance);
      const rangeBonus = movementBudget * 0.02;
      const inRange = skillsWithDist.filter(
        (s) => s.distance <= (s.unlockRadius ?? 2) + rangeBonus
      );
      const nearest5 = skillsWithDist.slice(0, 5);
      const meanDist5 = nearest5.length
        ? nearest5.reduce((s, x) => s + x.distance, 0) / nearest5.length
        : 0;
      const minDist = skillsWithDist.length
        ? Math.min(...skillsWithDist.map((s) => s.distance))
        : 0;

      const reachability = {
        skillsInRange: inRange.length,
        skillsTotal: skills.length,
        minDistanceToSkill: minDist,
        meanDistanceToNearest5: meanDist5,
        reachableIds: inRange.map((s) => s.id),
        rangeBonus,
      };

      return {
        player3d,
        knn,
        content: distances as ContentPoint[],
        contentCoords,
        reachability,
      };
    }, [
      data,
      pca,
      combinedVector,
      activeContentSpace,
      movementBudget,
      runtimeSpaceView,
      runtimeVizPoints,
      playerUnified,
      contentTypeFilter,
      playerSpaceVector,
      contentSpaceFeatureIds,
      getContentPointFeatureValue,
      normalizeFeatureValue,
    ]);

  const effectiveAlgorithm = useMemo(
    () => resolveEffectiveAlgorithm(runtimeSpaceView, distanceAlgorithm),
    [runtimeSpaceView, distanceAlgorithm]
  );

  const nearestRows = useMemo(() => {
    const k = Math.max(1, Math.min(50, nearestK));
    if (isContentRuntimeView(runtimeSpaceView)) {
      if (!data?.content || !activeContentSpace) return [];
      const source =
        runtimeSpaceView === "content-combined"
          ? combinedVector
          : playerSpaceVector;
      return data.content
        .filter(contentTypeFilter)
        .map((row) => {
          const target =
            runtimeSpaceView === "content-combined"
              ? (row.vectorCombined ?? row.vector)
              : contentSpaceFeatureIds.map((featureId) =>
                  normalizeFeatureValue(
                    featureId,
                    getContentPointFeatureValue(row, featureId)
                  )
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
  }, [
    runtimeSpaceView,
    nearestK,
    playerUnified,
    runtimeVizPoints,
    effectiveAlgorithm,
    data,
    activeContentSpace,
    combinedVector,
    contentTypeFilter,
    playerSpaceVector,
    contentSpaceFeatureIds,
    getContentPointFeatureValue,
    normalizeFeatureValue,
  ]);

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
              projection,
              selectedId,
              onSelect,
            }: {
              content: ContentPoint[];
              contentCoords: { x: number; y: number; z: number }[];
              player3d: [number, number, number];
              modelSpacePoints: ModelSpaceOverlayPoint[];
              colorBy: ColorBy;
              projection: "3d" | "2d";
              selectedId: string | null;
              onSelect: (id: string) => void;
            }) {
              const text = content.map(
                (p) =>
                  `<b>${p.name}</b> (${p.type})<br>branch: ${p.branch}<br>${p.vector.map((v, i) => v.toFixed(2)).join(", ")}`
              );
              const traceContent =
                projection === "2d"
                  ? {
                      x: contentCoords.map((c) => c.x),
                      y: contentCoords.map((c) => c.y),
                      text,
                      mode: "markers" as const,
                      type: "scatter" as const,
                      marker: {
                        size: content.map((p) =>
                          selectedId === p.id ? 12 : 6
                        ),
                        color: content.map((p) => getPointColor(p, colorBy)),
                        opacity: content.map((p) =>
                          selectedId === p.id ? 1 : 0.85
                        ),
                      },
                      hovertemplate: "%{text}<extra></extra>",
                      hoverinfo: "text" as const,
                    }
                  : {
                      x: contentCoords.map((c) => c.x),
                      y: contentCoords.map((c) => c.y),
                      z: contentCoords.map((c) => c.z),
                      text,
                      mode: "markers" as const,
                      type: "scatter3d" as const,
                      marker: {
                        size: content.map((p) =>
                          selectedId === p.id ? 12 : 6
                        ),
                        color: content.map((p) => getPointColor(p, colorBy)),
                        opacity: content.map((p) =>
                          selectedId === p.id ? 1 : 0.85
                        ),
                      },
                      hovertemplate: "%{text}<extra></extra>",
                      hoverinfo: "text" as const,
                    };
              const tracePlayer =
                projection === "2d"
                  ? {
                      x: [player3d[0]],
                      y: [player3d[1]],
                      text: ["You"],
                      mode: "markers" as const,
                      type: "scatter" as const,
                      marker: { size: 14, color: "#eab308", symbol: "diamond" },
                      hovertemplate: "You<extra></extra>",
                    }
                  : {
                      x: [player3d[0]],
                      y: [player3d[1]],
                      z: [player3d[2]],
                      text: ["You"],
                      mode: "markers" as const,
                      type: "scatter3d" as const,
                      marker: { size: 14, color: "#eab308", symbol: "diamond" },
                      hovertemplate: "You<extra></extra>",
                    };
              const traceModels =
                projection === "2d"
                  ? {
                      x: modelSpacePoints.map((row) => row.coords.x),
                      y: modelSpacePoints.map((row) => row.coords.y),
                      text: modelSpacePoints.map(
                        (row) => `<b>${row.name}</b><br>model space overlay`
                      ),
                      mode: "markers+text" as const,
                      type: "scatter" as const,
                      marker: {
                        size: 8,
                        color: modelSpacePoints.map(
                          (row) =>
                            `hsl(${Math.round(hashToUnit(row.id) * 360)}, 85%, 65%)`
                        ),
                        symbol: "cross",
                      },
                      textposition: "top center" as const,
                      hovertemplate: "%{text}<extra></extra>",
                    }
                  : {
                      x: modelSpacePoints.map((row) => row.coords.x),
                      y: modelSpacePoints.map((row) => row.coords.y),
                      z: modelSpacePoints.map((row) => row.coords.z),
                      text: modelSpacePoints.map(
                        (row) => `<b>${row.name}</b><br>model space overlay`
                      ),
                      mode: "markers+text" as const,
                      type: "scatter3d" as const,
                      marker: {
                        size: 8,
                        color: modelSpacePoints.map(
                          (row) =>
                            `hsl(${Math.round(hashToUnit(row.id) * 360)}, 85%, 65%)`
                        ),
                        symbol: "cross",
                      },
                      textposition: "top center" as const,
                      textfont: { size: 10, color: "#e5e7eb" },
                      hovertemplate: "%{text}<extra></extra>",
                    };
              return (
                <Plot
                  data={[traceContent, tracePlayer, traceModels]}
                  layout={
                    projection === "2d"
                      ? {
                          margin: { l: 40, r: 12, t: 24, b: 40 },
                          paper_bgcolor: "transparent",
                          plot_bgcolor: "rgba(0,0,0,0.1)",
                          xaxis: { gridcolor: "rgba(128,128,128,0.2)" },
                          yaxis: { gridcolor: "rgba(128,128,128,0.2)" },
                          showlegend: false,
                        }
                      : {
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
                        }
                  }
                  config={{
                    responsive: true,
                    scrollZoom: true,
                    displayModeBar: true,
                    modeBarButtonsToAdd: ["hoverclosest", "hovercompare"],
                  }}
                  style={{ width: "100%", height: "100%" }}
                  useResizeHandler
                  onClick={(event: {
                    points?: Array<{
                      curveNumber?: number;
                      pointIndex?: number;
                    }>;
                  }) => {
                    const pts = event.points;
                    if (pts?.[0] && pts[0].curveNumber === 0) {
                      const idx = pts[0].pointIndex;
                      if (typeof idx === "number" && content[idx])
                        onSelect(content[idx].id);
                    }
                  }}
                />
              );
            };
          }),
        {
          ssr: false,
          loading: () => (
            <div className="flex h-full items-center justify-center">
              Loading 3D…
            </div>
          ),
        }
      ),
    []
  );
  const DimensionPlotlyComponent = useMemo(
    () =>
      dynamic(
        () =>
          import("react-plotly.js").then((mod) => {
            const Plot = mod.default;
            return function DimensionPlotly({
              layers,
              projection,
              selectedCanonicalAssetId,
              onSelectCanonicalAsset,
              modelHueById,
              statSpaceOverlays,
              showLayerOverlays,
              layerSpaceOverlays,
              selectedModelId,
            }: {
              layers: Array<{
                layerId: ContentDimensionLayerId;
                label: string;
                color: string;
                nodes: ContentDimensionNode[];
              }>;
              projection: "3d" | "2d";
              selectedCanonicalAssetId: string | null;
              onSelectCanonicalAsset: (assetId: string) => void;
              modelHueById: Record<string, number>;
              statSpaceOverlays: StatSpaceOverlay[];
              showLayerOverlays: boolean;
              layerSpaceOverlays: LayerSpaceOverlay[];
              selectedModelId: string | null;
            }) {
              const schemaLayer = layers.find(
                (layer) => layer.layerId === "schema-model"
              );
              const canonicalLayer = layers.find(
                (layer) => layer.layerId === "canonical-asset"
              );
              const traces =
                projection === "2d"
                  ? [
                      ...statSpaceOverlays.map((overlay) => ({
                        x: [overlay.xCenter],
                        y: [overlay.height],
                        width: [overlay.width],
                        type: "bar" as const,
                        marker: {
                          color: overlay.color,
                          line: { width: 0, color: overlay.color },
                        },
                        hoverinfo: "skip" as const,
                        name: "",
                      })),
                      ...(schemaLayer
                        ? [
                            {
                              x: schemaLayer.nodes.map(
                                (node) => node.modelIndex
                              ),
                              y: schemaLayer.nodes.map(
                                (node) => node.surface.height
                              ),
                              width: schemaLayer.nodes.map((node) =>
                                Math.max(0.55, node.surface.width / 40)
                              ),
                              customdata: schemaLayer.nodes.map((node) => ({
                                label: node.label,
                                modelId: node.modelId,
                                depth: node.inheritanceDepth,
                                share: node.contentSharePct * 100,
                                width: node.surface.width,
                              })),
                              type: "bar" as const,
                              marker: {
                                color: schemaLayer.nodes.map(
                                  (node) => {
                                    const hue = modelHueById[node.modelId];
                                    return `hsl(${hue ?? modelSurfaceHue(node.modelId)}, 82%, 58%)`;
                                  }
                                ),
                                line: {
                                  width: 1,
                                  color: "rgba(255,255,255,0.18)",
                                },
                              },
                              name: "Model Surface",
                              hovertemplate:
                                "<b>%{customdata.label}</b><br>" +
                                "model: %{customdata.modelId}<br>" +
                                "depth: %{customdata.depth}<br>" +
                                "content: %{customdata.share:.1f}%<br>" +
                                "surface width: %{customdata.width}<br>" +
                                "<extra></extra>",
                            },
                          ]
                        : []),
                      ...(canonicalLayer
                        ? [
                            {
                              x: canonicalLayer.nodes.map(
                                (node) => node.modelIndex
                              ),
                              y: canonicalLayer.nodes.map(
                                (node) =>
                                  Math.max(0.15, node.surface.height - 0.18)
                              ),
                              text: canonicalLayer.nodes.map(
                                (node) => `${node.label} (${node.modelId})`
                              ),
                              customdata: canonicalLayer.nodes.map((node) => ({
                                assetId: node.id.replace("canonical-asset:", ""),
                                modelId: node.modelId,
                                label: node.label,
                              })),
                              type: "scatter" as const,
                              mode: "markers" as const,
                              marker: {
                                size: canonicalLayer.nodes.map((node) => {
                                  const assetId = node.id.replace(
                                    "canonical-asset:",
                                    ""
                                  );
                                  return assetId === selectedCanonicalAssetId
                                    ? 13
                                    : 9;
                                }),
                                color: canonicalLayer.nodes.map((node) => {
                                  const hue = modelHueById[node.modelId];
                                  return `hsl(${hue ?? modelSurfaceHue(node.modelId)}, 85%, 62%)`;
                                }),
                                line: {
                                  width: canonicalLayer.nodes.map((node) => {
                                    const assetId = node.id.replace(
                                      "canonical-asset:",
                                      ""
                                    );
                                    return assetId === selectedCanonicalAssetId
                                      ? 2
                                      : 1;
                                  }),
                                  color: canonicalLayer.nodes.map((node) => {
                                    const hue = modelHueById[node.modelId];
                                    return `hsl(${hue ?? modelSurfaceHue(node.modelId)}, 90%, 40%)`;
                                  }),
                                },
                              },
                              name: "Canonical Overlay",
                              hovertemplate: "%{text}<extra></extra>",
                            },
                          ]
                        : []),
                      ...(canonicalLayer
                        ? (() => {
                            const selectedNode = canonicalLayer.nodes.find(
                              (node) =>
                                node.id.replace("canonical-asset:", "") ===
                                selectedCanonicalAssetId
                            );
                            if (!selectedNode) return [];
                            const selectedAssetId = selectedNode.id.replace(
                              "canonical-asset:",
                              ""
                            );
                            const selectedHue =
                              modelHueById[selectedNode.modelId] ??
                              modelSurfaceHue(selectedNode.modelId);
                            return [
                              {
                                x: [selectedNode.modelIndex],
                                y: [
                                  Math.max(0.15, selectedNode.surface.height - 0.18),
                                ],
                                text: [
                                  `${selectedNode.label} (${selectedNode.modelId})`,
                                ],
                                customdata: [
                                  {
                                    assetId: selectedAssetId,
                                    modelId: selectedNode.modelId,
                                    label: selectedNode.label,
                                  },
                                ],
                                type: "scatter" as const,
                                mode: "markers+text" as const,
                                marker: {
                                  size: 14,
                                  color: `hsl(${selectedHue}, 92%, 70%)`,
                                  line: {
                                    width: 2,
                                    color: `hsl(${selectedHue}, 92%, 36%)`,
                                  },
                                },
                                textposition: "top center" as const,
                                textfont: {
                                  size: 10,
                                  color: "hsl(0, 0%, 96%)",
                                },
                                name: "Selected Asset",
                                hovertemplate: "%{text}<extra></extra>",
                              },
                            ];
                          })()
                        : []),
                    ]
                  : [
                      ...(showLayerOverlays
                        ? statSpaceOverlays.map((overlay) => {
                            const x0 = overlay.xCenter - overlay.width / 2;
                            const x1 = overlay.xCenter + overlay.width / 2;
                            const y0 = 0;
                            const y1 = overlay.height;
                            const z0 = 0.7;
                            const z1 = 2.3;
                            return {
                              x: [
                                x0,
                                x1,
                                x1,
                                x0,
                                x0,
                                null,
                                x0,
                                x1,
                                x1,
                                x0,
                                x0,
                                null,
                                x0,
                                x0,
                                null,
                                x1,
                                x1,
                                null,
                                x1,
                                x1,
                                null,
                                x0,
                                x0,
                              ],
                              y: [
                                y0,
                                y0,
                                y1,
                                y1,
                                y0,
                                null,
                                y0,
                                y0,
                                y1,
                                y1,
                                y0,
                                null,
                                y0,
                                y0,
                                null,
                                y0,
                                y0,
                                null,
                                y1,
                                y1,
                                null,
                                y1,
                                y1,
                              ],
                              z: [
                                z0,
                                z0,
                                z0,
                                z0,
                                z0,
                                null,
                                z1,
                                z1,
                                z1,
                                z1,
                                z1,
                                null,
                                z0,
                                z1,
                                null,
                                z0,
                                z1,
                                null,
                                z0,
                                z1,
                                null,
                                z0,
                                z1,
                              ],
                              type: "scatter3d" as const,
                              mode: "lines" as const,
                              line: {
                                color: overlay.color,
                                width: 5,
                              },
                              hoverinfo: "skip" as const,
                              name: "",
                              showlegend: false,
                            };
                          })
                        : []),
                      ...(showLayerOverlays
                        ? layerSpaceOverlays.map((overlay) => {
                            const x0 = overlay.xCenter - overlay.width / 2;
                            const x1 = overlay.xCenter + overlay.width / 2;
                            const y0 = overlay.yMin;
                            const y1 = overlay.yMax;
                            const z0 = overlay.zMin;
                            const z1 = overlay.zMax;
                            return {
                              x: [
                                x0,
                                x1,
                                x1,
                                x0,
                                x0,
                                null,
                                x0,
                                x1,
                                x1,
                                x0,
                                x0,
                                null,
                                x0,
                                x0,
                                null,
                                x1,
                                x1,
                                null,
                                x1,
                                x1,
                                null,
                                x0,
                                x0,
                              ],
                              y: [
                                y0,
                                y0,
                                y1,
                                y1,
                                y0,
                                null,
                                y0,
                                y0,
                                y1,
                                y1,
                                y0,
                                null,
                                y0,
                                y0,
                                null,
                                y0,
                                y0,
                                null,
                                y1,
                                y1,
                                null,
                                y1,
                                y1,
                              ],
                              z: [
                                z0,
                                z0,
                                z0,
                                z0,
                                z0,
                                null,
                                z1,
                                z1,
                                z1,
                                z1,
                                z1,
                                null,
                                z0,
                                z1,
                                null,
                                z0,
                                z1,
                                null,
                                z0,
                                z1,
                                null,
                                z0,
                                z1,
                              ],
                              type: "scatter3d" as const,
                              mode: "lines" as const,
                              line: {
                                color: overlay.color,
                                width: 3,
                              },
                              hoverinfo: "skip" as const,
                              name: "",
                              showlegend: false,
                            };
                          })
                        : []),
                      ...layers
                        .filter((layer) => layer.nodes.length > 0)
                        .map((layer) => {
                          const text = layer.nodes.map(
                            (node) =>
                              `<b>${node.label}</b><br>model: ${node.modelId}<br>index: ${node.modelIndex}<br>layer: ${layer.label}`
                          );
                          return {
                            x: layer.nodes.map((node) => node.coords.x),
                            y: layer.nodes.map((node) => node.coords.y),
                            z: layer.nodes.map((node) => node.coords.z),
                            text,
                            name: layer.label,
                            mode: "markers+text" as const,
                            type: "scatter3d" as const,
                            marker: {
                              size: 7,
                              color: layer.color,
                              opacity: 0.95,
                            },
                            textposition: "top center" as const,
                            hovertemplate: "%{text}<extra></extra>",
                          };
                        }),
                      ...(() => {
                        const selectedModelNode = layers
                          .flatMap((layer) => layer.nodes)
                          .find(
                            (node) =>
                              node.layerId === "schema-model" &&
                              node.modelId === selectedModelId
                          );
                        if (!selectedModelNode) return [];
                        const hue =
                          modelHueById[selectedModelNode.modelId] ??
                          modelSurfaceHue(selectedModelNode.modelId);
                        return [
                          {
                            x: [selectedModelNode.coords.x],
                            y: [selectedModelNode.coords.y],
                            z: [selectedModelNode.coords.z],
                            text: [`${selectedModelNode.label} (${selectedModelNode.modelId})`],
                            type: "scatter3d" as const,
                            mode: "markers+text" as const,
                            marker: {
                              size: 11,
                              color: `hsl(${hue}, 92%, 72%)`,
                              line: { width: 2, color: `hsl(${hue}, 92%, 36%)` },
                            },
                            textposition: "top center" as const,
                            hovertemplate: "%{text}<extra></extra>",
                            name: "",
                            showlegend: false,
                          },
                        ];
                      })(),
                    ];
              const allDataNodes = layers.flatMap((layer) => layer.nodes);
              const xValues = allDataNodes.map((n) => n.coords.x);
              const yValues = allDataNodes.map((n) => n.coords.y);
              const zValues = allDataNodes.map((n) => n.coords.z);
              const xMin = xValues.length > 0 ? Math.min(...xValues) : 0;
              const xMax = xValues.length > 0 ? Math.max(...xValues) : 1;
              const yMin = yValues.length > 0 ? Math.min(...yValues) : 0;
              const yMax = yValues.length > 0 ? Math.max(...yValues) : 1;
              const zMin = zValues.length > 0 ? Math.min(...zValues) : 0;
              const zMax = zValues.length > 0 ? Math.max(...zValues) : 2;
              return (
                <Plot
                  data={traces}
                  layout={
                    projection === "2d"
                      ? {
                          margin: { l: 40, r: 12, t: 12, b: 40 },
                          paper_bgcolor: "transparent",
                          plot_bgcolor: "rgba(0,0,0,0.1)",
                          xaxis: {
                            title: "Model Index (tree order)",
                            gridcolor: "rgba(128,128,128,0.2)",
                            tickmode: "linear",
                          },
                          yaxis: {
                            title: "Surface Height (Depth)",
                            gridcolor: "rgba(128,128,128,0.2)",
                            rangemode: "tozero",
                          },
                          showlegend: false,
                          legend: { orientation: "h", y: 1.12 },
                        }
                      : {
                          margin: { l: 0, r: 0, t: 12, b: 0 },
                          paper_bgcolor: "transparent",
                          plot_bgcolor: "rgba(0,0,0,0.1)",
                          scene: {
                            xaxis: {
                              title: { text: "Model Index", font: { color: "#e5e7eb", size: 12 } },
                              gridcolor: "rgba(128,128,128,0.2)",
                              tickfont: { color: "#cbd5e1", size: 10 },
                              range: [xMin - 1.2, xMax + 1.2],
                            },
                            yaxis: {
                              title: { text: "Depth", font: { color: "#e5e7eb", size: 12 } },
                              gridcolor: "rgba(128,128,128,0.2)",
                              tickfont: { color: "#cbd5e1", size: 10 },
                              range: [Math.max(0, yMin - 0.9), yMax + 0.9],
                            },
                            zaxis: {
                              title: { text: "Layer", font: { color: "#e5e7eb", size: 12 } },
                              gridcolor: "rgba(128,128,128,0.2)",
                              tickfont: { color: "#cbd5e1", size: 10 },
                              range: [zMin - 0.6, zMax + 0.6],
                            },
                            dragmode: "orbit",
                            hovermode: "closest",
                            aspectmode: "manual",
                            aspectratio: { x: 1.3, y: 1, z: 0.8 },
                          },
                          showlegend: false,
                          legend: { orientation: "h", y: 1.05 },
                        }
                  }
                  config={{
                    responsive: true,
                    scrollZoom: true,
                    displayModeBar: true,
                  }}
                  style={{ width: "100%", height: "100%" }}
                  useResizeHandler
                  onClick={(event: {
                    points?: Array<{
                      curveNumber?: number;
                      pointIndex?: number;
                      customdata?: { assetId?: string };
                    }>;
                  }) => {
                    const point = event.points?.[0];
                    if (!point) return;
                    if (projection !== "2d") return;
                    const assetId =
                      typeof point.customdata?.assetId === "string"
                        ? point.customdata.assetId
                        : null;
                    if (assetId) {
                      onSelectCanonicalAsset(assetId);
                    }
                  }}
                />
              );
            };
          }),
        {
          ssr: false,
          loading: () => (
            <div className="flex h-full items-center justify-center">
              Loading dimensions...
            </div>
          ),
        }
      ),
    []
  );

  const activeFeatureSpace = useMemo<ContentSpaceKey | null>(
    () =>
      CONTENT_SPACE_KEYS.includes(runtimeSpaceView as ContentSpaceKey)
        ? (runtimeSpaceView as ContentSpaceKey)
        : null,
    [runtimeSpaceView]
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
        const featureIds = level.featureIds.filter((featureId) =>
          allowed.has(featureId)
        );
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
  }, [
    activeFeatureSpace,
    runtimeSpaceFeatureIds,
    statContentLevels,
    enabledStatLevelById,
  ]);

  useEffect(() => {
    const statIds = [
      ...DEFAULT_STAT_FEATURES,
      ...DEFAULT_CURRENCY_STAT_FEATURES,
    ].map((row) => row.featureId);
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
          Run <code>pnpm --dir docs-site run space:precompute</code> to generate
          space-data.json
        </p>
      </div>
    );
  }

  if (spaceDataLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
        <p className="text-sm text-muted-foreground">
          Loading Space Explorer data…
        </p>
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
    canonicalAssets: canonicalAssetOptions.map((row) => ({
      id: row.id,
      name: row.name,
      modelId: row.modelId,
    })),
    validationErrors: patchValidationErrors,
  };
  const handleRefreshVisualization = useCallback(() => {
    setVizRefreshTick((tick) => tick + 1);
    setVizRefreshedAt(new Date().toLocaleTimeString());
    if (visualizationScope === "content-pack") {
      return;
    }
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
      data.traitNames ?? []
    ) as SpaceData;
    setData(next);
  }, [data, visualizationScope]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <MultiStepLoader
        loadingStates={TEST_MODE_LOADING_STATES.map((row) => ({
          text: row.text,
        }))}
        loading={pipelineLoading}
        duration={900}
        loop={false}
      />
      <section
        id="panel-content-space-explorer"
        data-ui-id="panel-content-space-explorer"
        data-theme-context="header"
        className={`overflow-hidden rounded border bg-background ${
          testModeEnabled
            ? "border-emerald-400/50 shadow-[0_0_0_1px_rgba(16,185,129,0.18)]"
            : "border-border"
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
                disabled={!testModeAllowed || quickTestBusy || pipelineLoading}
                title="Build content pack bundle and generate report"
                aria-label="Build content pack bundle and generate report"
              >
                <SparklesIcon className="size-3.5" />
              </Button>
            </div>
            {showUiIds ? (
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                ID: panel-content-space-explorer
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <div
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
              title="Current pack timestamp"
            >
              <Clock3Icon className="size-3.5" />
              <span className="font-mono text-foreground">
                {loadedPackIdentity?.packVersion ?? "unknown"}
              </span>
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
                <label
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
                  title="Select pack source"
                >
                  <PackageIcon className="size-3.5" />
                  <select
                    value={selectedPackOptionId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setSelectedPackOptionId(nextId);
                      const selected = packOptions.find(
                        (row) => row.id === nextId
                      );
                      if (!selected) return;
                      if (selected.kind === "bundle") {
                        loadBundlePack();
                        return;
                      }
                      if (
                        selected.kind === "content-pack-report" &&
                        selected.reportId
                      ) {
                        loadContentPackReport(selected.reportId);
                        return;
                      }
                      if (
                        selected.kind === "uploaded" &&
                        selected.overrides &&
                        selected.identity
                      ) {
                        setSpaceOverrides(selected.overrides);
                        setBaseSpaceVectors(selected.overrides);
                        const instances =
                          parseModelInstancesFromContentBindings(
                            selected.overrides
                          );
                        if (instances.length > 0) {
                          replaceModelInstances(instances);
                        }
                        setLoadedPackIdentity(selected.identity);
                        persistActivePackSnapshot(selected.identity);
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
                <label
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
                  title="Select report source"
                >
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
                  busy={
                    deliveryBusy ||
                    bundleBusy ||
                    quickTestBusy ||
                    pipelineLoading
                  }
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
        <div className="grid gap-0 xl:grid-cols-[520px_minmax(0,1fr)]">
          <div
            id="panel-controls-left"
            data-ui-id="panel-controls-left"
            className="space-y-3 border-b border-border p-3 xl:border-r xl:border-b-0"
          >
            <Tabs
              value={visualizationScope}
              onValueChange={(value) =>
                setVisualizationScope(
                  value === "content-pack" ? "content-pack" : "asset"
                )
              }
              className="space-y-3"
            >
              <TabsList className="grid h-8 w-full grid-cols-2">
                <TabsTrigger value="asset" className="text-xs">
                  Asset
                </TabsTrigger>
                <TabsTrigger value="content-pack" className="text-xs">
                  Content Pack
                </TabsTrigger>
              </TabsList>

              <TabsContent value="asset" className="mt-0 space-y-3">
                <div
                  id="panel-control-header"
                  data-ui-id="panel-control-header"
                  className="flex items-center gap-2"
                >
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold">
                      {selectedCanonicalAsset
                        ? selectedCanonicalAsset.name
                        : "No Asset Selected"}
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
                        const instance = canonicalAssetOptions.find(
                          (row) => row.id === instanceId
                        );
                        if (!instance) return;
                        setActiveModelSelection(instance.modelId, instance.id);
                      }}
                      className="ml-1 rounded border border-border bg-background px-2 py-1 text-[11px] text-foreground"
                    >
                      <option value="">None</option>
                      {canonicalAssetOptions.map((asset) => (
                        <option
                          key={`asset-option-${asset.id}`}
                          value={asset.id}
                        >
                          {asset.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <HelpInfo
                    tone="header"
                    title="Control Panel Header"
                    body="Single-asset controls. Select a canonical asset and inspect stat layers."
                  />
                </div>
                <details
                  id="panel-content-vector-controls"
                  data-ui-id="panel-content-vector-controls"
                  open
                  className="rounded border border-border bg-background/50"
                >
                  <summary className="cursor-pointer px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Stat Control
                    <HelpInfo
                      tone="header"
                      title="Stat Control"
                      body="Content levels are stat-model layers inherited by the loaded asset. Toggle levels on/off to expand or collapse the active space."
                    />
                  </summary>
                  <div className="space-y-3 border-t p-2">
                    <div
                      id="panel-content-features-base"
                      data-ui-id="panel-content-features-base"
                      className="space-y-2"
                    >
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
                                style={{
                                  borderColor: group.colorBorder,
                                  backgroundColor: group.colorSoft,
                                }}
                              >
                                <div className="mb-2 flex items-center justify-between gap-2">
                                  <div className="min-w-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                                    <span
                                      className="inline-block size-2 rounded-full align-middle"
                                      style={{ backgroundColor: group.color }}
                                    />
                                    <span className="ml-1 align-middle">
                                      {formatModelIdForUi(group.modelId)}
                                      {group.isBase
                                        ? " (parent)"
                                        : " (derived)"}
                                    </span>
                                  </div>
                                  <Switch
                                    checked={group.isEnabled}
                                    onCheckedChange={(checked) => {
                                      setEnabledStatLevelById((prev) => ({
                                        ...prev,
                                        [group.modelId]: checked,
                                      }));
                                    }}
                                    size="sm"
                                    aria-label={`Toggle ${group.modelId} content level`}
                                  />
                                </div>
                                <div className="space-y-2">
                                  {group.featureIds.map((featureId) => {
                                    const isFeature = (
                                      FEATURE_NAMES as readonly string[]
                                    ).includes(featureId);
                                    const min = isFeature ? 0 : -1;
                                    const max = isFeature ? 100 : 1;
                                    const step = isFeature ? 1 : 0.01;
                                    const value = getFeatureValue(featureId);
                                    return (
                                      <label
                                        key={`${group.modelId}-${featureId}`}
                                        className="grid grid-cols-[1fr_120px_56px] items-center gap-2"
                                      >
                                        <span className="truncate text-[11px] text-muted-foreground">
                                          {featureId}
                                        </span>
                                        <input
                                          type="range"
                                          min={min}
                                          max={max}
                                          step={step}
                                          value={value}
                                          onChange={(e) =>
                                            setFeatureValue(
                                              featureId,
                                              Number(e.target.value)
                                            )
                                          }
                                          className="w-full"
                                          style={{ accentColor: group.color }}
                                          disabled={!group.isEnabled}
                                        />
                                        <span className="font-mono text-[10px] text-muted-foreground">
                                          {isFeature
                                            ? value.toFixed(0)
                                            : value.toFixed(2)}
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-[11px] text-muted-foreground">
                              Loaded asset does not expose stat-model levels for
                              this space.
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">
                          Select a content space to edit model stats.
                        </p>
                      )}
                    </div>
                  </div>
                </details>
              </TabsContent>

              <TabsContent
                value="content-pack"
                className="mt-0 flex min-h-[640px] flex-col space-y-3"
              >
                <div
                  id="panel-control-header-pack"
                  data-ui-id="panel-control-header-pack"
                  className="flex items-center gap-2"
                >
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold">
                      {loadedPackIdentity?.packId ?? "Content Pack View"}
                    </h2>
                  </div>
                  <HelpInfo
                    tone="header"
                    title="Content Pack View"
                    body="Pack-level controls. Use layers to drive the shared visualization panel."
                  />
                </div>
                <div className="flex min-h-0 flex-1 flex-col rounded border border-border bg-background/50 p-2">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Object Tree Scope
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => {
                        setScopeRootModelId(null);
                        setActiveModelSelection(NO_MODEL_SELECTED, null);
                      }}
                    >
                      Clear Scope
                    </Button>
                  </div>
                  <Tabs
                    value={packTreeView}
                    onValueChange={(value) =>
                      setPackTreeView(value === "stats" ? "stats" : "models")
                    }
                    className="mb-2"
                  >
                    <TabsList className="grid h-7 w-full grid-cols-2">
                      <TabsTrigger value="models" className="text-[10px]">
                        Models
                      </TabsTrigger>
                      <TabsTrigger value="stats" className="text-[10px]">
                        Stats
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <div className="min-h-0 flex-1 space-y-1 overflow-auto pr-1">
                    <div
                      className={`rounded border px-2 py-1 text-[11px] ${
                        selectedScopeTreeNodeId === "pack-root"
                          ? "border-cyan-400/60 bg-cyan-500/10 text-cyan-100"
                          : "border-border/80 text-foreground"
                      }`}
                    >
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => {
                          setScopeRootModelId(null);
                          setActiveModelSelection(NO_MODEL_SELECTED, null);
                        }}
                      >
                        Pack Root
                      </button>
                    </div>
                    {packTreeRoots.length > 0 ? (
                      packTreeView === "stats" ? (
                        <div className="rounded border border-cyan-400/30 bg-cyan-500/5 p-1">
                          {groupedPackTreeRoots.stats.length > 0 ? (
                            renderPackScopeTree(
                              groupedPackTreeRoots.stats,
                              "stats"
                            )
                          ) : (
                            <p className="px-1 py-1 text-[11px] text-muted-foreground">
                              No stat models.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="rounded border border-indigo-400/30 bg-indigo-500/5 p-1">
                          {groupedPackTreeRoots.models.length > 0 ? (
                            renderPackScopeTree(
                              groupedPackTreeRoots.models,
                              "models"
                            )
                          ) : (
                            <p className="px-1 py-1 text-[11px] text-muted-foreground">
                              No models.
                            </p>
                          )}
                        </div>
                      )
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        No models in loaded pack.
                      </p>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div
            id="panel-summary-right"
            data-ui-id="panel-summary-right"
            className="p-3"
          >
            <section
              id="panel-visualization"
              data-ui-id="panel-visualization"
              data-theme-context="content"
              className="mt-4 min-h-[420px] rounded border border-border bg-background"
            >
              <div className="border-b border-border px-3 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">Visualization Panel</p>
                    <span className="rounded border border-border/70 bg-background/30 px-1.5 py-0 text-[9px] uppercase tracking-wide text-muted-foreground">
                      panel-visualization
                    </span>
                  </div>
                  {visualizationScope === "content-pack" ? (
                    <div className="flex min-w-0 flex-1 items-center justify-end gap-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                        {scopePathCrumbs.map((crumb, index) => {
                          const selected =
                            (crumb.modelId ?? null) ===
                            (effectiveScopeRootModelId ?? null);
                          return (
                            <span
                              key={`scope-breadcrumb-${index}-${crumb.label}`}
                              className="inline-flex items-center gap-1"
                            >
                              {index > 0 ? (
                                <ChevronRightIcon className="size-3 text-muted-foreground/70" />
                              ) : null}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className={`h-5 rounded border px-1.5 text-[10px] ${
                                  selected
                                    ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-100"
                                    : "border-border/70 bg-background/40 text-foreground"
                                }`}
                                onClick={() => {
                                  setScopeRootModelId(crumb.modelId);
                                  if (crumb.modelId) {
                                    setActiveModelSelection(crumb.modelId, null);
                                  } else {
                                    setActiveModelSelection(
                                      NO_MODEL_SELECTED,
                                      null
                                    );
                                  }
                                }}
                                title={
                                  crumb.modelId
                                    ? `Scope to ${crumb.modelId}`
                                    : "Scope to pack root"
                                }
                              >
                                {crumb.label}
                              </Button>
                            </span>
                          );
                        })}
                      </div>
                      {effectiveStatSpaceIds.length > 0 ? (
                        <div className="ml-1 flex items-center gap-1">
                          {effectiveStatSpaceIds.map((statSpaceId) => {
                            const enabled = enabledStatSpaces[statSpaceId] !== false;
                            const hue =
                              modelHueById.get(statSpaceId) ??
                              modelSurfaceHue(statSpaceId);
                            return (
                              <Button
                                key={`stat-space-toggle-${statSpaceId}`}
                                type="button"
                                variant="ghost"
                                size="sm"
                                className={`h-5 rounded border px-1.5 text-[10px] ${
                                  enabled
                                    ? "text-foreground"
                                    : "text-muted-foreground opacity-55"
                                }`}
                                style={{
                                  borderColor: `hsla(${hue}, 84%, 58%, ${enabled ? 0.7 : 0.35})`,
                                  backgroundColor: `hsla(${hue}, 84%, 45%, ${enabled ? 0.2 : 0.08})`,
                                }}
                                onClick={() => {
                                  setEnabledStatSpaces((prev) => ({
                                    ...prev,
                                    [statSpaceId]: !enabled,
                                  }));
                                }}
                                title={`Toggle ${statSpaceId} space`}
                              >
                                {formatModelIdForUi(statSpaceId)}
                              </Button>
                            );
                          })}
                        </div>
                      ) : null}
                      <div className="flex shrink-0 items-center gap-1">
                        <div className="flex items-center rounded border border-border/80 bg-background/40">
                          <input
                            type="number"
                            min={0}
                            max={maxTurn}
                            value={selectedTurn}
                            onChange={(e) =>
                              setSelectedTurn(
                                Math.max(
                                  0,
                                  Math.min(maxTurn, Number(e.target.value) || 0)
                                )
                              )
                            }
                            className="h-6 w-12 border-0 bg-transparent px-1.5 py-0 text-[10px] text-foreground outline-none"
                            title="Turn"
                          />
                          <div className="flex flex-col border-l border-border/70">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedTurn((t) => Math.min(maxTurn, t + 1))
                              }
                              className="px-1 py-0 text-muted-foreground hover:bg-muted/30"
                              disabled={selectedTurn >= maxTurn}
                              title="Next turn"
                            >
                              <ChevronUpIcon className="h-2.5 w-2.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedTurn((t) => Math.max(0, t - 1))
                              }
                              className="border-t border-border/70 px-1 py-0 text-muted-foreground hover:bg-muted/30"
                              disabled={selectedTurn <= 0}
                              title="Previous turn"
                            >
                              <ChevronDownIcon className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 w-6 px-0"
                          onClick={handleRefreshVisualization}
                          title="Refresh PCA/clusters from current data."
                        >
                          <RefreshCwIcon className="h-3 w-3" />
                        </Button>
                        {vizRefreshedAt ? (
                          <span className="rounded border border-border/70 bg-background/30 px-1.5 py-0 text-[9px] text-muted-foreground">
                            refreshed {vizRefreshedAt}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  <HelpInfo
                    tone="content"
                    title="Visualization Panel"
                    body="Main plotting surface. Toggle 3D, 2D, Info, and Stat Modifiers views. Header badges show top-K reachable entries for the current space."
                  />
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="rounded border border-sky-400/50 bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-100">
                    Reachability
                  </span>
                  <span className="rounded border border-border bg-muted/20 px-2 py-0.5 text-[10px] text-muted-foreground">
                    Algo:{" "}
                    <span className="font-semibold text-foreground">
                      {effectiveAlgorithm}
                    </span>
                  </span>
                  <span className="rounded border border-border bg-muted/20 px-2 py-0.5 text-[10px] text-muted-foreground">
                    K:{" "}
                    <span className="font-semibold text-foreground">
                      {nearestRows.length}
                    </span>
                  </span>
                  {nearestRows.length > 0
                    ? nearestRows.slice(0, 8).map((row) => {
                        const { Icon, className } = getTypeBadgeMeta(row.type);
                        return (
                          <span
                            key={`header-reach-${row.type}-${row.id}`}
                            className={`inline-flex max-w-[240px] items-center gap-1 rounded border px-2 py-0.5 text-[10px] ${className}`}
                            title={`${row.name} (${row.type}/${row.branch}) score=${row.score.toFixed(3)}`}
                          >
                            <Icon className="size-3 shrink-0" />
                            <span
                              className={`rounded border px-1 py-[1px] uppercase ${getBranchBadgeClass(row.branch)}`}
                            >
                              {row.branch}
                            </span>
                            <span className="truncate">{row.name}</span>
                          </span>
                        );
                      })
                    : null}
                </div>
              </div>
              <div
                id="panel-visualization-toolbar"
                data-ui-id="panel-visualization-toolbar"
                className="flex flex-wrap items-center gap-2 border-b border-border px-2 py-2"
              >
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
                  id="btn-viz-2d"
                  data-ui-id="btn-viz-2d"
                  type="button"
                  onClick={() => setVizMode("2d")}
                  className={`rounded px-3 py-1.5 text-xs font-semibold ${vizMode === "2d" ? "bg-cyan-500/20 text-cyan-100" : "text-muted-foreground hover:bg-muted/30"}`}
                  title="Interactive 2D projection."
                >
                  2D
                </button>
                <button
                  id="btn-viz-info"
                  data-ui-id="btn-viz-info"
                  type="button"
                  onClick={() => {
                    if (!contentPackInfoEnabled) return;
                    setVizMode("json");
                  }}
                  disabled={!contentPackInfoEnabled}
                  className={`rounded px-3 py-1.5 text-xs font-semibold ${
                    !contentPackInfoEnabled
                      ? "cursor-not-allowed opacity-40"
                      : vizMode === "json"
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:bg-muted/30"
                  }`}
                  title="Info panel with code/schema/data tabs."
                >
                  Info
                </button>
                <button
                  id="btn-viz-deltas"
                  data-ui-id="btn-viz-deltas"
                  type="button"
                  onClick={() => {
                    if (!statModifiersEnabled) return;
                    setVizMode("deltas");
                  }}
                  disabled={!statModifiersEnabled}
                  className={`rounded px-3 py-1.5 text-xs font-semibold ${
                    !statModifiersEnabled
                      ? "cursor-not-allowed opacity-40"
                      : vizMode === "deltas"
                        ? "bg-violet-500/20 text-violet-100"
                        : "text-muted-foreground hover:bg-muted/30"
                  }`}
                  title={
                    statModifiersEnabled
                      ? "Inspect selected asset stat sets and their stat modifiers."
                      : "Select an asset to inspect stat modifiers."
                  }
                >
                  Stat Modifiers
                </button>
                {visualizationScope === "content-pack" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={`h-7 rounded px-2 text-[11px] ${
                      showLayerOverlays
                        ? "bg-cyan-500/20 text-cyan-100"
                        : "text-muted-foreground"
                    }`}
                    onClick={() => setShowLayerOverlays((prev) => !prev)}
                    title="Toggle 3D layer-space overlay blocks"
                  >
                    Layer Overlay
                  </Button>
                ) : null}
                <div className="ml-auto flex items-center gap-2">
                  <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    Distance Algorithm
                    <select
                      value={distanceAlgorithm}
                      onChange={(e) =>
                        setDistanceAlgorithm(
                          e.target.value as DistanceAlgorithm
                        )
                      }
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
                      onChange={(e) =>
                        setNearestK(
                          Math.max(1, Math.min(50, Number(e.target.value) || 1))
                        )
                      }
                      className="w-14 rounded border border-border bg-background px-1.5 py-1 text-xs text-foreground"
                    />
                  </label>
                </div>
              </div>
              <div
                id="panel-visualization-content"
                data-ui-id="panel-visualization-content"
                className="min-h-[420px] p-2"
              >
                {vizMode === "3d" || vizMode === "2d" ? (
                  <div className="h-full min-h-[400px] w-full">
                    {visualizationScope === "content-pack" ? (
                      <div className="h-full min-h-[340px] rounded border border-border bg-muted/10 p-1">
                        {scopedCanonicalNodes.length > 0 ? (
                          <DimensionPlotlyComponent
                            key={`dim-${vizMode}-${vizRefreshTick}-${effectiveScopeRootModelId ?? "root"}`}
                            layers={dimensionNodesByLayer}
                            projection={vizMode === "2d" ? "2d" : "3d"}
                            selectedCanonicalAssetId={selectedCanonicalAsset?.id ?? null}
                            onSelectCanonicalAsset={(assetId) => {
                              const selected = canonicalAssetOptions.find(
                                (asset) => asset.id === assetId
                              );
                              if (!selected) return;
                              selectCanonicalAssetInPackScope(selected);
                            }}
                            modelHueById={Object.fromEntries(modelHueById)}
                            statSpaceOverlays={statSpaceOverlays}
                            showLayerOverlays={showLayerOverlays}
                            layerSpaceOverlays={layerSpaceOverlays}
                            selectedModelId={
                              activeModelSchemaId !== NO_MODEL_SELECTED
                                ? activeModelSchemaId
                                : null
                            }
                          />
                        ) : (
                          <div className="flex h-full min-h-[320px] items-center justify-center text-xs text-muted-foreground">
                            Add assets to view where this model appears in content space.
                          </div>
                        )}
                      </div>
                    ) : testModeEnabled && !testModeGeneratedAt ? (
                      <div className="flex h-full min-h-[400px] items-center justify-center rounded border border-dashed border-emerald-400/40 bg-emerald-500/5">
                        <div className="flex flex-col items-center gap-2 text-center">
                          <FlaskConicalIcon className="size-6 text-emerald-200" />
                          <p className="text-sm font-medium text-emerald-100">
                            Empty {vizMode.toUpperCase()} Test Space
                          </p>
                          <p className="max-w-md text-xs text-emerald-200/80">
                            Generate a bundle + report from the header spark
                            button to populate visualization.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <PlotlyComponent
                        key={`space-${vizMode}-${vizRefreshTick}-${selectedTurn}`}
                        content={content}
                        contentCoords={contentCoords}
                        player3d={player3d}
                        modelSpacePoints={selectedModelSpacePoints}
                        colorBy={markerColorBy}
                        projection={vizMode}
                        selectedId={selectedPoint?.id ?? null}
                        onSelect={(id) => {
                          const pt = content.find((p) => p.id === id);
                          setSelectedPoint(pt ?? null);
                        }}
                      />
                    )}
                  </div>
                ) : vizMode === "json" ? (
                  <div className="h-full min-h-[400px] w-full space-y-2">
                    {visualizationScope === "content-pack" ? (
                      <div className="rounded border border-border bg-muted/10 p-2">
                        <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                          Scoped Summary
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[10px]">
                          <span className="rounded border border-border/70 bg-muted/20 px-2 py-0.5 text-muted-foreground">
                            Scope Root:{" "}
                            <span className="font-semibold text-foreground">
                              {effectiveScopeRootModelId ?? "Pack Root"}
                            </span>
                          </span>
                          <span className="rounded border border-border/70 bg-muted/20 px-2 py-0.5 text-muted-foreground">
                            Models:{" "}
                            <span className="font-semibold text-foreground">
                              {scopedSchemaNodes.length}
                            </span>
                          </span>
                          <span className="rounded border border-border/70 bg-muted/20 px-2 py-0.5 text-muted-foreground">
                            Canonical:{" "}
                            <span className="font-semibold text-foreground">
                              {scopedCanonicalNodes.length}
                            </span>
                          </span>
                        </div>
                        {topScopedContributors.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                            {topScopedContributors.map((node) => (
                              <span
                                key={`scope-top-${node.id}`}
                                className="rounded border border-border/70 bg-muted/20 px-2 py-0.5 text-muted-foreground"
                              >
                                {formatModelIdForUi(node.modelId)}{" "}
                                <span className="font-semibold text-foreground">
                                  {(node.contentSharePct * 100).toFixed(1)}%
                                </span>
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {(visualizationScope === "content-pack"
                      ? Boolean(selectedInfoAsset && selectedInfoModelSchema)
                      : Boolean(selectedInfoModelSchema)) ? (
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
                              <span className="truncate">
                                {activeInfoSchemaTab?.label ?? ""}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setVizInfoEditorCode(
                                  activeInfoSchemaTab?.code ?? ""
                                )
                              }
                              className="opacity-0 transition-opacity group-hover/code:opacity-100 hover:text-foreground"
                            >
                              Reset
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await navigator.clipboard.writeText(
                                  vizInfoEditorCode
                                );
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
                            language={codeLanguageForTabId(
                              activeInfoSchemaTab?.id ?? ""
                            )}
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
                        {visualizationScope === "content-pack"
                          ? "Select a canonical asset to inspect info."
                          : "No model selected. Choose an asset or model to inspect info."}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full min-h-[400px] overflow-auto rounded border border-border bg-muted/10 p-2">
                    {!statModifiersEnabled ? (
                      <div className="flex h-full min-h-[360px] items-center justify-center text-xs text-muted-foreground">
                        Select an asset to view its stat sets and stat modifiers.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="rounded border border-border bg-background/50 px-2 py-1.5 text-[11px] text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            {selectedCanonicalAsset?.name}
                          </span>{" "}
                          <span className="font-mono">
                            ({selectedCanonicalAsset?.modelId})
                          </span>
                        </div>
                        {selectedAssetStatLevelSchemas.map(({ level, schema }) => (
                          <div
                            key={`viz-stat-modifier-${schema.modelId}`}
                            className="rounded border p-2"
                            style={{
                              borderColor: level.colorBorder,
                              backgroundColor: level.colorSoft,
                            }}
                          >
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground">
                                <span
                                  className="inline-block size-2 rounded-full"
                                  style={{ backgroundColor: level.color }}
                                />
                                {formatModelIdForUi(schema.modelId)}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {schema.featureRefs.length} stats
                              </span>
                            </div>
                            <div className="space-y-1 rounded border border-border/60 bg-background/40 p-1.5">
                              {schema.featureRefs.map((featureRef) => (
                                <div
                                  key={`${schema.modelId}:${featureRef.featureId}`}
                                  className="flex items-center justify-between gap-2 text-[11px]"
                                >
                                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                                    <BarChart3Icon className="size-3.5" />
                                    {featureRef.featureId}
                                  </span>
                                  <span className="font-mono text-foreground">
                                    {getFeatureValue(featureRef.featureId).toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                            {(schema.statModifiers ?? []).length > 0 ? (
                              <div className="mt-2 space-y-1">
                                <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                  Stat Modifiers
                                </div>
                                {(schema.statModifiers ?? []).map((modifier) => {
                                  const modifierSchema =
                                    statSchemaById.get(modifier.modifierStatModelId) ?? null;
                                  return (
                                    <div
                                      key={`${schema.modelId}:${modifier.modifierStatModelId}`}
                                      className="rounded border border-border/60 bg-background/50 p-1.5"
                                    >
                                      <div className="mb-1 text-[10px] font-semibold text-foreground">
                                        {formatModelIdForUi(modifier.modifierStatModelId)}
                                        {modifierSchema
                                          ? ` (${modifierSchema.featureRefs.length} stats)`
                                          : ""}
                                      </div>
                                      <div className="space-y-1">
                                        {modifier.mappings.map((mapping) => (
                                          <div
                                            key={`${schema.modelId}:${modifier.modifierStatModelId}:${mapping.modifierFeatureId}`}
                                            className="grid grid-cols-[1fr_18px_1fr] items-center gap-1 text-[10px]"
                                          >
                                            <span className="truncate font-mono text-muted-foreground">
                                              {mapping.modifierFeatureId}
                                            </span>
                                            <span className="text-center text-muted-foreground">
                                              &rarr;
                                            </span>
                                            <span className="truncate font-mono text-foreground">
                                              {mapping.targetFeatureId}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="mt-2 text-[10px] text-muted-foreground">
                                No stat modifiers configured for this stat set.
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
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
        onToggleStatModifierForStatSet={toggleStatModifierForStatSet}
        onUpdateStatModifierMapping={updateStatModifierMapping}
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
