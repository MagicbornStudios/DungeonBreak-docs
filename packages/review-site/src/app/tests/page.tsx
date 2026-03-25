import type * as React from "react";
import { groupSuitesByCategory } from "@/categories";
import { CategorySectionTitle } from "@/components/category-section-title";
import { InfoTip } from "@/components/InfoTip";
import { PlaywrightReviewBlock } from "@/components/playwright-review-block";
import { SuiteArticleHeading } from "@/components/suite-article-heading";
import { SuiteTestFilePanel } from "@/components/suite-test-file-panel";
import { TestsPageHero } from "@/components/tests-page-hero";
import { attachTestFullSources } from "@/lib/attach-test-full-sources";
import { loadBuildData } from "@/load-build-data";
import { statusClass } from "@/util/status-class";

export default function TestsPage(): React.ReactElement {
  const data = loadBuildData();
  attachTestFullSources(data.unit.report.suites);
  const v = data.unit.report;
  const e2e = data.e2e;
  const partial = v.available && (v.suiteFileCount <= 1 || v.total < 8);
  const groups = groupSuitesByCategory(v.suites);
  const cov = data.unit.coverage;

  return (
    <>
      <section aria-label="Vitest summary">
        <TestsPageHero
          coverageAvailable={cov.available}
          failed={v.failed}
          linesPct={cov.linesPct}
          passed={v.passed}
          suiteFileCount={v.suiteFileCount}
          total={v.total}
        />
      </section>

      {partial ? (
        <div className="mb-6 flex gap-3 rounded-xl border border-warn/40 bg-warn/10 p-4 text-sm">
          <InfoTip>
            This snapshot still looks small (old results.json or an incomplete
            report). Run <code className="text-xs">pnpm test:unit:report</code>{" "}
            then rebuild the hub. Plain{" "}
            <code className="text-xs">vitest run</code> no longer clobbers the
            JSON file.
          </InfoTip>
          <div>
            <strong className="text-foreground">Partial snapshot:</strong>{" "}
            <span className="text-muted-foreground">
              {v.suiteFileCount} file(s), {v.total} test(s).
            </span>
          </div>
        </div>
      ) : null}

      {groups.map(([category, suites]) => (
        <section
          className="mb-8 rounded-xl border-0 bg-card p-6 shadow-lg"
          key={category}
        >
          <CategorySectionTitle category={category} />
          {suites.map((suite, si) => (
            <article
              className="mb-8 border-b border-border/50 pb-8 last:mb-0 last:border-0 last:pb-0"
              key={suite.fileName}
            >
              <SuiteArticleHeading
                baseName={suite.baseName}
                failed={suite.failed}
                fileName={suite.fileName}
                index={si + 1}
                passed={suite.passed}
                pending={suite.pending}
                suiteStatus={suite.status}
              />
              {suite.fullFileSource ? (
                <SuiteTestFilePanel
                  assertions={suite.assertions.map((a) => ({
                    name: a.name,
                    status: a.status,
                    durationMs: a.durationMs,
                    failureMessages: a.failureMessages,
                    highlightFromLine: a.snippetLineStart,
                    highlightToLine: a.snippetLineEnd,
                  }))}
                  fileLabel={suite.fileName}
                  source={suite.fullFileSource}
                />
              ) : (
                suite.assertions.map((a, ai) => (
                  <div
                    className="mb-6 rounded-lg border border-border/40 bg-background/40 p-4 last:mb-0"
                    key={`${suite.fileName}-${a.name}-${ai}`}
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-secondary/80 font-medium text-foreground text-xs tabular-nums">
                        {ai + 1}
                      </span>
                      <span className="font-medium">{a.name}</span>
                      <div className="flex items-center gap-2 text-sm">
                        <span className={statusClass(a.status)}>{a.status}</span>
                        <span className="text-muted-foreground">
                          {a.durationMs == null
                            ? ""
                            : `${Math.round(a.durationMs)} ms`}
                        </span>
                      </div>
                    </div>
                    {a.failureMessages.length > 0 ? (
                      <pre className="mb-3 overflow-x-auto rounded-md bg-destructive/10 p-3 text-sm text-destructive whitespace-pre-wrap">
                        {a.failureMessages.join("\n\n")}
                      </pre>
                    ) : null}
                    {a.snippet ? (
                      <details className="group mt-3">
                        <summary className="cursor-pointer text-sm font-medium text-primary">
                          Test snippet (source file not resolved)
                        </summary>
                        <pre className="mt-2 overflow-x-auto rounded-md border border-border bg-muted/30 p-3 font-mono text-xs leading-relaxed">
                          {a.snippet}
                        </pre>
                      </details>
                    ) : null}
                  </div>
                ))
              )}
            </article>
          ))}
        </section>
      ))}

      <section className="mb-8 rounded-xl border-0 bg-card p-6 shadow-lg">
        <div className="mb-3">
          <InfoTip>
            Spec rows come from <code className="text-xs">e2e/results.json</code>{" "}
            (or the review-site Playwright project) at build time. Failed and
            flaky specs are listed first.
          </InfoTip>
        </div>
        <PlaywrightReviewBlock
          durationMs={e2e.durationMs}
          specs={e2e.specs}
        />
      </section>

      {data.manifest.available ? (
        <section className="rounded-xl border-0 bg-card p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold tracking-tight">
            Build manifest
          </h2>
          <div className="flex flex-wrap gap-2">
            {data.manifest.results.map((r) => (
              <span
                className="rounded-full bg-secondary px-3 py-1 text-secondary-foreground text-sm"
                key={r.key}
              >
                {r.key}: {r.status}
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
