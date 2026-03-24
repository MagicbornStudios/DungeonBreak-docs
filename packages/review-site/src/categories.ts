import type {
  ParsedVitestSuite,
  TestReviewCategory,
} from "@docs/lib/test-report-review";

export const categoryLabels: Record<TestReviewCategory, string> = {
  "asset-explorer": "Asset Explorer",
  "game-runtime": "Game Runtime",
  performance: "Performance",
  "schema-data-codegen": "Schemas, Data, Codegen",
  "assistant-mcp": "Assistant / MCP",
  other: "Other",
};

/** Stable tie-break when no failures in a group. */
const CATEGORY_ORDER: TestReviewCategory[] = [
  "game-runtime",
  "performance",
  "schema-data-codegen",
  "asset-explorer",
  "assistant-mcp",
  "other",
];

function categoryOrderIndex(c: TestReviewCategory): number {
  const i = CATEGORY_ORDER.indexOf(c);
  return i >= 0 ? i : CATEGORY_ORDER.length;
}

export function groupSuitesByCategory(
  suites: ParsedVitestSuite[]
): [TestReviewCategory, ParsedVitestSuite[]][] {
  const groups = new Map<TestReviewCategory, ParsedVitestSuite[]>();
  for (const suite of suites) {
    const current = groups.get(suite.category) ?? [];
    current.push(suite);
    groups.set(suite.category, current);
  }

  const entries = [...groups.entries()].map(([category, list]) => {
    const sortedSuites = [...list].sort((a, b) => {
      if (a.failed > 0 && b.failed === 0) {
        return -1;
      }
      if (a.failed === 0 && b.failed > 0) {
        return 1;
      }
      return a.fileName.localeCompare(b.fileName);
    });
    return [category, sortedSuites] as const;
  });

  entries.sort((left, right) => {
    const leftFails = left[1].some((s) => s.failed > 0);
    const rightFails = right[1].some((s) => s.failed > 0);
    if (leftFails !== rightFails) {
      return leftFails ? -1 : 1;
    }
    const byOrder = categoryOrderIndex(left[0]) - categoryOrderIndex(right[0]);
    if (byOrder !== 0) {
      return byOrder;
    }
    return categoryLabels[left[0]].localeCompare(categoryLabels[right[0]]);
  });

  return entries;
}
