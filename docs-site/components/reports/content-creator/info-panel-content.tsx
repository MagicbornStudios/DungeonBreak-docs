"use client";

import {
  IconChartBar as BarChart3Icon,
  IconHierarchy3 as BoxesIcon,
  IconFileCode as FileCode2Icon,
  IconPencil as PencilIcon,
  IconPlus as PlusIcon,
  IconTrash as Trash2Icon,
} from "@tabler/icons-react";
import type { ReactNode } from "react";

type FeatureRef = {
  featureId: string;
  spaces: string[];
  required?: boolean;
  defaultValue?: number;
};

type RuntimeModelSchemaRow = {
  modelId: string;
  label: string;
  description?: string;
  featureRefs: FeatureRef[];
};

type RuntimeFeatureSchemaRow = {
  featureId: string;
};

type ModelTreeNodeLike = {
  id: string;
};

type ModelInstanceBinding = {
  id: string;
  name: string;
  modelId: string;
  canonical: boolean;
};

type StatsInfoPanelContentProps = {
  selectedTreeNode: ModelTreeNodeLike | null;
  panelModelSchema: RuntimeModelSchemaRow | null;
  runtimeFeatureSchema: RuntimeFeatureSchemaRow[];
  featureDefaultMap: Map<string, number>;
  newStatFeatureId: string;
  newStatModelIdDraft: string;
  newStatLabelDraft: string;
  newStatTemplateModelId?: string;
  onSetNewStatFeatureId: (next: string) => void;
  onSetNewStatModelIdDraft: (next: string) => void;
  onSetNewStatLabelDraft: (next: string) => void;
  onCreateModelSchema: (modelId: string, label?: string, templateModelId?: string) => void;
  onSelectTreeNodeId: (nodeId: string) => void;
  onAddFeatureRefToModel: (modelId: string, featureId: string) => void;
  onRemoveFeatureRefFromModel: (modelId: string, featureId: string) => void;
  onUpdateFeatureRefDefaultValue: (modelId: string, featureId: string, defaultValue: number | null) => void;
  normalizeModelId: (value: string) => string;
};

