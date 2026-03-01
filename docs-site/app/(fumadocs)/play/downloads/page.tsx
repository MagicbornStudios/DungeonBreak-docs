import Link from "next/link";
import { Callout } from "fumadocs-ui/components/callout";
import { Card, Cards } from "fumadocs-ui/components/card";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/page";

const ARTIFACTS = [
  { name: "agent-play-report.json", desc: "Full agent playthrough report" },
  {
    name: "agent-play-report.analysis.json",
    desc: "Replayability, excitement, emergent metrics",
  },
  {
    name: "agent-play-report.events.jsonl",
    desc: "Event stream (JSONL)",
  },
  {
    name: "agent-play-report.events.jsonl.gz",
    desc: "Compressed event stream",
  },
  {
    name: "agent-play-report-jsonl-smoke.json",
    desc: "JSONL smoke test output",
  },
  { name: "pytest-report.html", desc: "Pytest HTML report (if available)" },
] as const;

export default function DownloadsPage() {
  return (
    <DocsPage
      footer={{ enabled: false }}
      tableOfContent={{ style: "normal", single: false }}
      toc={[
        { title: "Regenerate reports", url: "#regenerate-reports", depth: 2 },
        { title: "Artifacts", url: "#artifacts", depth: 2 },
      ]}
    >
      <DocsTitle>Downloadable Reports</DocsTitle>
      <DocsDescription>Build artifacts and report outputs from test runs.</DocsDescription>
      <DocsBody>
      <section id="regenerate-reports">
      <Callout type="info" title="Regenerate reports" className="mb-6">
        Test reports and artifacts from agent playthroughs and CI. Run{" "}
        <code>pnpm --dir packages/engine-mcp run agent:play</code> then{" "}
        <code>pnpm --dir packages/engine-mcp run analyze</code> to regenerate.
      </Callout>
      </section>
      <p className="mb-6">
        <Link href="/play" className="text-primary underline">
          Back to Play
        </Link>
      </p>
      <section id="artifacts">
      <Cards className="grid-cols-1 md:grid-cols-2">
        {ARTIFACTS.map(({ name, desc }) => (
          <a key={name} href={`/api/reports/${name}`} download className="block">
            <Card title={name} description={desc} />
          </a>
        ))}
      </Cards>
      </section>
      </DocsBody>
    </DocsPage>
  );
}
