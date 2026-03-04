import { describe, expect, test } from "vitest";

/**
 * Unit tests for the test-reports API contract (response shape).
 * The actual route runs in Next.js; we test the logic we'd use to parse and display.
 */
describe("test-reports unit API contract", () => {
  test("parses vitest json report shape", () => {
    const mockReport = {
      success: true,
      numTotalTests: 41,
      numPassedTests: 40,
      numFailedTests: 1,
      numPendingTests: 0,
      startTime: 1772657848374,
      testResults: [
        {
          name: "C:/repo/docs-site/tests/unit/ai-flags.test.ts",
          status: "passed",
          assertionResults: [
            { fullName: "ai flag config loads default", title: "loads default", status: "passed", duration: 9, failureMessages: [] },
          ],
          startTime: 1772657851262,
          endTime: 1772657851279,
        },
      ],
    };
    const file = (mockReport.testResults[0].name as string).split(/[/\\]/).pop() ?? "";
    const base = file.replace(/\.test\.(ts|tsx)$/, "");
    expect(base).toBe("ai-flags");
    expect(mockReport.testResults[0].assertionResults).toHaveLength(1);
    expect(mockReport.numPassedTests).toBe(40);
    expect(mockReport.numFailedTests).toBe(1);
  });

  test("suite row shape for UI", () => {
    const suite = {
      name: "C:/repo/docs-site/tests/unit/game-engine.test.ts",
      status: "passed",
      assertionResults: [
        { fullName: "a b", title: "b", status: "passed" as const, duration: 100, failureMessages: [] as string[] },
        { fullName: "a c", title: "c", status: "failed" as const, duration: 50, failureMessages: ["AssertionError"] },
      ],
      startTime: 1000,
      endTime: 2000,
    };
    const passed = suite.assertionResults.filter((a) => a.status === "passed").length;
    const failed = suite.assertionResults.filter((a) => a.status === "failed").length;
    expect(passed).toBe(1);
    expect(failed).toBe(1);
    expect(suite.endTime! - suite.startTime!).toBe(1000);
  });
});
