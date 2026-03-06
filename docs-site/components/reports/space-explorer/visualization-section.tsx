import type { ComponentType, Dispatch, SetStateAction } from "react";
import { IconFlask as FlaskConicalIcon } from "@tabler/icons-react";
import type { ContentDimensionNode } from "@/lib/content-dimension";
import { DimensionPlotly, type LayerSpaceOverlay, type OverlayVisibility, type StatSpaceOverlay } from "@/components/reports/space-explorer/dimension-plotly";
import { VisualizationPanelHeader } from "@/components/reports/space-explorer/visualization-panel-header";
import { VisualizationToolbar } from "@/components/reports/space-explorer/visualization-toolbar";
import { PlotOverlayControls } from "@/components/reports/space-explorer/plot-overlay-controls";
import { InfoModePane, StatModifiersModePane } from "@/components/reports/space-explorer/visualization-modes";
import { NO_MODEL_SELECTED, type ContentPoint, type ModelInstanceBinding } from "@/components/reports/space-explorer/config";

type LayerEntry = {
  layerId: "schema-model" | "canonical-asset";
  label: string;
  color: string;
  nodes: ContentDimensionNode[];
};

type PlotlyComponentProps = {
  content: ContentPoint[];
  contentCoords: { x: number; y: number; z: number }[];
  player3d: [number, number, number];
  modelSpacePoints: Array<{ id: string; name: string; coords: { x: number; y: number; z: number }; vector: number[] }>;
  colorBy: "branch" | "cluster" | "type";
  projection: "3d" | "2d";
  selectedId: string | null;
  onSelect: (id: string) => void;
};

type VisualizationSectionProps = {
  visualizationScope: "content-pack";
  scopePathCrumbs: Array<{ label: string; modelId: string | null }>;
  effectiveScopeRootModelId: string | null;
  setScopeRootModelId: (modelId: string | null) => void;
  setActiveModelSelection: (modelId: string, instanceId: string | null) => void;
  effectiveStatSpaceIds: string[];
  enabledStatSpaces: Record<string, boolean>;
  setEnabledStatSpaces: Dispatch<SetStateAction<Record<string, boolean>>>;
  modelHueById: Map<string, number>;
  selectedTurn: number;
  maxTurn: number;
  setSelectedTurn: Dispatch<SetStateAction<number>>;
  handleRefreshVisualization: () => void;
  vizRefreshedAt: string | null;
  effectiveAlgorithm: string;
  nearestRows: Array<{ id: string; type: string; branch: string; name: string; score: number }>;
  vizMode: "3d" | "2d" | "json" | "deltas";
  setVizMode: (next: "3d" | "2d" | "json" | "deltas") => void;
  contentPackInfoEnabled: boolean;
  statModifiersEnabled: boolean;
  distanceAlgorithm: "game-default" | "euclidean" | "cosine";
  setDistanceAlgorithm: (next: "game-default" | "euclidean" | "cosine") => void;
  nearestK: number;
  setNearestK: (next: number) => void;
  scopedCanonicalNodes: unknown[];
  vizRefreshTick: number;
  layers: LayerEntry[];
  selectedCanonicalAsset: ModelInstanceBinding | null;
  canonicalAssetOptions: ModelInstanceBinding[];
  selectCanonicalAssetInPackScope: (asset: ModelInstanceBinding) => void;
  statSpaceOverlays: StatSpaceOverlay[];
  overlayVisibility: OverlayVisibility;
  setOverlayVisibility: Dispatch<SetStateAction<OverlayVisibility>>;
  layerSpaceOverlays: LayerSpaceOverlay[];
  activeModelSchemaId: string;
  testModeEnabled: boolean;
  testModeGeneratedAt: string | null;
  PlotlyComponent: ComponentType<PlotlyComponentProps>;
  content: ContentPoint[];
  contentCoords: { x: number; y: number; z: number }[];
  player3d: [number, number, number];
  selectedModelSpacePoints: PlotlyComponentProps["modelSpacePoints"];
  markerColorBy: "branch" | "cluster" | "type";
  selectedPoint: ContentPoint | null;
  setSelectedPoint: Dispatch<SetStateAction<ContentPoint | null>>;
  scopedSchemaNodes: Array<{ id: string; modelId: string; contentSharePct: number }>;
  topScopedContributors: Array<{ id: string; modelId: string; contentSharePct: number }>;
  formatModelIdForUi: (modelId: string) => string;
  selectedInfoAsset: { id: string; name: string; modelId: string } | null;
  selectedInfoModelSchema: { modelId: string } | null;
  infoSchemaTabs: Array<{ id: string; label: string; code: string }>;
  vizInfoTabId: string;
  setVizInfoTabId: (id: string) => void;
  activeInfoSchemaTab: { id: string; label: string; code: string } | null;
  vizInfoEditorCode: string;
  setVizInfoEditorCode: (code: string) => void;
  vizInfoCopied: boolean;
  setVizInfoCopied: (next: boolean) => void;
  codeLanguageForTabId: (id: string) => string;
  selectedAssetStatLevelSchemas: Array<{
    level: { color: string; colorBorder: string; colorSoft: string };
    schema: {
      modelId: string;
      featureRefs: Array<{ featureId: string }>;
      statModifiers?: Array<{
        modifierStatModelId: string;
        mappings: Array<{ modifierFeatureId: string; targetFeatureId: string }>;
      }>;
    };
  }>;
  statSchemaById: Map<string, { featureRefs: Array<{ featureId: string }> }>;
  getFeatureValue: (featureId: string) => number;
};

