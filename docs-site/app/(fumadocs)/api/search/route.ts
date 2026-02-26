import { createSearchAPI } from "fumadocs-core/search/server";
import { source } from "@/lib/source";

/**
 * Extract plain text from Lexical content for search indexing
 */
function extractTextFromLexical(content: any): string {
	if (!content?.root) {
		return "";
	}

	function extractFromNode(node: any): string {
		if (!node) {
			return "";
		}

		if (node.type === "text") {
			return node.text || "";
		}

		if (node.children && Array.isArray(node.children)) {
			return node.children.map(extractFromNode).join(" ");
		}

		return "";
	}

	return extractFromNode(content.root);
}

async function getSearchIndexes() {
	const pages = await source.getPages();

	const entries = pages.map((page) => {
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
		const contentText = extractTextFromLexical(data.content);

		return {
			title,
			description,
			url: page.url,
			id: page.url,
			structuredData: {
				headings: [],
				contents: [
					{
						heading: title,
						content: contentText,
					},
				],
			},
		};
	});

	return entries;
}

export const GET = async (request: Request) => {
	const indexes = await getSearchIndexes();
	const server = createSearchAPI("advanced", {
		indexes,
	});
	return server.GET(request);
};
