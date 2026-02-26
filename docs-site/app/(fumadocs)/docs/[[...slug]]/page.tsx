import {
	DocsBody,
	DocsDescription,
	DocsPage,
	DocsTitle,
} from "fumadocs-ui/page";
import { notFound, redirect } from "next/navigation";
import { getPayload } from "payload";
import config from "@payload-config";
import VideoJSPlayer from "@/components/videojs-player";
import {
	extractTableOfContents,
	serializeLexical,
} from "@/lib/lexical-serializer";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import { source } from "@/lib/source";
import { EditButton, LLMCopyButton } from "./page.client";

export default async function Page(props: {
	params: Promise<{ slug?: string[] }>;
}) {
	const params = await props.params;
	const slug = params.slug;
	if (!slug || slug.length === 0) {
		redirect("/docs/getting-started");
	}
	if (slug.length === 2 && slug[0] === "getting-started" && slug[1] === "welcome") {
		redirect("/docs/getting-started");
	}
	const page = await source.getPage(slug);

	if (!page) {
		notFound();
	}

	// File-based MDX (e.g. generated API docs) vs Payload Lexical
	const isFileBased = "body" in page.data && page.data.body;

	// Fumadocs expects toc: { title: ReactNode; url: string; depth: number }[] — url must be a string (e.g. "#id")
	let toc: { title: string; url: string; depth: number }[] = [];
	if (isFileBased) {
		const dataWithToc = page.data as { toc?: { content?: string; title?: string; id?: string; url?: string; depth?: number }[] };
		const raw = (dataWithToc.toc ?? []) as { content?: string; title?: string; id?: string; url?: string; depth?: number }[];
		toc = raw.map((h) => {
			const id = (h.id ?? (typeof h.url === "string" ? h.url.replace(/^#?/, "") : "")) || "";
			return {
				title: h.content ?? h.title ?? "",
				url: id ? `#${id}` : "#",
				depth: h.depth ?? 2,
			};
		});
	} else {
		const payloadData = page.data as { content?: unknown };
		toc = extractTableOfContents(payloadData.content);
	}

	const payload = await getPayload({ config });
	type PayloadDocData = { content?: SerializedEditorState | null; id?: string | number };
	const payloadData = isFileBased ? null : (page.data as PayloadDocData);
	const contentHtml = isFileBased || !payloadData
		? null
		: await serializeLexical(payloadData.content ?? null, payload);
	const BodyComponent = isFileBased ? (page.data as { body: React.ComponentType }).body : null;

	return (
		<DocsPage
			footer={{ enabled: false }}
			tableOfContent={{ style: "normal", single: false }}
			toc={toc}
		>
			<DocsTitle className="font-bold font-serif text-4xl md:text-5xl">
				{page.data.title}
			</DocsTitle>
			<DocsDescription>{page.data.description}</DocsDescription>
			{!isFileBased && (
				<div className="flex flex-row items-center gap-2 border-b pb-6">
					<LLMCopyButton slug={params.slug ?? []} />
					<EditButton
						payloadUrl={`/admin/collections/docs/${String(payloadData?.id ?? "")}`}
					/>
				</div>
			)}
			<DocsBody>
				{BodyComponent ? <BodyComponent /> : <VideoJSPlayer html={contentHtml!} />}
			</DocsBody>
		</DocsPage>
	);
}

export async function generateStaticParams() {
	return await source.generateParams();
}

export async function generateMetadata(props: {
	params: Promise<{ slug?: string[] }>;
}) {
	const params = await props.params;
	const slug = params.slug;
	if (!slug || slug.length === 0) {
		return { title: "Redirecting...", description: "" };
	}
	if (slug.length === 2 && slug[0] === "getting-started" && slug[1] === "welcome") {
		return { title: "Redirecting...", description: "" };
	}
	const page = await source.getPage(slug);

	if (!page) {
		notFound();
	}

	const slugPath = params.slug?.filter(Boolean).join("/") || "getting-started";
	const image = `/docs-og/${slugPath}/image.png`;

	return {
		title: page.data.title,
		description: page.data.description,
		openGraph: {
			images: image,
		},
		twitter: {
			card: "summary_large_image",
			images: image,
		},
	};
}

export const revalidate = 30;
