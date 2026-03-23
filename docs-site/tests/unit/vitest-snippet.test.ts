import { describe, expect, test } from "vitest";
import {
  extractVitestSnippetAfterIndex,
  enrichSuitesWithSnippets,
} from "@/lib/vitest-snippet";
import type { ParsedVitestSuite } from "@/lib/test-report-review";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

describe("vitest-snippet", () => {
  test("extracts lines starting at it() with matching title", () => {
    const src = `
import { test, expect } from "vitest";
test("alpha", () => {
  expect(1).toBe(1);
});
test("beta", async () => {
  expect(2).toBe(2);
});
`;
    const a = extractVitestSnippetAfterIndex(src, "alpha", 0, 20);
    expect(a.snippet).toContain('test("alpha"');
    expect(a.snippet).toContain("expect(1)");
    const b = extractVitestSnippetAfterIndex(src, "beta", a.resumeAt, 20);
    expect(b.snippet).toContain('test("beta"');
    expect(b.snippet).toContain("expect(2)");
  });

  test("supports it.skip and template literal title", () => {
    const src = "it.skip(`x y`, () => {\n  ok();\n});";
    const r = extractVitestSnippetAfterIndex(src, "x y", 0, 10);
    expect(r.snippet).toContain("it.skip");
    expect(r.snippet).toContain("ok()");
  });

  test("enrichSuitesWithSnippets reads file from docs site dir", () => {
    const dir = path.join(os.tmpdir(), `snippet-${Date.now()}`);
    const testDir = path.join(dir, "tests", "unit");
    mkdirSync(testDir, { recursive: true });
    const fileRel = path.join("tests", "unit", "sample.test.ts");
    writeFileSync(
      path.join(dir, fileRel),
      `import { test, expect } from "vitest";
test("one", () => { expect(1).toBe(1); });
`,
      "utf8"
    );
    try {
      const suite: ParsedVitestSuite = {
        filePath: fileRel.replace(/\\/g, "/"),
        fileName: "sample.test.ts",
        baseName: "sample",
        category: "other",
        status: "passed",
        durationMs: 1,
        passed: 1,
        failed: 0,
        pending: 0,
        assertions: [
          {
            name: "one",
            shortTitle: "one",
            status: "passed",
            durationMs: 1,
            failureMessages: [],
          },
        ],
      };
      enrichSuitesWithSnippets([suite], dir);
      expect(suite.assertions[0]?.snippet).toContain('test("one"');
      expect(suite.assertions[0]?.snippet).toContain("expect(1)");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
