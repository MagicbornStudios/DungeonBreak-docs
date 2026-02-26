import { NextResponse } from "next/server";
import { getSource } from "@/lib/source";
import { extractTableOfContents } from "@/lib/lexical-serializer";

export type DocsTocItem = { title: string; url: string; depth: number };

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const slugParam = searchParams.get("slug");
	if (!slugParam) {
		return NextResponse.json({ toc: [] });
	}
	const slug = slugParam.split(",").map((s) => s.trim()).filter(Boolean);
	if (slug.length === 0) {
		return NextResponse.json({ toc: [] });
	}

	const source = await getSource();
	const page = await source.getPage(slug);
	if (!page) {
		return NextResponse.json({ toc: [] });
	}

	const isFileBased = "body" in page.data && page.data.body;
	let toc: DocsTocItem[] = [];

	function toTitle(v: unknown): string {
		if (typeof v === "string") return v;
		return "";
	}

	if (isFileBased) {
		const dataWithToc = page.data as { toc?: unknown[] };
		const raw = (dataWithToc.toc ?? []) as {
			content?: unknown;
			title?: unknown;
			id?: string;
			url?: string;
			depth?: number;
		}[];
		toc = raw.map((h) => {
			const id =
				(h.id ?? (typeof h.url === "string" ? h.url.replace(/^#?/, "") : "")) ||
				"";
			return {
				title: toTitle(h.content ?? h.title),
				url: id ? `#${id}` : "#",
				depth: h.depth ?? 2,
			};
		});
	} else {
		const dataWithContent = page.data as { content?: unknown };
		const raw = extractTableOfContents(dataWithContent.content);
		toc = raw.map((item) => ({
			title: toTitle(item.title),
			url: typeof item.url === "string" ? item.url : "#",
			depth: typeof item.depth === "number" ? item.depth : 2,
		}));
	}

	return NextResponse.json({ toc });
}
