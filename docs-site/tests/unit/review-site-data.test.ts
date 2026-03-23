import { describe, expect, test } from "vitest";
import {
  parsePlaywrightReport,
  parseReviewManifest,
} from "@/lib/review-site-data";

describe("review-site-data", () => {
  test("parses review manifest results for the published site", () => {
    const manifest = parseReviewManifest({
      buildVersion: "abc123",
      workflow: "docs-browser-game",
      generatedAt: "2026-03-22T00:00:00Z",
      results: {
        typecheck: "pass",
        e2e: "fail",
      },
    });

    expect(manifest.available).toBe(true);
    expect(manifest.buildVersion).toBe("abc123");
    expect(manifest.results).toEqual([
      { key: "typecheck", status: "pass" },
      { key: "e2e", status: "fail" },
    ]);
  });

  test("parses playwright json into summary counts and flattened specs", () => {
    const report = parsePlaywrightReport({
      stats: {
        duration: 4200,
      },
      suites: [
        {
          title: "tests/e2e",
          file: "tests/e2e/portal.spec.ts",
          specs: [
            {
              title: "marketing landing page routes into the portal",
              tests: [
                {
                  status: "expected",
                  results: [{ status: "passed", duration: 120 }],
                },
              ],
            },
            {
              title: "asset explorer flow",
              tests: [
                {
                  status: "unexpected",
                  error: { message: "boom" },
                  results: [{ status: "failed", duration: 80 }],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(report.available).toBe(true);
    expect(report.total).toBe(2);
    expect(report.passed).toBe(1);
    expect(report.failed).toBe(1);
    expect(report.durationMs).toBe(4200);
    expect(report.specs).toHaveLength(2);
    expect(report.specs[1]?.errors[0]).toContain("boom");
  });
});
