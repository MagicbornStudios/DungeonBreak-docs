import { readFileSync } from "node:fs";
import type { ParsedVitestSuite } from "@docs/lib/test-report-review";
import { resolveTestSourcePath } from "@docs/lib/vitest-snippet";
import { docsSiteRoot } from "@/lib/paths";

/**
 * `data.json` omits `fullFileSource` to keep the bundle small. Re-attach sources
 * at Astro build time from docs-site paths.
 */
export function attachTestFullSources(suites: ParsedVitestSuite[]): void {
  for (const suite of suites) {
    const p = resolveTestSourcePath(suite, docsSiteRoot);
    if (!p) {
      suite.fullFileSource = null;
      continue;
    }
    try {
      suite.fullFileSource = readFileSync(p, "utf8");
    } catch {
      suite.fullFileSource = null;
    }
  }
}
