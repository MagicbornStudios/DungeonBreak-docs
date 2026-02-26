import type { source } from "@/lib/source";

type PageDataWithGetText = { getText: (format: string) => Promise<string>; title?: string };
export async function getLLMText(page: NonNullable<Awaited<ReturnType<typeof source.getPage>>>) {
  const data = page.data as PageDataWithGetText;
  const processed = "getText" in data && typeof data.getText === "function" ? await data.getText("processed") : String((page.data as { content?: unknown }).content ?? "");

  return `# ${data.title ?? ""}
URL: ${page.url}

${processed}`;
}
