"use client";

import type { ReactNode } from "react";
import { ContentPackEntryThumb } from "@/components/content-pack-thumbnail";

export type StatMapChipVariant =
  | "narrative-anchor"
  | "narrative-effect"
  | "narrative-neutral"
  | "combat"
  | "skill"
  | "rune";

function formatSignedStatNumber(num: number): string {
  if (num === 0) {
    return "0";
  }
  if (num > 0) {
    return `+${num}`;
  }
  return String(num);
}

const VARIANT_STYLES: Record<
  StatMapChipVariant,
  { strong: string; muted: string }
> = {
  "narrative-anchor": {
    strong: "border-indigo-500/35 bg-indigo-500/10 text-foreground",
    muted: "border-border/40 bg-muted/15 text-muted-foreground",
  },
  "narrative-effect": {
    strong: "border-primary/35 bg-primary/10 text-foreground",
    muted: "border-border/40 bg-muted/15 text-muted-foreground",
  },
  "narrative-neutral": {
    strong: "border-violet-500/30 bg-violet-500/10 text-foreground",
    muted: "border-border/40 bg-muted/15 text-muted-foreground",
  },
  combat: {
    strong: "border-orange-500/35 bg-orange-500/10 text-foreground",
    muted: "border-border/40 bg-muted/15 text-muted-foreground",
  },
  skill: {
    strong: "border-emerald-500/35 bg-emerald-500/10 text-foreground",
    muted: "border-border/40 bg-muted/15 text-muted-foreground",
  },
  rune: {
    strong: "border-fuchsia-500/35 bg-fuchsia-500/10 text-foreground",
    muted: "border-border/40 bg-muted/15 text-muted-foreground",
  },
};

export type StatMapResolve = (entityKey: string) => {
  label: string;
  iconSpriteUrl?: string;
};

interface StatMapChipsProps {
  title: string;
  value: Record<string, number>;
  variant: StatMapChipVariant;
  resolve: StatMapResolve;
}

export function StatMapChips({
  title,
  value,
  variant,
  resolve,
}: StatMapChipsProps): ReactNode {
  const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) {
    return <span className="text-muted-foreground text-xs">Empty map</span>;
  }
  const styles = VARIANT_STYLES[variant];
  return (
    <div className="flex flex-col gap-2">
      <p className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
        {title}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {entries.map(([key, num]) => {
          const { label, iconSpriteUrl } = resolve(key);
          const muted = Math.abs(num) < 1e-9;
          const chipClass = muted ? styles.muted : styles.strong;
          return (
            <span
              className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] ${chipClass}`}
              key={key}
              title={label === key ? key : `${label} (${key})`}
            >
              {iconSpriteUrl ? (
                <ContentPackEntryThumb
                  height={14}
                  sizeClass="size-3.5 shrink-0 rounded-sm"
                  url={iconSpriteUrl}
                  width={14}
                />
              ) : null}
              <span className="truncate font-medium font-sans text-[10px]">
                {label}
              </span>
              <span className="shrink-0 opacity-90">
                {formatSignedStatNumber(num)}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
