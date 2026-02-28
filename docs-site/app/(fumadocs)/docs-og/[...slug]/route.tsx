import { ImageResponse } from "next/og";
import { generate as DefaultImage } from "fumadocs-ui/og";
import { source, getPageImage } from "@/lib/source";

export const runtime = "nodejs";
export const revalidate = false;

export async function GET(
  req: Request,
  context: { params: Promise<{ slug?: string[] }> },
) {
  const resolvedParams = await Promise.resolve(context?.params);
  const slug = resolvedParams?.slug ?? [];

  if (slug.length === 0) {
    return new Response("Not found", { status: 404 });
  }

  const pathParts = slug.slice(0, -1);
  const page = await source.getPage(pathParts);

  if (!page) {
    return new Response("Not found", { status: 404 });
  }

  const data =
    page.data && typeof page.data === "object"
      ? (page.data as Record<string, unknown>)
      : {};
  const title =
    typeof data.title === "string" && data.title.trim().length > 0
      ? data.title
      : "Untitled";
  const description =
    typeof data.description === "string" ? data.description : "";

  return new ImageResponse(
    <DefaultImage
      title={title}
      description={description}
      site="DungeonBreak Docs"
    />,
    { width: 1200, height: 630 },
  );
}

export async function generateStaticParams() {
  try {
    const pages = await source.getPages();
    return pages
      .filter((p) => p.url != null && typeof p.url === "string")
      .map((p) => ({ slug: getPageImage(p).segments }));
  } catch (error) {
    console.warn("docs-og generateStaticParams fallback:", error);
    return [];
  }
}
