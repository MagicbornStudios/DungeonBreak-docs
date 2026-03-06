import { useCallback, useEffect, useState, type ChangeEvent, type Dispatch, type SetStateAction } from "react";
import { parseModelInstancesFromContentBindings } from "@/lib/space-explorer-schema";
import type { ActionTraceEntry, PackIdentity, ReportData } from "@/lib/space-explorer-shared";
import type {
  BuiltBundlePayload,
  ModelInstanceBinding,
  PackSelectOption,
  ReportIdentity,
  ReportSelectOption,
  SpaceVectorPackOverrides,
} from "@/components/reports/space-explorer/config";

type UsePackAndReportSourcesParams = {
  loadedPackVersion?: string;
  testModeEnabled: boolean;
  testModeBundleSource: string;
  persistActivePackSnapshot: (
    identity: PackIdentity,
    bundle?: Record<string, unknown>
  ) => void;
  replaceModelInstances: (instances: ModelInstanceBinding[]) => void;
  setSpaceOverrides: Dispatch<SetStateAction<SpaceVectorPackOverrides | undefined>>;
  setBaseSpaceVectors: Dispatch<SetStateAction<SpaceVectorPackOverrides | undefined>>;
  setLoadedPackIdentity: Dispatch<SetStateAction<PackIdentity | null>>;
  setBuilderMessage: Dispatch<SetStateAction<string>>;
  setReport: Dispatch<SetStateAction<ReportData | null>>;
  setLoadedReportIdentity: Dispatch<SetStateAction<ReportIdentity | null>>;
};

