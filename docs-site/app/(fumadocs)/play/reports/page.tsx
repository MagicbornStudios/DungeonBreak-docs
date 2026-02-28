"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

type ReportSummary = {
  seed?: number;
  turnsRequested?: number;
  actionCoverage?: { expected: string[]; covered: string[]; missing: string[] };
  run?: { turnsPlayed?: number };
};

export default function ReportsPage() {
  const [data, setData] = useState<{
    report: ReportSummary;
    analysis: Analysis;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/play-reports")
      .then((r) => r.json())
      .then((body) => {
        if (!body.ok) {
          setError(body.error ?? body.hint ?? "Failed to load reports");
          return;
        }
        setData({ report: body.report, analysis: body.analysis });
      })
      .catch((e) => setError(String(e)));
  }, []);

  if (error) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <h1 className="mb-4 text-2xl font-bold">Playthrough Reports</h1>
        <p className="text-amber-500">{error}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Run <code>pnpm --dir packages/engine-mcp run agent:play</code> then{" "}
          <code>pnpm --dir packages/engine-mcp run analyze</code> to generate reports.
        </p>
        <p className="mt-4">
          <Link href="/play" className="text-primary underline">
            Back to Play
          </Link>
        </p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <h1 className="mb-4 text-2xl font-bold">Playthrough Reports</h1>
        <p className="text-muted-foreground">Loading...</p>
      </main>
    );
  }

  const { report, analysis } = data;
  const r = analysis.replayability;
  const e = analysis.excitement;
  const m = analysis.emergent;

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Playthrough Reports</h1>
      <p className="mb-6">
        <Link href="/play" className="text-primary underline">
          ← Back to Play
        </Link>
      </p>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Playthrough Summary</h2>
        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div className="rounded border p-3">
            <div className="text-muted-foreground">Seed</div>
            <div className="font-mono">{report.seed ?? "—"}</div>
          </div>
          <div className="rounded border p-3">
            <div className="text-muted-foreground">Turns</div>
            <div>
              {report.run?.turnsPlayed ?? "—"} / {report.turnsRequested ?? "—"}
            </div>
          </div>
          <div className="rounded border p-3">
            <div className="text-muted-foreground">Actions Covered</div>
            <div>
              {report.actionCoverage?.covered?.length ?? 0} /{" "}
              {report.actionCoverage?.expected?.length ?? 0}
            </div>
          </div>
          <div className="rounded border p-3">
            <div className="text-muted-foreground">Missing Actions</div>
            <div className="truncate">
              {report.actionCoverage?.missing?.join(", ") || "none"}
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Replayability</h2>
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
            <p className="text-amber-500">⚠ Move-only run — replayability = 0</p>
          )}
          {r.insufficientExcitementWarning && (
            <p className="text-amber-500">
              ⚠ Insufficient excitement — all non-move actions missing
            </p>
          )}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Excitement</h2>
        <div className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Mean excitement:</span>{" "}
            {e.meanExcitement.toFixed(2)}
          </p>
          <p>
            <span className="text-muted-foreground">Rolling window:</span>{" "}
            {e.rollingWindowSize} turns
          </p>
          {e.perTurnScores.length > 0 && (
            <p>
              <span className="text-muted-foreground">Turns scored:</span>{" "}
              {e.perTurnScores.length}
            </p>
          )}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Emergent</h2>
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
    </main>
  );
}
