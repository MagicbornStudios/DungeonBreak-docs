import type * as React from "react";
import { InfoTip } from "@/components/InfoTip";
import { MainAppLinks } from "@/components/MainAppLinks";
import {
  CoverageReportIcon,
  PlaywrightReportIcon,
} from "@/components/report-html-icons";
import { loadContentBundleSummary } from "@/lib/content-bundle-summary";
import { publicAssetHref } from "@/lib/public-asset";
import { loadBuildData } from "@/load-build-data";

export default function OverviewPage(): React.ReactElement {
  const data = loadBuildData();
  const v = data.unit.report;
  const e2e = data.e2e;
  const bundle = loadContentBundleSummary();
  const partial = v.available && (v.suiteFileCount <= 1 || v.total < 8);

  return (
    <>
      <div className="mb-6">
        <MainAppLinks />
      </div>

      {partial ? (
        <div className="mb-6 flex gap-3 rounded-xl border border-warn/50 bg-warn/10 p-4 text-sm">
          <InfoTip>
            Only `pnpm test:unit:report` (from docs-site) refreshes the full
            Vitest JSON used by this site. A plain `vitest run` or a single test
            file no longer overwrites that file — if counts look stale, run the
            report script then `pnpm review-site:build`.
          </InfoTip>
          <div className="text-foreground">
            <strong>Test snapshot looks thin:</strong>{" "}
            <span className="text-muted-foreground">
              {v.suiteFileCount} suite file(s), {v.total} test(s). Regenerate
              with{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                pnpm test:unit:report
              </code>{" "}
              then rebuild this hub.
            </span>
          </div>
        </div>
      ) : null}

      <section className="relative mb-10 overflow-hidden rounded-2xl border border-purple-500/25 bg-gradient-to-br from-card via-card to-purple-950/20 p-6 shadow-2xl sm:p-8 md:p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-purple-600/10 blur-3xl"
        />
        <div className="relative flex flex-col gap-8">
          <div className="min-w-0 space-y-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                DungeonBreak review hub
              </h1>
              <p className="mt-2 max-w-2xl text-muted-foreground text-sm leading-relaxed sm:text-base">
                Static exports: unit coverage, Playwright, bundled content, and
                the standalone game. Use the header to open Tests, Guides, or
                Game data.
              </p>
              <div className="mt-5">
                <a
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 px-8 font-semibold text-base text-white shadow-xl transition hover:from-purple-600 hover:to-indigo-700"
                  href={publicAssetHref("/game/index.html", "overview")}
                >
                  <span aria-hidden className="text-xl">
                    ▶
                  </span>
                  Launch standalone game
                </a>
              </div>
            </div>
            {bundle.ok && (bundle.engineName || bundle.engineVersion) ? (
              <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-sm">
                <span className="font-medium text-foreground">Engine package</span>
                <code className="rounded-lg bg-background/80 px-2 py-1 font-mono text-xs">
                  {bundle.engineName ?? "—"} @ {bundle.engineVersion ?? "—"}
                </code>
                <InfoTip>
                  Read from the same content bundle JSON the game loads (
                  <code className="text-xs">enginePackage</code> field). Not the
                  coverage report.
                </InfoTip>
              </div>
            ) : null}
          </div>

          <div className="grid w-full grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border border-border/80 bg-background/50 p-4 shadow-md backdrop-blur-sm">
              <div className="mb-1 flex items-center justify-between gap-1">
                <span className="text-muted-foreground text-xs uppercase tracking-wide">
                  Unit pass
                </span>
                <InfoTip>Vitest totals from bundled results JSON.</InfoTip>
              </div>
              <p className="font-semibold text-2xl text-foreground tabular-nums">
                {v.passed}/{v.total}
              </p>
            </div>
            <div className="rounded-xl border border-border/80 bg-background/50 p-4 shadow-md backdrop-blur-sm">
              <div className="mb-1 flex items-center justify-between gap-1">
                <span className="text-muted-foreground text-xs uppercase tracking-wide">
                  Suites
                </span>
                <InfoTip>Distinct test files in the snapshot.</InfoTip>
              </div>
              <p className="font-semibold text-2xl text-foreground tabular-nums">
                {v.suiteFileCount}
              </p>
            </div>
            <div className="rounded-xl border border-border/80 bg-background/50 p-4 shadow-md backdrop-blur-sm">
              <div className="mb-1 flex items-center justify-between gap-1">
                <span className="text-muted-foreground text-xs uppercase tracking-wide">
                  Line coverage
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <CoverageReportIcon
                    href={publicAssetHref(
                      "/reports/unit-coverage/index.html",
                      "overview"
                    )}
                  />
                  <InfoTip>
                    Scoped to docs-site Vitest coverage include globs (lib/,
                    selected app/api and report components) — intentionally
                    excludes Next shells and UI. Open the HTML report for
                    per-file detail.
                  </InfoTip>
                </div>
              </div>
              <p className="font-semibold text-2xl text-foreground tabular-nums">
                {data.unit.coverage.linesPct == null
                  ? "n/a"
                  : `${data.unit.coverage.linesPct.toFixed(1)}%`}
              </p>
            </div>
            <div className="rounded-xl border border-border/80 bg-background/50 p-4 shadow-md backdrop-blur-sm">
              <div className="mb-1 flex items-center justify-between gap-1">
                <span className="text-muted-foreground text-xs uppercase tracking-wide">
                  E2E pass
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <PlaywrightReportIcon
                    href={publicAssetHref("/reports/e2e/index.html", "overview")}
                  />
                  <InfoTip>Playwright summary JSON at build time.</InfoTip>
                </div>
              </div>
              <p className="font-semibold text-2xl text-foreground tabular-nums">
                {e2e.passed}/{e2e.total}
              </p>
            </div>
          </div>
        </div>

        <div className="relative mt-8 border-border/60 border-t pt-6">
          <h2 className="mb-3 font-semibold text-foreground text-sm uppercase tracking-wide">
            Artifacts &amp; exports
          </h2>
          <ul className="flex flex-wrap gap-2">
            <li>
              <a
                className="inline-flex items-center rounded-full border border-border bg-background/60 px-3 py-1.5 text-foreground text-xs transition hover:border-primary/50 hover:bg-accent"
                href={publicAssetHref("/game/index.html", "overview")}
              >
                Standalone game
              </a>
            </li>
            <li>
              <a
                className="inline-flex items-center rounded-full border border-border bg-background/60 px-3 py-1.5 text-foreground text-xs transition hover:border-primary/50 hover:bg-accent"
                href={publicAssetHref("/data.json", "overview")}
              >
                data.json
              </a>
            </li>
            <li>
              <a
                className="inline-flex items-center rounded-full border border-border bg-background/60 px-3 py-1.5 text-foreground text-xs transition hover:border-primary/50 hover:bg-accent"
                href={publicAssetHref(
                  "/game/content-pack.bundle.v1.json",
                  "overview"
                )}
              >
                content-pack.bundle.v1.json
              </a>
            </li>
          </ul>
        </div>
      </section>

      {data.manifest.available ? (
        <section className="mb-8 rounded-xl border border-border/60 bg-card/50 p-6 shadow-lg">
          <h2 className="mb-2 font-semibold text-foreground text-lg tracking-tight">
            Build manifest
          </h2>
          <p className="mb-4 text-muted-foreground text-sm">
            <code className="rounded bg-muted px-1 py-0.5 text-foreground">
              {data.manifest.buildVersion ?? "local"}
            </code>{" "}
            · {data.manifest.workflow ?? "—"} ·{" "}
            {data.manifest.generatedAt ?? "—"}
          </p>
          <div className="flex flex-wrap gap-2">
            {data.manifest.results.map((r) => (
              <span
                className="rounded-full bg-secondary px-3 py-1 text-secondary-foreground text-sm"
                key={r.key}
              >
                {r.key}: <strong className="text-foreground">{r.status}</strong>
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
