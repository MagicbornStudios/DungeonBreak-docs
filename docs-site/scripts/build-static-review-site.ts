import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildStaticReviewSite } from "../lib/static-review-site";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docsSiteDir = path.resolve(__dirname, "..");

const reportRoot = path.resolve(docsSiteDir, "test-reports");
const outputDir = path.resolve(docsSiteDir, "static-review-site");
const publicGameDir = path.resolve(docsSiteDir, "public", "game");

const data = buildStaticReviewSite({
  outputDir,
  reportRoot,
  publicGameDir,
});

console.log(
  [
    "[build-static-review-site] built static review site",
    `output=${outputDir}`,
    `unit=${data.unit.report.passed}/${data.unit.report.total}`,
    `e2e=${data.e2e.passed}/${data.e2e.total}`,
    `build=${data.manifest.buildVersion ?? "local"}`,
  ].join(" ")
);
