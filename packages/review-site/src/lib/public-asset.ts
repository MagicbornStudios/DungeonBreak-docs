/**
 * Which static HTML file this link is rendered from (export has `trailingSlash`
 * folders: `tests/index.html`, etc.). Used when `basePath` is empty so `file://`
 * resolves assets relative to the current page instead of the drive root.
 */
export type StaticExportPage =
  | "overview"
  | "tests"
  | "guides"
  | "game-data"
  | "content-graphs";

/**
 * Href for files next to the export (`public/` copy). With `NEXT_PUBLIC_BASE_PATH`,
 * returns a root-absolute web path. Without it, returns a path relative to the
 * current page so `file://` and static hosts work (use `<a>`, not `next/link`).
 */
export function publicAssetHref(
  sitePath: string,
  page: StaticExportPage
): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";
  const normalized = sitePath.startsWith("/")
    ? sitePath
    : `/${sitePath}`;

  if (base) {
    return `${base}${normalized}`;
  }

  const pathPart = normalized.replace(/^\//, "");
  if (page === "overview") {
    return pathPart;
  }
  return `../${pathPart}`;
}
