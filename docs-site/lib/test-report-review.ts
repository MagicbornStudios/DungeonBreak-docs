import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type VitestAssertionStatus =
  | "passed"
  | "failed"
  | "skipped"
  | "pending"
  | "todo";

type VitestAssertionResult = {
  fullName?: string;
  title?: string;
  status?: VitestAssertionStatus;
  duration?: number;
  failureMessages?: string[];
};

type VitestSuiteResult = {
  name?: string;
  status?: string;
  assertionResults?: VitestAssertionResult[];
  startTime?: number;
  endTime?: number;
};

type VitestJsonReport = {
  success?: boolean;
  numTotalTests?: number;
  numPassedTests?: number;
  numFailedTests?: number;
  numPendingTests?: number;
  startTime?: number;
  testResults?: VitestSuiteResult[];
};

type CoverageMetric = {
  total?: number;
  covered?: number;
  skipped?: number;
  pct?: number;
};

type CoverageSummary = {
  total?: {
    lines?: CoverageMetric;
    statements?: CoverageMetric;
    functions?: CoverageMetric;
    branches?: CoverageMetric;
  };
};

export type TestReviewCategory =
  | "asset-explorer"
  | "game-runtime"
  | "schema-data-codegen"
  | "assistant-mcp"
  | "other";

export type ParsedVitestAssertion = {
  name: string;
  status: VitestAssertionStatus | "unknown";
  durationMs: number | null;
  failureMessages: string[];
};

export type ParsedVitestSuite = {
  filePath: string;
  fileName: string;
  baseName: string;
  category: TestReviewCategory;
  status: string;
  durationMs: number | null;
  passed: number;
  failed: number;
  pending: number;
  assertions: ParsedVitestAssertion[];
};

export type ParsedVitestReport = {
  available: boolean;
  success: boolean;
  total: number;
  passed: number;
  failed: number;
  pending: number;
  startTime: number | null;
  suites: ParsedVitestSuite[];
};

export type ParsedCoverageSummary = {
  available: boolean;
  linesPct: number | null;
  statementsPct: number | null;
  functionsPct: number | null;
  branchesPct: number | null;
};

export type UnitTestReviewData = {
  report: ParsedVitestReport;
  coverage: ParsedCoverageSummary;
};

function unitResultsPathFor(reportRoot: string): string {
  return path.resolve(reportRoot, "unit", "results.json");
}

function coverageSummaryPathFor(reportRoot: string): string {
  return path.resolve(reportRoot, "unit-coverage", "coverage-summary.json");
}

export function categoryForSuite(filePath: string): TestReviewCategory {
  const lower = filePath.toLowerCase();
  if (lower.includes("asset-explorer")) {
    return "asset-explorer";
  }
  if (
    lower.includes("game-engine") ||
    lower.includes("presenter") ||
    lower.includes("package-consumer") ||
    lower.includes("archetype-balance")
  ) {
    return "game-runtime";
  }
  if (
    lower.includes("content-pack") ||
    lower.includes("content-dimension") ||
    lower.includes("codegen") ||
    lower.includes("schema")
  ) {
    return "schema-data-codegen";
  }
  if (
    lower.includes("frame-actions") ||
    lower.includes("remote-mcp") ||
    lower.includes("ai-flags") ||
    lower.includes("planning-chat") ||
    lower.includes("authoring-chat")
  ) {
    return "assistant-mcp";
  }
  return "other";
}

export function parseVitestReport(
  report: VitestJsonReport | null | undefined
): ParsedVitestReport {
  if (!report || !Array.isArray(report.testResults)) {
    return {
      available: false,
      success: false,
      total: 0,
      passed: 0,
      failed: 0,
      pending: 0,
      startTime: null,
      suites: [],
    };
  }

  const suites = report.testResults.map((suite) => {
    const filePath = String(suite.name ?? "");
    const fileName = filePath.split(/[/\\]/).pop() ?? filePath;
    const baseName = fileName.replace(/\.test\.(ts|tsx|js|jsx)$/, "");
    const assertions = Array.isArray(suite.assertionResults)
      ? suite.assertionResults.map((assertion) => ({
          name: String(assertion.fullName ?? assertion.title ?? "Unnamed test"),
          status:
            (assertion.status as ParsedVitestAssertion["status"]) ?? "unknown",
          durationMs:
            typeof assertion.duration === "number" ? assertion.duration : null,
          failureMessages: Array.isArray(assertion.failureMessages)
            ? assertion.failureMessages.map((row) => String(row))
            : [],
        }))
      : [];

    return {
      filePath,
      fileName,
      baseName,
      category: categoryForSuite(filePath),
      status: String(suite.status ?? "unknown"),
      durationMs:
        typeof suite.startTime === "number" && typeof suite.endTime === "number"
          ? suite.endTime - suite.startTime
          : null,
      passed: assertions.filter((row) => row.status === "passed").length,
      failed: assertions.filter((row) => row.status === "failed").length,
      pending: assertions.filter(
        (row) =>
          row.status === "pending" ||
          row.status === "skipped" ||
          row.status === "todo"
      ).length,
      assertions,
    } satisfies ParsedVitestSuite;
  });

  return {
    available: true,
    success: Boolean(report.success),
    total: Number(report.numTotalTests ?? 0),
    passed: Number(report.numPassedTests ?? 0),
    failed: Number(report.numFailedTests ?? 0),
    pending: Number(report.numPendingTests ?? 0),
    startTime: typeof report.startTime === "number" ? report.startTime : null,
    suites,
  };
}

export function parseCoverageSummary(
  summary: CoverageSummary | null | undefined
): ParsedCoverageSummary {
  if (!summary?.total) {
    return {
      available: false,
      linesPct: null,
      statementsPct: null,
      functionsPct: null,
      branchesPct: null,
    };
  }
  return {
    available: true,
    linesPct:
      typeof summary.total.lines?.pct === "number"
        ? summary.total.lines.pct
        : null,
    statementsPct:
      typeof summary.total.statements?.pct === "number"
        ? summary.total.statements.pct
        : null,
    functionsPct:
      typeof summary.total.functions?.pct === "number"
        ? summary.total.functions.pct
        : null,
    branchesPct:
      typeof summary.total.branches?.pct === "number"
        ? summary.total.branches.pct
        : null,
  };
}

export function loadUnitTestReviewData(): UnitTestReviewData {
  return loadUnitTestReviewDataFrom(
    path.resolve(process.cwd(), "test-reports")
  );
}

export function loadUnitTestReviewDataFrom(
  reportRoot: string
): UnitTestReviewData {
  const unitResultsPath = unitResultsPathFor(reportRoot);
  const coverageSummaryPath = coverageSummaryPathFor(reportRoot);

  const report = existsSync(unitResultsPath)
    ? parseVitestReport(
        JSON.parse(readFileSync(unitResultsPath, "utf8")) as VitestJsonReport
      )
    : parseVitestReport(null);

  const coverage = existsSync(coverageSummaryPath)
    ? parseCoverageSummary(
        JSON.parse(readFileSync(coverageSummaryPath, "utf8")) as CoverageSummary
      )
    : parseCoverageSummary(null);

  return { report, coverage };
}
