import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import {
  type ParsedPlaywrightReport,
  type ReviewManifest,
  type ReviewSiteData,
  loadReviewSiteData,
} from "@/lib/review-site-data";
import {
  type ParsedVitestSuite,
  type TestReviewCategory,
} from "@/lib/test-report-review";

export type StaticReviewSiteOptions = {
  outputDir: string;
  reportRoot: string;
  publicGameDir: string;
};

const categoryLabels: Record<TestReviewCategory, string> = {
  "asset-explorer": "Asset Explorer",
  "game-runtime": "Game Runtime",
  "schema-data-codegen": "Schemas, Data, Codegen",
  "assistant-mcp": "Assistant / MCP",
  other: "Other",
};

const reviewSiteCss = `
:root {
  color-scheme: dark;
  --bg: #09090b;
  --panel: rgba(24, 24, 27, 0.92);
  --panel-2: rgba(39, 39, 42, 0.88);
  --card: rgba(255, 255, 255, 0.04);
  --border: rgba(255, 255, 255, 0.12);
  --text: #fafafa;
  --muted: #a1a1aa;
  --primary: #8b5cf6;
  --primary-2: #6366f1;
  --success: #22c55e;
  --danger: #f43f5e;
  --warning: #f59e0b;
  --shadow: 0 16px 48px rgba(0, 0, 0, 0.28);
  --radius: 18px;
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background:
    radial-gradient(circle at top, rgba(139, 92, 246, 0.22), transparent 32%),
    linear-gradient(180deg, #09090b 0%, #111827 100%);
  color: var(--text);
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

a {
  color: inherit;
  text-decoration: none;
}

code {
  font-family:
    "IBM Plex Mono",
    ui-monospace,
    SFMono-Regular,
    Menlo,
    Monaco,
    Consolas,
    "Liberation Mono",
    monospace;
  font-size: 0.92em;
}

.shell {
  width: min(1200px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 24px 0 64px;
}

.hero {
  background: linear-gradient(135deg, rgba(91, 33, 182, 0.9), rgba(99, 102, 241, 0.85));
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 28px;
  box-shadow: var(--shadow);
  padding: 28px;
  overflow: hidden;
  position: relative;
}

.hero::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 90% 20%, rgba(255, 255, 255, 0.22), transparent 22%),
    radial-gradient(circle at 10% 80%, rgba(255, 255, 255, 0.08), transparent 30%);
  pointer-events: none;
}

.hero h1 {
  margin: 0;
  font-size: clamp(2rem, 5vw, 3.4rem);
  line-height: 1.02;
}

.hero p {
  max-width: 72ch;
  color: rgba(255, 255, 255, 0.8);
  margin: 12px 0 0;
  line-height: 1.6;
}

.hero-grid,
.metrics,
.two-up,
.summary-grid {
  display: grid;
  gap: 16px;
}

.hero-grid {
  margin-top: 22px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.summary-grid,
.metrics {
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.two-up {
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
  margin-top: 18px;
}

.card,
.metric,
.surface {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.card,
.surface {
  padding: 18px;
}

.metric {
  padding: 16px;
  background: var(--card);
}

.metric-label,
.eyebrow,
.chip {
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}

.metric-value {
  margin-top: 6px;
  font-size: 1.75rem;
  font-weight: 700;
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 18px;
}

.button,
.button-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 16px;
  border-radius: 999px;
  font-weight: 600;
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
}

.button {
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  color: white;
  box-shadow: 0 14px 36px rgba(99, 102, 241, 0.34);
}

.button-secondary {
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text);
}

.button:hover,
.button-secondary:hover {
  transform: translateY(-1px);
}

.section-title {
  margin: 0;
  font-size: 1.2rem;
}

.section-copy,
.muted {
  color: var(--muted);
  line-height: 1.6;
}

.status-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.84rem;
  border-radius: 999px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border);
}

.tone-pass { color: #86efac; }
.tone-fail { color: #fda4af; }
.tone-warn { color: #fcd34d; }
.tone-muted { color: var(--muted); }

.suite-list {
  display: grid;
  gap: 14px;
  margin-top: 14px;
}

.suite-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
}

.assertion-list {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.assertion {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px;
}

.pre {
  white-space: pre-wrap;
  overflow-x: auto;
  border-radius: 12px;
  padding: 12px;
  background: rgba(127, 29, 29, 0.28);
  border: 1px solid rgba(244, 63, 94, 0.28);
  color: #fecdd3;
  font-size: 0.76rem;
}

.list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.list-item {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.footer {
  margin-top: 18px;
  font-size: 0.8rem;
  color: var(--muted);
}

@media (max-width: 900px) {
  .two-up {
    grid-template-columns: 1fr;
  }
}
`;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatPct(value: number | null): string {
  return value === null ? "n/a" : `${value.toFixed(1)}%`;
}

