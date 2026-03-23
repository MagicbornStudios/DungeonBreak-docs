import { BarChart3, Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils";

const iconBtn =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background/80 text-muted-foreground transition hover:border-primary/40 hover:bg-accent hover:text-accent-foreground";

export function CoverageReportIcon({
  className,
  href,
}: {
  href: string;
  className?: string;
}) {
  return (
    <a
      className={cn(iconBtn, className)}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      title="Unit coverage HTML report (pnpm review-site:serve if file:// breaks assets)"
    >
      <BarChart3 aria-hidden className="size-4" />
      <span className="sr-only">Open unit coverage HTML report</span>
    </a>
  );
}

export function PlaywrightReportIcon({
  className,
  href,
}: {
  href: string;
  className?: string;
}) {
  return (
    <a
      className={cn(iconBtn, className)}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      title="Playwright HTML report (pnpm review-site:serve if file:// breaks assets)"
    >
      <Clapperboard aria-hidden className="size-4" />
      <span className="sr-only">Open Playwright HTML report</span>
    </a>
  );
}

export function HtmlReportIconPair({
  className,
  coverageHref,
  playwrightHref,
}: {
  coverageHref: string;
  playwrightHref: string;
  className?: string;
}) {
  return (
    <nav
      aria-label="HTML test reports"
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border border-border bg-background/50 p-1 shadow-inner",
        className
      )}
    >
      <CoverageReportIcon href={coverageHref} />
      <PlaywrightReportIcon href={playwrightHref} />
    </nav>
  );
}
