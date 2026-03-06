import type { ChangeEvent, MutableRefObject } from "react";
import {
  IconCircleCheck as CircleCheckIcon,
  IconClockHour3 as Clock3Icon,
  IconFileText as FileTextIcon,
  IconFolder as FolderTreeIcon,
  IconPackage as PackageIcon,
  IconSparkles as SparklesIcon,
  IconUpload as UploadIcon,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { DeliveryControls, HelpInfo } from "@/components/reports/space-explorer/aux-controls";
import type { DeliveryPullResponse, PackIdentity } from "@/lib/space-explorer-shared";

type PackSelectOption = {
  id: string;
  label: string;
  timestamp?: string;
  kind: "bundle" | "content-pack-report" | "uploaded";
  reportId?: string;
};

type ReportSelectOption = {
  id: string;
  label: string;
  kind: "api" | "session";
};

type SpaceExplorerHeaderProps = {
  showUiIds: boolean;
  onOpenContentCreator: () => void;
  onRunQuickTestMode: () => void;
  testModeAllowed: boolean;
  quickTestBusy: boolean;
  pipelineLoading: boolean;
  loadedPackIdentity: PackIdentity | null;
  testModeEnabled: boolean;
  testModeGeneratedAt: string | null;
  selectedPackOptionId: string;
  setSelectedPackOptionId: (id: string) => void;
  packOptions: PackSelectOption[];
  onSelectPackOption: (id: string) => void;
  packUploadInputRef: MutableRefObject<HTMLInputElement | null>;
  onPackUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  selectedReportOptionId: string;
  setSelectedReportOptionId: (id: string) => void;
  reportOptions: ReportSelectOption[];
  deliveryVersionDraft: string;
  deliveryPluginVersion: string;
  deliveryRuntimeVersion: string;
  deliveryBusy: boolean;
  bundleBusy: boolean;
  lastPublishedVersion: string | null;
  lastPulledVersion: string | null;
  deliverySelection: DeliveryPullResponse | null;
  setDeliveryVersionDraft: (value: string) => void;
  setDeliveryPluginVersion: (value: string) => void;
  setDeliveryRuntimeVersion: (value: string) => void;
  onPublishDelivery: () => void;
  onPullDelivery: () => void;
};

export function SpaceExplorerHeader({
  showUiIds,
  onOpenContentCreator,
  onRunQuickTestMode,
  testModeAllowed,
  quickTestBusy,
  pipelineLoading,
  loadedPackIdentity,
  testModeEnabled,
  testModeGeneratedAt,
  selectedPackOptionId,
  setSelectedPackOptionId,
  packOptions,
  onSelectPackOption,
  packUploadInputRef,
  onPackUpload,
  selectedReportOptionId,
  setSelectedReportOptionId,
  reportOptions,
  deliveryVersionDraft,
  deliveryPluginVersion,
  deliveryRuntimeVersion,
  deliveryBusy,
  bundleBusy,
  lastPublishedVersion,
  lastPulledVersion,
  deliverySelection,
  setDeliveryVersionDraft,
  setDeliveryPluginVersion,
  setDeliveryRuntimeVersion,
  onPublishDelivery,
  onPullDelivery,
}: SpaceExplorerHeaderProps) {
  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">Content Space Explorer</p>
            <Button
              id="btn-model-schema-popup"
              data-ui-id="btn-model-schema-popup"
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenContentCreator}
              className="h-7 items-center gap-1 px-2 text-[11px]"
              title="Open Content Creator"
            >
              <FolderTreeIcon className="size-3.5" />
              Content Creator
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon-xs"
              onClick={onRunQuickTestMode}
              disabled={!testModeAllowed || quickTestBusy || pipelineLoading}
              title="Build content pack bundle and generate report"
              aria-label="Build content pack bundle and generate report"
            >
              <SparklesIcon className="size-3.5" />
            </Button>
          </div>
          {showUiIds ? (
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              ID: panel-content-space-explorer
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <div
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
            title="Current pack timestamp"
          >
            <Clock3Icon className="size-3.5" />
            <span className="font-mono text-foreground">
              {loadedPackIdentity?.packVersion ?? "unknown"}
            </span>
          </div>
          {testModeEnabled ? (
            <>
              <span className="inline-flex items-center gap-1 rounded border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-100">
                <PackageIcon className="size-3.5" />
                Browser-generated bundle/report
              </span>
              {testModeGeneratedAt ? (
                <span className="inline-flex items-center gap-1 rounded border border-emerald-400/50 bg-emerald-500/20 px-2 py-1 text-[11px] text-emerald-50">
                  <CircleCheckIcon className="size-3.5" />
                  Generated
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded border border-amber-400/40 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-100">
                  <FileTextIcon className="size-3.5" />
                  Not generated
                </span>
              )}
            </>
          ) : (
            <>
              <label
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
                title="Select pack source"
              >
                <PackageIcon className="size-3.5" />
                <select
                  value={selectedPackOptionId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setSelectedPackOptionId(nextId);
                    onSelectPackOption(nextId);
                  }}
                  className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
                >
                  {packOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                type="button"
                variant="outline"
                size="icon-xs"
                onClick={() => packUploadInputRef.current?.click()}
                className="h-6 w-6"
                title="Upload content pack"
                aria-label="Upload content pack"
              >
                <UploadIcon className="size-3.5" />
              </Button>
              <input
                ref={packUploadInputRef}
                type="file"
                accept=".json,application/json"
                onChange={onPackUpload}
                className="hidden"
              />
              <label
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
                title="Select report source"
              >
                <FileTextIcon className="size-3.5" />
                <select
                  value={selectedReportOptionId}
                  onChange={(e) => setSelectedReportOptionId(e.target.value)}
                  className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
                >
                  {reportOptions.length === 0 ? (
                    <option value="">No reports available</option>
                  ) : (
                    reportOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <DeliveryControls
                versionDraft={deliveryVersionDraft}
                pluginVersion={deliveryPluginVersion}
                runtimeVersion={deliveryRuntimeVersion}
                busy={deliveryBusy || bundleBusy || quickTestBusy || pipelineLoading}
                lastPublishedVersion={lastPublishedVersion}
                lastPulledVersion={lastPulledVersion}
                selection={deliverySelection}
                onVersionDraftChange={setDeliveryVersionDraft}
                onPluginVersionChange={setDeliveryPluginVersion}
                onRuntimeVersionChange={setDeliveryRuntimeVersion}
                onPublish={onPublishDelivery}
                onPull={onPullDelivery}
              />
            </>
          )}
          <HelpInfo
            tone="header"
            title="Content Space Explorer"
            body="Primary authoring and analysis controls. Use this panel to choose views, tune vectors, and inspect reachability or deltas."
          />
        </div>
      </div>
      {testModeEnabled ? (
        <div className="border-b border-emerald-400/40 bg-emerald-500/10 px-3 py-1.5 text-[11px] text-emerald-100">
          Test mode active: browser-only session, no database persistence.
        </div>
      ) : null}
    </>
  );
}
