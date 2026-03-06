import { useRef, useState } from "react";
import type { PackIdentity } from "@/lib/space-explorer-shared";
import {
  MODEL_PRESETS,
  type PatchDraft,
  type ReportIdentity,
  type SpaceVectorPackOverrides,
} from "@/components/reports/space-explorer/config";

export function useSpaceBuilderDeliveryState() {
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

  return {
    baseSpaceVectors,
    setBaseSpaceVectors,
    drafts,
    setDrafts,
    draftName,
    setDraftName,
    selectedPresetId,
    setSelectedPresetId,
    builderMessage,
    setBuilderMessage,
    bundleBusy,
    setBundleBusy,
    quickTestBusy,
    setQuickTestBusy,
    testModeGeneratedAt,
    setTestModeGeneratedAt,
    pipelineLoading,
    setPipelineLoading,
    spaceDataLoading,
    setSpaceDataLoading,
    loadedPackIdentity,
    setLoadedPackIdentity,
    loadedReportIdentity,
    setLoadedReportIdentity,
    lastAutoVizPackKeyRef,
  };
}
