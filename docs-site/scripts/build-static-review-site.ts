import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prepareStaticReviewSite } from "../lib/static-review-site";

/** Astro can emit `href="/./_astro/..."`; rewrite so static hosting + file:// work. */
function fixAstroAssetPrefixes(outDir: string): void {
  const walk = (absDir: string): void => {
    for (const ent of readdirSync(absDir, { withFileTypes: true })) {
      const abs = path.join(absDir, ent.name);
      if (ent.isDirectory()) {
        walk(abs);
      } else if (ent.name.endsWith(".html")) {
        const relDir = path.relative(outDir, path.dirname(abs));
        const depth = relDir === "" ? 0 : relDir.split(path.sep).length;
        const prefix = depth === 0 ? "./" : `${"../".repeat(depth)}`;
        let html = readFileSync(abs, "utf8");
        const attrs = "href|src|component-url|renderer-url|before-hydration-url";
        html = html.replaceAll(
          new RegExp(`(${attrs})="\\/\\.\\/_astro\\/`, "g"),
          `$1="${prefix}_astro/`
        );
        html = html.replaceAll(
          new RegExp(`(${attrs})="\\/_astro\\/`, "g"),
          `$1="${prefix}_astro/`
        );
        writeFileSync(abs, html);
      }
    }
  };
  walk(outDir);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docsSiteDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(docsSiteDir, "..");
const reviewSiteDir = path.join(repoRoot, "packages", "review-site");
const reportRoot = path.resolve(docsSiteDir, "test-reports");
const outputDir = path.resolve(docsSiteDir, "static-review-site");
const publicGameDir = path.resolve(docsSiteDir, "public", "game");
const reviewBundlePublicDir = path.join(reviewSiteDir, "public");

function spawnPnpm(args: string[]) {
  if (process.platform === "win32") {
    return spawnSync("cmd.exe", ["/d", "/s", "/c", `pnpm ${args.join(" ")}`], {
      cwd: reviewSiteDir,
      stdio: "inherit",
      env: {
        ...process.env,
        REVIEW_SITE_DATA_DIR: outputDir,
      },
    });
  }

  return spawnSync("pnpm", args, {
    cwd: reviewSiteDir,
    stdio: "inherit",
    env: {
      ...process.env,
      REVIEW_SITE_DATA_DIR: outputDir,
    },
  });
}

const data = prepareStaticReviewSite({
  outputDir,
  reportRoot,
  publicGameDir,
  docsSiteDir,
  reviewBundlePublicDir,
});

const build = spawnPnpm(["exec", "astro", "build"]);
if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

fixAstroAssetPrefixes(outputDir);

console.log(
  [
    "[build-static-review-site] built static review hub (Astro → static HTML)",
    `output=${outputDir}`,
    `unit=${data.unit.report.passed}/${data.unit.report.total}`,
    `e2e=${data.e2e.passed}/${data.e2e.total}`,
    `build=${data.manifest.buildVersion ?? "local"}`,
  ].join(" ")
);
