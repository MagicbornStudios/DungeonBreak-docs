import { Callout } from "fumadocs-ui/components/callout";
import { Card, Cards } from "fumadocs-ui/components/card";
import { PlayTerminalMount } from "@/components/game/play-terminal-mount";
import { BarChart3, BookOpen, Download, FileText, Play, ScrollText, Sparkles } from "lucide-react";

export default function PlayPage() {
  return (
    <main className="play-page">
      <section className="play-page-hero space-y-6">
        <div className="flex items-center gap-3">
          <Play className="size-8 text-primary" />
          <h1 className="text-3xl font-bold">Escape the Dungeon</h1>
        </div>

        <Callout type="info" title="Browser gameplay build">
          One action equals one turn. Kael starts on depth 12 and must climb
          while the dungeon simulates around you.
        </Callout>

        <Callout title="Layout">
          Left: actions. Center: story feed. Right: status and nearby context.
          The game autosaves to your browser.
        </Callout>

        <Callout type="idea" title="MCP & button-first">
          The engine is controllable via MCP (engine-mcp server); the browser
          game uses button-first play.
        </Callout>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <ScrollText className="size-5 text-primary" />
            Game design reference
          </div>
          <Card
            href="/planning/grd"
            title="GRD: Escape the Dungeon"
            description="Game Requirements Document — world, entities, systems, acts"
          />
        </div>

        <Cards className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          <Card href="/" title="Back to docs home" icon={<BookOpen />} />
          <Card href="/play/reports" title="Playthrough reports" icon={<BarChart3 />}>
            Test reports and analysis
          </Card>
          <Card href="/play/reports/game-value" title="Game Value" icon={<Sparkles />}>
            Concept worth metrics
          </Card>
          <Card href="/play/downloads" title="Downloadables" icon={<Download />} />
          <Card href="/play/content" title="Content packs" icon={<FileText />} />
        </Cards>
      </section>
      <PlayTerminalMount />
    </main>
  );
}
