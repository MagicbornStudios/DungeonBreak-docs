"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { Callout } from "fumadocs-ui/components/callout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "fumadocs-ui/components/ui/tabs";
import { Card, Cards } from "fumadocs-ui/components/card";
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Globe,
  Loader2,
  Play,
  Repeat,
  ScrollText,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { ReplayViewer } from "@/components/game/replay-viewer";
import { SpaceExplorer } from "@/components/reports/space-explorer";
import { runPlaythrough, type BrowserReport } from "@/lib/playthrough-runner";
import { analyzeReport } from "@/lib/playthrough-analyzer";
import { ActionPoliciesTab } from "@/components/reports/action-policies-tab";

const ExcitementChart = dynamic(
  () => import("@/components/reports/excitement-chart").then((m) => m.ExcitementChart),
  { ssr: false },
);

type Analysis = {
  schemaVersion: string;
  replayability: {
    actionDiversityEntropy: number;
    actionCoverageRatio: number;
    uniqueActionRoomPairs: number;
    moveOnlyRun: boolean;
    insufficientExcitementWarning: boolean;
  };
  excitement: {
    perTurnScores: number[];
    rollingWindowSize: number;
    rollingAverage: number[];
    meanExcitement: number;
  };
  emergent: {
    novelEventCombinations: number;
    actionTypeEntropy: number;
  };
};

const GENERATED_REPORT_KEY = "dungeonbreak-browser-report";

type ReportSummary = {
  seed?: number;
  turnsRequested?: number;
  actionCoverage?: { expected: string[]; covered: string[]; missing: string[] };
  run?: {
    turnsPlayed?: number;
    actionTrace?: Array<{ playerTurn: number; action: { actionType: string; payload?: Record<string, unknown> } }>;
  };
};