function formatDuration(value: number | null): string {
  return value === null ? "n/a" : `${Math.round(value)} ms`;
}

function statusTone(status: string): string {
  const lower = status.toLowerCase();
  if (["pass", "passed", "ok", "success"].includes(lower)) {
    return "tone-pass";
  }
  if (["fail", "failed", "error"].includes(lower)) {
    return "tone-fail";
  }
  if (["warn", "warning", "skipped", "pending", "todo"].includes(lower)) {
    return "tone-warn";
  }
  return "tone-muted";
}

function groupSuitesByCategory(
  suites: ParsedVitestSuite[]
): Array<[TestReviewCategory, ParsedVitestSuite[]]> {
  const groups = new Map<TestReviewCategory, ParsedVitestSuite[]>();
  for (const suite of suites) {
    const current = groups.get(suite.category) ?? [];
    current.push(suite);
    groups.set(suite.category, current);
  }
  return [...groups.entries()].sort((left, right) =>
    categoryLabels[left[0]].localeCompare(categoryLabels[right[0]])
  );
}

function copyDirIfExists(sourceDir: string, targetDir: string): void {
  if (!existsSync(sourceDir)) {
    return;
  }
  mkdirSync(path.dirname(targetDir), { recursive: true });
  cpSync(sourceDir, targetDir, { recursive: true, force: true });
}

function copyFileIfExists(sourcePath: string, targetPath: string): void {
  if (!existsSync(sourcePath)) {
    return;
  }
  mkdirSync(path.dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, readFileSync(sourcePath));
}

function renderManifestSummary(manifest: ReviewManifest): string {
  if (!manifest.available) {
    return `<div class="muted">No test manifest found yet.</div>`;
  }
  const results = manifest.results
    .map(
      (entry) =>
        `<div class="status-pill ${statusTone(entry.status)}"><span>${escapeHtml(
          entry.key
        )}</span><strong>${escapeHtml(entry.status)}</strong></div>`
    )
    .join("");

  return `
    <div class="stack">
      <div class="row">
        <div>
          <div class="eyebrow">Workflow</div>
          <div>${escapeHtml(manifest.workflow ?? "unknown")}</div>
        </div>
        <div>
          <div class="eyebrow">Build Version</div>
          <div><code>${escapeHtml(manifest.buildVersion ?? "local")}</code></div>
        </div>
        <div>
          <div class="eyebrow">Generated</div>
          <div>${escapeHtml(manifest.generatedAt ?? "unknown")}</div>
        </div>
      </div>
      <div class="status-grid">${results}</div>
    </div>
  `;
}

function renderE2ESpecs(report: ParsedPlaywrightReport): string {
  if (!report.available) {
    return `<div class="muted">No Playwright report found yet.</div>`;
  }

  const topSpecs = report.specs.slice(0, 12);
  return `
    <ul class="list">
      ${topSpecs
        .map(
          (spec) => `
            <li class="list-item">
              <div>
                <div>${escapeHtml(spec.title)}</div>
                <div class="muted">${escapeHtml(
                  spec.file.split(/[/\\\\]/).pop() ?? spec.file
                )}</div>
              </div>
              <div class="row">
                <span class="${statusTone(spec.status)}">${escapeHtml(spec.status)}</span>
                <span class="muted">${escapeHtml(formatDuration(spec.durationMs))}</span>
              </div>
            </li>
          `
        )
        .join("")}
    </ul>
  `;
}

