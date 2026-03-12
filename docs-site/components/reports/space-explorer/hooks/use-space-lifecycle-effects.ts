import { type MutableRefObject, useEffect, useMemo, type Dispatch, type SetStateAction } from "react";
import { getPlayerStateAtTurn, type ActionTraceEntry, type PackIdentity, type ReportData } from "@/lib/space-explorer-shared";
import type { RuntimeSpaceView } from "@/lib/space-explorer-runtime";
import { NO_MODEL_SELECTED, PATCH_DRAFTS_STORAGE_KEY, type PatchDraft, type RuntimeFeatureSchemaRow, type RuntimeModelSchemaRow, type SpaceData, EMPTY_SPACE_DATA } from "@/components/reports/space-explorer/config";
import type { ContentPoint } from "@/components/reports/space-explorer/config";

interface UseSpaceLifecycleEffectsParams {
  loadedPackIdentity: PackIdentity | null;
  lastAutoVizPackKeyRef: MutableRefObject<string>;
  setVizMode: (mode: "2d" | "3d" | "json" | "deltas") => void;
  setData: Dispatch<SetStateAction<SpaceData>>;
  setSelectedPoint: Dispatch<SetStateAction<ContentPoint | null>>;
  drafts: PatchDraft[];
  setDrafts: Dispatch<SetStateAction<PatchDraft[]>>;
  report: ReportData | null;
  selectedTurn: number;
  setTraits: Dispatch<SetStateAction<Record<string, number>>>;
  setFeatures: Dispatch<SetStateAction<Record<string, number>>>;
  setTraitDeltas: Dispatch<SetStateAction<Record<string, number>>>;
  setFeatureDeltas: Dispatch<SetStateAction<Record<string, number>>>;
  activeModelSchemaId: string | null;
  modelOptions: RuntimeModelSchemaRow[];
  setActiveModelSelection: (modelId: string, instanceId: string | null) => void;
  runtimeSpaceView: RuntimeSpaceView;
  setRuntimeSpaceView: (value: RuntimeSpaceView) => void;
  inferredKaelModelId: string;
  ensureKaelBinding: (modelId: string) => void;
  selectedModelFeatureIds: string[];
  setSelectedModelFeatureIds: Dispatch<SetStateAction<string[]>>;
  runtimeFeatureSchema: RuntimeFeatureSchemaRow[];
}

export function useSpaceLifecycleEffects({
  loadedPackIdentity,
  lastAutoVizPackKeyRef,
  setVizMode,
  setData,
  setSelectedPoint,
  drafts,
  setDrafts,
  report,
  selectedTurn,
  setTraits,
  setFeatures,
  setTraitDeltas,
  setFeatureDeltas,
  activeModelSchemaId,
  modelOptions,
  setActiveModelSelection,
  runtimeSpaceView,
  setRuntimeSpaceView,
  inferredKaelModelId,
  ensureKaelBinding,
  selectedModelFeatureIds,
  setSelectedModelFeatureIds,
  runtimeFeatureSchema,
}: UseSpaceLifecycleEffectsParams) {
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
  }, [loadedPackIdentity, lastAutoVizPackKeyRef, setVizMode]);

  useEffect(() => {
    setData(EMPTY_SPACE_DATA);
    setSelectedPoint(null);
  }, [setData, setSelectedPoint]);

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
  }, [setDrafts]);

  useEffect(() => {
    try {
      localStorage.setItem(PATCH_DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
    } catch {
      // ignore
    }
  }, [drafts]);

  const playerStateAtTurn = useMemo(() => {
    if (!report || selectedTurn < 0) return null;
    return getPlayerStateAtTurn(
      report.seed,
      report.run.actionTrace as ActionTraceEntry[],
      selectedTurn
    );
  }, [report, selectedTurn]);

  useEffect(() => {
    if (!playerStateAtTurn || !report) return;
    const traitUpdates = Object.fromEntries(
      Object.entries(playerStateAtTurn.traits ?? {}).map(([featureId, value]) => [
        featureId,
        Number(value ?? 0),
      ])
    ) as Record<string, number>;
    const featureUpdates = Object.fromEntries(
      Object.entries(playerStateAtTurn.features ?? {}).map(([featureId, value]) => [
        featureId,
        Number(value ?? 0),
      ])
    ) as Record<string, number>;
    setTraits(traitUpdates);
    setFeatures(featureUpdates);
    setTraitDeltas({});
    setFeatureDeltas({});
  }, [playerStateAtTurn, report, setTraits, setFeatures, setTraitDeltas, setFeatureDeltas]);

  useEffect(() => {
    if (activeModelSchemaId === NO_MODEL_SELECTED || !activeModelSchemaId) return;
    if (modelOptions.some((row) => row.modelId === activeModelSchemaId)) return;
    setActiveModelSelection(NO_MODEL_SELECTED, null);
  }, [modelOptions, activeModelSchemaId, setActiveModelSelection]);

  useEffect(() => {
    if (runtimeSpaceView !== "content-combined") {
      setRuntimeSpaceView("content-combined");
    }
  }, [runtimeSpaceView, setRuntimeSpaceView]);

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
  }, [runtimeFeatureSchema, selectedModelFeatureIds.length, setSelectedModelFeatureIds]);
}
