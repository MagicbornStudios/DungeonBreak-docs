import { source } from "@/lib/source";

export const revalidate = false;

export async function GET() {
  const pages = await source.getPages();

  const scanned: string[] = [];
  scanned.push("# Fumadocs with Payload CMS");

  // Group pages by category (source returns data with categorySlug, title, description)
  type PageDataWithMeta = { categorySlug?: string; title?: string; description?: string };
  const byCategory = new Map<string, typeof pages>();
  for (const page of pages) {
    const data = page.data as PageDataWithMeta;
    const categorySlug = data.categorySlug || "index";
    const arr = byCategory.get(categorySlug) ?? [];
    arr.push(page);
    byCategory.set(categorySlug, arr);
  }

  // Generate markdown list for each category
  for (const [categorySlug, categoryPages] of byCategory) {
    const lines = categoryPages.map((page) => {
      const data = page.data as PageDataWithMeta;
      const description = data.description || "";
      return `- [${data.title ?? ""}](${page.url}): ${description}`;
    });

    scanned.push(`## ${categorySlug}`);
    scanned.push(lines.join("\n"));
  }

  return new Response(scanned.join("\n\n"));
}
