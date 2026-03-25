"use client";

import {
  CircleCheck,
  CircleX,
  FileCode2,
  ListTree,
  MinusCircle,
  ScrollText,
  SkipForward,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { statusClass } from "@/util/status-class";
import { TestFileCodeView } from "./TestFileCodeView";

export interface SuiteAssertionForPanel {
  name: string;
  status: string;
  durationMs: number | null;
  failureMessages: string[];
  highlightFromLine: number | null | undefined;
  highlightToLine: number | null | undefined;
}

function sortAssertionsFailedFirst(
  assertions: SuiteAssertionForPanel[]
): SuiteAssertionForPanel[] {
  const decorated = assertions.map((a, i) => ({ a, i }));
  decorated.sort((x, y) => {
    const xf = x.a.status === "failed" ? 0 : 1;
    const yf = y.a.status === "failed" ? 0 : 1;
    if (xf !== yf) {
      return xf - yf;
    }
    return x.i - y.i;
  });
  return decorated.map((d) => d.a);
}

function AssertionStatusIcon({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "failed") {
    return (
      <CircleX aria-hidden className="size-3.5 shrink-0 text-destructive" />
    );
  }
  if (s === "passed") {
    return (
      <CircleCheck aria-hidden className="size-3.5 shrink-0 text-success" />
    );
  }
  if (s === "pending" || s === "skipped" || s === "todo") {
    return <SkipForward aria-hidden className="size-3.5 shrink-0 text-warn" />;
  }
  return (
    <MinusCircle
      aria-hidden
      className="size-3.5 shrink-0 text-muted-foreground"
    />
  );
}

type DetailTab = "source" | "failure";

export function SuiteTestFilePanel({
  assertions,
  fileLabel,
  source,
}: {
  fileLabel: string;
  source: string;
  assertions: SuiteAssertionForPanel[];
}) {
  const ordered = useMemo(
    () => sortAssertionsFailedFirst(assertions),
    [assertions]
  );

  const [selected, setSelected] = useState(0);
  const [detailTab, setDetailTab] = useState<DetailTab>("source");

  useEffect(() => {
    const failI = ordered.findIndex((a) => a.status === "failed");
    setSelected(failI >= 0 ? failI : 0);
  }, [ordered]);

  const safeIndex = useMemo(() => {
    if (ordered.length === 0) {
      return 0;
    }
    return Math.min(Math.max(0, selected), ordered.length - 1);
  }, [ordered.length, selected]);

  const current = ordered[safeIndex];
  const hasFailureText = current != null && current.failureMessages.length > 0;

  const select = useCallback((i: number) => {
    setSelected(i);
    setDetailTab("source");
  }, []);

  if (ordered.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 rounded-xl border border-border/60 bg-background/30 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2 font-medium text-foreground text-sm">
        <FileCode2 aria-hidden className="size-4 shrink-0 text-primary" />
        <span>Test file (read-only)</span>
        <code className="max-w-full truncate rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
          {fileLabel}
        </code>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5" role="tablist">
        {ordered.map((a, i) => {
          const active = i === safeIndex;
          return (
            <button
              className={cn(
                "flex max-w-full items-start gap-2 rounded-lg border px-2.5 py-1.5 text-left font-medium text-xs transition",
                active
                  ? "border-primary bg-primary/15 text-foreground shadow-sm"
                  : "border-border/60 bg-card/50 text-muted-foreground hover:border-border hover:bg-card hover:text-foreground"
              )}
              key={`${i}-${a.name}`}
              onClick={() => select(i)}
              role="tab"
              type="button"
            >
              <span className="mt-0.5 flex w-5 shrink-0 justify-center font-semibold text-[10px] text-muted-foreground tabular-nums">
                {i + 1}
              </span>
              <AssertionStatusIcon status={a.status} />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{a.name}</span>
                <span
                  className={cn(
                    "mt-0.5 block font-normal",
                    statusClass(a.status)
                  )}
                >
                  {a.status}
                  {a.durationMs == null
                    ? ""
                    : ` · ${Math.round(a.durationMs)} ms`}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {hasFailureText ? (
        <div
          className="mb-3 flex flex-wrap gap-1 rounded-lg border border-border/50 bg-muted/15 p-0.5"
          role="tablist"
        >
          <button
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-xs transition",
              detailTab === "source"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-card hover:text-foreground"
            )}
            onClick={() => setDetailTab("source")}
            role="tab"
            type="button"
          >
            <ScrollText aria-hidden className="size-3.5 shrink-0" />
            Source
          </button>
          <button
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-xs transition",
              detailTab === "failure"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-card hover:text-foreground"
            )}
            onClick={() => setDetailTab("failure")}
            role="tab"
            type="button"
          >
            <ListTree aria-hidden className="size-3.5 shrink-0" />
            Stack trace
          </button>
        </div>
      ) : null}

      {hasFailureText && detailTab === "failure" ? (
        <pre className="mb-3 max-h-[min(50vh,24rem)] overflow-auto whitespace-pre-wrap rounded-md bg-destructive/10 p-3 text-destructive text-sm">
          {current.failureMessages.join("\n\n")}
        </pre>
      ) : null}

      {(!hasFailureText || detailTab === "source") && (
        <TestFileCodeView
          fileLabel={fileLabel}
          highlightFromLine={current?.highlightFromLine ?? undefined}
          highlightToLine={current?.highlightToLine ?? undefined}
          source={source}
        />
      )}
    </div>
  );
}
