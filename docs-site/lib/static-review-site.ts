import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import type { ParsedVitestSuite } from "@/lib/test-report-review";
import { type ReviewSiteData, loadReviewSiteData } from "@/lib/review-site-data";

export type StaticReviewSiteOptions = {
  outputDir: string;
  reportRoot: string;
  publicGameDir: string;
  /** Root of the docs-site package (parent of test-reports). Used for snippet enrichment in data.json. */
  docsSiteDir?: string;
  /** When set, writes the same data.json into this folder (e.g. packages/review-site/public) for local Astro dev. */
  reviewBundlePublicDir?: string;
};

function copyDirIfExists(sourceDir: string, targetDir: string): void {
  if (!existsSync(sourceDir)) {
    return;
  }
  mkdirSync(path.dirname(targetDir), { recursive: true });
  cpSync(sourceDir, targetDir, { recursive: true, force: true });
}

function copyFileIfExists(sourcePath: string, targetPath: string): void {
  if (!existsSync(sourcePath)) {
    return;
  }
  mkdirSync(path.dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, readFileSync(sourcePath));
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** When Vitest coverage / Playwright HTML were not generated, links would 404; ship a stub page instead. */
function ensurePlaceholderReportIndex(
  indexPath: string,
  title: string,
  steps: string[]
): void {
  if (existsSync(indexPath)) {
    return;
  }
  mkdirSync(path.dirname(indexPath), { recursive: true });
  const items = steps.map((t) => `<li>${escapeHtml(t)}</li>`).join("\n");
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(title)}</title>
<style>
body{font-family:system-ui,sans-serif;max-width:42rem;margin:2rem auto;padding:0 1rem;line-height:1.5;color:#1e293b;background:#f8fafc}
h1{font-size:1.25rem;margin-bottom:0.75rem}
code{background:#e2e8f0;padding:0.1em 0.35em;border-radius:4px;font-size:0.9em}
ul{padding-left:1.25rem}
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<p>This report was not present when the review hub was built.</p>
<ul>
${items}
</ul>
</body>
</html>
`;
  writeFileSync(indexPath, html, "utf8");
}

/** Full test sources are huge; keep line ranges + snippets in data.json only. */
function stripSuiteFullSources(data: ReviewSiteData): ReviewSiteData {
  return {
    ...data,
    unit: {
      ...data.unit,
      report: {
        ...data.unit.report,
        suites: data.unit.report.suites.map((suite) => {
          const { fullFileSource: _f, ...rest } = suite as ParsedVitestSuite & {
            fullFileSource?: string | null;
          };
          return rest as ParsedVitestSuite;
        }),
      },
    },
  };
}

/**
 * Writes data.json, copies game + report artifacts into outputDir.
 * Run the Astro app in `packages/review-site` with `vite.build.emptyOutDir: false` to merge the static UI.
 */
export function prepareStaticReviewSite(
  options: StaticReviewSiteOptions
): ReviewSiteData {
  const docsSiteDir =
    options.docsSiteDir ?? path.resolve(options.reportRoot, "..");
  const data = loadReviewSiteData(options.reportRoot, docsSiteDir);
  const dataForExport = stripSuiteFullSources(data);
  const outputDir = path.resolve(options.outputDir);

  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(path.resolve(outputDir, "reports"), { recursive: true });
  mkdirSync(path.resolve(outputDir, "tests"), { recursive: true });
  mkdirSync(path.resolve(outputDir, "references"), { recursive: true });

  const dataJson = `${JSON.stringify(dataForExport, null, 2)}\n`;
  writeFileSync(path.resolve(outputDir, "data.json"), dataJson);

  if (options.reviewBundlePublicDir) {
    mkdirSync(options.reviewBundlePublicDir, { recursive: true });
    writeFileSync(
      path.resolve(options.reviewBundlePublicDir, "data.json"),
      dataJson
    );
  }

  copyDirIfExists(
    path.resolve(options.reportRoot, "unit-coverage"),
    path.resolve(outputDir, "reports", "unit-coverage")
  );
  copyDirIfExists(
    path.resolve(options.reportRoot, "e2e", "html"),
    path.resolve(outputDir, "reports", "e2e")
  );
  copyDirIfExists(options.publicGameDir, path.resolve(outputDir, "game"));

  copyFileIfExists(
    path.resolve(options.reportRoot, "unit", "results.json"),
    path.resolve(outputDir, "reports", "unit-results.json")
  );
  copyFileIfExists(
    path.resolve(options.reportRoot, "e2e", "results.json"),
    path.resolve(outputDir, "reports", "e2e-results.json")
  );
  copyFileIfExists(
    path.resolve(options.reportRoot, "vector-usage-report.json"),
    path.resolve(outputDir, "reports", "vector-usage-report.json")
  );
  copyFileIfExists(
    path.resolve(options.reportRoot, "balance-sim-report.json"),
    path.resolve(outputDir, "reports", "balance-sim-report.json")
  );

  ensurePlaceholderReportIndex(
    path.resolve(outputDir, "reports", "unit-coverage", "index.html"),
    "Unit coverage (not generated)",
    [
      "In docs-site: pnpm test:unit:report (Vitest with coverage + JSON snapshot).",
      "Then: pnpm review-site:build",
    ]
  );
  ensurePlaceholderReportIndex(
    path.resolve(outputDir, "reports", "e2e", "index.html"),
    "Playwright HTML (not generated)",
    [
      "Generate HTML under docs-site/test-reports/e2e/html (see Playwright config / e2e scripts).",
      "Then: pnpm review-site:build",
    ]
  );

  const gameplayDesignSource = path.resolve(
    docsSiteDir,
    "..",
    ".planning",
    "GAMEPLAY-DESIGN.xml"
  );
  copyFileIfExists(
    gameplayDesignSource,
    path.resolve(outputDir, "references", "GAMEPLAY-DESIGN.xml")
  );

  return dataForExport;
}

/** @deprecated Use prepareStaticReviewSite; name kept for older imports. */
export function buildStaticReviewSite(
  options: StaticReviewSiteOptions
): ReviewSiteData {
  return prepareStaticReviewSite(options);
}
