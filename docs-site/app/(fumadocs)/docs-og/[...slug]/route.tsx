import { notFound } from "next/navigation";
import { ImageResponse } from "next/og";
import { generate as DefaultImage } from "fumadocs-ui/og";
import { source, getPageImage } from "@/lib/source";

export const runtime = "nodejs";
export const revalidate = false;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const pathParts = slug.slice(0, -1);
  const page = await source.getPage(pathParts);

  if (!page) {
    notFound();
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
  const pages = await source.getPages();
  return pages
    .filter((p) => p.url != null && typeof p.url === "string")
    .map((p) => ({ slug: getPageImage(p).segments }));
}