function renderTestsPage(data: ReviewSiteData): string {
  const suiteGroups = groupSuitesByCategory(data.unit.report.suites);
  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>DungeonBreak Test Review</title>
    <link rel="stylesheet" href="../assets/review-site.css" />
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <div class="eyebrow">DungeonBreak</div>
        <h1>Test Review</h1>
        <p>Latest unit, coverage, and browser end-to-end output, packaged into a static review surface for GitHub Pages.</p>
        <div class="actions">
          <a class="button" href="../game/index.html">Launch Standalone Game</a>
          <a class="button-secondary" href="../index.html">Back to Overview</a>
          <a class="button-secondary" href="../reports/unit-coverage/index.html">Coverage HTML</a>
          <a class="button-secondary" href="../reports/e2e/index.html">Playwright HTML</a>
        </div>
      </section>

      <section class="card" style="margin-top: 18px;">
        <h2 class="section-title">Build Status</h2>
        <p class="section-copy">This page is generated from the same CI artifacts used to gate the browser game and content-authoring flow.</p>
        ${renderManifestSummary(data.manifest)}
      </section>

      <section class="two-up">
        <div class="surface stack">
          <div>
            <div class="eyebrow">Unit</div>
            <h2 class="section-title">Vitest Summary</h2>
          </div>
          <div class="metrics">
            <div class="metric"><div class="metric-label">Total Tests</div><div class="metric-value">${escapeHtml(String(data.unit.report.total))}</div></div>
            <div class="metric"><div class="metric-label">Passed</div><div class="metric-value">${escapeHtml(String(data.unit.report.passed))}</div></div>
            <div class="metric"><div class="metric-label">Failed</div><div class="metric-value">${escapeHtml(String(data.unit.report.failed))}</div></div>
            <div class="metric"><div class="metric-label">Pending</div><div class="metric-value">${escapeHtml(String(data.unit.report.pending))}</div></div>
          </div>
          <div class="metrics">
            <div class="metric"><div class="metric-label">Lines</div><div class="metric-value">${escapeHtml(formatPct(data.unit.coverage.linesPct))}</div></div>
            <div class="metric"><div class="metric-label">Statements</div><div class="metric-value">${escapeHtml(formatPct(data.unit.coverage.statementsPct))}</div></div>
            <div class="metric"><div class="metric-label">Functions</div><div class="metric-value">${escapeHtml(formatPct(data.unit.coverage.functionsPct))}</div></div>
            <div class="metric"><div class="metric-label">Branches</div><div class="metric-value">${escapeHtml(formatPct(data.unit.coverage.branchesPct))}</div></div>
          </div>
        </div>
        <div class="surface stack">
          <div>
            <div class="eyebrow">Browser</div>
            <h2 class="section-title">Playwright Summary</h2>
          </div>
          <div class="metrics">
            <div class="metric"><div class="metric-label">Specs</div><div class="metric-value">${escapeHtml(String(data.e2e.total))}</div></div>
            <div class="metric"><div class="metric-label">Passed</div><div class="metric-value">${escapeHtml(String(data.e2e.passed))}</div></div>
            <div class="metric"><div class="metric-label">Failed</div><div class="metric-value">${escapeHtml(String(data.e2e.failed))}</div></div>
            <div class="metric"><div class="metric-label">Skipped / Flaky</div><div class="metric-value">${escapeHtml(String(data.e2e.skipped + data.e2e.flaky))}</div></div>
          </div>
          <div class="muted">Duration: ${escapeHtml(formatDuration(data.e2e.durationMs))}</div>
          ${renderE2ESpecs(data.e2e)}
        </div>
      </section>

      ${suiteGroups
        .map(
          ([category, suites]) => `
            <section class="card" style="margin-top: 18px;">
              <div class="eyebrow">Unit Suites</div>
              <h2 class="section-title">${escapeHtml(categoryLabels[category])}</h2>
              <div class="suite-list">
                ${suites
                  .map(
                    (suite) => `
                      <article class="suite-card">
                        <div class="row">
                          <div>
                            <div><strong>${escapeHtml(suite.baseName)}</strong></div>
                            <div class="muted"><code>${escapeHtml(suite.fileName)}</code></div>
                          </div>
                          <div class="row">
                            <span class="${statusTone(suite.status)}">${escapeHtml(suite.status)}</span>
                            <span class="muted">${escapeHtml(
                              `${suite.passed} passed / ${suite.failed} failed / ${suite.pending} pending`
                            )}</span>
                            <span class="muted">${escapeHtml(
                              formatDuration(suite.durationMs)
                            )}</span>
                          </div>
                        </div>
                        <div class="assertion-list">
                          ${suite.assertions
                            .map(
                              (assertion) => `
                                <div class="assertion">
                                  <div class="row">
                                    <div>${escapeHtml(assertion.name)}</div>
                                    <div class="row">
                                      <span class="${statusTone(assertion.status)}">${escapeHtml(
                                        assertion.status
                                      )}</span>
                                      <span class="muted">${escapeHtml(
                                        formatDuration(assertion.durationMs)
                                      )}</span>
                                    </div>
                                  </div>
                                  ${
                                    assertion.failureMessages.length > 0
                                      ? `<pre class="pre">${escapeHtml(
                                          assertion.failureMessages.join("\n\n")
                                        )}</pre>`
                                      : ""
                                  }
                                </div>
                              `
                            )
                            .join("")}
                        </div>
                      </article>
                    `
                  )
                  .join("")}
              </div>
            </section>
          `
        )
        .join("")}
      <div class="footer">Static review site generated from repository artifacts.</div>
    </main>
  </body>
</html>
  `.trim();
}

function renderOverviewPage(data: ReviewSiteData): string {
  const manifestVersion = data.manifest.buildVersion ?? "local";
  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>DungeonBreak Game and Test Review</title>
    <link rel="stylesheet" href="./assets/review-site.css" />
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <div class="eyebrow">DungeonBreak Review Host</div>
        <h1>Latest game and test surface</h1>
        <p>This static host is built per main-branch commit so the latest standalone game, coverage, browser results, and report summaries stay reviewable without opening local tooling first.</p>
        <div class="actions">
          <a class="button" href="./game/index.html">Launch Standalone Game</a>
          <a class="button-secondary" href="./tests/index.html">Open Test Review</a>
          <a class="button-secondary" href="./reports/unit-coverage/index.html">Coverage HTML</a>
          <a class="button-secondary" href="./reports/e2e/index.html">Playwright HTML</a>
        </div>
      </section>

      <section class="summary-grid" style="margin-top: 18px;">
        <div class="metric">
          <div class="metric-label">Build Version</div>
          <div class="metric-value"><code>${escapeHtml(manifestVersion)}</code></div>
        </div>
        <div class="metric">
          <div class="metric-label">Unit Tests</div>
          <div class="metric-value">${escapeHtml(String(data.unit.report.passed))}<span class="muted"> / ${escapeHtml(String(data.unit.report.total))}</span></div>
        </div>
        <div class="metric">
          <div class="metric-label">Coverage</div>
          <div class="metric-value">${escapeHtml(formatPct(data.unit.coverage.linesPct))}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Playwright</div>
          <div class="metric-value">${escapeHtml(String(data.e2e.passed))}<span class="muted"> / ${escapeHtml(String(data.e2e.total))}</span></div>
        </div>
      </section>

      <section class="two-up">
        <div class="surface stack">
          <div class="eyebrow">Status</div>
          <h2 class="section-title">Latest CI Summary</h2>
          ${renderManifestSummary(data.manifest)}
        </div>
        <div class="surface stack">
          <div class="eyebrow">What is published</div>
          <h2 class="section-title">Review flow</h2>
          <ul class="list">
            <li class="list-item"><span>Standalone KAPLAY build</span><a class="button-secondary" href="./game/index.html">Open</a></li>
            <li class="list-item"><span>Unit + coverage review</span><a class="button-secondary" href="./tests/index.html">Open</a></li>
            <li class="list-item"><span>Coverage HTML artifact</span><a class="button-secondary" href="./reports/unit-coverage/index.html">Open</a></li>
            <li class="list-item"><span>Playwright HTML artifact</span><a class="button-secondary" href="./reports/e2e/index.html">Open</a></li>
          </ul>
        </div>
      </section>
      <div class="footer">Published as a static bundle suitable for GitHub Pages.</div>
    </main>
  </body>
</html>
  `.trim();
}

