"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Callout } from "fumadocs-ui/components/callout";
import { Card, Cards } from "fumadocs-ui/components/card";

type PackInfo = {
  keys: Record<string, number>;
  schema?: string;
};

export default function ContentPage() {
  const [data, setData] = useState<{
    packs: Record<string, PackInfo>;
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
      <main className="mx-auto max-w-4xl p-6">
        <h1 className="mb-4 text-2xl font-bold">Content Packs</h1>
        <Callout type="error" title="Error">{error}</Callout>
        <Link href="/play" className="mt-4 block text-primary underline">
          Back to Play
        </Link>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <h1 className="mb-4 text-2xl font-bold">Content Packs</h1>
        <p className="text-muted-foreground">Loading...</p>
      </main>
    );
  }

  const entries = Object.entries(data.packs).sort(([a], [b]) => a.localeCompare(b));

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Content Packs</h1>
      <Cards className="mb-6 grid-cols-1">
        <Card href="/play" title="← Back to Play" />
      </Cards>
      <Callout type="info" title="Data source" className="mb-6">
        <code>contracts/data/*.json</code> files with key counts. Changelog between versions coming in a future update.
      </Callout>
      <Cards className="grid-cols-1 md:grid-cols-2">
        {entries.map(([file, info]) => (
          <Card key={file} title={file}>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
              {Object.entries(info.keys).map(([key, count]) => (
                <div key={key} className="flex gap-2">
                  <dt className="text-muted-foreground">{key}:</dt>
                  <dd>{count}</dd>
                </div>
              ))}
              {Object.keys(info.keys).length === 0 && (
                <dd className="col-span-2 text-muted-foreground">No keys</dd>
              )}
            </dl>
          </Card>
        ))}
      </Cards>
    </main>
  );
}
