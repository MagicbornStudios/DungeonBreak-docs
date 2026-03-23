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
