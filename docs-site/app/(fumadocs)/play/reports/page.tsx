"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Callout } from "fumadocs-ui/components/callout";
import { Card, Cards } from "fumadocs-ui/components/card";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/page";
import { BarChart3, Download, FileText, Globe, Sparkles } from "lucide-react";
import { runPlaythrough, type BrowserReport } from "@/lib/playthrough-runner";
import { analyzeReport } from "@/lib/playthrough-analyzer";

const GENERATED_REPORT_KEY = "dungeonbreak-browser-report";

type ReportSummary = {
  seed?: number;
  turnsRequested?: number;
  actionCoverage?: { expected: string[]; covered: string[]; missing: string[] };
  run?: {
    turnsPlayed?: number;
    actionTrace?: Array<{ playerTurn: number; action: { actionType: string } }>;
  };
};

const REPORTS_TOC = [
  { title: "Report links", url: "#report-links", depth: 2 },
  { title: "Status", url: "#status", depth: 2 },
];

export default function ReportsPage() {
  const [hasReport, setHasReport] = useState(false);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    fetch("/api/play-reports")
      .then((r) => r.json())
      .then((body) => {
        setFetched(true);
        if (body.ok) {
          setHasReport(true);
          return;
        }
        try {
          const stored = sessionStorage.getItem(GENERATED_REPORT_KEY);
          setHasReport(!!stored);
        } catch {
          // ignore
        }
      })
      .catch(() => {
        setFetched(true);
        try {
          const stored = sessionStorage.getItem(GENERATED_REPORT_KEY);
          setHasReport(!!stored);
        } catch {
          // ignore
        }
      });
  }, []);

  const generateReport = useCallback(() => {
    try {
      const report = runPlaythrough(undefined, 75) as BrowserReport;
      const analysis = analyzeReport(report);
      sessionStorage.setItem(GENERATED_REPORT_KEY, JSON.stringify({ report, analysis }));
      setHasReport(true);
      window.location.href = "/play/reports/game-value";
    } catch {
      // stay on page
    }
  }, []);

  return (
    <DocsPage
      footer={{ enabled: false }}
      tableOfContent={{ style: "normal", single: false }}
      toc={REPORTS_TOC}
    >
      <DocsTitle className="flex items-center gap-2">
        <BarChart3 className="size-6 text-primary" />
        Playthrough Reports
      </DocsTitle>
      <DocsDescription>
        Test reports and artifacts from agent playthroughs.
      </DocsDescription>
      <DocsBody>
      <section id="report-links">
        <h2 className="sr-only">Report links</h2>

      <Cards className="mb-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <Card href="/play/reports/game-value" title="Game Value" icon={<Sparkles />}>
          Analyze spaces and playthroughs to derive concept worth
        </Card>
        <Card href="/play" title="← Back to Play" />
        <Card href="/play/downloads" title="Downloadables" icon={<Download />} />
        <Card href="/play/reports/spaces" title="Space Explorer" icon={<Globe />} />
        <Card href="/play/reports/content-packs" title="Content Pack Reports" icon={<FileText />} />
        <Card href="/docs/formulas" title="Formulas" icon={<FileText />} />
      </Cards>
      </section>

      <section id="status">
        <h2 className="sr-only">Status</h2>
      {!fetched ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : hasReport ? (
        <Callout type="success" title="Report available">
          <Link href="/play/reports/game-value" className="font-medium underline">
            Open Game Value →
          </Link>{" "}
          to analyze playthrough metrics, action policies, and content spaces.
        </Callout>
      ) : (
        <>
          <Callout type="info" title="No report found">
            Run <code>pnpm --dir packages/engine-mcp run agent:play</code> then{" "}
            <code>pnpm --dir packages/engine-mcp run analyze</code> to persist reports, or generate one in the browser.
          </Callout>
          <button
            type="button"
            onClick={generateReport}
            className="mt-4 rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          >
            Generate report in browser
          </button>
        </>
      )}
      </section>
      </DocsBody>
    </DocsPage>
  );
}
