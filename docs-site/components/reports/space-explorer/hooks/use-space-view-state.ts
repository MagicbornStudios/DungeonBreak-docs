import { useState } from "react";
import type { ReportData } from "@/lib/space-explorer-shared";
import type { OverlayVisibility } from "@/components/reports/space-explorer/dimension-plotly";
import {
  EMPTY_SPACE_DATA,
  type ContentPoint,
  type PatchDraft,
  type RuntimeFeatureSchemaRow,
  type SpaceData,
  type SpaceVectorPackOverrides,
} from "@/components/reports/space-explorer/config";

export function useSpaceViewState() {
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
  const [overlayVisibility, setOverlayVisibility] = useState<OverlayVisibility>({
    spaceOutline: true,
    schemaOutline: true,
    canonicalOutline: true,
    schemaPoints: true,
    canonicalPoints: true,
  });
  const [vizRefreshTick, setVizRefreshTick] = useState(0);
  const [vizRefreshedAt, setVizRefreshedAt] = useState<string | null>(null);
  const visualizationScope: "content-pack" = "content-pack";
  const [packTreeView, setPackTreeView] = useState<"models" | "stats">(
    "models"
  );
  const [enabledStatSpaces, setEnabledStatSpaces] = useState<
    Record<string, boolean>
  >({});
  const [traits, setTraits] = useState<Record<string, number>>({});
  const [features, setFeatures] = useState<Record<string, number>>({});
  const [traitDeltas, setTraitDeltas] = useState<Record<string, number>>({});
  const [featureDeltas, setFeatureDeltas] = useState<Record<string, number>>({});
  const [modelSchemaModalOpen, setModelSchemaModalOpen] = useState(false);
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

  return {
    data,
    setData,
    error,
    setError,
    spaceOverrides,
    setSpaceOverrides,
    selectedPoint,
    setSelectedPoint,
    report,
    setReport,
    selectedTurn,
    setSelectedTurn,
    vizInfoTabId,
    setVizInfoTabId,
    vizInfoEditorCode,
    setVizInfoEditorCode,
    vizInfoCopied,
    setVizInfoCopied,
    overlayVisibility,
    setOverlayVisibility,
    vizRefreshTick,
    setVizRefreshTick,
    vizRefreshedAt,
    setVizRefreshedAt,
    visualizationScope,
    packTreeView,
    setPackTreeView,
    enabledStatSpaces,
    setEnabledStatSpaces,
    traits,
    setTraits,
    features,
    setFeatures,
    traitDeltas,
    setTraitDeltas,
    featureDeltas,
    setFeatureDeltas,
    modelSchemaModalOpen,
    setModelSchemaModalOpen,
    behaviorWindowSeconds,
    setBehaviorWindowSeconds,
    behaviorStepSeconds,
    setBehaviorStepSeconds,
    newFeatureId,
    setNewFeatureId,
    newFeatureGroup,
    setNewFeatureGroup,
    newFeatureSpaces,
    setNewFeatureSpaces,
    newModelId,
    setNewModelId,
    newModelLabel,
    setNewModelLabel,
    newModelSpaces,
    setNewModelSpaces,
    selectedModelFeatureIds,
    setSelectedModelFeatureIds,
    enabledStatLevelById,
    setEnabledStatLevelById,
  };
}
