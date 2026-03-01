import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Callout } from "fumadocs-ui/components/callout";
import { getMDXComponents } from "@/mdx-components";

const PLANNING_DIR = path.resolve(process.cwd(), "..", ".planning");

export const SLUG_TO_FILE: Record<string, string> = {
	roadmap: "ROADMAP.md",
	grd: "GRD-escape-the-dungeon.md",
	"todo-realtime-content-visualizer": "TODO-realtime-content-visualizer.md",
	"todo-dungeonbreak-3d": "TODO-dungeonbreak-3d.md",
	"prd-content-balancing": "PRD-content-balancing.md",
};

export type PlanningTocItem = { title: string; url: string; depth: number };

type PlanningDoc = {
	content: string;
	toc: PlanningTocItem[];
};

const slugifyHeading = (value: string): string =>
	value
		.toLowerCase()
		.trim()
		.replace(/[`*_~[\]().,!?/\\]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-");

const stripMarkdownInline = (value: string): string =>
	value
		.replace(/`([^`]+)`/g, "$1")
		.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
		.replace(/[*_~]/g, "")
		.replace(/<[^>]+>/g, "")
		.trim();

function parseToc(content: string): { toc: PlanningTocItem[]; headingByLine: Map<number, PlanningTocItem> } {
	const lines = content.split(/\r?\n/);
	const toc: PlanningTocItem[] = [];
	const headingByLine = new Map<number, PlanningTocItem>();
	const seenIds = new Map<string, number>();

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index] ?? "";
		const match = /^(#{1,6})\s+(.+)$/.exec(line);
		if (!match) {
			continue;
		}

		const depth = match[1]?.length ?? 1;
		if (depth > 4) {
			continue;
		}
		const rawTitle = stripMarkdownInline(match[2] ?? "");
		if (!rawTitle) {
			continue;
		}

		const baseId = slugifyHeading(rawTitle) || `section-${index + 1}`;
		const prior = seenIds.get(baseId) ?? 0;
		seenIds.set(baseId, prior + 1);
		const id = prior === 0 ? baseId : `${baseId}-${prior + 1}`;

		const item = {
			title: rawTitle,
			url: `#${id}`,
			depth,
		};
		toc.push(item);
		headingByLine.set(index + 1, item);
	}

	return { toc, headingByLine };
}

export function getPlanningDocument(slug: string): PlanningDoc | null {
	const file = SLUG_TO_FILE[slug] ?? `${slug}.md`;
	const filePath = path.join(PLANNING_DIR, file);

	if (!existsSync(filePath)) {
		return null;
	}

	const content = readFileSync(filePath, "utf8");
	const { toc } = parseToc(content);

	return { content, toc };
}

function nodeText(children: ReactNode): string {
	if (typeof children === "string") {
		return children;
	}
	if (Array.isArray(children)) {
		return children.map((child) => nodeText(child)).join("");
	}
	if (children && typeof children === "object" && "props" in children) {
		const props = (children as { props?: { children?: ReactNode } }).props;
		return nodeText(props?.children ?? "");
	}
	return "";
}

function buildHeadingComponent(
	tag: "h1" | "h2" | "h3" | "h4" | "h5" | "h6",
	headingByLine: Map<number, PlanningTocItem>,
) {
	return function PlanningHeading({
		children,
		node,
	}: {
		children?: ReactNode;
		node?: { position?: { start?: { line?: number } } };
	}) {
		const line = node?.position?.start?.line;
		const mapped = typeof line === "number" ? headingByLine.get(line) : undefined;
		const text = nodeText(children ?? "");
		const fallbackId = slugifyHeading(stripMarkdownInline(text)) || "section";
		const id = mapped?.url.replace(/^#/, "") ?? fallbackId;
		const Tag = tag;
		return <Tag id={id}>{children}</Tag>;
	};
}

function buildPlanningComponents(headingByLine: Map<number, PlanningTocItem>) {
	return {
	...getMDXComponents(),
	blockquote: ({ children }: { children?: ReactNode }) => (
		<Callout type="info" className="my-4">
			{children}
		</Callout>
	),
	h1: buildHeadingComponent("h1", headingByLine),
	h2: buildHeadingComponent("h2", headingByLine),
	h3: buildHeadingComponent("h3", headingByLine),
	h4: buildHeadingComponent("h4", headingByLine),
	h5: buildHeadingComponent("h5", headingByLine),
	h6: buildHeadingComponent("h6", headingByLine),
};
}

export function PlanningMarkdown({ slug }: { slug: string }) {
	const doc = getPlanningDocument(slug);
	if (!doc) {
		return null;
	}

	const { content, headingByLine } = (() => {
		const parsed = parseToc(doc.content);
		return { content: doc.content, headingByLine: parsed.headingByLine };
	})();
	const planningComponents = buildPlanningComponents(headingByLine);

	return (
		<article className="fd-prose max-w-none">
			<ReactMarkdown remarkPlugins={[remarkGfm]} components={planningComponents}>
				{content}
			</ReactMarkdown>
		</article>
	);
}

export function getPlanningSlugs(): string[] {
	return Object.keys(SLUG_TO_FILE);
}