export default function GameValuePage() {
  const [data, setData] = useState<{
    report: ReportSummary;
    analysis: Analysis;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);
  const [priorityOrder, setPriorityOrder] = useState<string[] | null>(null);

  useEffect(() => {
    fetch("/api/play-reports")
      .then((r) => r.json())
      .then((body) => {
        setFetched(true);
        if (body.ok) {
          setData({ report: body.report, analysis: body.analysis });
          return;
        }
        try {
          const stored = sessionStorage.getItem(GENERATED_REPORT_KEY);
          if (stored) {
            const { report, analysis } = JSON.parse(stored);
            setData({ report, analysis });
            return;
          }
        } catch {
          // ignore
        }
        setError(body.error ?? body.hint ?? "Failed to load reports");
      })
      .catch((e) => {
        setFetched(true);
        try {
          const stored = sessionStorage.getItem(GENERATED_REPORT_KEY);
          if (stored) {
            const { report, analysis } = JSON.parse(stored);
            setData({ report, analysis });
            return;
          }
        } catch {
          // ignore
        }
        setError(String(e));
      });
  }, []);

  const generateReport = useCallback(() => {
    setError(null);
    setData(null);
    try {
      const report = runPlaythrough(undefined, 75, priorityOrder ?? undefined) as BrowserReport;
      const analysis = analyzeReport(report);
      const payload = { report, analysis };
      setData(payload);
      try {
        sessionStorage.setItem(GENERATED_REPORT_KEY, JSON.stringify(payload));
      } catch {
        // ignore
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [priorityOrder]);

  if (error) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <h1 className="mb-4 text-2xl font-bold">Game Value</h1>
        <Callout type="error" title="Error loading reports">
          {error}
        </Callout>
        <p className="mt-4 text-sm text-muted-foreground">
          Run agent:play + analyze, or generate one in the browser.
        </p>
        <button
          type="button"
          onClick={generateReport}
          className="mt-4 rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          Generate report in browser
        </button>
        <Link href="/play/reports" className="ml-4 inline-block text-primary underline">
          ← Reports
        </Link>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <div className="mb-4 flex items-center gap-3">
          <Sparkles className="size-8 text-primary" />
          <h1 className="text-2xl font-bold">Game Value</h1>
        </div>
        {!fetched ? (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading…
          </p>
        ) : (
          <>
            <Callout type="info" title="No report found">
              Generate a playthrough report to analyze concept worth.
            </Callout>
            <button
              type="button"
              onClick={generateReport}
              className="mt-4 flex items-center gap-2 rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
            >
              <BarChart3 className="size-4" />
              Generate report in browser
            </button>
          </>
        )}
        <Link href="/play/reports" className="mt-6 flex items-center gap-1 text-primary underline">
          <ChevronRight className="size-4 rotate-[-90deg]" />
          Reports
        </Link>
      </main>
    );
  }

  const { report, analysis } = data;
  const r = analysis.replayability;
  const e = analysis.excitement;
  const m = analysis.emergent;
  const hasReplay =
    typeof report.seed === "number" &&
    Array.isArray(report.run?.actionTrace) &&
    report.run.actionTrace.length > 0;

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex items-center gap-3">
        <Sparkles className="size-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Game Value</h1>
          <p className="text-sm text-muted-foreground">
            Analyze spaces and playthroughs to derive concept worth. Escape the Dungeon = low (Kaplay); DungeonBreak = high (Unreal, 3D).
          </p>
        </div>
      </div>

      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ScrollText className="size-4" />
          Game design reference
        </div>
        <Card href="/planning/grd" title="GRD: Escape the Dungeon" icon={<ScrollText />}>
          Game Requirements Document — world, entities, systems, acts
        </Card>
      </div>

      <Cards className="mb-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <Card href="/play/reports" title="Reports" icon={<BarChart3 />} />
        <Card href="/play" title="Play" icon={<Play />} />
        <Card href="/docs/formulas" title="Formulas" icon={<FileText />} />
        <Card href="/docs/formulas/spaces" title="Spaces" icon={<BookOpen />} />
        <Card href="/play/reports/spaces" title="Space Explorer" icon={<Globe />} />
        <Card href="/play/downloads" title="Downloads" icon={<Download />} />
      </Cards>

      {hasReplay && (
        <section className="mb-8">
          <ReplayViewer
            report={{
              seed: report.seed!,
              run: { actionTrace: report.run!.actionTrace! },
            }}
          />
        </section>
      )}

      <Tabs defaultValue="summary" className="mb-8">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="summary" className="gap-1.5">
            <BarChart3 className="size-3.5" /> Summary
          </TabsTrigger>
          <TabsTrigger value="replayability" className="gap-1.5">
            <Repeat className="size-3.5" /> Replayability
          </TabsTrigger>
          <TabsTrigger value="excitement" className="gap-1.5">
            <TrendingUp className="size-3.5" /> Excitement
          </TabsTrigger>
          <TabsTrigger value="emergent" className="gap-1.5">
            <Globe className="size-3.5" /> Emergent
          </TabsTrigger>
          <TabsTrigger value="policies" className="gap-1.5">
            <FileText className="size-3.5" /> Policies
          </TabsTrigger>
          <TabsTrigger value="spaces" className="gap-1.5">
            <Globe className="size-3.5" /> Spaces
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <BarChart3 className="size-4" />
              Playthrough Summary
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              <div className="rounded-lg border bg-muted/20 px-4 py-3">
                <div className="text-xs text-muted-foreground">Seed</div>
                <div className="font-mono text-sm">{String(report.seed ?? "—")}</div>
              </div>
              <div className="rounded-lg border bg-muted/20 px-4 py-3">
                <div className="text-xs text-muted-foreground">Turns</div>
                <div className="text-sm">{report.run?.turnsPlayed ?? "—"} / {report.turnsRequested ?? "—"}</div>
              </div>
              <div className="rounded-lg border bg-muted/20 px-4 py-3">
                <div className="text-xs text-muted-foreground">Actions Covered</div>
                <div className="text-sm">{report.actionCoverage?.covered?.length ?? 0} / {report.actionCoverage?.expected?.length ?? 0}</div>
              </div>
              <div className="rounded-lg border bg-muted/20 px-4 py-3">
                <div className="text-xs text-muted-foreground">Missing</div>
                <div className="truncate text-sm">{report.actionCoverage?.missing?.join(", ") || "none"}</div>
              </div>
            </div>
            {report.actionCoverage && (
              <details className="group rounded border text-sm">
                <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 font-medium hover:bg-muted/50">
                  <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" />
                  Action coverage table
                </summary>
                <div className="overflow-auto border-t">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="border-b px-3 py-1.5 text-left text-xs">Action</th>
                        <th className="border-b px-3 py-1.5 text-left text-xs">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.actionCoverage.expected.map((action) => {
                        const covered = report.actionCoverage!.covered.includes(action);
                        return (
                          <tr key={action} className="border-b last:border-0">
                            <td className="px-3 py-1 font-mono text-xs">{action}</td>
                            <td className="px-3 py-1">
                              <span className={covered ? "text-green-600 dark:text-green-500" : "text-amber-600 dark:text-amber-500"}>
                                {covered ? "✓" : "✗"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </section>
        </TabsContent>

        <TabsContent value="replayability">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Replayability</h2>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Action diversity (entropy):</span>{" "}
                {r.actionDiversityEntropy.toFixed(3)}
              </p>
              <p>
                <span className="text-muted-foreground">Action coverage ratio:</span>{" "}
                {(r.actionCoverageRatio * 100).toFixed(1)}%
              </p>
              <p>
                <span className="text-muted-foreground">Unique (action, room) pairs:</span>{" "}
                {r.uniqueActionRoomPairs}
              </p>
              {r.moveOnlyRun && (
                <Callout type="warning" title="Move-only run">
                  Replayability = 0
                </Callout>
              )}
              {r.insufficientExcitementWarning && (
                <Callout type="warning" title="Insufficient excitement">
                  All non-move actions missing
                </Callout>
              )}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="excitement">
          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <TrendingUp className="size-4" /> Excitement
            </h2>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Mean excitement:</span>{" "}
                {e.meanExcitement.toFixed(2)}
              </p>
              <p>
                <span className="text-muted-foreground">Rolling window:</span> {e.rollingWindowSize} turns
              </p>
              {e.perTurnScores.length > 0 && (
                <p>
                  <span className="text-muted-foreground">Turns scored:</span> {e.perTurnScores.length}
                </p>
              )}
            </div>
            {e.perTurnScores.length > 0 && (
              <div className="mt-4 h-64">
                <ExcitementChart
                  perTurnScores={e.perTurnScores}
                  rollingAverage={e.rollingAverage}
                />
              </div>
            )}
          </section>
        </TabsContent>

        <TabsContent value="emergent">
          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Globe className="size-4" /> Emergent
            </h2>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Novel event combinations:</span>{" "}
                {m.novelEventCombinations}
              </p>
              <p>
                <span className="text-muted-foreground">Action type entropy:</span>{" "}
                {m.actionTypeEntropy.toFixed(3)}
              </p>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="policies">
          <ActionPoliciesTab
            priorityOrder={priorityOrder}
            onPriorityOrderChange={setPriorityOrder}
            onGenerate={generateReport}
          />
        </TabsContent>

        <TabsContent value="spaces">
          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Globe className="size-4" /> Content Spaces
            </h2>
            <p className="text-sm text-muted-foreground">
              Trait/feature space of skills, archetypes, and dialogue. Use the Space Explorer for full 3D viz and recompute.
            </p>
            <div className="min-h-[500px]">
              <SpaceExplorer />
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </main>
  );
}
