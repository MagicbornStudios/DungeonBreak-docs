"use client";

type UseContentCreatorActionsParams = {
  activeModelSchemaId: string | null;
  normalizeModelId: (value: string) => string;
  formatModelIdForUi: (value: string) => string;
  toFileStem: (value: string) => string;
  onCreateModelSchema: (modelId: string, label?: string, templateModelId?: string) => void;
  onAddCanonicalAsset: (modelId: string, name?: string) => void;
  onSetNewStatModelIdDraft: (next: string) => void;
  onSetNewStatLabelDraft: (next: string) => void;
  onSetNewStatTemplateModelId: (next: string | undefined) => void;
  onSetSelectedTreeNodeId: (next: string) => void;
  onSetObjectSectionTab: (next: "models" | "canonical") => void;
  onSetCanonicalTab: (next: "edit" | "code") => void;
};

export function useContentCreatorActions({
  activeModelSchemaId,
  normalizeModelId,
  formatModelIdForUi,
  toFileStem,
  onCreateModelSchema,
  onAddCanonicalAsset,
  onSetNewStatModelIdDraft,
  onSetNewStatLabelDraft,
  onSetNewStatTemplateModelId,
  onSetSelectedTreeNodeId,
  onSetObjectSectionTab,
  onSetCanonicalTab,
}: UseContentCreatorActionsParams) {
  const suggestDerivedModelId = (modelId: string) => `${modelId}.subclass`;
  const suggestDerivedStatId = (modelId: string) => {
    const base = `${modelId}.derived`;
    return base.endsWith("stats") ? base : `${base}stats`;
  };

  const createSchemaViaTree = (kind: "model" | "stat", templateModelId?: string, suggestedId?: string) => {
    const suggested = suggestedId || (kind === "stat" ? "newstats" : "entity.new_model");
    if (kind === "stat") {
      const normalized = normalizeModelId(suggested);
      const statId = normalized.endsWith("stats") ? normalized : `${normalized}stats`;
      onSetNewStatModelIdDraft(statId);
      onSetNewStatLabelDraft(formatModelIdForUi(statId));
      onSetNewStatTemplateModelId(templateModelId ?? activeModelSchemaId ?? undefined);
      onSetSelectedTreeNodeId("group:stats");
      onSetObjectSectionTab("models");
      return;
    }
    const raw = window.prompt("New model id (example: entity.magicdog):", suggested);
    const nextId = normalizeModelId(raw ?? "");
    if (!nextId) return;
    onCreateModelSchema(nextId, nextId, templateModelId ?? activeModelSchemaId ?? undefined);
  };

  const promptCreateCanonicalAsset = (modelId: string, nodeId: string) => {
    const suggested = `new_${toFileStem(modelId)}`;
    const nextName = window.prompt(`Canonical asset name for ${modelId}:`, suggested) ?? "";
    onAddCanonicalAsset(modelId, nextName.trim() || undefined);
    onSetSelectedTreeNodeId(nodeId);
    onSetCanonicalTab("edit");
  };

  return {
    suggestDerivedModelId,
    suggestDerivedStatId,
    createSchemaViaTree,
    promptCreateCanonicalAsset,
  };
}
