import type { LucideIcon } from "lucide-react";
import { CircleCheck, CircleX, MinusCircle } from "lucide-react";
import { statusClass } from "@/util/status-class";

function suiteVisualState(
  failed: number,
  passed: number
): { Icon: LucideIcon; iconClass: string } {
  if (failed > 0) {
    return { Icon: CircleX, iconClass: "text-destructive" };
  }
  if (passed > 0 && failed === 0) {
    return { Icon: CircleCheck, iconClass: "text-success" };
  }
  return { Icon: MinusCircle, iconClass: "text-warn" };
}

export function SuiteArticleHeading({
  baseName,
  failed,
  fileName,
  index,
  passed,
  pending,
  suiteStatus,
}: {
  index: number;
  baseName: string;
  fileName: string;
  failed: number;
  passed: number;
  pending: number;
  suiteStatus: string;
}) {
  const { Icon, iconClass } = suiteVisualState(failed, passed);

  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-border/40 border-b pb-3">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary/80 font-semibold text-foreground text-sm tabular-nums"
          title={`Suite #${index} in this section`}
        >
          {index}
        </span>
        <Icon aria-hidden className={`mt-1 size-5 shrink-0 ${iconClass}`} />
        <div className="min-w-0">
          <strong className="text-base">{baseName}</strong>{" "}
          <span className="text-muted-foreground text-sm">
            <code className="text-xs">{fileName}</code>
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className={statusClass(suiteStatus)}>{suiteStatus}</span>
        <span className="text-muted-foreground">
          {passed} ok · {failed} fail · {pending} skip
        </span>
      </div>
    </div>
  );
}
