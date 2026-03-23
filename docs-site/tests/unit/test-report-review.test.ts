import { describe, expect, test } from "vitest";
import {
  categoryForSuite,
  parseCoverageSummary,
  parseVitestReport,
} from "@/lib/test-report-review";

describe("test report review parser", () => {
  test("categorizes key suite types for the review page", () => {
    expect(
      categoryForSuite("docs-site/tests/unit/asset-explorer-helpers.test.ts")
    ).toBe("asset-explorer");
    expect(categoryForSuite("docs-site/tests/unit/game-engine.test.ts")).toBe(
      "game-runtime"
    );
    expect(
      categoryForSuite("docs-site/tests/unit/content-packs.test.ts")
    ).toBe("schema-data-codegen");
    expect(categoryForSuite("docs-site/tests/unit/frame-actions.test.ts")).toBe(
      "assistant-mcp"
    );
  });

  test("parses vitest json report into grouped suite data", () => {
    const parsed = parseVitestReport({
      success: true,
      numTotalTests: 3,
      numPassedTests: 2,
      numFailedTests: 1,
      numPendingTests: 0,
      startTime: 1772657848374,
      testResults: [
        {
          name: "C:/repo/docs-site/tests/unit/asset-explorer-helpers.test.ts",
          status: "passed",
          assertionResults: [
            {
              fullName:
                "asset explorer helpers reads canonical pack binding metadata",
              title: "reads canonical pack binding metadata",
              status: "passed",
              duration: 5,
              failureMessages: [],
            },
          ],
          startTime: 1000,
          endTime: 1010,
        },
        {
          name: "C:/repo/docs-site/tests/unit/game-engine.test.ts",
          status: "failed",
          assertionResults: [
            {
              fullName:
                "game engine world generation keeps fixed feature counts per level",
              title: "world generation keeps fixed feature counts per level",
              status: "failed",
              duration: 10,
              failureMessages: ["AssertionError: expected 16 to be 50"],
            },
          ],
          startTime: 1020,
          endTime: 1055,
        },
      ],
    });

    expect(parsed.available).toBe(true);
    expect(parsed.total).toBe(3);
    expect(parsed.failed).toBe(1);
    expect(parsed.suites).toHaveLength(2);
    expect(parsed.suites[0]?.category).toBe("asset-explorer");
    expect(parsed.suites[1]?.category).toBe("game-runtime");
    expect(parsed.suites[0]?.assertions[0]?.shortTitle).toBe(
      "reads canonical pack binding metadata"
    );
    expect(parsed.suites[1]?.assertions[0]?.shortTitle).toBe(
      "world generation keeps fixed feature counts per level"
    );
    expect(parsed.suites[1]?.assertions[0]?.failureMessages[0]).toContain(
      "expected 16 to be 50"
    );
  });

  test("parses coverage summary totals for the review page", () => {
    const coverage = parseCoverageSummary({
      total: {
        lines: { pct: 81.5 },
        statements: { pct: 80.1 },
        functions: { pct: 78.2 },
        branches: { pct: 62.4 },
      },
    });

    expect(coverage.available).toBe(true);
    expect(coverage.linesPct).toBe(81.5);
    expect(coverage.branchesPct).toBe(62.4);
  });
});
