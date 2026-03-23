import type {
  ParsedVitestSuite,
  TestReviewCategory,
} from "@docs/lib/test-report-review";

export const categoryLabels: Record<TestReviewCategory, string> = {
  "asset-explorer": "Asset Explorer",
  "game-runtime": "Game Runtime",
  "schema-data-codegen": "Schemas, Data, Codegen",
  "assistant-mcp": "Assistant / MCP",
  other: "Other",
};

export function groupSuitesByCategory(
  suites: ParsedVitestSuite[]
): [TestReviewCategory, ParsedVitestSuite[]][] {
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
