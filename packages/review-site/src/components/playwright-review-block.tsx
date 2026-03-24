import type { ParsedPlaywrightSpec } from "@docs/lib/review-site-data";
import {
  AlertTriangle,
  CircleCheck,
  CircleX,
  Clapperboard,
  MinusCircle,
} from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { statusClass } from "@/util/status-class";

const PATH_SPLIT = /[/\\]/;

function baseFile(file: string): string {
  return file.split(PATH_SPLIT).pop() ?? file;
}

function specOrder(s: ParsedPlaywrightSpec): number {
  switch (s.status) {
    case "failed":
      return 0;
    case "flaky":
      return 1;
    case "skipped":
      return 2;
    default:
      return 3;
  }
}

function SpecStatusIcon({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "failed") {
    return <CircleX aria-hidden className="size-4 shrink-0 text-destructive" />;
  }
  if (s === "passed") {
    return <CircleCheck aria-hidden className="size-4 shrink-0 text-success" />;
  }
  if (s === "flaky") {
    return <AlertTriangle aria-hidden className="size-4 shrink-0 text-warn" />;
  }
  return (
    <MinusCircle
      aria-hidden
      className="size-4 shrink-0 text-muted-foreground"
    />
  );
}

export function PlaywrightReviewBlock({
  durationMs,
  specs,
}: {
  durationMs: number | null;
  specs: ParsedPlaywrightSpec[];
}) {
  const sorted = useMemo(
    () =>
      [...specs].sort((a, b) => {
        const d = specOrder(a) - specOrder(b);
        if (d !== 0) {
          return d;
        }
        return a.title.localeCompare(b.title);
      }),
    [specs]
  );

  return (
    <>
      <h2 className="mb-4 flex items-center gap-2 font-semibold text-foreground text-lg tracking-tight">
        <Clapperboard aria-hidden className="size-5 shrink-0 text-primary" />
        Playwright (E2E)
      </h2>
      <p className="mb-4 text-muted-foreground text-sm">
        Duration {durationMs == null ? "n/a" : `${Math.round(durationMs)} ms`} ·{" "}
        {specs.length} spec(s)
      </p>
      <div className="space-y-2">
        {sorted.map((spec, i) => (
          <div
            className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-card/50 px-3 py-2 text-sm"
            key={`${spec.file}::${spec.title}`}
          >
            <span className="flex w-7 shrink-0 justify-center font-medium text-muted-foreground text-xs tabular-nums">
              {i + 1}
            </span>
            <SpecStatusIcon status={spec.status} />
            <span className="min-w-0 flex-1 font-medium">{spec.title}</span>
            <span className="text-muted-foreground">{baseFile(spec.file)}</span>
            <span className={cn("shrink-0", statusClass(spec.status))}>
              {spec.status}
            </span>
            <span className="text-muted-foreground">
              {spec.durationMs == null
                ? ""
                : `${Math.round(spec.durationMs)} ms`}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
