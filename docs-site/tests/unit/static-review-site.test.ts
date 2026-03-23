import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { prepareStaticReviewSite } from "@/lib/static-review-site";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0, tempDirs.length)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function createTempDir(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "dungeonbreak-review-site-"));
  tempDirs.push(dir);
  return dir;
}

describe("static-review-site", () => {
  test("prepares data.json and copies game/report artifacts (Vite builds UI)", () => {
    const root = createTempDir();
    const reportRoot = path.join(root, "test-reports");
    const gameRoot = path.join(root, "public", "game");
    const outputDir = path.join(root, "site");

    mkdirSync(path.join(reportRoot, "unit"), { recursive: true });
    mkdirSync(path.join(reportRoot, "unit-coverage"), { recursive: true });
    mkdirSync(path.join(reportRoot, "e2e", "html"), { recursive: true });
    mkdirSync(gameRoot, { recursive: true });
    const fakeDocsRoot = path.join(root, "docs-site");
    mkdirSync(path.join(fakeDocsRoot, "tests", "unit"), { recursive: true });
    writeFileSync(
      path.join(fakeDocsRoot, "tests", "unit", "review-site-data.test.ts"),
      `import { describe, expect, test } from "vitest";
describe("review-site-data", () => {
  test("parses manifest", () => {
    expect(1).toBe(1);
  });
});
`,
      "utf8"
    );

    writeFileSync(
      path.join(reportRoot, "test-manifest-latest.json"),
      JSON.stringify(
        {
          buildVersion: "abc123",
          workflow: "docs-browser-game",
          generatedAt: "2026-03-22T00:00:00Z",
          results: { typecheck: "pass", unit: "pass" },
        },
        null,
        2
      )
    );
    writeFileSync(
      path.join(reportRoot, "unit", "results.json"),
      JSON.stringify(
        {
          success: true,
          numTotalTests: 2,
          numPassedTests: 2,
          numFailedTests: 0,
          numPendingTests: 0,
          testResults: [
            {
              name: "tests/unit/review-site-data.test.ts",
              status: "passed",
              assertionResults: [
                {
                  fullName: "review-site-data parses manifest",
                  title: "parses manifest",
                  status: "passed",
                  duration: 10,
                  failureMessages: [],
                },
              ],
              startTime: 1,
              endTime: 15,
            },
          ],
        },
        null,
        2
      )
    );
    writeFileSync(
      path.join(reportRoot, "unit-coverage", "coverage-summary.json"),
      JSON.stringify(
        {
          total: {
            lines: { pct: 75 },
            statements: { pct: 74 },
            functions: { pct: 81 },
            branches: { pct: 66 },
          },
        },
        null,
        2
      )
    );
    writeFileSync(
      path.join(reportRoot, "unit-coverage", "index.html"),
      "<html><body>coverage</body></html>"
    );
    writeFileSync(
      path.join(reportRoot, "e2e", "results.json"),
      JSON.stringify(
        {
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
                      results: [{ status: "passed", duration: 55 }],
                    },
                  ],
                },
              ],
            },
          ],
        },
        null,
        2
      )
    );
    writeFileSync(
      path.join(reportRoot, "e2e", "html", "index.html"),
      "<html><body>playwright</body></html>"
    );
    writeFileSync(
      path.join(gameRoot, "index.html"),
      "<html><body>game</body></html>"
    );

    const data = prepareStaticReviewSite({
      outputDir,
      reportRoot,
      publicGameDir: gameRoot,
      docsSiteDir: fakeDocsRoot,
    });

    expect(data.manifest.buildVersion).toBe("abc123");
    expect(existsSync(path.join(outputDir, "data.json"))).toBe(true);
    expect(existsSync(path.join(outputDir, "game", "index.html"))).toBe(true);
    const roundTrip = JSON.parse(
      readFileSync(path.join(outputDir, "data.json"), "utf8")
    ) as { manifest: { buildVersion: string } };
    expect(roundTrip.manifest.buildVersion).toBe("abc123");
    expect(data.unit.report.suites[0]?.assertions[0]?.snippet).toContain(
      "expect(1)"
    );
  });
});
