"use client";

import { CircleHelp } from "lucide-react";
import type { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function InfoTip({
  children,
  className,
  contentClassName,
  side = "top",
}: {
  children: ReactNode;
  className?: string;
  /** Wider or styled tooltip body (default max-w-xs). */
  contentClassName?: string;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            aria-label="More information"
            className={cn(
              "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              className
            )}
            type="button"
          >
            <CircleHelp className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          className={cn("max-w-xs leading-snug", contentClassName)}
          side={side}
        >
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
