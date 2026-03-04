import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart3, FileText, Home, ScrollText } from "lucide-react";
import { Callout } from "fumadocs-ui/components/callout";
import { Card, Cards } from "fumadocs-ui/components/card";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/page";
import {
	PlanningMarkdown,
	getPlanningDocument,
	getPlanningSlugs,
	type PlanningTocItem,
} from "@/components/planning-markdown";

const SLUG_LABELS: Record<string, string> = {
	roadmap: "Roadmap",
	grd: "GRD: Escape the Dungeon",
	"todo-realtime-content-visualizer": "TODO: Realtime Content Visualizer",
	"todo-dungeonbreak-3d": "TODO: DungeonBreak 3D",
	"prd-content-balancing": "PRD: Content Space Balancing",
};

const SLUG_DESCRIPTIONS: Record<string, string> = {
	roadmap: "Phase overview and dependencies",
	grd: "World, entities, systems, acts - core design reference",
	"todo-realtime-content-visualizer": "Future realtime visualization",
	"todo-dungeonbreak-3d": "Unreal 3D - stakeholder discovery pending",
	"prd-content-balancing": "Content space balancing vision",
};

const PLANNING_INDEX_TOC: PlanningTocItem[] = [
	{ title: "Core design reference", url: "#core-design-reference", depth: 2 },
	{ title: "All planning docs", url: "#all-planning-docs", depth: 2 },
	{ title: "Future", url: "#future", depth: 2 },
];

export default async function PlanningPage({
	params,
}: {
	params: Promise<{ slug?: string[] }>;
}) {
	const { slug } = await params;
	const key = slug?.join("/") ?? "";

	if (!key) {
		const slugs = getPlanningSlugs();
		return (
			<DocsPage
				footer={{ enabled: false }}
				tableOfContent={{ style: "normal", single: false }}
				toc={PLANNING_INDEX_TOC}
			>
				<DocsTitle>Planning Docs</DocsTitle>
				<DocsDescription>Markdown sourced from <code>.planning/*.md</code>.</DocsDescription>
				<DocsBody>
					<Callout type="info" title="Embedded markdown">
						These docs are served from <code>.planning/*.md</code> and rendered at runtime.
					</Callout>

					<section id="core-design-reference" className="mt-6 space-y-3">
						<h2 className="text-lg font-semibold">Core design reference</h2>
						<Card href="/planning/grd" title="GRD: Escape the Dungeon" icon={<ScrollText />}>
							World, entities, systems, acts - primary requirements doc.
						</Card>
						<Card href="/planning/dashboard" title="Planning dashboard" icon={<BarChart3 />}>
							System health: completion, open questions, token estimates, loop usage (Recharts).
						</Card>
					</section>

					<section id="all-planning-docs" className="mt-8 space-y-3">
						<h2 className="text-lg font-semibold">All planning docs</h2>
						<Cards className="grid-cols-1 sm:grid-cols-2">
							<Card href="/" title="Back to home" icon={<Home />} />
							{slugs
								.filter((item) => item !== "grd")
								.map((item) => (
									<Card
										key={item}
										href={`/planning/${item}`}
										title={SLUG_LABELS[item] ?? item}
										icon={<FileText />}
									>
										{SLUG_DESCRIPTIONS[item]}
									</Card>
								))}
						</Cards>
					</section>

					<section id="future" className="mt-8 space-y-3">
						<h2 className="text-lg font-semibold">Future</h2>
						<Card
							href="/planning/todo-dungeonbreak-3d"
							title="TODO: DungeonBreak 3D"
							icon={<FileText />}
						>
							Planned via core systems, content, and formulas - stakeholder discovery pending.
						</Card>
					</section>
				</DocsBody>
			</DocsPage>
		);
	}

	if (!getPlanningSlugs().includes(key)) {
		notFound();
	}

	const doc = getPlanningDocument(key);
	if (!doc) {
		notFound();
	}

	return (
		<DocsPage
			footer={{ enabled: false }}
			tableOfContent={{ style: "normal", single: false }}
			toc={doc.toc}
		>
			<DocsTitle>{SLUG_LABELS[key] ?? key}</DocsTitle>
			<DocsDescription>{SLUG_DESCRIPTIONS[key] ?? "Planning document"}</DocsDescription>
			<DocsBody>
				<div className="mb-6 flex items-center gap-4 text-sm">
					<Link href="/planning" className="text-primary hover:underline">
						Planning index
					</Link>
					<Link href="/" className="text-primary hover:underline">
						Home
					</Link>
				</div>
				<PlanningMarkdown slug={key} />
			</DocsBody>
		</DocsPage>
	);
}

export function generateStaticParams() {
	const slugs = getPlanningSlugs();
	return [{}, ...slugs.map((slug) => ({ slug: [slug] }))];
}
