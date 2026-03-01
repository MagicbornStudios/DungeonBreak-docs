import { notFound } from "next/navigation";
import { Callout } from "fumadocs-ui/components/callout";
import { Card, Cards } from "fumadocs-ui/components/card";
import { FileText, Home, ScrollText } from "lucide-react";
import { PlanningMarkdown, getPlanningSlugs } from "@/components/planning-markdown";

const SLUG_LABELS: Record<string, string> = {
	roadmap: "Roadmap",
	grd: "GRD: Escape the Dungeon",
	"todo-realtime-content-visualizer": "TODO: Realtime Content Visualizer",
	"todo-dungeonbreak-3d": "TODO: DungeonBreak 3D",
	"prd-content-balancing": "PRD: Content Space Balancing",
};

const SLUG_DESCRIPTIONS: Record<string, string> = {
	roadmap: "Phase overview and dependencies",
	grd: "World, entities, systems, acts — core design reference",
	"todo-realtime-content-visualizer": "Future realtime viz",
	"todo-dungeonbreak-3d": "Unreal 3D — stakeholder discovery pending",
	"prd-content-balancing": "Content space balancing vision",
};

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
			<main className="mx-auto max-w-3xl px-6 py-8">
				<div className="mb-6 flex items-center gap-3">
					<FileText className="size-8 text-primary" />
					<div>
						<h1 className="text-2xl font-bold">Planning Docs</h1>
						<p className="text-sm text-muted-foreground">
							Markdown from <code>.planning/*.md</code>
						</p>
					</div>
				</div>
				<Callout type="info" title="Embedded Markdown">
					These docs are served from <code>.planning/*.md</code> — not converted to MDX.
				</Callout>

				<div className="mt-6 space-y-6">
					<div>
						<h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
							<ScrollText className="size-5 text-primary" />
							Core design reference
						</h2>
						<Card
							href="/planning/grd"
							title="GRD: Escape the Dungeon"
							icon={<ScrollText />}
						>
							World, entities, systems, acts — primary requirements doc
						</Card>
					</div>

					<div>
						<h2 className="mb-3 text-lg font-semibold">All planning docs</h2>
						<Cards className="grid-cols-1 sm:grid-cols-2">
							<Card href="/" title="← Back to home" icon={<Home />} />
							{slugs
								.filter((s) => s !== "grd")
								.map((s) => (
									<Card
										key={s}
										href={`/planning/${s}`}
										title={SLUG_LABELS[s] ?? s}
										icon={<FileText />}
									>
										{SLUG_DESCRIPTIONS[s]}
									</Card>
								))}
						</Cards>
					</div>

					<div>
						<h2 className="mb-3 text-lg font-semibold">Future</h2>
						<Card href="/planning/todo-dungeonbreak-3d" title="TODO: DungeonBreak 3D" icon={<FileText />}>
							Planned via core systems, content, formulas — stakeholder discovery pending
						</Card>
					</div>
				</div>
			</main>
		);
	}

	if (!getPlanningSlugs().includes(key)) {
		notFound();
	}

	return (
		<main className="mx-auto max-w-4xl px-6 py-8">
			<Cards className="mb-6 grid-cols-1 sm:grid-cols-2">
				<Card href="/" title="← Back to home" />
				<Card href="/planning" title="Planning" />
			</Cards>
			<PlanningMarkdown slug={key} />
		</main>
	);
}

export function generateStaticParams() {
	const slugs = getPlanningSlugs();
	return [
		{},
		...slugs.map((slug) => ({ slug: [slug] })),
		{ slug: ["todo-dungeonbreak-3d"] },
	];
}
