import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Callout } from "fumadocs-ui/components/callout";
import { getMDXComponents } from "@/mdx-components";

const PLANNING_DIR = path.resolve(process.cwd(), "..", ".planning");

const SLUG_TO_FILE: Record<string, string> = {
	roadmap: "ROADMAP.md",
	grd: "GRD-escape-the-dungeon.md",
	"todo-realtime-content-visualizer": "TODO-realtime-content-visualizer.md",
	"todo-dungeonbreak-3d": "TODO-dungeonbreak-3d.md",
	"prd-content-balancing": "PRD-content-balancing.md",
};

const planningComponents = {
	...getMDXComponents(),
	blockquote: ({ children }: { children?: React.ReactNode }) => (
		<Callout type="info" className="my-4">
			{children}
		</Callout>
	),
};

export function PlanningMarkdown({ slug }: { slug: string }) {
	const file = SLUG_TO_FILE[slug] ?? `${slug}.md`;
	const filePath = path.join(PLANNING_DIR, file);

	if (!existsSync(filePath)) {
		return null;
	}

	const content = readFileSync(filePath, "utf8");
	return (
		<article className="fd-prose max-w-none py-6">
			<ReactMarkdown remarkPlugins={[remarkGfm]} components={planningComponents}>
				{content}
			</ReactMarkdown>
		</article>
	);
}

export function getPlanningSlugs(): string[] {
	return Object.keys(SLUG_TO_FILE);
}
