import type { ChangeEvent, MutableRefObject } from "react";
import {
  IconAlertTriangle as AlertTriangleIcon,
  IconCircleCheck as CircleCheckIcon,
  IconClockHour3 as Clock3Icon,
  IconCode as CodeIcon,
  IconDownload as DownloadIcon,
  IconFileText as FileTextIcon,
  IconFolder as FolderTreeIcon,
  IconPackage as PackageIcon,
  IconSparkles as SparklesIcon,
  IconUpload as UploadIcon,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  DeliveryControls,
  HelpInfo,
} from "@/components/reports/space-explorer/aux-controls";
import type {
  DeliveryPullResponse,
  PackIdentity,
} from "@/lib/space-explorer-shared";
import type { GeneratedOutputPayload } from "@/components/reports/space-explorer/config";
import type {
  OverlaySelectOption,
  OverlayWarningStatus,
} from "@/components/reports/space-explorer/overlay-warnings";

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
  onExportContentSchema: () => void;
  onExportLevelContent: () => void;
  onExportCanonicalInstances: () => void;
  onExportGeneratedOutputs: () => void;
  generatedOutputs: GeneratedOutputPayload[];
  selectedOverlayId: string;
  setSelectedOverlayId: (id: string) => void;
  overlayOptions: OverlaySelectOption[];
  overlayStatuses: OverlayWarningStatus[];
  activeOverlayLabel: string | null;
  activeOverlayDescription?: string;
  overlayMissingCount: number;
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
  onExportContentSchema,
  onExportLevelContent,
  onExportCanonicalInstances,
  onExportGeneratedOutputs,
  generatedOutputs,
  selectedOverlayId,
  setSelectedOverlayId,
  overlayOptions,
  overlayStatuses,
  activeOverlayLabel,
  activeOverlayDescription,
  overlayMissingCount,
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
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            onClick={() => packUploadInputRef.current?.click()}
            className="h-6 w-6"
            title="Import schema, level content, canonical instances, or content pack JSON"
            aria-label="Import schema, level content, canonical instances, or content pack JSON"
          >
            <UploadIcon className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            onClick={onExportContentSchema}
            className="h-6 w-6"
            title="Export current schema document"
            aria-label="Export current schema document"
          >
            <DownloadIcon className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            onClick={onExportLevelContent}
            className="h-6 w-6"
            title="Export current level content document"
            aria-label="Export current level content document"
          >
            <PackageIcon className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            onClick={onExportCanonicalInstances}
            className="h-6 w-6"
            title="Export current canonical instances document"
            aria-label="Export current canonical instances document"
          >
            <FileTextIcon className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            onClick={onExportGeneratedOutputs}
            disabled={generatedOutputs.length === 0}
            className="h-6 w-6"
            title={
              generatedOutputs.length > 0
                ? "Export generated codegen outputs"
                : "No generated outputs available"
            }
            aria-label="Export generated codegen outputs"
          >
            <CodeIcon className="size-3.5" />
          </Button>
          <input
            ref={packUploadInputRef}
            type="file"
            accept=".json,application/json"
            onChange={onPackUpload}
            className="hidden"
          />
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
                busy={
                  deliveryBusy || bundleBusy || quickTestBusy || pipelineLoading
                }
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Test mode active: browser-only session, no database persistence.
            </span>
            {generatedOutputs.length > 0 ? (
              <span className="inline-flex items-center gap-1 rounded border border-emerald-300/40 bg-emerald-400/10 px-2 py-1 text-[11px] text-emerald-50">
                <CodeIcon className="size-3.5" />
                {generatedOutputs.length} generated output
                {generatedOutputs.length === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
          {generatedOutputs.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {generatedOutputs.map((output) => (
                <span
                  key={output.artifactId}
                  className="rounded border border-emerald-300/35 bg-black/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-50/90"
                >
                  {output.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="border-b border-border/60 bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <label
              className="inline-flex items-center gap-1"
              title="Warnings-only game overlay"
            >
              <PackageIcon className="size-3.5" />
              <span>Overlay</span>
              <select
                value={selectedOverlayId}
                onChange={(e) => setSelectedOverlayId(e.target.value)}
                className="rounded border border-border bg-background px-2 py-1 text-[11px] text-foreground"
              >
                {overlayOptions.map((option) => (
                  <option key={option.overlayId} value={option.overlayId}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {activeOverlayLabel ? (
              overlayMissingCount === 0 ? (
                <span className="inline-flex items-center gap-1 rounded border border-emerald-300/50 bg-emerald-500/10 px-2 py-1 text-emerald-700 dark:text-emerald-200">
                  <CircleCheckIcon className="size-3.5" />
                  {activeOverlayLabel}: ready
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded border border-amber-300/50 bg-amber-500/10 px-2 py-1 text-amber-700 dark:text-amber-200">
                  <AlertTriangleIcon className="size-3.5" />
                  {activeOverlayLabel}: {overlayMissingCount} warning
                  {overlayMissingCount === 1 ? "" : "s"}
                </span>
              )
            ) : (
              <span className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-foreground">
                <FileTextIcon className="size-3.5" />
                No overlay warnings
              </span>
            )}
          </div>
          {activeOverlayDescription ? (
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground/80">
              {activeOverlayDescription}
            </span>
          ) : null}
        </div>
        {overlayStatuses.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {overlayStatuses.map((status) => (
              <span
                key={status.category}
                title={status.detail}
                className={`rounded border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                  status.ready
                    ? "border-emerald-300/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
                    : "border-amber-300/50 bg-amber-500/10 text-amber-700 dark:text-amber-200"
                }`}
              >
                {status.label}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}
