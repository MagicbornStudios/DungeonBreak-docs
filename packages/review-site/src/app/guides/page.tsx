import path from "node:path";
import type * as React from "react";
import { InfoTip } from "@/components/InfoTip";
import { publicAssetHref } from "@/lib/public-asset";
import { repoRoot } from "@/lib/paths";
import { renderMarkdownFile } from "@/lib/render-markdown";

export default async function GuidesPage(): Promise<React.ReactElement> {
  const gameStructurePath = path.join(repoRoot, "GAME_STRUCTURE.md");
  const gameStructureHtml = await renderMarkdownFile(gameStructurePath);

  return (
    <>
      <header className="mb-10 space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Guides</h1>
        <p className="max-w-2xl text-muted-foreground">
          Where the numbers come from, how to refresh them, and long-form
          structure docs from the repo.
        </p>
      </header>

      <section className="mb-10 rounded-xl border-0 bg-card p-6 shadow-lg">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Source of truth</h2>
          <InfoTip>
            These paths are relative to the docs-site package at the time you
            run the build. CI copies the generated JSON into this static folder.
          </InfoTip>
        </div>
        <ul className="list-inside list-disc space-y-2 text-sm text-foreground">
          <li>
            <strong>Unit tests:</strong>{" "}
            <code className="rounded bg-muted px-1 py-0.5">
              test-reports/unit/results.json
            </code>
          </li>
          <li>
            <strong>E2E:</strong>{" "}
            <code className="rounded bg-muted px-1 py-0.5">
              test-reports/e2e/results.json
            </code>{" "}
            (or the Playwright output configured for the review-site project)
          </li>
          <li>
            <strong>Coverage:</strong>{" "}
            <code className="rounded bg-muted px-1 py-0.5">
              test-reports/unit-coverage/
            </code>
          </li>
          <li>
            <strong>Aggregated bundle metadata:</strong>{" "}
            <a
              className="text-primary underline-offset-4 hover:underline"
              href={publicAssetHref("/data.json", "guides")}
            >
              data.json
            </a>{" "}
            in this output folder
          </li>
        </ul>
        <p className="mt-4 text-muted-foreground text-sm">
          <strong className="text-foreground">Vitest JSON:</strong> plain{" "}
          <code className="rounded bg-muted px-0.5">pnpm test:unit</code> no
          longer writes{" "}
          <code className="rounded bg-muted px-0.5">results.json</code> (so
          one-off runs do not clobber the hub). Refresh the snapshot with{" "}
          <code className="rounded bg-muted px-0.5">pnpm test:unit:report</code>{" "}
          from <code className="rounded bg-muted px-0.5">docs-site</code>, then{" "}
          <code className="rounded bg-muted px-0.5">pnpm review-site:build</code>
          . CI already runs that order.
        </p>
      </section>

      <section className="mb-10 rounded-xl border-0 bg-card p-6 shadow-lg">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight">
            Gameplay design (XML)
          </h2>
          <InfoTip>
            Authoritative gameplay design lives in XML under .planning. A copy is
            placed next to this site when the file exists at build time.
          </InfoTip>
        </div>
        <p className="text-muted-foreground text-sm">
          Open the bundled copy (view-source or an XML-aware editor):{" "}
          <a
            className="text-primary underline-offset-4 hover:underline"
            href={publicAssetHref(
              "/references/GAMEPLAY-DESIGN.xml",
              "guides"
            )}
          >
            references/GAMEPLAY-DESIGN.xml
          </a>
        </p>
      </section>

      <section className="rounded-xl border-0 bg-card p-6 shadow-lg">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight">
            GAME_STRUCTURE.md
          </h2>
          <InfoTip>
            Rendered from the repository root at build time. Code fences use
            Shiki via rehype-pretty-code.
          </InfoTip>
        </div>
        <article
          className="prose prose-invert max-w-none prose-headings:scroll-mt-24 prose-pre:border prose-pre:border-border prose-pre:bg-card"
          dangerouslySetInnerHTML={{ __html: gameStructureHtml }}
        />
      </section>
    </>
  );
}
