"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ContentPacksResponse = {
  ok: boolean;
  packs?: Record<string, { keys: Record<string, number> }>;
  error?: string;
};

type IngestReport = {
  schemaVersion: string;
  generatedAt: string;
  changed: boolean;
  sourceCount: number;
  sourceFiles: string[];
  summary: {
    featureCount: number;
    modelCount: number;
    contentFeatureCount: number;
    powerFeatureCount: number;
  };
};

export default function DungeonbreakContentAppContentPage() {
  const [data, setData] = useState<ContentPacksResponse | null>(null);
  const [report, setReport] = useState<IngestReport | null>(null);
  useEffect(() => {
    fetch("/api/content-packs")
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setData({ ok: false, error: String(e) }));
    fetch("/reports/content-pack.latest.report.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((next) => setReport(next as IngestReport | null))
      .catch(() => setReport(null));
  }, []);

  return (
    <div className="space-y-4">
      <Card className="bg-card/70">
        <CardHeader><CardTitle>Content Packs</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Runtime pack schemas for actions, rooms, items, dialogue, events, vectors, and model mappings.
            <div className="mt-2">
              <Link href="/play/reports/content-packs" className="text-primary underline">Open detailed pack reports</Link>
            </div>
          <div className="mt-3 rounded border border-border bg-muted/20 p-2 font-mono text-[11px] leading-relaxed">
            <p>Agent inbox: <code>docs-site/content-packs/inbox/*.json</code></p>
            <p>Ingest command: <code>pnpm --dir docs-site run content:ingest</code></p>
            <p>KAPLAY source: <code>docs-site/public/game/content-pack.bundle.v1.json</code></p>
            <p>Optional Dolt tool: set <code>CONTENT_PACK_DOLT_PATH</code> and maintain a <code>content_pack_patches</code> table with JSON payloads to have the ingest loop merge pulls automatically.</p>
          </div>
        </CardContent>
      </Card>
      {report ? (
        <Card className="bg-card/60">
          <CardHeader><CardTitle className="text-sm">Latest Ingest Report</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Generated</span><span>{new Date(report.generatedAt).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Changed</span><span>{report.changed ? "yes" : "no"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Patches</span><span>{report.sourceCount}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Features</span><span>{report.summary.featureCount}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Models</span><span>{report.summary.modelCount}</span></div>
          </CardContent>
        </Card>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Object.entries(data?.packs ?? {}).map(([name, row]) => (
          <Card key={name} className="bg-card/60">
            <CardHeader><CardTitle className="text-sm">{name}</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-xs">
              {Object.entries(row.keys).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-mono">{v}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
      {data && !data.ok ? <p className="text-xs text-rose-300">{data.error ?? "Failed to load packs."}</p> : null}
    </div>
  );
}
