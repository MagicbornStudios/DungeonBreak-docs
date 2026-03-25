"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function ContentPackEntryThumb({
  url,
  sizeClass,
  height,
  width,
}: {
  url: string | null;
  sizeClass: string;
  height: number;
  width: number;
}) {
  const [broken, setBroken] = useState(false);
  if (!url || broken) {
    return null;
  }
  return (
    // biome-ignore lint/performance/noImgElement: arbitrary remote sprite URLs from bundle
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: onError only hides failed loads
    <img
      alt=""
      className={cn(
        "shrink-0 rounded-md border border-border/60 bg-muted/50 object-contain shadow-sm",
        sizeClass
      )}
      decoding="async"
      height={height}
      loading="lazy"
      onError={() => setBroken(true)}
      src={url}
      width={width}
    />
  );
}
