import { IconChartBar as BarChart3Icon, IconBraces as BracesIcon, IconFileCode as FileCode2Icon, IconBrandCpp as SiCplusplus, IconBrandCSharp as SiSharp, IconFileTypeTsx as SiTypescript, IconJson as SiJsonwebtokens } from "@tabler/icons-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "@/components/ui/button";

type InfoTab = { id: string; label: string; code: string };

type TopContributor = { id: string; modelId: string; contentSharePct: number };

type InfoModePaneProps = {
  visualizationScope: "asset" | "content-pack";
  effectiveScopeRootModelId: string | null;
  scopedSchemaNodesCount: number;
  scopedCanonicalNodesCount: number;
  topScopedContributors: TopContributor[];
  formatModelIdForUi: (modelId: string) => string;
  selectedInfoAsset: { id: string; name: string; modelId: string } | null;
  selectedInfoModelSchema: { modelId: string } | null;
  infoSchemaTabs: InfoTab[];
  vizInfoTabId: string;
  setVizInfoTabId: (id: string) => void;
  activeInfoSchemaTab: InfoTab | null;
  vizInfoEditorCode: string;
  setVizInfoEditorCode: (code: string) => void;
  vizInfoCopied: boolean;
  setVizInfoCopied: (next: boolean) => void;
  codeLanguageForTabId: (id: string) => string;
};

export function InfoModePane({
  visualizationScope,
  effectiveScopeRootModelId,
  scopedSchemaNodesCount,
  scopedCanonicalNodesCount,
  topScopedContributors,
  formatModelIdForUi,
  selectedInfoAsset,
  selectedInfoModelSchema,
  infoSchemaTabs,
  vizInfoTabId,
  setVizInfoTabId,
  activeInfoSchemaTab,
  vizInfoEditorCode,
  setVizInfoEditorCode,
  vizInfoCopied,
  setVizInfoCopied,
  codeLanguageForTabId,
}: InfoModePaneProps) {
  return (
    <div className="h-full min-h-[400px] w-full space-y-2">
      {visualizationScope === "content-pack" ? (
        <div className="rounded border border-border bg-muted/10 p-2">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            Scoped Summary
          </div>
          <div className="flex flex-wrap gap-1.5 text-[10px]">
            <span className="rounded border border-border/70 bg-muted/20 px-2 py-0.5 text-muted-foreground">
              Scope Root: <span className="font-semibold text-foreground">{effectiveScopeRootModelId ?? "Pack Root"}</span>
            </span>
            <span className="rounded border border-border/70 bg-muted/20 px-2 py-0.5 text-muted-foreground">
              Models: <span className="font-semibold text-foreground">{scopedSchemaNodesCount}</span>
            </span>
            <span className="rounded border border-border/70 bg-muted/20 px-2 py-0.5 text-muted-foreground">
              Canonical: <span className="font-semibold text-foreground">{scopedCanonicalNodesCount}</span>
            </span>
          </div>
          {topScopedContributors.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
              {topScopedContributors.map((node) => (
                <span
                  key={`scope-top-${node.id}`}
                  className="rounded border border-border/70 bg-muted/20 px-2 py-0.5 text-muted-foreground"
                >
                  {formatModelIdForUi(node.modelId)} <span className="font-semibold text-foreground">{(node.contentSharePct * 100).toFixed(1)}%</span>
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
                <Button
                  key={tab.id}
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setVizInfoTabId(tab.id)}
                  className={`rounded border p-1 ${
                    vizInfoTabId === tab.id
                      ? "border-primary/60 bg-primary/15 text-primary"
                      : "border-border text-muted-foreground"
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
                </Button>
              ))}
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <span className="inline-flex min-w-0 items-center gap-1 font-mono">
                <FileCode2Icon className="h-3 w-3 shrink-0" />
                <span className="truncate">{activeInfoSchemaTab?.label ?? ""}</span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setVizInfoEditorCode(activeInfoSchemaTab?.code ?? "")}
                className="h-6 px-1.5 opacity-0 transition-opacity group-hover/code:opacity-100"
              >
                Reset
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(vizInfoEditorCode);
                  setVizInfoCopied(true);
                  setTimeout(() => setVizInfoCopied(false), 1200);
                }}
                className="h-6 px-1.5 opacity-0 transition-opacity group-hover/code:opacity-100"
              >
                {vizInfoCopied ? "Copied" : "Copy"}
              </Button>
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
          {visualizationScope === "content-pack"
            ? "Select a canonical asset to inspect info."
            : "No model selected. Choose an asset or model to inspect info."}
        </div>
      )}
    </div>
  );
}

type StatLevelSchema = {
  level: { color: string; colorBorder: string; colorSoft: string };
  schema: {
    modelId: string;
    featureRefs: Array<{ featureId: string }>;
    statModifiers?: Array<{
      modifierStatModelId: string;
      mappings: Array<{ modifierFeatureId: string; targetFeatureId: string }>;
    }>;
  };
};

type StatModifiersModePaneProps = {
  statModifiersEnabled: boolean;
  selectedCanonicalAsset: { name: string; modelId: string } | null;
  selectedAssetStatLevelSchemas: StatLevelSchema[];
  statSchemaById: Map<string, { featureRefs: Array<{ featureId: string }> }>;
  formatModelIdForUi: (modelId: string) => string;
  getFeatureValue: (featureId: string) => number;
};

export function StatModifiersModePane({
  statModifiersEnabled,
  selectedCanonicalAsset,
  selectedAssetStatLevelSchemas,
  statSchemaById,
  formatModelIdForUi,
  getFeatureValue,
}: StatModifiersModePaneProps) {
  return (
    <div className="h-full min-h-[400px] overflow-auto rounded border border-border bg-muted/10 p-2">
      {!statModifiersEnabled ? (
        <div className="flex h-full min-h-[360px] items-center justify-center text-xs text-muted-foreground">
          Select an asset to view its stat sets and stat modifiers.
        </div>
      ) : (
        <div className="space-y-2">
          <div className="rounded border border-border bg-background/50 px-2 py-1.5 text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">{selectedCanonicalAsset?.name}</span>{" "}
            <span className="font-mono">({selectedCanonicalAsset?.modelId})</span>
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
                  <span className="inline-block size-2 rounded-full" style={{ backgroundColor: level.color }} />
                  {formatModelIdForUi(schema.modelId)}
                </span>
                <span className="text-[10px] text-muted-foreground">{schema.featureRefs.length} stats</span>
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
                    <span className="font-mono text-foreground">{getFeatureValue(featureRef.featureId).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              {(schema.statModifiers ?? []).length > 0 ? (
                <div className="mt-2 space-y-1">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Stat Modifiers</div>
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
                              <span className="truncate font-mono text-muted-foreground">{mapping.modifierFeatureId}</span>
                              <span className="text-center text-muted-foreground">&rarr;</span>
                              <span className="truncate font-mono text-foreground">{mapping.targetFeatureId}</span>
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
  );
}
