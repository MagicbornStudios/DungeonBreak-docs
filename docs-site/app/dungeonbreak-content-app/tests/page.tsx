import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ParsedVitestSuite,
  type TestReviewCategory,
  loadUnitTestReviewData,
} from "@/lib/test-report-review";

const categoryLabels: Record<TestReviewCategory, string> = {
  "asset-explorer": "Asset Explorer",
  "game-runtime": "Game Runtime",
  "schema-data-codegen": "Schemas, Data, Codegen",
  "assistant-mcp": "Assistant / MCP",
  other: "Other",
};

function formatPct(value: number | null): string {
  return value === null ? "n/a" : `${value.toFixed(1)}%`;
}

function formatDuration(value: number | null): string {
  return value === null ? "n/a" : `${value} ms`;
}

function statusTone(status: string): string {
  if (status === "passed") {
    return "text-emerald-300";
  }
  if (status === "failed") {
    return "text-rose-300";
  }
  return "text-amber-200";
}

function groupSuitesByCategory(suites: ParsedVitestSuite[]) {
  const groups = new Map<TestReviewCategory, ParsedVitestSuite[]>();
  for (const suite of suites) {
    const current = groups.get(suite.category) ?? [];
    current.push(suite);
    groups.set(suite.category, current);
  }
  return [...groups.entries()].sort((left, right) =>
    categoryLabels[left[0]].localeCompare(categoryLabels[right[0]])
  );
}

export default function UnitTestReviewPage() {
  const { report, coverage } = loadUnitTestReviewData();
  const groupedSuites = groupSuitesByCategory(report.suites);

  return (
    <div className="space-y-4">
      <Card className="bg-card/70">
        <CardHeader>
          <CardTitle>Unit Test Review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Review the current `docs-site` unit-test run and coverage in one
            place. Run <code>pnpm --dir docs-site run test:unit:report</code> to
            refresh JSON results and coverage artifacts before opening this
            page.
          </p>
          <div className="grid gap-3 md:grid-cols-4">
            <MetricCard label="Total Tests" value={String(report.total)} />
            <MetricCard label="Passed" value={String(report.passed)} />
            <MetricCard label="Failed" value={String(report.failed)} />
            <MetricCard label="Pending" value={String(report.pending)} />
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <MetricCard label="Lines" value={formatPct(coverage.linesPct)} />
            <MetricCard
              label="Statements"
              value={formatPct(coverage.statementsPct)}
            />
            <MetricCard
              label="Functions"
              value={formatPct(coverage.functionsPct)}
            />
            <MetricCard
              label="Branches"
              value={formatPct(coverage.branchesPct)}
            />
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link
              href="/dungeonbreak-content-app/asset-explorer"
              className="inline-flex items-center gap-1 rounded border border-border px-3 py-1.5 hover:border-primary hover:text-primary"
            >
              Asset Explorer
              <ArrowUpRightIcon className="size-3.5" />
            </Link>
          </div>
          {!report.available ? (
            <div className="rounded-lg border border-dashed border-border px-3 py-3 text-xs">
              No unit test JSON report found yet.
            </div>
          ) : null}
        </CardContent>
      </Card>

      {groupedSuites.map(([category, suites]) => (
        <Card key={category} className="bg-card/60">
          <CardHeader>
            <CardTitle className="text-base">
              {categoryLabels[category]}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            {suites.map((suite) => (
              <div
                key={suite.filePath}
                className="rounded-xl border border-border bg-background/40 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-foreground">
                      {suite.baseName}
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {suite.fileName}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={statusTone(suite.status)}>
                      {suite.status}
                    </span>
                    <span className="text-muted-foreground">
                      {suite.passed} passed / {suite.failed} failed /{" "}
                      {suite.pending} pending
                    </span>
                    <span className="text-muted-foreground">
                      {formatDuration(suite.durationMs)}
                    </span>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {suite.assertions.map((assertion) => (
                    <div
                      key={`${suite.filePath}-${assertion.name}`}
                      className="rounded border border-border/70 bg-background/50 px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-foreground">{assertion.name}</div>
                        <div className="flex flex-wrap gap-2">
                          <span className={statusTone(assertion.status)}>
                            {assertion.status}
                          </span>
                          <span className="text-muted-foreground">
                            {formatDuration(assertion.durationMs)}
                          </span>
                        </div>
                      </div>
                      {assertion.failureMessages.length > 0 ? (
                        <pre className="mt-2 overflow-x-auto rounded border border-rose-500/40 bg-rose-950/20 p-2 text-[10px] text-rose-200">
                          {assertion.failureMessages.join("\n\n")}
                        </pre>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 px-3 py-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-foreground">{value}</div>
    </div>
  );
}