export function buildStaticReviewSite(
  options: StaticReviewSiteOptions
): ReviewSiteData {
  const data = loadReviewSiteData(options.reportRoot);
  const outputDir = path.resolve(options.outputDir);

  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(path.resolve(outputDir, "assets"), { recursive: true });
  mkdirSync(path.resolve(outputDir, "tests"), { recursive: true });
  mkdirSync(path.resolve(outputDir, "reports"), { recursive: true });

  writeFileSync(
    path.resolve(outputDir, "assets", "review-site.css"),
    `${reviewSiteCss.trim()}\n`
  );
  writeFileSync(
    path.resolve(outputDir, "index.html"),
    `${renderOverviewPage(data)}\n`
  );
  writeFileSync(
    path.resolve(outputDir, "404.html"),
    `${renderOverviewPage(data)}\n`
  );
  writeFileSync(
    path.resolve(outputDir, "tests", "index.html"),
    `${renderTestsPage(data)}\n`
  );
  writeFileSync(
    path.resolve(outputDir, "data.json"),
    `${JSON.stringify(data, null, 2)}\n`
  );

  copyDirIfExists(
    path.resolve(options.reportRoot, "unit-coverage"),
    path.resolve(outputDir, "reports", "unit-coverage")
  );
  copyDirIfExists(
    path.resolve(options.reportRoot, "e2e", "html"),
    path.resolve(outputDir, "reports", "e2e")
  );
  copyDirIfExists(options.publicGameDir, path.resolve(outputDir, "game"));

  copyFileIfExists(
    path.resolve(options.reportRoot, "unit", "results.json"),
    path.resolve(outputDir, "reports", "unit-results.json")
  );
  copyFileIfExists(
    path.resolve(options.reportRoot, "e2e", "results.json"),
    path.resolve(outputDir, "reports", "e2e-results.json")
  );
  copyFileIfExists(
    path.resolve(options.reportRoot, "vector-usage-report.json"),
    path.resolve(outputDir, "reports", "vector-usage-report.json")
  );
  copyFileIfExists(
    path.resolve(options.reportRoot, "balance-sim-report.json"),
    path.resolve(outputDir, "reports", "balance-sim-report.json")
  );

  return data;
}
