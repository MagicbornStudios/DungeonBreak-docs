import type { Dispatch, SetStateAction } from "react";
import { TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { HelpInfo } from "@/components/reports/space-explorer/aux-controls";
import {
  NO_MODEL_SELECTED,
  type ContentPoint,
  type ModelInstanceBinding,
} from "@/components/reports/space-explorer/config";

type FeatureGroup = {
  modelId: string;
  isBase: boolean;
  isEnabled: boolean;
  color: string;
  colorBorder: string;
  colorSoft: string;
  featureIds: string[];
};

type AssetControlPanelProps = {
  selectedCanonicalAsset: ModelInstanceBinding | null;
  activeModelInstanceId: string | null;
  canonicalAssetOptions: ModelInstanceBinding[];
  setActiveModelSelection: (modelId: string, instanceId: string | null) => void;
  setSelectedPoint: Dispatch<SetStateAction<ContentPoint | null>>;
  activeFeatureSpace: string | null;
  featuresByInheritanceGroup: FeatureGroup[];
  formatModelIdForUi: (modelId: string) => string;
  setEnabledStatLevelById: Dispatch<SetStateAction<Record<string, boolean>>>;
  featureDefaultsById: Map<string, number>;
  getFeatureValue: (featureId: string) => number;
  setFeatureValue: (featureId: string, value: number) => void;
};

export function AssetControlPanel({
  selectedCanonicalAsset,
  activeModelInstanceId,
  canonicalAssetOptions,
  setActiveModelSelection,
  setSelectedPoint,
  activeFeatureSpace,
  featuresByInheritanceGroup,
  formatModelIdForUi,
  setEnabledStatLevelById,
  featureDefaultsById,
  getFeatureValue,
  setFeatureValue,
}: AssetControlPanelProps) {
  return (
    <TabsContent value="asset" className="mt-0 space-y-3">
      <div
        id="panel-control-header"
        data-ui-id="panel-control-header"
        className="flex items-center gap-2"
      >
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">
            {selectedCanonicalAsset ? selectedCanonicalAsset.name : "No Asset Selected"}
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
              const instance = canonicalAssetOptions.find((row) => row.id === instanceId);
              if (!instance) return;
              setActiveModelSelection(instance.modelId, instance.id);
            }}
            className="ml-1 rounded border border-border bg-background px-2 py-1 text-[11px] text-foreground"
          >
            <option value="">None</option>
            {canonicalAssetOptions.map((asset) => (
              <option key={`asset-option-${asset.id}`} value={asset.id}>
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
                            {group.isBase ? " (parent)" : " (derived)"}
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
                          const baselineValue = featureDefaultsById.get(featureId) ?? 0;
                          const isWideRange = Math.abs(baselineValue) > 1;
                          const min = isWideRange ? 0 : -1;
                          const max = isWideRange ? 100 : 1;
                          const step = isWideRange ? 1 : 0.01;
                          const value = getFeatureValue(featureId);
                          return (
                            <label
                              key={`${group.modelId}-${featureId}`}
                              className="grid grid-cols-[1fr_120px_56px] items-center gap-2"
                            >
                              <span className="truncate text-[11px] text-muted-foreground">{featureId}</span>
                              <input
                                type="range"
                                min={min}
                                max={max}
                                step={step}
                                value={value}
                                onChange={(e) => setFeatureValue(featureId, Number(e.target.value))}
                                className="w-full"
                                style={{ accentColor: group.color }}
                                disabled={!group.isEnabled}
                              />
                              <span className="font-mono text-[10px] text-muted-foreground">
                                {isWideRange ? value.toFixed(0) : value.toFixed(2)}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Loaded asset does not expose stat-model levels for this space.
                  </p>
                )}
              </>
            ) : (
              <p className="text-[11px] text-muted-foreground">Select a content space to edit model stats.</p>
            )}
          </div>
        </div>
      </details>
    </TabsContent>
  );
}
