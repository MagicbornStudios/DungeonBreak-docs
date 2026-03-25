import fs from "node:fs";
import path from "node:path";
import type * as React from "react";
import { ContentPackExplorer } from "@/components/ContentPackExplorer";
import { InfoTip } from "@/components/InfoTip";
import { loadContentBundleSummary } from "@/lib/content-bundle-summary";
import { filterExplorerPackKeys } from "@/lib/content-collection-meta";
import { docsSiteRoot } from "@/lib/paths";
import { publicAssetHref } from "@/lib/public-asset";

export default function GameDataPage(): React.ReactElement {
  const summary = loadContentBundleSummary();
  const bundleUrl = publicAssetHref(
    "/game/content-pack.bundle.v1.json",
    "game-data"
  );
  const bundlePath = path.join(
    docsSiteRoot,
    "public",
    "game",
    "content-pack.bundle.v1.json"
  );
  let initialPacks: Record<string, unknown> = {};
  if (fs.existsSync(bundlePath)) {
    const bundle = JSON.parse(fs.readFileSync(bundlePath, "utf8")) as {
      packs?: Record<string, unknown>;
    };
    initialPacks = bundle.packs ?? {};
  }

  return (
    <>
      <header className="mb-8 space-y-3">
        <h1 className="font-semibold text-3xl tracking-tight">
          Game data &amp; schemas
        </h1>
        <div className="flex max-w-2xl flex-wrap items-center gap-2 text-muted-foreground">
          <p>
            Read-only hub for whatever lives under{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">packs</code>{" "}
            in the bundle JSON.
          </p>
          <InfoTip contentClassName="max-w-md text-sm leading-snug">
            Each row is a pipeline slice from{" "}
            <span className="font-mono text-xs">
              content-pack.bundle.v1.json
            </span>
            . Stat catalogs list axes that map to entity maps; gameplay rules
            hold tuning (economy payouts, affinity gain/cap, forge). Per-rune
            affinity <em>values</em> are{" "}
            <span className="font-mono text-xs">runeStats</span> on entities,
            not in <span className="font-mono text-xs">runeAffinity</span>.
          </InfoTip>
        </div>
        <div className="flex max-w-2xl flex-wrap items-center gap-2 text-muted-foreground text-sm">
          <span className="text-foreground">Regenerate the bundle</span>
          <span>when content changes.</span>
          <InfoTip contentClassName="max-w-sm text-xs leading-snug">
            Run{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
              packages/engine/scripts/build-content-pack-bundle.mjs
            </code>{" "}
            (or the kaplay standalone build). See{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
              packages/review-site/CONTENT-BUNDLE-NOTES.md
            </code>
            .
          </InfoTip>
        </div>
      </header>

      <section className="mb-8 rounded-xl border border-border bg-card p-6 shadow-lg">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="font-semibold text-lg tracking-tight">
            Bundle snapshot
          </h2>
          <InfoTip>
            Metadata from the same JSON file loaded in the explorer (build-time
            read + client fetch for the tree).
          </InfoTip>
        </div>
        {summary.ok ? (
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Schema version</dt>
              <dd className="font-mono text-foreground">
                {summary.schemaVersion ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Generated</dt>
              <dd className="font-mono text-foreground">
                {summary.generatedAt ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Engine</dt>
              <dd className="font-mono text-foreground">
                {summary.engineName ?? "—"} @ {summary.engineVersion ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                Model schemas (contentSchema)
              </dt>
              <dd className="font-mono text-foreground">
                {summary.modelSchemaCount ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Content hashes</dt>
              <dd className="font-mono text-foreground">
                {summary.hashKeyCount ?? "—"} keys
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Collections in bundle</dt>
              <dd className="text-foreground">
                {filterExplorerPackKeys(summary.packKeys).length} in hub
                <span className="text-muted-foreground">
                  {" "}
                  ({summary.packKeys.length} keys in JSON)
                </span>
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-destructive text-sm">{summary.error}</p>
        )}
        <p className="mt-6 text-muted-foreground text-sm">
          Raw JSON:{" "}
          <a
            className="text-primary underline-offset-4 hover:underline"
            href={bundleUrl}
          >
            game/content-pack.bundle.v1.json
          </a>
        </p>
        <p className="mt-3 text-muted-foreground text-sm">
          <a
            className="font-medium text-primary underline-offset-4 hover:underline"
            href="../content-graphs/index.html"
          >
            Content graphs (Mermaid)
          </a>
          — quests, events, dialogue clusters, and a used/unused event report
          generated from the bundle.
        </p>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-lg">
        <h2 className="mb-4 font-semibold text-lg tracking-tight">
          Collection explorer
        </h2>
        <ContentPackExplorer
          bundleUrl={bundleUrl}
          initialPackKeys={filterExplorerPackKeys(summary.packKeys)}
          initialPacks={initialPacks}
        />
      </section>
    </>
  );
}
