import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prepareStaticReviewSite } from "../lib/static-review-site";

/**
 * Next static export emits absolute `/_next/` and `href="/..."` URLs. Those break
 * under `file://` and some static hosts. Rewrite to paths relative to each HTML file.
 */
function fixNextStaticExportPaths(
  outDir: string,
  siteBasePath: string
): void {
  const base = siteBasePath.replace(/^\/+|\/+$/g, "");
  const sitePrefix = base ? `/${base}` : "";

  const relToDir = (fromPosix: string, targetDir: string): string => {
    const from = fromPosix || ".";
    const to = targetDir || ".";
    let r = path.posix.relative(from, to);
    if (r === "") {
      r = ".";
    }
    return `${r}/`;
  };

  const relToFile = (fromPosix: string, filePath: string): string =>
    path.posix.relative(fromPosix || ".", filePath);

  const walk = (absDir: string): void => {
    for (const ent of readdirSync(absDir, { withFileTypes: true })) {
      const abs = path.join(absDir, ent.name);
      if (ent.isDirectory()) {
        walk(abs);
      } else if (ent.name.endsWith(".html")) {
        const relDir = path.relative(outDir, path.dirname(abs));
        const fromPosix = relDir.split(path.sep).join("/");

        let html = readFileSync(abs, "utf8");

        const nextRel = path.posix.relative(fromPosix || ".", "_next");
        const nextPrefix = `${nextRel}/`;
        const absNext = sitePrefix ? `/${base}/_next/` : "/_next/";
        html = html.replaceAll(absNext, nextPrefix);

        const homeHref =
          sitePrefix === "" ? 'href="/"' : `href="${sitePrefix}/"`;
        html = html.replaceAll(
          homeHref,
          `href="${relToDir(fromPosix, ".")}"`
        );

        for (const seg of [
          "tests",
          "guides",
          "game-data",
          "content-graphs",
        ] as const) {
          const absHref =
            sitePrefix === ""
              ? `href="/${seg}/"`
              : `href="${sitePrefix}/${seg}/"`;
          html = html.replaceAll(
            absHref,
            `href="${relToDir(fromPosix, seg)}"`
          );
        }

        const fileTargets = [
          "game/index.html",
          "data.json",
          "game/content-pack.bundle.v1.json",
          "game/content-graphs/content-graph-used-unused.json",
          "reports/unit-coverage/index.html",
          "reports/e2e/index.html",
        ] as const;
        for (const f of fileTargets) {
          const absUrl =
            sitePrefix === "" ? `href="/${f}"` : `href="${sitePrefix}/${f}"`;
          html = html.replaceAll(
            absUrl,
            `href="${relToFile(fromPosix, f)}"`
          );
          const jsonAbs = sitePrefix
            ? `\\"href\\":\\"${sitePrefix}/${f}\\"`
            : `\\"href\\":\\"/${f}\\"`;
          const jsonRel = `\\"href\\":\\"${relToFile(fromPosix, f)}\\"`;
          html = html.replaceAll(jsonAbs, jsonRel);
        }

        for (const seg of [
          "tests",
          "guides",
          "game-data",
          "content-graphs",
        ] as const) {
          const absHref =
            sitePrefix === ""
              ? `\\"href\\":\\"/${seg}/\\"`
              : `\\"href\\":\\"${sitePrefix}/${seg}/\\"`;
          const relHref = `\\"href\\":\\"${relToDir(fromPosix, seg)}\\"`;
          html = html.replaceAll(absHref, relHref);
        }

        writeFileSync(abs, html, "utf8");
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

const reviewPublic = path.join(reviewSiteDir, "public");
rmSync(reviewPublic, { recursive: true, force: true });
mkdirSync(reviewPublic, { recursive: true });
cpSync(outputDir, reviewPublic, { recursive: true, force: true });

const build = spawnPnpm(["exec", "next", "build"]);
if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const nextOut = path.join(reviewSiteDir, "out");
rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });
cpSync(nextOut, outputDir, { recursive: true, force: true });

const siteBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";
fixNextStaticExportPaths(outputDir, siteBasePath);

console.log(
  [
    "[build-static-review-site] built static review hub (Next.js export → static HTML)",
    `output=${outputDir}`,
    `unit=${data.unit.report.passed}/${data.unit.report.total}`,
    `e2e=${data.e2e.passed}/${data.e2e.total}`,
    `build=${data.manifest.buildVersion ?? "local"}`,
  ].join(" ")
);
