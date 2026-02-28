"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
        <p className="text-amber-500">{error}</p>
        <p className="mt-4">
          <Link href="/play" className="text-primary underline">
            Back to Play
          </Link>
        </p>
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

  const entries = Object.entries(data.packs).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Content Packs</h1>
      <p className="mb-6">
        <Link href="/play" className="text-primary underline">
          ← Back to Play
        </Link>
      </p>
      <p className="mb-6 text-muted-foreground">
        <code>contracts/data/*.json</code> files with key counts. Changelog between versions coming in a future update.
      </p>
      <div className="space-y-4">
        {entries.map(([file, info]) => (
          <section
            key={file}
            className="rounded border p-4"
          >
            <h2 className="mb-2 font-mono font-semibold">{file}</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
              {Object.entries(info.keys).map(([key, count]) => (
                <div key={key} className="flex gap-2">
                  <dt className="text-muted-foreground">{key}:</dt>
                  <dd>{count}</dd>
                </div>
              ))}
              {Object.keys(info.keys).length === 0 && (
                <dd className="text-muted-foreground">No keys</dd>
              )}
            </dl>
          </section>
        ))}
      </div>
    </main>
  );
}
