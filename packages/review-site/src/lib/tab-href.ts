export type ReviewTab = "overview" | "tests" | "guides" | "data";

/**
 * Relative `*.html` links for static hosting and `file://` (no clean URLs).
 * Game data tab lives at `game-data/` (not `data/`) for Next.js routing.
 */
function folderForTab(target: Exclude<ReviewTab, "overview">): string {
  return target === "data" ? "game-data" : target;
}

export function tabHref(target: ReviewTab, current: ReviewTab): string {
  const atRoot = current === "overview";
  if (atRoot) {
    switch (target) {
      case "overview":
        return "./index.html";
      case "tests":
        return "./tests/index.html";
      case "guides":
        return "./guides/index.html";
      case "data":
        return "./game-data/index.html";
      default:
        return "./index.html";
    }
  }
  if (target === "overview") {
    return "../index.html";
  }
  if (target === current) {
    return "./index.html";
  }
  return `../${folderForTab(target)}/index.html`;
}
