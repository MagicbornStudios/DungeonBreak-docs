"use client";

import { cn } from "@/lib/utils";

type LiveWaveformProps = {
  active?: boolean;
  className?: string;
};

const BARS = [0.35, 0.6, 0.8, 0.5, 0.9, 0.65, 0.4];

export function LiveWaveform({ active = false, className }: LiveWaveformProps) {
  return (
    <div className={cn("flex h-8 items-end gap-1", className)}>
      {BARS.map((height, index) => (
        <span
          key={`${height}-${index}`}
          className={cn(
            "block w-1 rounded-sm bg-primary/70",
            active ? "animate-pulse" : "opacity-40"
          )}
          style={{
            animationDelay: `${index * 75}ms`,
            height: `${Math.max(4, Math.round(height * 24))}px`,
          }}
        />
      ))}
    </div>
  );
}
