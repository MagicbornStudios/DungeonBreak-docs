"use client";

import { IconHelpCircle as CircleHelpIcon, IconPackage as PackageIcon, IconRefresh as RefreshCwIcon, IconUpload as UploadIcon } from "@tabler/icons-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { analyzeReport } from "@/lib/playthrough-analyzer";
import { runPlaythrough } from "@/lib/playthrough-runner";
import type {
  ActionTraceEntry,
  DeliveryPullResponse,
  PackIdentity,
  ReportData,
} from "@/lib/space-explorer-shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function HelpInfo({
  title,
  body,
  tone = "content",
}: {
  title: string;
  body: string;
  tone?: "header" | "content" | "footer" | "context";
}) {
  const [open, setOpen] = useState(false);
  const toneClasses: Record<"header" | "content" | "footer" | "context", string> = {
    header: "border-sky-400/60 bg-sky-500/15 text-sky-100 hover:bg-sky-500/25",
    content: "border-violet-400/60 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25",
    footer: "border-emerald-400/60 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25",
    context: "border-amber-400/60 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25",
  };
  const toneDialogClasses: Record<"header" | "content" | "footer" | "context", string> = {
    header: "border-sky-400/60",
    content: "border-violet-400/60",
    footer: "border-emerald-400/60",
    context: "border-amber-400/60",
  };
  const toneHeaderClasses: Record<"header" | "content" | "footer" | "context", string> = {
    header: "bg-sky-500/10 text-sky-100",
    content: "bg-violet-500/10 text-violet-100",
    footer: "bg-emerald-500/10 text-emerald-100",
    context: "bg-amber-500/10 text-amber-100",
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={`About ${title}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={`ml-1 size-5 rounded-full border transition-colors ${toneClasses[tone]}`}
      >
        <CircleHelpIcon className="size-3.5" />
      </Button>
      {open ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`w-full max-w-md rounded border bg-card p-4 shadow-lg ${toneDialogClasses[tone]}`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              className={`mb-2 flex items-center justify-between gap-3 rounded px-2 py-1 ${toneHeaderClasses[tone]}`}
            >
              <div className="text-sm font-semibold">{title}</div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label="Close"
                className="h-6 px-2 py-0.5 text-xs"
                onClick={() => setOpen(false)}
              >
                X
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{body}</p>
            <div className="mt-4 text-right">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function GenerateReportButton({
  onGenerated,
  policyId,
  packIdentity,
  testModeEnabled,
  onRunQuickTestMode,
  quickTestBusy,
}: {
  onGenerated: (r: ReportData) => void;
  policyId: string;
  packIdentity: PackIdentity | null;
  testModeEnabled: boolean;
  onRunQuickTestMode: () => void;
  quickTestBusy: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const onClick = useCallback(() => {
    if (testModeEnabled) {
      onRunQuickTestMode();
      return;
    }
    setBusy(true);
    try {
      const report = runPlaythrough(undefined, 75, undefined, policyId);
      const reportWithBinding = {
        ...report,
      } as typeof report & { packBinding?: Record<string, string> };
      if (packIdentity) {
        reportWithBinding.packBinding = {
          packId: packIdentity.packId,
          packVersion: packIdentity.packVersion,
          packHash: packIdentity.packHash,
          schemaVersion: packIdentity.schemaVersion,
          engineVersion: packIdentity.engineVersion,
        };
      }
      const analysis = analyzeReport(report);
      const payload = { report: reportWithBinding, analysis };
      try {
        sessionStorage.setItem("dungeonbreak-browser-report", JSON.stringify(payload));
      } catch {
        // ignore
      }
      onGenerated({
        seed: report.seed,
        run: {
          actionTrace: report.run.actionTrace as ActionTraceEntry[],
        },
      });
    } finally {
      setBusy(false);
    }
  }, [onGenerated, policyId, packIdentity, testModeEnabled, onRunQuickTestMode]);
  return (
    <details className="rounded border bg-background" open>
      <summary className="cursor-pointer px-3 py-2 text-xs font-medium uppercase text-muted-foreground hover:bg-muted/50">
        Report
      </summary>
      <div className="border-t px-3 py-2">
        <p className="text-xs text-muted-foreground">No report loaded.</p>
        <Button type="button" onClick={onClick} disabled={busy || quickTestBusy} className="mt-2 h-8 w-full text-xs">
          {testModeEnabled
            ? quickTestBusy
              ? "Running quick test mode..."
              : "Run test mode build + playthrough"
            : busy
              ? "Generating..."
              : "Generate report in browser"}
        </Button>
        <Link href="/play/reports" className="mt-2 block text-center text-xs text-primary underline">
          View full report
        </Link>
      </div>
    </details>
  );
}

export type DeliveryControlsProps = {
  versionDraft: string;
  pluginVersion: string;
  runtimeVersion: string;
  busy: boolean;
  lastPublishedVersion: string | null;
  lastPulledVersion: string | null;
  selection: DeliveryPullResponse | null;
  onVersionDraftChange: (value: string) => void;
  onPluginVersionChange: (value: string) => void;
  onRuntimeVersionChange: (value: string) => void;
  onPublish: () => void;
  onPull: () => void;
};

export function DeliveryControls({
  versionDraft,
  pluginVersion,
  runtimeVersion,
  busy,
  lastPublishedVersion,
  lastPulledVersion,
  selection,
  onVersionDraftChange,
  onPluginVersionChange,
  onRuntimeVersionChange,
  onPublish,
  onPull,
}: DeliveryControlsProps) {
  return (
    <>
      <div className="inline-flex items-center gap-1 rounded border border-border/60 bg-muted/20 px-1 py-1">
        <PackageIcon className="size-3.5 text-muted-foreground" />
        <Input value={versionDraft} onChange={(e) => onVersionDraftChange(e.target.value)} className="h-7 w-32 border-border/60 bg-background px-2 text-xs" placeholder="version" title="Delivery version to publish" />
        <Input value={pluginVersion} onChange={(e) => onPluginVersionChange(e.target.value)} className="h-7 w-20 border-border/60 bg-background px-2 text-xs" placeholder="plugin" title="Plugin compatibility version" />
        <Input value={runtimeVersion} onChange={(e) => onRuntimeVersionChange(e.target.value)} className="h-7 w-20 border-border/60 bg-background px-2 text-xs" placeholder="runtime" title="Runtime compatibility version" />
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onPublish} disabled={busy} className="h-7 px-2 text-[11px]" title="Build and publish delivery artifacts">
        <UploadIcon className="mr-1 size-3.5" />
        Publish
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onPull} disabled={busy} className="h-7 px-2 text-[11px]" title="Pull latest compatible delivery version">
        <RefreshCwIcon className="mr-1 size-3.5" />
        Pull
      </Button>
      {lastPublishedVersion ? <Badge variant="secondary">Published {lastPublishedVersion}</Badge> : null}
      {lastPulledVersion ? <Badge variant="outline">Pulled {lastPulledVersion}</Badge> : null}
      {selection?.downloads?.bundle ? (
        <Button asChild type="button" variant="ghost" size="sm" className="h-7 px-2 text-[11px]">
          <a href={selection.downloads.bundle} target="_blank" rel="noreferrer">
            Bundle
          </a>
        </Button>
      ) : null}
      {selection?.downloads?.manifest ? (
        <Button asChild type="button" variant="ghost" size="sm" className="h-7 px-2 text-[11px]">
          <a href={selection.downloads.manifest} target="_blank" rel="noreferrer">
            Manifest
          </a>
        </Button>
      ) : null}
    </>
  );
}
