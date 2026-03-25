"use client";

import mermaid from "mermaid";
import { type ReactElement, useEffect, useRef, useState } from "react";

let mermaidInitialized = false;

export function ContentMermaidDiagram({
  title,
  definition,
}: {
  title: string;
  definition: string;
}): ReactElement {
  const hostRef = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!mermaidInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        securityLevel: "loose",
      });
      mermaidInitialized = true;
    }
    const el = hostRef.current;
    if (!el) {
      return;
    }
    el.replaceChildren();
    const id = `mmd-${Math.random().toString(36).slice(2, 11)}`;
    void mermaid.render(id, definition).then(
      ({ svg }) => {
        el.innerHTML = svg;
        setErr(null);
      },
      (e: unknown) => {
        setErr(e instanceof Error ? e.message : String(e));
      }
    );
  }, [definition]);

  return (
    <section className="mb-8 rounded-xl border border-border bg-card/50 p-4 shadow-inner">
      <h3 className="mb-3 font-semibold text-foreground text-lg tracking-tight">
        {title}
      </h3>
      {err ? (
        <pre className="mb-2 overflow-auto rounded border border-destructive/40 bg-destructive/10 p-2 text-destructive text-xs">
          {err}
        </pre>
      ) : null}
      <div
        className="content-graph-mermaid overflow-x-auto text-foreground [&_svg]:max-h-[480px] [&_svg]:max-w-full"
        ref={hostRef}
      />
    </section>
  );
}
