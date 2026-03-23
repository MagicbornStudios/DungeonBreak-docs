import {
  type BundledLanguage,
  createHighlighter,
  type Highlighter,
} from "shiki";

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  highlighterPromise ??= createHighlighter({
    themes: ["github-dark"],
    langs: ["typescript", "tsx", "javascript", "json"],
  });
  return highlighterPromise;
}

export async function highlightCode(
  code: string,
  lang: BundledLanguage | "txt" = "typescript"
): Promise<string> {
  const hi = await getHighlighter();
  const trimmed = code.trim();
  if (!trimmed) {
    return "";
  }
  try {
    return hi.codeToHtml(trimmed, {
      lang: lang === "txt" ? "typescript" : lang,
      theme: "github-dark",
    });
  } catch {
    return hi.codeToHtml(trimmed, {
      lang: "typescript",
      theme: "github-dark",
    });
  }
}
