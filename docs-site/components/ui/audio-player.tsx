"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

type AudioPlayerProps = {
  className?: string;
  src?: string | null;
  title?: string;
};

export function AudioPlayer({ className, src, title }: AudioPlayerProps) {
  const hasSrc = typeof src === "string" && src.trim().length > 0;
  const safeTitle = useMemo(() => title?.trim() || "Generated audio", [title]);

  if (!hasSrc) {
    return (
      <div
        className={cn(
          "rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground",
          className
        )}
      >
        Audio unavailable.
      </div>
    );
  }

  return (
    <div className={cn("rounded-md border bg-card p-2", className)}>
      <div className="mb-2 text-xs text-muted-foreground">{safeTitle}</div>
      <audio className="w-full" controls preload="metadata" src={src || undefined}>
        <track kind="captions" />
      </audio>
    </div>
  );
}
