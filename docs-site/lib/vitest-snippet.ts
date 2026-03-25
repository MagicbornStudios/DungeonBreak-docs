import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { ParsedVitestSuite } from "./test-report-review";

const DEFAULT_MAX_LINES = 48;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Find the next `it("title"` / `test('title'` block and return up to maxLines of source from that line.
 */
export function extractVitestSnippetAfterIndex(
  source: string,
  title: string,
  searchFrom: number,
  maxLines: number = DEFAULT_MAX_LINES
): {
  snippet: string | null;
  resumeAt: number;
  startLine1: number | null;
  endLine1: number | null;
} {
  const t = title.trim();
  if (!t) {
    return {
      snippet: null,
      resumeAt: searchFrom,
      startLine1: null,
      endLine1: null,
    };
  }
  const escaped = escapeRegExp(t);
  const pattern = `\\b(?:it|test)(?:\\.(?:skip|only|todo|fails|concurrent))?\\s*\\(\\s*(["'\`])${escaped}\\1`;
  const re = new RegExp(pattern);
  const slice = source.slice(searchFrom);
  const m = re.exec(slice);
  if (!m || m.index === undefined) {
    return {
      snippet: null,
      resumeAt: searchFrom,
      startLine1: null,
      endLine1: null,
    };
  }
  const matchStart = searchFrom + m.index;
  const lineStart = source.lastIndexOf("\n", matchStart) + 1;
  const fromLineStart = source.slice(lineStart);
  const lines = fromLineStart.split(/\r?\n/);
  const snippetLines = lines.slice(0, Math.max(1, maxLines));
  const newlineBefore = source.slice(0, lineStart).match(/\r?\n/g);
  const startLine1 = newlineBefore ? newlineBefore.length + 1 : 1;
  const endLine1 = startLine1 + snippetLines.length - 1;
  return {
    snippet: snippetLines.join("\n").trimEnd(),
    resumeAt: matchStart + m[0].length,
    startLine1,
    endLine1,
  };
}

export function resolveTestSourcePath(
  suite: ParsedVitestSuite,
  docsSiteDir: string
): string | null {
  const fp = suite.filePath.trim();
  if (!fp) {
    return null;
  }
  // Only trust bare paths when absolute — relative paths would follow process cwd (wrong in Vitest).
  if (path.isAbsolute(fp) && existsSync(fp)) {
    return fp;
  }
  const normalized = fp.replace(/\\/g, "/");
  if (!path.isAbsolute(fp)) {
    const joined = path.resolve(docsSiteDir, fp);
    if (existsSync(joined)) {
      return joined;
    }
  }
  if (normalized.includes("/tests/unit/") || normalized.startsWith("tests/unit/")) {
    const rel = normalized.includes("/tests/unit/")
      ? normalized.slice(normalized.indexOf("tests/unit/"))
      : normalized;
    const candidate = path.resolve(docsSiteDir, rel);
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  const byName = path.resolve(docsSiteDir, "tests", "unit", suite.fileName);
  return existsSync(byName) ? byName : null;
}

export function enrichSuitesWithSnippets(
  suites: ParsedVitestSuite[],
  docsSiteDir: string
): void {
  for (const suite of suites) {
    const sourcePath = resolveTestSourcePath(suite, docsSiteDir);
    if (!sourcePath) {
      continue;
    }
    const source = readFileSync(sourcePath, "utf8");
    suite.fullFileSource = source;
    let cursor = 0;
    for (const assertion of suite.assertions) {
      const title = assertion.shortTitle.trim() || assertion.name;
      const { snippet, resumeAt, startLine1, endLine1 } =
        extractVitestSnippetAfterIndex(
          source,
          title,
          cursor,
          DEFAULT_MAX_LINES
        );
      assertion.snippet = snippet;
      assertion.snippetLineStart = startLine1;
      assertion.snippetLineEnd = endLine1;
      if (snippet) {
        cursor = resumeAt;
      }
    }
  }
}
