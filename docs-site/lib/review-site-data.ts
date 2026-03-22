import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import {
  type UnitTestReviewData,
  loadUnitTestReviewDataFrom,
} from "@/lib/test-report-review";

type JsonRecord = Record<string, unknown>;

export type ReviewManifestResult = {
  key: string;
  status: string;
};

export type ReviewManifest = {
  available: boolean;
  buildVersion: string | null;
  workflow: string | null;
  generatedAt: string | null;
  results: ReviewManifestResult[];
};

export type PlaywrightSpecStatus =
  | "passed"
  | "failed"
  | "skipped"
  | "flaky"
  | "unknown";

export type ParsedPlaywrightSpec = {
  file: string;
  title: string;
  suitePath: string[];
  status: PlaywrightSpecStatus;
  durationMs: number | null;
  errors: string[];
};

export type ParsedPlaywrightReport = {
  available: boolean;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  durationMs: number | null;
  specs: ParsedPlaywrightSpec[];
};

export type ReviewSiteData = {
  manifest: ReviewManifest;
  unit: UnitTestReviewData;
  e2e: ParsedPlaywrightReport;
};

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function collectErrors(value: unknown): string[] {
  if (!value) {
    return [];
  }
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectErrors(entry));
  }
  const record = asRecord(value);
  if (!record) {
    return [];
  }
  const message = asString(record.message);
  const stack = asString(record.stack);
  return [message, stack].filter((entry): entry is string => entry !== null);
}

function summarizePlaywrightStatus(
  statuses: string[],
  flakyCount: number
): PlaywrightSpecStatus {
  const normalized = statuses.map((status) => status.toLowerCase());
  if (
    normalized.some((status) =>
      ["failed", "timedout", "timed_out", "interrupted", "unexpected"].includes(
        status
      )
    )
  ) {
    return "failed";
  }
  if (flakyCount > 0 || normalized.includes("flaky")) {
    return "flaky";
  }
  if (
    normalized.length > 0 &&
    normalized.every((status) => ["skipped", "pending"].includes(status))
  ) {
    return "skipped";
  }
  if (
    normalized.length > 0 &&
    normalized.every((status) => ["passed", "expected"].includes(status))
  ) {
    return "passed";
  }
  return "unknown";
}

export function parsePlaywrightReport(raw: unknown): ParsedPlaywrightReport {
  const root = asRecord(raw);
  if (!root) {
    return {
      available: false,
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      flaky: 0,
      durationMs: null,
      specs: [],
    };
  }

  const specs: ParsedPlaywrightSpec[] = [];
  const rootFile = asString(root.file);

  function visitSuite(
    node: unknown,
    suitePath: string[],
    fileHint: string | null
  ): void {
    const record = asRecord(node);
    if (!record) {
      return;
    }
    const title = asString(record.title);
    const nextSuitePath = title ? [...suitePath, title] : suitePath;
    const nextFileHint = asString(record.file) ?? fileHint;

    for (const childSuite of asArray(record.suites)) {
      visitSuite(childSuite, nextSuitePath, nextFileHint);
    }

    for (const specNode of asArray(record.specs)) {
      const spec = asRecord(specNode);
      if (!spec) {
        continue;
      }
      const tests = asArray(spec.tests);
      const resultStatuses: string[] = [];
      const errorMessages: string[] = [];
      let durationMs = 0;
      let sawDuration = false;
      let flakyCount = 0;

      for (const testNode of tests) {
        const test = asRecord(testNode);
        if (!test) {
          continue;
        }
        const testStatus = asString(test.status);
        if (testStatus) {
          resultStatuses.push(testStatus);
          if (testStatus.toLowerCase() === "flaky") {
            flakyCount += 1;
          }
        }
        errorMessages.push(...collectErrors(test.error));
        for (const resultNode of asArray(test.results)) {
          const result = asRecord(resultNode);
          if (!result) {
            continue;
          }
          const resultStatus = asString(result.status);
          if (resultStatus) {
            resultStatuses.push(resultStatus);
            if (resultStatus.toLowerCase() === "flaky") {
              flakyCount += 1;
            }
          }
          const duration = asNumber(result.duration);
          if (duration !== null) {
            durationMs += duration;
            sawDuration = true;
          }
          errorMessages.push(...collectErrors(result.error));
          errorMessages.push(...collectErrors(result.errors));
        }
      }

      specs.push({
        file: asString(spec.file) ?? nextFileHint ?? rootFile ?? "unknown",
        title: asString(spec.title) ?? "Unnamed Playwright spec",
        suitePath: nextSuitePath,
        status: summarizePlaywrightStatus(resultStatuses, flakyCount),
        durationMs: sawDuration ? durationMs : null,
        errors: [...new Set(errorMessages)],
      });
    }
  }

  for (const suite of asArray(root.suites)) {
    visitSuite(suite, [], null);
  }

  const stats = asRecord(root.stats);
  const total =
    asNumber(stats?.expected) ?? asNumber(stats?.total) ?? specs.length;
  const passed =
    asNumber(stats?.expected) ??
    specs.filter((spec) => spec.status === "passed").length;
  const failed =
    asNumber(stats?.unexpected) ??
    specs.filter((spec) => spec.status === "failed").length;
  const skipped =
    asNumber(stats?.skipped) ??
    specs.filter((spec) => spec.status === "skipped").length;
  const flaky =
    asNumber(stats?.flaky) ??
    specs.filter((spec) => spec.status === "flaky").length;

  return {
    available: specs.length > 0 || stats !== null,
    total,
    passed,
    failed,
    skipped,
    flaky,
    durationMs: asNumber(stats?.duration),
    specs,
  };
}

export function parseReviewManifest(raw: unknown): ReviewManifest {
  const record = asRecord(raw);
  if (!record) {
    return {
      available: false,
      buildVersion: null,
      workflow: null,
      generatedAt: null,
      results: [],
    };
  }

  const resultsRecord = asRecord(record.results);
  const results = resultsRecord
    ? Object.entries(resultsRecord).map(([key, value]) => ({
        key,
        status: typeof value === "string" ? value : "unknown",
      }))
    : [];

  return {
    available: true,
    buildVersion: asString(record.buildVersion),
    workflow: asString(record.workflow),
    generatedAt: asString(record.generatedAt),
    results,
  };
}

function latestFileMatching(dirPath: string, prefix: string): string | null {
  if (!existsSync(dirPath)) {
    return null;
  }

  const latestPath = path.resolve(dirPath, `${prefix}-latest.json`);
  if (existsSync(latestPath)) {
    return latestPath;
  }

  const matches = readdirSync(dirPath)
    .filter(
      (entry) => entry.startsWith(`${prefix}-`) && entry.endsWith(".json")
    )
    .map((entry) => path.resolve(dirPath, entry))
    .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs);

  return matches[0] ?? null;
}

function readJsonFile(filePath: string | null): unknown {
  if (!filePath || !existsSync(filePath)) {
    return null;
  }
  return JSON.parse(readFileSync(filePath, "utf8")) as unknown;
}

export function loadReviewSiteData(reportRoot: string): ReviewSiteData {
  const manifestPath = latestFileMatching(reportRoot, "test-manifest");
  const e2ePath = path.resolve(reportRoot, "e2e", "results.json");

  return {
    manifest: parseReviewManifest(readJsonFile(manifestPath)),
    unit: loadUnitTestReviewDataFrom(reportRoot),
    e2e: parsePlaywrightReport(readJsonFile(e2ePath)),
  };
}
