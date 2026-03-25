import fs from "node:fs";
import path from "node:path";
import type * as React from "react";
import { ContentMermaidDiagram } from "@/components/ContentMermaidDiagram";
import { docsSiteRoot } from "@/lib/paths";
import { publicAssetHref } from "@/lib/public-asset";

const GRAPH_DIR = path.join(docsSiteRoot, "public/game/content-graphs");

function readText(name: string): string {
  const p = path.join(GRAPH_DIR, name);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

export default function ContentGraphsPage(): React.ReactElement {
  const quests = readText("content-graph-quests.mmd");
  const events = readText("content-graph-events.mmd");
  const dialogue = readText("content-graph-dialogue-scenes.mmd");
  const reportRaw = readText("content-graph-used-unused.json");
  let unreferencedCount: number | null = null;
  try {
    const parsed = reportRaw
      ? (JSON.parse(reportRaw) as {
          events?: { unreferenced?: string[] };
        })
      : null;
    unreferencedCount = parsed?.events?.unreferenced?.length ?? null;
  } catch {
    unreferencedCount = null;
  }

  const reportHref = publicAssetHref(
    "/game/content-graphs/content-graph-used-unused.json",
    "content-graphs"
  );

  const empty = !quests.trim() && !events.trim() && !dialogue.trim();

  return (
    <>
      <header className="mb-8 space-y-3">
        <p className="text-muted-foreground text-sm">
          <a
            className="text-primary underline-offset-4 hover:underline"
            href="../game-data/index.html"
          >
            ← Game data
          </a>
        </p>
        <h1 className="font-semibold text-3xl tracking-tight">
          Content graphs (Mermaid)
        </h1>
        <p className="max-w-2xl text-muted-foreground text-sm leading-relaxed">
          Static views derived from the same bundle as the explorer. Regenerate
          with{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            node docs-site/scripts/generate-content-graph-mermaid.mjs
          </code>{" "}
          (also runs during docs-site{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            prebuild
          </code>
          ).
        </p>
        {unreferencedCount !== null ? (
          <p className="max-w-2xl text-muted-foreground text-sm">
            Event ids defined in{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">eventPack</code>{" "}
            but not referenced elsewhere under{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">packs</code>{" "}
            (via{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">eventId</code>{" "}
            /{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              onSelectEventIds
            </code>
            ):{" "}
            <span className="font-mono text-foreground">{unreferencedCount}</span>
            .{" "}
            <a
              className="text-primary underline-offset-4 hover:underline"
              href={reportHref}
            >
              content-graph-used-unused.json
            </a>
          </p>
        ) : null}
      </header>

      {empty ? (
        <p className="rounded-lg border border-border bg-card p-6 text-muted-foreground text-sm">
          No graph files found under{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            docs-site/public/game/content-graphs/
          </code>
          . Run the generator after building the content bundle.
        </p>
      ) : (
        <>
          {quests.trim() ? (
            <ContentMermaidDiagram definition={quests} title="Quests" />
          ) : null}
          {events.trim() ? (
            <ContentMermaidDiagram definition={events} title="Events" />
          ) : null}
          {dialogue.trim() ? (
            <ContentMermaidDiagram
              definition={dialogue}
              title="Dialogue scenes"
            />
          ) : null}
        </>
      )}
    </>
  );
}
