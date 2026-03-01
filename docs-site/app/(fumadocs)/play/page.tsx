import { BarChart3, Download, FileText, Play, ScrollText, Sparkles } from "lucide-react";
import { Card, Cards } from "fumadocs-ui/components/card";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/page";
import { PlayTerminalMount } from "@/components/game/play-terminal-mount";

const PLAY_TOC = [
	{ title: "Quick start", url: "#quick-start", depth: 2 },
	{ title: "Gameplay", url: "#gameplay", depth: 2 },
	{ title: "References", url: "#references", depth: 2 },
];

export default function PlayPage() {
	return (
		<DocsPage
			footer={{ enabled: false }}
			tableOfContent={{ style: "normal", single: false }}
			toc={PLAY_TOC}
		>
			<DocsTitle className="flex items-center gap-2">
				<Play className="size-6 text-primary" />
				Escape the Dungeon
			</DocsTitle>
			<DocsDescription>
				Button-first browser gameplay with KAPLAY ASCII grid as the default mode.
			</DocsDescription>
			<DocsBody>
				<section id="quick-start" className="mb-5 space-y-2">
					<h2 className="text-lg font-semibold">Quick start</h2>
					<p className="text-sm text-muted-foreground">
						Each action is one turn. Kael starts on depth 12 and climbs while the dungeon
						simulates around each decision.
					</p>
				</section>

				<section id="gameplay" className="mb-6">
					<PlayTerminalMount />
				</section>

				<section id="references" className="space-y-3">
					<h2 className="text-lg font-semibold">References</h2>
					<Cards className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
						<Card href="/planning/grd" title="GRD" icon={<ScrollText />}>
							Game requirements and systems
						</Card>
						<Card href="/play/reports" title="Reports" icon={<BarChart3 />}>
							Playthrough metrics and analysis
						</Card>
						<Card href="/play/reports/game-value" title="Game Value" icon={<Sparkles />}>
							Concept worth metrics
						</Card>
						<Card href="/play/downloads" title="Downloads" icon={<Download />}>
							Artifacts and report outputs
						</Card>
						<Card href="/play/content" title="Content packs" icon={<FileText />}>
							Pack overview and key counts
						</Card>
						<Card href="/" title="Docs home">
							Return to documentation home
						</Card>
					</Cards>
					<p className="text-xs text-muted-foreground">
						Need the previous React first-person shell? Use the mode switch in the gameplay panel.
					</p>
				</section>
			</DocsBody>
		</DocsPage>
	);
}