export function usePackAndReportSources({
  loadedPackVersion,
  testModeEnabled,
  testModeBundleSource,
  persistActivePackSnapshot,
  replaceModelInstances,
  setSpaceOverrides,
  setBaseSpaceVectors,
  setLoadedPackIdentity,
  setBuilderMessage,
  setReport,
  setLoadedReportIdentity,
}: UsePackAndReportSourcesParams) {
  const [packOptions, setPackOptions] = useState<PackSelectOption[]>([
    { id: "bundle-default", label: "Content Pack Bundle", kind: "bundle" },
  ]);
  const [selectedPackOptionId, setSelectedPackOptionId] =
    useState("bundle-default");
  const [reportOptions, setReportOptions] = useState<ReportSelectOption[]>([]);
  const [selectedReportOptionId, setSelectedReportOptionId] = useState("");

  const loadBundlePack = useCallback(() => {
    fetch("/game/content-pack.bundle.v1.json")
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error("bundle not found"))
      )
      .then((bundle) => {
        const overrides = (bundle?.packs?.spaceVectors ?? undefined) as
          | SpaceVectorPackOverrides
          | undefined;
        if (overrides && typeof overrides === "object") {
          setSpaceOverrides(overrides);
          setBaseSpaceVectors(overrides);
          const instances = parseModelInstancesFromContentBindings(overrides);
          if (instances.length > 0) {
            replaceModelInstances(instances);
          }
        }
        const identity: PackIdentity = {
          source: "bundle:/game/content-pack.bundle.v1.json",
          packId: String(bundle?.patchName ?? "content-pack.bundle.v1"),
          packVersion: String(bundle?.generatedAt ?? "unknown"),
          packHash: String(bundle?.hashes?.overall ?? "unknown"),
          schemaVersion: String(
            bundle?.schemaVersion ?? "content-pack.bundle.v1"
          ),
          engineVersion: String(bundle?.enginePackage?.version ?? "unknown"),
        };
        setLoadedPackIdentity(identity);
        persistActivePackSnapshot(identity, bundle as Record<string, unknown>);
        setPackOptions((prev) =>
          prev.map((row) =>
            row.id === "bundle-default"
              ? {
                  ...row,
                  label: String(bundle?.patchName ?? "content-pack.bundle.v1"),
                  timestamp: String(bundle?.generatedAt ?? "unknown"),
                }
              : row
          )
        );
      })
      .catch(() => {
        // optional
      });
  }, [
    persistActivePackSnapshot,
    replaceModelInstances,
    setBaseSpaceVectors,
    setLoadedPackIdentity,
    setSpaceOverrides,
  ]);

  const loadDefaultTestModeBundle = useCallback(() => {
    fetch("/api/content-packs/test-mode-default")
      .then((r) =>
        r.ok
          ? r.json()
          : Promise.reject(new Error("default test-mode bundle not found"))
      )
      .then((body) => {
        const bundle = body?.bundle as BuiltBundlePayload | undefined;
        if (!bundle) return;
        const overrides = (bundle?.packs?.spaceVectors ?? undefined) as
          | SpaceVectorPackOverrides
          | undefined;
        if (overrides && typeof overrides === "object") {
          setSpaceOverrides(overrides);
          setBaseSpaceVectors(overrides);
          const instances = parseModelInstancesFromContentBindings(overrides);
          replaceModelInstances(instances);
        }
        const identity: PackIdentity = {
          source: "test-mode-default:encrypted",
          packId: String(
            bundle.patchName ?? "test-mode.default.content-pack.bundle.v1"
          ),
          packVersion: String(bundle.generatedAt ?? "unknown"),
          packHash: String(bundle.hashes?.overall ?? "unknown"),
          schemaVersion: String(
            bundle.schemaVersion ?? "content-pack.bundle.v1"
          ),
          engineVersion: String(bundle.enginePackage?.version ?? "unknown"),
        };
        setLoadedPackIdentity(identity);
        persistActivePackSnapshot(identity, bundle as Record<string, unknown>);
        setPackOptions((prev) =>
          prev.map((row) =>
            row.id === "bundle-default"
              ? {
                  ...row,
                  label: String(bundle?.patchName ?? "Test Mode Default"),
                  timestamp: String(bundle?.generatedAt ?? "unknown"),
                }
              : row
          )
        );
        setSelectedPackOptionId("bundle-default");
      })
      .catch((error) => {
        setBuilderMessage(
          error instanceof Error ? error.message : String(error)
        );
      });
  }, [
    persistActivePackSnapshot,
    replaceModelInstances,
    setBaseSpaceVectors,
    setBuilderMessage,
    setLoadedPackIdentity,
    setSpaceOverrides,
  ]);

  const loadEmptyTestModeBundle = useCallback(() => {
    setSpaceOverrides(undefined);
    setBaseSpaceVectors(undefined);
    replaceModelInstances([]);
    const identity: PackIdentity = {
      source: "test-mode-empty",
      packId: "test-mode.empty.content-pack.bundle.v1",
      packVersion: new Date().toISOString(),
      packHash: "empty",
      schemaVersion: "content-pack.bundle.v1",
      engineVersion: "dev",
    };
    setLoadedPackIdentity(identity);
    persistActivePackSnapshot(identity, {
      schemaVersion: "content-pack.bundle.v1",
      patchName: identity.packId,
      generatedAt: identity.packVersion,
      hashes: { overall: identity.packHash },
      enginePackage: { version: identity.engineVersion },
      packs: {},
    });
    setSelectedPackOptionId("bundle-default");
    setBuilderMessage("Test mode empty bundle active: runtime defaults only.");
  }, [
    persistActivePackSnapshot,
    replaceModelInstances,
    setBaseSpaceVectors,
    setBuilderMessage,
    setLoadedPackIdentity,
    setSpaceOverrides,
  ]);

  const loadContentPackReport = useCallback(
    (reportId: string) => {
      fetch(
        `/api/content-packs/reports?reportId=${encodeURIComponent(reportId)}`
      )
        .then((r) =>
          r.ok
            ? r.json()
            : Promise.reject(new Error("content-pack report not found"))
        )
        .then((body) => {
          const overrides = body?.report?.bundle?.spaceVectors as
            | SpaceVectorPackOverrides
            | undefined;
          if (!overrides || typeof overrides !== "object") {
            setBuilderMessage(
              `Report '${reportId}' does not include space vectors.`
            );
            return;
          }
          setSpaceOverrides(overrides);
          const instances = parseModelInstancesFromContentBindings(overrides);
          if (instances.length > 0) {
            replaceModelInstances(instances);
          }
          const identity: PackIdentity = {
            source: `content-pack-report:${String(body?.report?.sourceName ?? reportId)}`,
            reportId,
            packId: String(
              body?.report?.bundle?.patchName ??
                body?.report?.sourceName ??
                "content-pack.report"
            ),
            packVersion: String(
              body?.report?.bundle?.generatedAt ??
                body?.report?.generatedAt ??
                "unknown"
            ),
            packHash: String(body?.report?.bundle?.hashes?.overall ?? "unknown"),
            schemaVersion: String(
              body?.report?.bundle?.schemaVersion ?? "content-pack.bundle.v1"
            ),
            engineVersion: String(
              body?.report?.bundle?.enginePackage?.version ?? "unknown"
            ),
          };
          setLoadedPackIdentity(identity);
          persistActivePackSnapshot(
            identity,
            (body?.report?.bundle as Record<string, unknown> | undefined) ??
              undefined
          );
          setBuilderMessage(
            `Loaded content-pack report '${reportId}' into Space Explorer.`
          );
        })
        .catch(() => {
          try {
            const raw = sessionStorage.getItem(
              `dungeonbreak-content-pack-report-${reportId}`
            );
            if (!raw) {
              setBuilderMessage(`content-pack report '${reportId}' not found.`);
              return;
            }
            const localReport = JSON.parse(raw) as {
              sourceName?: string;
              generatedAt?: string;
              bundle?: {
                patchName?: string;
                schemaVersion?: string;
                generatedAt?: string;
                hashes?: Record<string, string>;
                enginePackage?: { version?: string };
                spaceVectors?: SpaceVectorPackOverrides;
              };
            };
            const overrides = localReport?.bundle?.spaceVectors;
            if (!overrides || typeof overrides !== "object") {
              setBuilderMessage(
                `Report '${reportId}' does not include space vectors.`
              );
              return;
            }
            setSpaceOverrides(overrides);
            const instances = parseModelInstancesFromContentBindings(overrides);
            if (instances.length > 0) {
              replaceModelInstances(instances);
            }
            const identity: PackIdentity = {
              source: `content-pack-report:session:${String(localReport?.sourceName ?? reportId)}`,
              reportId,
              packId: String(
                localReport?.bundle?.patchName ??
                  localReport?.sourceName ??
                  "content-pack.report"
              ),
              packVersion: String(
                localReport?.bundle?.generatedAt ??
                  localReport?.generatedAt ??
                  "unknown"
              ),
              packHash: String(localReport?.bundle?.hashes?.overall ?? "unknown"),
              schemaVersion: String(
                localReport?.bundle?.schemaVersion ?? "content-pack.bundle.v1"
              ),
              engineVersion: String(
                localReport?.bundle?.enginePackage?.version ?? "unknown"
              ),
            };
            setLoadedPackIdentity(identity);
            persistActivePackSnapshot(
              identity,
              (localReport?.bundle as Record<string, unknown> | undefined) ??
                undefined
            );
            setBuilderMessage(
              `Loaded local content-pack report '${reportId}' into Space Explorer.`
            );
          } catch (e) {
            setBuilderMessage(e instanceof Error ? e.message : String(e));
          }
        });
    },
    [
      persistActivePackSnapshot,
      replaceModelInstances,
      setBuilderMessage,
      setLoadedPackIdentity,
      setSpaceOverrides,
    ]
  );

  const refreshPackOptions = useCallback(async () => {
    const next: PackSelectOption[] = [
      {
        id: "bundle-default",
        label: "Content Pack Bundle",
        kind: "bundle",
        timestamp: loadedPackVersion,
      },
    ];
    try {
      const response = await fetch("/api/content-packs/reports");
      if (response.ok) {
        const body = (await response.json()) as {
          ok?: boolean;
          entries?: Array<{
            reportId: string;
            sourceName?: string;
            generatedAt?: string;
          }>;
        };
        for (const entry of body.entries ?? []) {
          next.push({
            id: `content-pack-report:${entry.reportId}`,
            label: entry.sourceName || entry.reportId,
            timestamp: entry.generatedAt,
            kind: "content-pack-report",
            reportId: entry.reportId,
          });
        }
      }
    } catch {
      // ignore list fetch failures
    }
    try {
      for (let i = 0; i < sessionStorage.length; i += 1) {
        const key = sessionStorage.key(i);
        if (!key || !key.startsWith("dungeonbreak-content-pack-report-")) {
          continue;
        }
        const reportId = key.replace("dungeonbreak-content-pack-report-", "");
        if (next.some((row) => row.reportId === reportId)) continue;
        const raw = sessionStorage.getItem(key);
        if (!raw) continue;
        const localReport = JSON.parse(raw) as {
          sourceName?: string;
          generatedAt?: string;
          bundle?: { generatedAt?: string };
        };
        next.push({
          id: `content-pack-report:${reportId}`,
          label: localReport.sourceName || reportId,
          timestamp: localReport.bundle?.generatedAt ?? localReport.generatedAt,
          kind: "content-pack-report",
          reportId,
        });
      }
    } catch {
      // ignore session scan errors
    }
    setPackOptions((prev) => {
      const uploaded = prev.filter((row) => row.kind === "uploaded");
      const merged = [...uploaded, ...next];
      const seen = new Set<string>();
      return merged.filter((row) => {
        if (seen.has(row.id)) return false;
        seen.add(row.id);
        return true;
      });
    });
  }, [loadedPackVersion]);

  const refreshReportOptions = useCallback(async () => {
    const next: ReportSelectOption[] = [];
    try {
      const response = await fetch("/api/play-reports");
      if (response.ok) {
        const body = (await response.json()) as {
          ok?: boolean;
          report?: { reportId?: string; seed?: number; generatedAt?: string };
        };
        if (body?.ok && body?.report) {
          next.push({
            id: "api-report",
            label: body.report.reportId
              ? `Playthrough Report - ${body.report.reportId}`
              : `Playthrough Report - Seed ${String(body.report.seed ?? "unknown")}`,
            kind: "api",
          });
        }
      }
    } catch {
      // ignore
    }
    try {
      const raw = sessionStorage.getItem("dungeonbreak-browser-report");
      if (raw) {
        const local = JSON.parse(raw) as {
          report?: { reportId?: string; seed?: number; generatedAt?: string };
        };
        next.push({
          id: "session-report",
          label: local?.report?.reportId
            ? `Playthrough Report - ${local.report.reportId}`
            : `Playthrough Report - Seed ${String(local?.report?.seed ?? "unknown")}`,
          kind: "session",
        });
      }
    } catch {
      // ignore
    }
    setReportOptions(next);
    setSelectedReportOptionId((prev) => {
      if (prev && next.some((row) => row.id === prev)) return prev;
      return next[0]?.id ?? "";
    });
  }, []);

  const handlePackUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as {
          patchName?: string;
          generatedAt?: string;
          hashes?: { overall?: string };
          schemaVersion?: string;
          enginePackage?: { version?: string };
          packs?: { spaceVectors?: SpaceVectorPackOverrides };
          bundle?: {
            patchName?: string;
            generatedAt?: string;
            hashes?: { overall?: string };
            schemaVersion?: string;
            enginePackage?: { version?: string };
            spaceVectors?: SpaceVectorPackOverrides;
          };
        };
        const overrides =
          parsed?.packs?.spaceVectors ?? parsed?.bundle?.spaceVectors;
        if (!overrides || typeof overrides !== "object") {
          setBuilderMessage(
            `Uploaded file '${file.name}' has no space vector payload.`
          );
          return;
        }
        const identity: PackIdentity = {
          source: `upload:${file.name}`,
          packId: String(
            parsed.patchName ?? parsed.bundle?.patchName ?? file.name
          ),
          packVersion: String(
            parsed.generatedAt ??
              parsed.bundle?.generatedAt ??
              new Date().toISOString()
          ),
          packHash: String(
            parsed.hashes?.overall ??
              parsed.bundle?.hashes?.overall ??
              "uploaded"
          ),
          schemaVersion: String(
            parsed.schemaVersion ??
              parsed.bundle?.schemaVersion ??
              "content-pack.bundle.v1"
          ),
          engineVersion: String(
            parsed.enginePackage?.version ??
              parsed.bundle?.enginePackage?.version ??
              "unknown"
          ),
        };
        const optionId = `uploaded:${Date.now()}`;
        setPackOptions((prev) => [
          {
            id: optionId,
            label: identity.packId,
            timestamp: identity.packVersion,
            kind: "uploaded",
            overrides,
            identity,
          },
          ...prev,
        ]);
        setSelectedPackOptionId(optionId);
        setSpaceOverrides(overrides);
        setBaseSpaceVectors(overrides);
        const instances = parseModelInstancesFromContentBindings(overrides);
        if (instances.length > 0) {
          replaceModelInstances(instances);
        }
        setLoadedPackIdentity(identity);
        const bundlePayload =
          parsed &&
          typeof parsed === "object" &&
          parsed.bundle &&
          typeof parsed.bundle === "object"
            ? (parsed.bundle as Record<string, unknown>)
            : (parsed as Record<string, unknown>);
        persistActivePackSnapshot(identity, bundlePayload);
        setBuilderMessage(`Loaded uploaded content pack '${file.name}'.`);
      } catch (e) {
        setBuilderMessage(e instanceof Error ? e.message : String(e));
      } finally {
        if (event.target) event.target.value = "";
      }
    },
    [
      persistActivePackSnapshot,
      replaceModelInstances,
      setBaseSpaceVectors,
      setBuilderMessage,
      setLoadedPackIdentity,
      setSpaceOverrides,
    ]
  );

  const applyLoadedReport = useCallback(
    (
      r: {
        seed: number;
        run: { actionTrace: unknown[] };
        packBinding?: Record<string, unknown>;
      },
      source: string
    ) => {
      if (r?.seed != null && Array.isArray(r.run?.actionTrace)) {
        setReport({
          seed: r.seed,
          run: { actionTrace: r.run.actionTrace as ActionTraceEntry[] },
        });
        const packBinding = r.packBinding;
        setLoadedReportIdentity({
          source,
          reportId: String((r as { reportId?: string }).reportId ?? ""),
          packId: packBinding ? String(packBinding.packId ?? "") : undefined,
          packVersion: packBinding
            ? String(packBinding.packVersion ?? "")
            : undefined,
          packHash: packBinding ? String(packBinding.packHash ?? "") : undefined,
          schemaVersion: packBinding
            ? String(packBinding.schemaVersion ?? "")
            : undefined,
          engineVersion: packBinding
            ? String(packBinding.engineVersion ?? "")
            : undefined,
        });
      }
    },
    [setLoadedReportIdentity, setReport]
  );

  const loadReportFromSession = useCallback(() => {
    try {
      const stored = sessionStorage.getItem("dungeonbreak-browser-report");
      if (stored) {
        const { report: r } = JSON.parse(stored) as {
          report?: {
            seed: number;
            run: { actionTrace: unknown[] };
            reportId?: string;
            packBinding?: Record<string, unknown>;
          };
        };
        if (r) applyLoadedReport(r, "session:browser-playthrough");
      }
    } catch {
      // ignore
    }
  }, [applyLoadedReport]);

  const loadReportFromApi = useCallback(() => {
    fetch("/api/play-reports")
      .then((r) => r.json())
      .then((body) => {
        if (body.ok && body.report) {
          applyLoadedReport(body.report, "api:/api/play-reports");
          return;
        }
        loadReportFromSession();
      })
      .catch(() => {
        loadReportFromSession();
      });
  }, [applyLoadedReport, loadReportFromSession]);

  const handlePackOptionSelect = useCallback(
    (nextId: string) => {
      const selected = packOptions.find((row) => row.id === nextId);
      if (!selected) return;
      if (selected.kind === "bundle") {
        loadBundlePack();
        return;
      }
      if (selected.kind === "content-pack-report" && selected.reportId) {
        loadContentPackReport(selected.reportId);
        return;
      }
      if (
        selected.kind === "uploaded" &&
        selected.overrides &&
        selected.identity
      ) {
        setSpaceOverrides(selected.overrides);
        setBaseSpaceVectors(selected.overrides);
        const instances = parseModelInstancesFromContentBindings(
          selected.overrides
        );
        if (instances.length > 0) {
          replaceModelInstances(instances);
        }
        setLoadedPackIdentity(selected.identity);
        persistActivePackSnapshot(selected.identity);
      }
    },
    [
      loadBundlePack,
      loadContentPackReport,
      packOptions,
      persistActivePackSnapshot,
      replaceModelInstances,
      setBaseSpaceVectors,
      setLoadedPackIdentity,
      setSpaceOverrides,
    ]
  );

  useEffect(() => {
    if (testModeEnabled) {
      if (testModeBundleSource === "default") {
        loadDefaultTestModeBundle();
      } else {
        loadEmptyTestModeBundle();
      }
      return;
    }
    loadBundlePack();
  }, [
    testModeEnabled,
    testModeBundleSource,
    loadBundlePack,
    loadDefaultTestModeBundle,
    loadEmptyTestModeBundle,
  ]);

  useEffect(() => {
    void refreshPackOptions();
    void refreshReportOptions();
  }, [refreshPackOptions, refreshReportOptions]);

  useEffect(() => {
    const reportId = new URLSearchParams(window.location.search).get(
      "contentPackReportId"
    );
    if (!reportId) return;
    loadContentPackReport(reportId);
    const optionId = `content-pack-report:${reportId}`;
    setPackOptions((prev) =>
      prev.some((row) => row.id === optionId)
        ? prev
        : [
            ...prev,
            {
              id: optionId,
              label: reportId,
              kind: "content-pack-report",
              reportId,
            },
          ]
    );
    setSelectedPackOptionId(optionId);
  }, [loadContentPackReport]);

  useEffect(() => {
    const selected = reportOptions.find((row) => row.id === selectedReportOptionId);
    if (!selected) return;
    if (selected.kind === "api") {
      loadReportFromApi();
      return;
    }
    loadReportFromSession();
  }, [
    selectedReportOptionId,
    reportOptions,
    loadReportFromApi,
    loadReportFromSession,
  ]);

  return {
    packOptions,
    selectedPackOptionId,
    setSelectedPackOptionId,
    reportOptions,
    selectedReportOptionId,
    setSelectedReportOptionId,
    handlePackUpload,
    handlePackOptionSelect,
    loadBundlePack,
    loadContentPackReport,
  };
}