export function VisualizationSection(props: VisualizationSectionProps) {
  const {
    visualizationScope,
    scopePathCrumbs,
    effectiveScopeRootModelId,
    setScopeRootModelId,
    setActiveModelSelection,
    effectiveStatSpaceIds,
    enabledStatSpaces,
    setEnabledStatSpaces,
    modelHueById,
    selectedTurn,
    maxTurn,
    setSelectedTurn,
    handleRefreshVisualization,
    vizRefreshedAt,
    effectiveAlgorithm,
    nearestRows,
    vizMode,
    setVizMode,
    contentPackInfoEnabled,
    statModifiersEnabled,
    distanceAlgorithm,
    setDistanceAlgorithm,
    nearestK,
    setNearestK,
    scopedCanonicalNodes,
    vizRefreshTick,
    layers,
    selectedCanonicalAsset,
    canonicalAssetOptions,
    selectCanonicalAssetInPackScope,
    statSpaceOverlays,
    overlayVisibility,
    setOverlayVisibility,
    layerSpaceOverlays,
    activeModelSchemaId,
    testModeEnabled,
    testModeGeneratedAt,
    PlotlyComponent,
    content,
    contentCoords,
    player3d,
    selectedModelSpacePoints,
    markerColorBy,
    selectedPoint,
    setSelectedPoint,
    scopedSchemaNodes,
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
    selectedAssetStatLevelSchemas,
    statSchemaById,
    getFeatureValue,
  } = props;

  return (
    <section
      id="panel-visualization"
      data-ui-id="panel-visualization"
      data-theme-context="content"
      className="mt-4 min-h-[420px] rounded border border-border bg-background"
    >
      <VisualizationPanelHeader
        visualizationScope={visualizationScope}
        scopePathCrumbs={scopePathCrumbs}
        effectiveScopeRootModelId={effectiveScopeRootModelId}
        setScopeRootModelId={setScopeRootModelId}
        setActiveModelSelection={setActiveModelSelection}
        effectiveStatSpaceIds={effectiveStatSpaceIds}
        enabledStatSpaces={enabledStatSpaces}
        setEnabledStatSpaces={setEnabledStatSpaces}
        modelHueById={modelHueById}
        selectedTurn={selectedTurn}
        maxTurn={maxTurn}
        setSelectedTurn={setSelectedTurn}
        handleRefreshVisualization={handleRefreshVisualization}
        vizRefreshedAt={vizRefreshedAt}
        effectiveAlgorithm={effectiveAlgorithm}
        nearestRows={nearestRows}
      />
      <VisualizationToolbar
        vizMode={vizMode}
        setVizMode={setVizMode}
        contentPackInfoEnabled={contentPackInfoEnabled}
        statModifiersEnabled={statModifiersEnabled}
        distanceAlgorithm={distanceAlgorithm}
        setDistanceAlgorithm={setDistanceAlgorithm}
        nearestK={nearestK}
        setNearestK={setNearestK}
      />
      <div
        id="panel-visualization-content"
        data-ui-id="panel-visualization-content"
        className="min-h-[420px] p-2"
      >
        {vizMode === "3d" || vizMode === "2d" ? (
          <div className="h-full min-h-[400px] w-full">
            {visualizationScope === "content-pack" ? (
              <div className="relative h-full min-h-[340px] rounded border border-border bg-muted/10 p-1">
                {scopedCanonicalNodes.length > 0 ? (
                  <DimensionPlotly
                    key={`dim-${vizMode}-${vizRefreshTick}-${effectiveScopeRootModelId ?? "root"}`}
                    layers={layers}
                    projection={vizMode === "2d" ? "2d" : "3d"}
                    selectedCanonicalAssetId={selectedCanonicalAsset?.id ?? null}
                    onSelectCanonicalAsset={(assetId) => {
                      const selected = canonicalAssetOptions.find((asset) => asset.id === assetId);
                      if (!selected) return;
                      selectCanonicalAssetInPackScope(selected);
                    }}
                    modelHueById={Object.fromEntries(modelHueById)}
                    statSpaceOverlays={statSpaceOverlays}
                    overlayVisibility={overlayVisibility}
                    layerSpaceOverlays={layerSpaceOverlays}
                    selectedModelId={activeModelSchemaId !== NO_MODEL_SELECTED ? activeModelSchemaId : null}
                  />
                ) : (
                  <div className="flex h-full min-h-[320px] items-center justify-center text-xs text-muted-foreground">
                    Add assets to view where this model appears in content space.
                  </div>
                )}
                {vizMode === "3d" ? (
                  <PlotOverlayControls
                    overlayVisibility={overlayVisibility}
                    setOverlayVisibility={setOverlayVisibility}
                  />
                ) : null}
              </div>
            ) : testModeEnabled && !testModeGeneratedAt ? (
              <div className="flex h-full min-h-[400px] items-center justify-center rounded border border-dashed border-emerald-400/40 bg-emerald-500/5">
                <div className="flex flex-col items-center gap-2 text-center">
                  <FlaskConicalIcon className="size-6 text-emerald-200" />
                  <p className="text-sm font-medium text-emerald-100">Empty {vizMode.toUpperCase()} Test Space</p>
                  <p className="max-w-md text-xs text-emerald-200/80">
                    Generate a bundle + report from the header spark button to populate visualization.
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
          <InfoModePane
            visualizationScope={visualizationScope}
            effectiveScopeRootModelId={effectiveScopeRootModelId}
            scopedSchemaNodesCount={scopedSchemaNodes.length}
            scopedCanonicalNodesCount={scopedCanonicalNodes.length}
            topScopedContributors={topScopedContributors}
            formatModelIdForUi={formatModelIdForUi}
            selectedInfoAsset={selectedInfoAsset}
            selectedInfoModelSchema={selectedInfoModelSchema}
            infoSchemaTabs={infoSchemaTabs}
            vizInfoTabId={vizInfoTabId}
            setVizInfoTabId={setVizInfoTabId}
            activeInfoSchemaTab={activeInfoSchemaTab}
            vizInfoEditorCode={vizInfoEditorCode}
            setVizInfoEditorCode={setVizInfoEditorCode}
            vizInfoCopied={vizInfoCopied}
            setVizInfoCopied={setVizInfoCopied}
            codeLanguageForTabId={codeLanguageForTabId}
          />
        ) : (
          <StatModifiersModePane
            statModifiersEnabled={statModifiersEnabled}
            selectedCanonicalAsset={selectedCanonicalAsset}
            selectedAssetStatLevelSchemas={selectedAssetStatLevelSchemas}
            statSchemaById={statSchemaById}
            formatModelIdForUi={formatModelIdForUi}
            getFeatureValue={getFeatureValue}
          />
        )}
      </div>
    </section>
  );
}