export function StatsInfoPanelContent(props: StatsInfoPanelContentProps) {
  const {
    selectedTreeNode,
    panelModelSchema,
    runtimeFeatureSchema,
    featureDefaultMap,
    newStatFeatureId,
    newStatModelIdDraft,
    newStatLabelDraft,
    newStatTemplateModelId,
    onSetNewStatFeatureId,
    onSetNewStatModelIdDraft,
    onSetNewStatLabelDraft,
    onCreateModelSchema,
    onSelectTreeNodeId,
    onAddFeatureRefToModel,
    onRemoveFeatureRefFromModel,
    onUpdateFeatureRefDefaultValue,
    normalizeModelId,
  } = props;

  if (selectedTreeNode?.id === "group:stats") {
    return (
      <div className="space-y-2">
        <div className="rounded border border-border bg-muted/20 p-2 text-xs text-muted-foreground">
          <div className="font-medium text-foreground">stats</div>
          <div>Reusable stat models used to define stat spaces and defaults.</div>
        </div>
        <div className="rounded border border-cyan-400/30 bg-cyan-500/5 p-2 text-xs">
          <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-cyan-100">Create Stat Set</div>
          <div className="grid gap-2">
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Stat Model Id
              <input
                type="text"
                value={newStatModelIdDraft}
                onChange={(event) => onSetNewStatModelIdDraft(event.target.value)}
                placeholder="combatstats2"
                className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
              />
            </label>
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Label
              <input
                type="text"
                value={newStatLabelDraft}
                onChange={(event) => onSetNewStatLabelDraft(event.target.value)}
                placeholder="Combat Stats 2"
                className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                const nextIdRaw = normalizeModelId(newStatModelIdDraft);
                if (!nextIdRaw) return;
                const nextId = nextIdRaw.endsWith("stats") ? nextIdRaw : `${nextIdRaw}stats`;
                onCreateModelSchema(nextId, newStatLabelDraft.trim() || nextId, newStatTemplateModelId);
                onSelectTreeNodeId(`model:${nextId}`);
              }}
              className="inline-flex items-center gap-1 rounded border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-[10px] uppercase tracking-wide text-emerald-100 hover:bg-emerald-500/20"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Create Stat Set
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!panelModelSchema) {
    return <p className="text-xs text-muted-foreground">Select a stat model to inspect stat definitions.</p>;
  }

  return (
    <div className="space-y-2 text-xs">
      <div className="rounded border border-border bg-muted/20 p-2">
        <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Stat Model</div>
        <div className="font-mono text-foreground">{panelModelSchema.modelId}</div>
        {panelModelSchema.description ? <div className="mt-1 text-muted-foreground">{panelModelSchema.description}</div> : null}
      </div>
      <div>
        <div className="mb-1 text-[11px] font-medium uppercase text-muted-foreground">
          Stats ({panelModelSchema.featureRefs.length})
        </div>
        <div className="max-h-[42vh] overflow-auto rounded border border-border">
          {panelModelSchema.featureRefs.map((ref) => (
            <div
              key={`${panelModelSchema.modelId}-${ref.featureId}-${ref.spaces.join("|")}`}
              className="flex items-center justify-between border-b border-border px-2 py-1 text-[11px] last:border-b-0"
            >
              <span className="font-mono text-foreground">{ref.featureId}</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.01"
                  value={(ref.defaultValue ?? featureDefaultMap.get(ref.featureId) ?? 0).toFixed(2)}
                  onChange={(event) =>
                    onUpdateFeatureRefDefaultValue(panelModelSchema.modelId, ref.featureId, Number(event.target.value))
                  }
                  className="w-20 rounded border border-border bg-background px-1.5 py-0.5 text-right font-mono text-[10px] text-foreground"
                />
                <button
                  type="button"
                  onClick={() => onRemoveFeatureRefFromModel(panelModelSchema.modelId, ref.featureId)}
                  className="rounded border border-red-500/40 px-1 py-0.5 text-red-200 hover:bg-red-500/10"
                  title="Remove stat variable"
                >
                  <Trash2Icon className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <select
            value={newStatFeatureId}
            onChange={(event) => onSetNewStatFeatureId(event.target.value)}
            className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1 text-[11px] text-foreground"
          >
            <option value="">Select variable...</option>
            {runtimeFeatureSchema
              .filter((row) => !panelModelSchema.featureRefs.some((ref) => ref.featureId === row.featureId))
              .map((row) => (
                <option key={`stat-feature-option-${row.featureId}`} value={row.featureId}>
                  {row.featureId}
                </option>
              ))}
          </select>
          <button
            type="button"
            onClick={() => {
              if (!newStatFeatureId) return;
              onAddFeatureRefToModel(panelModelSchema.modelId, newStatFeatureId);
              onSetNewStatFeatureId("");
            }}
            className="inline-flex items-center gap-1 rounded border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-[10px] uppercase tracking-wide text-emerald-100 hover:bg-emerald-500/20"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Add Variable
          </button>
        </div>
      </div>
    </div>
  );
}

type ModelsInfoPanelContentProps = {
  selectedTreeNode: ModelTreeNodeLike | null;
  canonicalAssetCount: number;
  modelDefinitionCount: number;
};

export function ModelsInfoPanelContent({
  selectedTreeNode,
  canonicalAssetCount,
  modelDefinitionCount,
}: ModelsInfoPanelContentProps) {
  if (selectedTreeNode?.id !== "group:models") {
    return <p className="text-xs text-muted-foreground">Select a model node to inspect and edit model metadata.</p>;
  }
  return (
    <div className="space-y-2">
      <div className="rounded border border-border bg-muted/20 p-2 text-xs text-muted-foreground">
        <div className="font-medium text-foreground">models</div>
        <div>Model classes and inheritance hierarchy for content object authoring.</div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded border border-border bg-background/50 p-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Canonical Assets</div>
          <div className="mt-1 text-lg font-semibold text-foreground">{canonicalAssetCount}</div>
        </div>
        <div className="rounded border border-border bg-background/50 p-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Model Definitions</div>
          <div className="mt-1 text-lg font-semibold text-foreground">{modelDefinitionCount}</div>
        </div>
      </div>
    </div>
  );
}

type CanonicalInfoPanelContentProps = {
  panelModelSchema: RuntimeModelSchemaRow | null;
  panelModelInstance: ModelInstanceBinding | null;
  panelResolvedFeatureRefs: FeatureRef[];
  featureDefaultMap: Map<string, number>;
  canonicalTab: "edit" | "code";
  canonicalCreateName: string;
  canonicalCreateModelId: string;
  canonicalNameDraft: string;
  sharedCodeBlockPanel: ReactNode;
  onSetCanonicalTab: (next: "edit" | "code") => void;
  onSetCanonicalCreateName: (next: string) => void;
  onSetCanonicalNameDraft: (next: string) => void;
  onAddCanonicalAsset: (modelId: string, name?: string) => void;
  onRenameModelInstance: (id: string, name: string) => void;
  onDeleteModelInstance: (id: string) => void;
  onOpenCanonicalAssetInExplorer: (selection: { modelId: string; instanceId: string | null }) => void;
};

export function CanonicalInfoPanelContent(props: CanonicalInfoPanelContentProps) {
  const {
    panelModelSchema,
    panelModelInstance,
    panelResolvedFeatureRefs,
    featureDefaultMap,
    canonicalTab,
    canonicalCreateName,
    canonicalCreateModelId,
    canonicalNameDraft,
    sharedCodeBlockPanel,
    onSetCanonicalTab,
    onSetCanonicalCreateName,
    onSetCanonicalNameDraft,
    onAddCanonicalAsset,
    onRenameModelInstance,
    onDeleteModelInstance,
    onOpenCanonicalAssetInExplorer,
  } = props;

  if (!panelModelSchema) {
    return <p className="text-xs text-muted-foreground">Select a canonical asset or canonical model to inspect stats.</p>;
  }

  const canonicalTitlePlaceholder = "new_canonical_asset";
  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center justify-between border-b border-border pb-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onSetCanonicalTab("edit")}
            className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${
              canonicalTab === "edit"
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:bg-muted/30"
            }`}
            title="Edit canonical asset"
          >
            <PencilIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onSetCanonicalTab("code")}
            className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${
              canonicalTab === "code"
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:bg-muted/30"
            }`}
            title="View generated code"
          >
            <FileCode2Icon className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="inline-flex items-center gap-1 rounded border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono text-amber-100">
          <BoxesIcon className="h-3.5 w-3.5" />
          {panelModelSchema.modelId}
        </div>
        <button
          type="button"
          disabled={!panelModelInstance?.canonical}
          onClick={() => {
            if (!panelModelInstance?.canonical) return;
            if (!window.confirm(`Delete object '${panelModelInstance.name}'? This removes it from serialized canonical assets.`)) return;
            onDeleteModelInstance(panelModelInstance.id);
          }}
          className="rounded border border-red-500/40 px-2 py-0.5 text-red-200 hover:bg-red-500/10 disabled:opacity-40"
          title="Delete canonical asset"
        >
          <Trash2Icon className="h-3.5 w-3.5" />
        </button>
      </div>
      {canonicalTab === "edit" ? (
        <div className="grid gap-2 md:grid-cols-2">
          <div className="rounded border border-border bg-muted/20 p-2">
            <div className="space-y-3">
              {panelModelInstance?.canonical ? (
                <div className="rounded border border-border bg-background/50 p-2">
                  <div
                    role="textbox"
                    contentEditable
                    suppressContentEditableWarning
                    onInput={(event) => onSetCanonicalNameDraft(event.currentTarget.textContent ?? "")}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return;
                      event.preventDefault();
                      (event.currentTarget as HTMLDivElement).blur();
                    }}
                    onBlur={(event) => {
                      const next = (event.currentTarget.textContent ?? "").trim();
                      if (!next) {
                        onSetCanonicalNameDraft(panelModelInstance.name);
                        event.currentTarget.textContent = panelModelInstance.name;
                        return;
                      }
                      if (next !== panelModelInstance.name) {
                        onRenameModelInstance(panelModelInstance.id, next);
                      }
                    }}
                    className="rounded border border-border bg-background px-2 py-1 text-lg font-semibold text-foreground outline-none focus:ring-1 focus:ring-primary"
                  >
                    {canonicalNameDraft || panelModelInstance.name}
                  </div>
                  <div className="mt-2 inline-flex items-center rounded border border-border bg-muted/30 px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                    {panelModelSchema.modelId}
                  </div>
                </div>
              ) : (
                <div className="rounded border border-border bg-background/50 p-2">
                  <div
                    role="textbox"
                    contentEditable
                    suppressContentEditableWarning
                    onFocus={(event) => {
                      if ((event.currentTarget.textContent ?? "").trim() === canonicalTitlePlaceholder) {
                        event.currentTarget.textContent = "";
                      }
                    }}
                    onInput={(event) => onSetCanonicalCreateName(event.currentTarget.textContent ?? "")}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return;
                      event.preventDefault();
                      (event.currentTarget as HTMLDivElement).blur();
                    }}
                    onBlur={(event) => {
                      const next = (event.currentTarget.textContent ?? "").trim();
                      if (!next) {
                        onSetCanonicalCreateName("");
                        event.currentTarget.textContent = canonicalTitlePlaceholder;
                      }
                    }}
                    className="rounded border border-border bg-background px-2 py-1 text-lg font-semibold text-foreground outline-none focus:ring-1 focus:ring-primary"
                  >
                    {canonicalCreateName || canonicalTitlePlaceholder}
                  </div>
                  <div className="mt-2 inline-flex items-center rounded border border-border bg-muted/30 px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                    {canonicalCreateModelId}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!canonicalCreateModelId) return;
                      const nextName = canonicalCreateName.trim();
                      onAddCanonicalAsset(canonicalCreateModelId, nextName || undefined);
                      onSetCanonicalCreateName("");
                    }}
                    className="mt-2 inline-flex items-center gap-1 rounded border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-[10px] uppercase tracking-wide text-emerald-100 hover:bg-emerald-500/20"
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                    Create
                  </button>
                </div>
              )}
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-[11px] font-medium uppercase text-muted-foreground">
              <span>Stats ({panelResolvedFeatureRefs.length})</span>
              <button
                type="button"
                onClick={() =>
                  onOpenCanonicalAssetInExplorer({
                    modelId: panelModelSchema.modelId,
                    instanceId: panelModelInstance?.id ?? null,
                  })
                }
                className="rounded border border-sky-400/40 bg-sky-500/10 px-2 py-0.5 text-[10px] text-sky-100 hover:bg-sky-500/20"
                title="Loads this model in the Space Explorer."
              >
                3D
              </button>
            </div>
            <div className="max-h-[42vh] overflow-auto rounded border border-border">
              {panelResolvedFeatureRefs.map((ref) => (
                <div
                  key={`canonical-${panelModelSchema.modelId}-${ref.featureId}-${ref.spaces.join("|")}`}
                  className="flex items-center justify-between border-b border-border px-2 py-1 text-[11px] last:border-b-0"
                >
                  <span className="inline-flex items-center gap-1 font-mono text-foreground">
                    <BarChart3Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    {ref.featureId}
                  </span>
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
      ) : (
        sharedCodeBlockPanel ?? <p className="text-xs text-muted-foreground">No code available for this selection.</p>
      )}
    </div>
  );
}
