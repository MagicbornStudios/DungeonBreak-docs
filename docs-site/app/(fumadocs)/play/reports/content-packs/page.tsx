"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/page";
import { buildContentPackReport } from "@/lib/content-pack-report";

type ContentPackReportEntry = {
  reportId: string;
  sourceName: string;
  generatedAt: string;
  featureCount: number;
  modelCount: number;
  unresolvedRefCount: number;
};

type ContentPackReport = {
  reportId: string;
  sourceName: string;
  summary: {
    packKeys: string[];
    spaceVectors: {
      featureCount: number;
      modelCount: number;
      groups: Record<string, number>;
      spaces: Record<string, number>;
      modelPrefixes: Record<string, number>;
      unresolvedFeatureRefs: string[];
    };
  };
};

export default function ContentPackReportsPage() {
  const [entries, setEntries] = useState<ContentPackReportEntry[]>([]);
  const [selected, setSelected] = useState<ContentPackReport | null>(null);
  const [message, setMessage] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [localOnly, setLocalOnly] = useState(false);

  const refreshIndex = useCallback(async () => {
    const response = await fetch("/api/content-packs/reports");
    const body = (await response.json()) as { ok: boolean; entries?: ContentPackReportEntry[]; error?: string };
    if (!body.ok) {
      setMessage(body.error ?? "Failed to load content-pack reports.");
      return;
    }
    setEntries(body.entries ?? []);
  }, []);

  const loadReport = useCallback(async (reportId: string) => {
    try {
      const response = await fetch(`/api/content-packs/reports?reportId=${encodeURIComponent(reportId)}`);
      const raw = await response.text();
      const body = raw
        ? (JSON.parse(raw) as { ok: boolean; report?: ContentPackReport; error?: string })
        : { ok: false, error: "Empty response from report API." };
      if (!body.ok || !body.report) {
        throw new Error(body.error ?? "Failed to load report.");
      }
      setSelected(body.report);
      setLocalOnly(false);
      return;
    } catch {
      try {
        const raw = sessionStorage.getItem(`dungeonbreak-content-pack-report-${reportId}`);
        if (raw) {
          const parsed = JSON.parse(raw) as ContentPackReport;
          setSelected(parsed);
          setLocalOnly(true);
          return;
        }
      } catch {
        // ignore
      }
      setMessage("Failed to load report.");
    }
  }, []);

  useEffect(() => {
    refreshIndex().catch(() => {
      // ignore
    });
  }, [refreshIndex]);

  const onUpload = useCallback(
    async (file: File | null) => {
      if (!file) return;
      setBusy(true);
      setMessage("");
      try {
        const text = await file.text();
        const bundle = JSON.parse(text);
        try {
          const response = await fetch("/api/content-packs/reports", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              bundle,
              sourceName: file.name,
              persist: true,
            }),
          });
          const raw = await response.text();
          const body = raw
            ? (JSON.parse(raw) as {
                ok: boolean;
                report?: ContentPackReport;
                entry?: ContentPackReportEntry;
                error?: string;
              })
            : { ok: false, error: "Empty response from report API." };
          if (!body.ok || !body.report) {
            throw new Error(body.error ?? "Failed to create report.");
          }
          setSelected(body.report);
          setMessage(`Report created: ${body.report.reportId}`);
          setLocalOnly(false);
          try {
            sessionStorage.setItem(`dungeonbreak-content-pack-report-${body.report.reportId}`, JSON.stringify(body.report));
          } catch {
            // ignore
          }
          await refreshIndex();
        } catch {
          const report = buildContentPackReport(bundle, { sourceName: file.name });
          const fallbackEntry: ContentPackReportEntry = {
            reportId: report.reportId,
            sourceName: report.sourceName,
            generatedAt: report.generatedAt,
            featureCount: report.summary.spaceVectors.featureCount,
            modelCount: report.summary.spaceVectors.modelCount,
            unresolvedRefCount: report.summary.spaceVectors.unresolvedFeatureRefs.length,
          };
          setEntries((prev) => [fallbackEntry, ...prev.filter((row) => row.reportId !== fallbackEntry.reportId)]);
          setSelected(report as unknown as ContentPackReport);
          setMessage(`Report created (local): ${report.reportId}`);
          setLocalOnly(true);
          try {
            sessionStorage.setItem(`dungeonbreak-content-pack-report-${report.reportId}`, JSON.stringify(report));
          } catch {
            // ignore
          }
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : String(error));
      } finally {
        setBusy(false);
      }
    },
    [refreshIndex],
  );

  return (
    <DocsPage
      footer={{ enabled: false }}
      tableOfContent={{ style: "normal", single: false }}
      toc={[
        { title: "Create", url: "#create", depth: 2 },
        { title: "Saved Reports", url: "#saved", depth: 2 },
      ]}
    >
      <DocsTitle>Content Pack Reports</DocsTitle>
      <DocsDescription>
        Upload a content pack bundle, generate a space-vector report, and open it in Space Explorer.
      </DocsDescription>
      <DocsBody>
        <section id="create" className="mb-6 rounded border border-border p-3">
          <div className="mb-2 text-sm font-semibold">Create from Bundle</div>
          <input
            data-testid="content-pack-report-upload"
            type="file"
            accept=".json,application/json"
            onChange={(event) => {
              void onUpload(event.target.files?.[0] ?? null);
            }}
            className="block text-xs"
          />
          {message ? <p className="mt-2 text-xs text-muted-foreground">{message}</p> : null}
          {localOnly ? (
            <p className="mt-1 text-[11px] text-amber-300">
              API persistence unavailable in this runtime; using local session storage fallback.
            </p>
          ) : null}
          {busy ? <p className="mt-1 text-xs text-muted-foreground">Analyzing bundle...</p> : null}
        </section>

        <section id="saved" className="grid gap-4 md:grid-cols-[320px_minmax(0,1fr)]">
          <div className="rounded border border-border p-3">
            <div className="mb-2 text-sm font-semibold">Saved Reports</div>
            <ul className="grid gap-2">
              {entries.map((entry) => (
                <li key={entry.reportId} className="rounded border border-border p-2">
                  <div className="truncate text-xs font-medium">{entry.sourceName}</div>
                  <div className="text-[11px] text-muted-foreground">
                    f={entry.featureCount} m={entry.modelCount} unresolved={entry.unresolvedRefCount}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      className="rounded border border-border px-2 py-1 text-[11px] hover:bg-muted/30"
                      onClick={() => {
                        void loadReport(entry.reportId);
                      }}
                    >
                      View
                    </button>
                    <Link
                      href={`/play/reports/spaces?contentPackReportId=${encodeURIComponent(entry.reportId)}`}
                      className="rounded border border-border px-2 py-1 text-[11px] hover:bg-muted/30"
                    >
                      Open in Space Explorer
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded border border-border p-3">
            <div className="mb-2 text-sm font-semibold">Selected Report</div>
            {!selected ? (
              <p className="text-xs text-muted-foreground">Select a report to inspect it.</p>
            ) : (
              <div className="space-y-2 text-xs">
                <p>
                  <span className="font-semibold">ID:</span> {selected.reportId}
                </p>
                <p>
                  <span className="font-semibold">Source:</span> {selected.sourceName}
                </p>
                <p>
                  <span className="font-semibold">Pack keys:</span> {selected.summary.packKeys.join(", ")}
                </p>
                <p>
                  <span className="font-semibold">Features / Models:</span>{" "}
                  {selected.summary.spaceVectors.featureCount} / {selected.summary.spaceVectors.modelCount}
                </p>
                <p>
                  <span className="font-semibold">Unresolved refs:</span>{" "}
                  {selected.summary.spaceVectors.unresolvedFeatureRefs.length}
                </p>
              </div>
            )}
          </div>
        </section>
      </DocsBody>
    </DocsPage>
  );
}
