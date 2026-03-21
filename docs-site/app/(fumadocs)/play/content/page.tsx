"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Callout } from "fumadocs-ui/components/callout";
import { Card, Cards } from "fumadocs-ui/components/card";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/page";
import type { ContentPackRegistryEntry } from "@dungeonbreak/engine";

export default function ContentPage() {
  const [data, setData] = useState<{
    packs: ContentPackRegistryEntry[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/content-packs")
      .then((r) => r.json())
      .then((body) => {
        if (!body.ok) {
          setError(body.error ?? "Failed to load content packs");
          return;
        }
        setData({ packs: body.packs });
      })
      .catch((e) => setError(String(e)));
  }, []);

  if (error) {
    return (
      <DocsPage footer={{ enabled: false }} tableOfContent={{ style: "normal", single: false }} toc={[]}>
        <DocsTitle>Content Packs</DocsTitle>
        <DocsDescription>Versioned content-pack metadata for gameplay ingestion.</DocsDescription>
        <DocsBody>
        <Callout type="error" title="Error">{error}</Callout>
        <Link href="/play" className="mt-4 block text-primary underline">
          Back to Play
        </Link>
        </DocsBody>
      </DocsPage>
    );
  }

  if (!data) {
    return (
      <DocsPage footer={{ enabled: false }} tableOfContent={{ style: "normal", single: false }} toc={[]}>
        <DocsTitle>Content Packs</DocsTitle>
        <DocsDescription>Versioned content-pack metadata for gameplay ingestion.</DocsDescription>
        <DocsBody>
          <p className="text-muted-foreground">Loading...</p>
        </DocsBody>
      </DocsPage>
    );
  }

  const entries = [...data.packs].sort((a, b) => a.title.localeCompare(b.title));

  return (
    <DocsPage
      footer={{ enabled: false }}
      tableOfContent={{ style: "normal", single: false }}
      toc={[
        { title: "Overview", url: "#overview", depth: 2 },
        { title: "Pack list", url: "#pack-list", depth: 2 },
      ]}
    >
      <DocsTitle>Content Packs</DocsTitle>
      <DocsDescription>Structured data consumed by KAPLAY now and Unreal later.</DocsDescription>
      <DocsBody>
      <section id="overview">
      <Cards className="mb-6 grid-cols-1">
        <Card href="/play" title="Back to Play" />
      </Cards>
      <Callout type="info" title="Data source" className="mb-6">
        Canonical pack registry exported from <code>@dungeonbreak/engine</code>. This is the source the content app should treat as authoritative.
      </Callout>
      </section>
      <section id="pack-list">
      <Cards className="grid-cols-1 md:grid-cols-2">
        {entries.map((pack) => (
          <Card key={pack.packId} title={pack.title}>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Pack ID:</dt>
                <dd className="font-mono">{pack.packId}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Kind:</dt>
                <dd className="font-mono">{pack.kind}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Export:</dt>
                <dd className="font-mono">{pack.exportName}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Source:</dt>
                <dd className="font-mono">{pack.sourceFile}</dd>
              </div>
              {pack.contentSourcePath ? (
                <div className="flex gap-2 sm:col-span-2">
                  <dt className="text-muted-foreground">Content path:</dt>
                  <dd className="font-mono">{pack.contentSourcePath}</dd>
                </div>
              ) : null}
              {Object.entries(pack.topLevelCounts).map(([key, count]) => (
                <div key={key} className="flex gap-2">
                  <dt className="text-muted-foreground">{key}:</dt>
                  <dd>{count}</dd>
                </div>
              ))}
              {Object.keys(pack.topLevelCounts).length === 0 && (
                <dd className="col-span-2 text-muted-foreground">No top-level collection counts</dd>
              )}
            </dl>
          </Card>
        ))}
      </Cards>
      </section>
      </DocsBody>
    </DocsPage>
  );
}
