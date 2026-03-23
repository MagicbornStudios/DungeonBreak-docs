import fs from "node:fs";
import path from "node:path";
import type { ReviewSiteData } from "@docs/lib/review-site-data";

function tryRead(dir: string): ReviewSiteData | null {
  const p = path.join(dir, "data.json");
  if (!fs.existsSync(p)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(p, "utf8")) as ReviewSiteData;
}

/**
 * Build: set `REVIEW_SITE_DATA_DIR` to the folder that contains `data.json` (usually
 * `docs-site/static-review-site` after `prepareStaticReviewSite`).
 * Dev: falls back to `../docs-site/static-review-site` or `./public` when unset.
 */
export function loadBuildData(): ReviewSiteData {
  const fromEnv = process.env.REVIEW_SITE_DATA_DIR;
  if (fromEnv) {
    const data = tryRead(path.resolve(fromEnv));
    if (data) {
      return data;
    }
    throw new Error(
      `REVIEW_SITE_DATA_DIR=${fromEnv} has no data.json — run pnpm review-site:build from docs-site first.`
    );
  }

  const cwd = process.cwd();
  const fallbacks = [
    path.resolve(cwd, "../docs-site/static-review-site"),
    path.resolve(cwd, "../../docs-site/static-review-site"),
    path.join(cwd, "public"),
  ];

  for (const dir of fallbacks) {
    const data = tryRead(dir);
    if (data) {
      return data;
    }
  }

  throw new Error(
    "No data.json found. Run `pnpm review-site:build` from docs-site, or set REVIEW_SITE_DATA_DIR, or place data.json in packages/review-site/public/."
  );
}
