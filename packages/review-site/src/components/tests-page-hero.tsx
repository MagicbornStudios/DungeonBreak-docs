import { HtmlReportIconPair } from "./report-html-icons.tsx";

interface Props {
  total: number;
  passed: number;
  failed: number;
  suiteFileCount: number;
  linesPct: number | null;
  coverageAvailable: boolean;
}

export function TestsPageHero({
  total,
  passed,
  failed,
  suiteFileCount,
  linesPct,
  coverageAvailable,
}: Props) {
  return (
    <section className="group relative mb-10 overflow-hidden rounded-2xl border border-purple-500/25 bg-gradient-to-br from-card via-card to-purple-950/20 p-6 shadow-2xl sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-purple-600/10 blur-3xl"
      />
      <div className="relative flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="min-w-0 font-semibold text-3xl text-foreground tracking-tight sm:text-4xl">
            Test Review
          </h1>
          <div className="shrink-0">
            <HtmlReportIconPair
              className="border-border/80 bg-background/70 shadow-md backdrop-blur-sm"
              coverageHref="../reports/unit-coverage/index.html"
              playwrightHref="../reports/e2e/index.html"
            />
          </div>
        </div>

        <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          <div className="rounded-xl border border-border/80 bg-background/50 p-4 shadow-md backdrop-blur-sm">
            <div className="mb-1 text-muted-foreground text-xs uppercase tracking-wide">
              Total
            </div>
            <div className="font-semibold text-2xl text-foreground tabular-nums">
              {total}
            </div>
          </div>
          <div className="rounded-xl border border-border/80 bg-background/50 p-4 shadow-md backdrop-blur-sm">
            <div className="mb-1 text-muted-foreground text-xs uppercase tracking-wide">
              Passed
            </div>
            <div className="font-semibold text-2xl text-success tabular-nums">
              {passed}
            </div>
          </div>
          <div className="rounded-xl border border-border/80 bg-background/50 p-4 shadow-md backdrop-blur-sm">
            <div className="mb-1 text-muted-foreground text-xs uppercase tracking-wide">
              Failed
            </div>
            <div className="font-semibold text-2xl text-destructive tabular-nums">
              {failed}
            </div>
          </div>
          <div
            className="rounded-xl border border-border/80 bg-background/50 p-4 shadow-md backdrop-blur-sm"
            title="Distinct test files in the Vitest JSON snapshot"
          >
            <div className="mb-1 text-muted-foreground text-xs uppercase tracking-wide">
              Files
            </div>
            <div className="font-semibold text-2xl text-foreground tabular-nums">
              {suiteFileCount}
            </div>
          </div>
          <div
            className="col-span-2 rounded-xl border border-border/80 bg-background/50 p-4 shadow-md backdrop-blur-sm sm:col-span-1"
            title="From coverage-summary.json (run test:unit:report with coverage). Scoped to lib/ + selected API paths in Vitest config."
          >
            <div className="mb-1 text-muted-foreground text-xs uppercase tracking-wide">
              Line cov.
            </div>
            <div className="font-semibold text-2xl text-foreground tabular-nums">
              {linesPct == null ? "n/a" : `${linesPct.toFixed(1)}%`}
            </div>
            {!coverageAvailable || linesPct == null ? (
              <p className="mt-1 text-[10px] text-muted-foreground leading-snug">
                Re-run unit report with coverage to populate.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
