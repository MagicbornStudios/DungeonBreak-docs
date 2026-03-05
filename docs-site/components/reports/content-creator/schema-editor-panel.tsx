"use client";

import { SchemaJsonSection } from "@/components/reports/content-creator/schema-json-section";

type JsonSectionKey = "models" | "stats" | "canonical";
type JsonSectionMode = "preview" | "edit";

export function ContentCreatorSchemaEditorPanel(props: {
  objectSectionTab: "models" | "canonical";
  jsonApplyError: string;
  jsonSectionOpen: Record<JsonSectionKey, boolean>;
  jsonSectionEditorMode: Record<JsonSectionKey, JsonSectionMode>;
  modelsSchemaDraft: string;
  statsSchemaDraft: string;
  canonicalSchemaDraft: string;
  deferredModelsSchemaJson: string;
  deferredStatsSchemaJson: string;
  deferredCanonicalSchemaJson: string;
  jsonSyntaxMounted: boolean;
  onSetJsonSectionOpen: (next: Record<JsonSectionKey, boolean> | ((prev: Record<JsonSectionKey, boolean>) => Record<JsonSectionKey, boolean>)) => void;
  onSetJsonSectionEditorMode: (
    next:
      | Record<JsonSectionKey, JsonSectionMode>
      | ((prev: Record<JsonSectionKey, JsonSectionMode>) => Record<JsonSectionKey, JsonSectionMode>),
  ) => void;
  onSetModelsSchemaDraft: (next: string) => void;
  onSetStatsSchemaDraft: (next: string) => void;
  onSetCanonicalSchemaDraft: (next: string) => void;
  onApplyModelsAndStatsSchemaDraft: () => void;
  onApplyCanonicalSchemaDraft: () => void;
}) {
  const {
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
    onSetJsonSectionOpen,
    onSetJsonSectionEditorMode,
    onSetModelsSchemaDraft,
    onSetStatsSchemaDraft,
    onSetCanonicalSchemaDraft,
    onApplyModelsAndStatsSchemaDraft,
    onApplyCanonicalSchemaDraft,
  } = props;

  return (
    <div className="space-y-2 p-1">
      {jsonApplyError ? (
        <div className="rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-[11px] text-red-200">
          {jsonApplyError}
        </div>
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
            onOpenChange={(isOpen) => onSetJsonSectionOpen((prev) => ({ ...prev, models: isOpen }))}
            onModeChange={(mode) => onSetJsonSectionEditorMode((prev) => ({ ...prev, models: mode }))}
            onDraftChange={onSetModelsSchemaDraft}
            onApply={onApplyModelsAndStatsSchemaDraft}
          />
          <SchemaJsonSection
            title="Stats Schema"
            open={jsonSectionOpen.stats}
            mode={jsonSectionEditorMode.stats}
            draft={statsSchemaDraft}
            deferredDraft={deferredStatsSchemaJson}
            loadingText="Preparing stats schema..."
            syntaxMounted={jsonSyntaxMounted}
            onOpenChange={(isOpen) => onSetJsonSectionOpen((prev) => ({ ...prev, stats: isOpen }))}
            onModeChange={(mode) => onSetJsonSectionEditorMode((prev) => ({ ...prev, stats: mode }))}
            onDraftChange={onSetStatsSchemaDraft}
            onApply={onApplyModelsAndStatsSchemaDraft}
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
          onOpenChange={(isOpen) => onSetJsonSectionOpen((prev) => ({ ...prev, canonical: isOpen }))}
          onModeChange={(mode) => onSetJsonSectionEditorMode((prev) => ({ ...prev, canonical: mode }))}
          onDraftChange={onSetCanonicalSchemaDraft}
          onApply={onApplyCanonicalSchemaDraft}
        />
      )}
    </div>
  );
}

