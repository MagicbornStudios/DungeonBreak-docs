import path from "node:path";
import { fileURLToPath } from "node:url";

/** `packages/review-site` root (contains `app/`, `src/`, `next.config.mjs`). */
export const reviewSitePkgRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

export const repoRoot = path.resolve(reviewSitePkgRoot, "../..");

export const docsSiteRoot = path.resolve(reviewSitePkgRoot, "../../docs-site");
