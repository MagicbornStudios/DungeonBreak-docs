"use client";

import {
  IconChartBar as BarChart3Icon,
  IconCircleCheck as CircleCheckIcon,
  IconHierarchy3 as BoxesIcon,
  IconFileCode as FileCode2Icon,
  IconLoader2 as Loader2Icon,
  IconPencil as PencilIcon,
  IconPlus as PlusIcon,
  IconTrash as Trash2Icon,
} from "@tabler/icons-react";
import { useEffect, useState, type ReactNode } from "react";

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
  statModifiers?: Array<{
    modifierStatModelId: string;
    mappings: Array<{ modifierFeatureId: string; targetFeatureId: string }>;
  }>;
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
  runtimeModelSchemas: RuntimeModelSchemaRow[];
  runtimeFeatureSchema: RuntimeFeatureSchemaRow[];
  statColorByModelId: Map<string, string>;
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
  onDeleteModelSchema: (modelId: string) => void;
  onUpdateStatModifierMapping: (
    targetStatModelId: string,
    modifierStatModelId: string,
    modifierFeatureId: string,
    targetFeatureId: string
  ) => void;
  normalizeModelId: (value: string) => string;
};

export function StatsInfoPanelContent(props: StatsInfoPanelContentProps) {
  const {
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
    onSetNewStatFeatureId,
    onSetNewStatModelIdDraft,
    onSetNewStatLabelDraft,
    onCreateModelSchema,
    onSelectTreeNodeId,
    onAddFeatureRefToModel,
    onRemoveFeatureRefFromModel,
    onUpdateFeatureRefDefaultValue,
    onDeleteModelSchema,
    onUpdateStatModifierMapping,
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
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Stat Model</div>
          <button
            type="button"
            onClick={() => {
              if (
                !window.confirm(
                  `Delete stat model '${panelModelSchema.modelId}'? This may impact models and canonical assets that use it.`
                )
              ) {
                return;
              }
              onDeleteModelSchema(panelModelSchema.modelId);
            }}
            className="rounded border border-red-500/40 px-2 py-0.5 text-red-200 hover:bg-red-500/10"
            title="Delete stat model"
          >
            <Trash2Icon className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="font-mono text-foreground">{panelModelSchema.modelId}</div>
        {panelModelSchema.description ? <div className="mt-1 text-muted-foreground">{panelModelSchema.description}</div> : null}
      </div>
      <div>
        <div className="mb-1 text-[11px] font-medium uppercase text-muted-foreground">
          Stats ({panelModelSchema.featureRefs.length})
        </div>
        <div className="mb-2 flex items-center gap-2 rounded border border-border bg-background/60 p-1.5">
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
            Add Stat
          </button>
        </div>
        <div className="max-h-[42vh] overflow-auto rounded border border-border">
          {panelModelSchema.featureRefs.map((ref) => (
            <div
              key={`${panelModelSchema.modelId}-${ref.featureId}-${ref.spaces.join("|")}`}
              className="flex items-center justify-between border-b border-border px-2 py-1 text-[11px] last:border-b-0"
            >
              <span className="inline-flex items-center gap-1 font-mono text-foreground">
                <BarChart3Icon className="h-3.5 w-3.5 text-cyan-200/90" />
                {ref.featureId}
              </span>
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
      </div>
      {(panelModelSchema.statModifiers ?? []).length > 0 ? (
        <div className="space-y-1">
          <div className="text-[11px] font-medium uppercase text-muted-foreground">Stat Modifiers</div>
          <div className="space-y-2">
            {(panelModelSchema.statModifiers ?? []).map((modifier) => {
              const modifierSchema =
                runtimeModelSchemas.find((row) => row.modelId === modifier.modifierStatModelId) ?? null;
              if (!modifierSchema) return null;
              const swatchColor =
                statColorByModelId.get(modifierSchema.modelId) ??
                `hsl(${Math.round((modifierSchema.modelId.length * 37) % 360)} 85% 65%)`;
              const mappingByModifierFeatureId = new Map(
                modifier.mappings.map((mapping) => [mapping.modifierFeatureId, mapping.targetFeatureId] as const)
              );

              return (
                <div
                  key={`${panelModelSchema.modelId}:${modifierSchema.modelId}`}
                  className="rounded border border-border bg-background/50 p-2"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: swatchColor }} />
                    <span className="font-mono text-[11px] text-foreground">{modifierSchema.modelId}</span>
                  </div>
                  <div className="space-y-1">
                    {modifierSchema.featureRefs.map((modifierRef) => {
                      const selectedTargetFeatureId =
                        mappingByModifierFeatureId.get(modifierRef.featureId) ??
                        panelModelSchema.featureRefs[0]?.featureId ??
                        "";
                      return (
                        <label
                          key={`${modifierSchema.modelId}:${modifierRef.featureId}`}
                          className="grid grid-cols-[1fr_20px_1fr] items-center gap-1.5"
                        >
                          <span className="truncate font-mono text-[10px] text-foreground">{modifierRef.featureId}</span>
                          <span className="text-center text-[10px] text-muted-foreground">&rarr;</span>
                          <select
                            value={selectedTargetFeatureId}
                            onChange={(event) =>
                              onUpdateStatModifierMapping(
                                panelModelSchema.modelId,
                                modifierSchema.modelId,
                                modifierRef.featureId,
                                event.target.value
                              )
                            }
                            className="min-w-0 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-foreground"
                            disabled={panelModelSchema.featureRefs.length === 0}
                          >
                            {panelModelSchema.featureRefs.length === 0 ? (
                              <option value="">No target stats</option>
                            ) : (
                              panelModelSchema.featureRefs.map((targetRef) => (
                                <option key={`${panelModelSchema.modelId}:${targetRef.featureId}`} value={targetRef.featureId}>
                                  {targetRef.featureId}
                                </option>
                              ))
                            )}
                          </select>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
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

type SelectedContentObject = {
  id: string;
  type: string;
  branch: string;
  unlockRadius?: number;
};

type ModelInfoPanelContentProps = {
  panelModelSchema: RuntimeModelSchemaRow | null;
  selectedContentObject: SelectedContentObject | null;
  modelLabelDraft: string;
  modelDescriptionDraft: string;
  panelResolvedFeatureRefs: FeatureRef[];
  statGroups: Array<{
    statModelId: string;
    label: string;
    color: string;
    features: FeatureRef[];
  }>;
  featureDefaultMap: Map<string, number>;
  linkedCanonicalCount: number;
  migrationOpsCount: number;
  migrationScript: string;
  copiedScript: boolean;
  onSetModelLabelDraft: (next: string) => void;
  onSetModelDescriptionDraft: (next: string) => void;
  onUpdateModelMetadata: (modelId: string, updates: { label?: string; description?: string }) => void;
  onDeleteModelSchema: (modelId: string) => void;
  onCopyMigrationScript: () => Promise<void>;
  onClearMigrationOps: () => void;
};

export function ModelInfoPanelContent({
  panelModelSchema,
  selectedContentObject,
  modelLabelDraft,
  modelDescriptionDraft,
  panelResolvedFeatureRefs,
  statGroups,
  featureDefaultMap,
  linkedCanonicalCount,
  migrationOpsCount,
  migrationScript,
  copiedScript,
  onSetModelLabelDraft,
  onSetModelDescriptionDraft,
  onUpdateModelMetadata,
  onDeleteModelSchema,
  onCopyMigrationScript,
  onClearMigrationOps,
}: ModelInfoPanelContentProps) {
  const [autosaveState, setAutosaveState] = useState<"idle" | "dirty" | "saving" | "saved">("idle");

  useEffect(() => {
    if (!panelModelSchema) return;
    const nextLabel = modelLabelDraft.trim() || panelModelSchema.modelId;
    const nextDescription = modelDescriptionDraft.trim();
    const currentLabel = panelModelSchema.label;
    const currentDescription = panelModelSchema.description ?? "";
    if (nextLabel === currentLabel && nextDescription === currentDescription) {
      setAutosaveState("idle");
      return;
    }
    setAutosaveState("dirty");
    const timer = window.setTimeout(() => {
      setAutosaveState("saving");
      onUpdateModelMetadata(panelModelSchema.modelId, {
        label: nextLabel,
        description: nextDescription,
      });
      setAutosaveState("saved");
      window.setTimeout(() => setAutosaveState("idle"), 850);
    }, 380);
    return () => window.clearTimeout(timer);
  }, [modelDescriptionDraft, modelLabelDraft, onUpdateModelMetadata, panelModelSchema]);

  if (!panelModelSchema) {
    if (!selectedContentObject) {
      return <p className="text-xs text-muted-foreground">Select a model node to inspect details.</p>;
    }
    return (
      <div className="mb-2 rounded border border-border bg-muted/20 p-2 text-xs">
        <div className="font-mono text-foreground">{selectedContentObject.id}</div>
        <div className="text-muted-foreground">type: {selectedContentObject.type}</div>
        <div className="text-muted-foreground">branch: {selectedContentObject.branch}</div>
        <div className="text-muted-foreground">unlock radius: {selectedContentObject.unlockRadius ?? "n/a"}</div>
      </div>
    );
  }

  return (
    <div className="space-y-2 text-xs">
      <div className="rounded border border-border bg-muted/20 p-2">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Model</div>
          <div className="flex items-center gap-2">
            {autosaveState === "saving" ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                Saving
              </span>
            ) : autosaveState === "saved" ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-200">
                <CircleCheckIcon className="h-3.5 w-3.5" />
                Saved
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => {
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
              className="rounded border border-red-500/40 px-2 py-0.5 text-red-200 hover:bg-red-500/10"
              title="Delete model"
            >
              <Trash2Icon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="grid gap-2">
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Label
            <input
              type="text"
              value={modelLabelDraft}
              onChange={(event) => onSetModelLabelDraft(event.target.value)}
              className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
            />
          </label>
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Description
            <textarea
              value={modelDescriptionDraft}
              onChange={(event) => onSetModelDescriptionDraft(event.target.value)}
              className="mt-1 h-16 w-full resize-y rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
            />
          </label>
        </div>
      </div>
      {panelModelSchema.description ? <p className="text-muted-foreground">{panelModelSchema.description}</p> : null}
      {migrationOpsCount > 0 ? (
        <div className="group rounded border border-amber-400/40 bg-amber-500/10">
          <div className="flex items-center justify-between border-b border-amber-400/40 px-2 py-1 text-[10px] text-amber-100">
            <span>Migration Script ({migrationOpsCount})</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCopyMigrationScript}
                className="opacity-0 transition-opacity group-hover:opacity-100"
              >
                {copiedScript ? "Copied" : "Copy"}
              </button>
              <button type="button" onClick={onClearMigrationOps} className="hover:text-amber-50">
                Clear
              </button>
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
          {statGroups.map((group) => (
            <div
              key={`${panelModelSchema.modelId}-group-${group.statModelId}`}
              className="border-b border-border last:border-b-0"
            >
              <div className="flex items-center gap-2 px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                <span
                  className="inline-block size-2 rounded-full border border-black/20"
                  style={{ backgroundColor: group.color }}
                />
                <span className="font-mono">{group.label}</span>
              </div>
              {group.features.map((ref) => (
                <div
                  key={`${panelModelSchema.modelId}-${group.statModelId}-${ref.featureId}-${ref.spaces.join("|")}`}
                  className="flex items-center justify-between px-2 py-1 text-[11px]"
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
          ))}
        </div>
      </div>
    </div>
  );
}
