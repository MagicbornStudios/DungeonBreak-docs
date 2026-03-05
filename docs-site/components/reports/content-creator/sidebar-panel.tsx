"use client";

import { IconBraces as BracesIcon, IconFolder as FolderTreeIcon } from "@tabler/icons-react";
import type { ReactNode } from "react";

type ContentCreatorSidebarPanelProps = {
  objectSectionTab: "models" | "canonical";
  activeNavigatorMode: "tree" | "json";
  selectedLabel: string;
  onSetObjectSectionTab: (next: "models" | "canonical") => void;
  onSetNavigatorMode: (next: "tree" | "json") => void;
  children: ReactNode;
};

export function ContentCreatorSidebarPanel({
  objectSectionTab,
  activeNavigatorMode,
  selectedLabel,
  onSetObjectSectionTab,
  onSetNavigatorMode,
  children,
}: ContentCreatorSidebarPanelProps) {
  return (
    <div className="flex min-h-0 flex-col rounded border border-border p-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="text-[11px] font-medium uppercase text-muted-foreground">Object Tree</div>
        <div className="inline-flex items-center rounded border border-border bg-background/60 p-0.5">
          <button
            type="button"
            onClick={() => onSetObjectSectionTab("models")}
            className={`rounded px-1.5 py-0.5 text-[10px] ${
              objectSectionTab === "models" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/30"
            }`}
            title="Models section"
          >
            Models
          </button>
          <button
            type="button"
            onClick={() => onSetObjectSectionTab("canonical")}
            className={`rounded px-1.5 py-0.5 text-[10px] ${
              objectSectionTab === "canonical" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/30"
            }`}
            title="Canonical assets section"
          >
            Canonical Assets
          </button>
        </div>
      </div>
      <div className="mb-1 flex items-center justify-end">
        <div className="inline-flex items-center rounded border border-border bg-background/60 p-0.5">
          <button
            type="button"
            onClick={() => onSetNavigatorMode("tree")}
            className={`rounded px-1.5 py-0.5 text-[10px] ${
              activeNavigatorMode === "tree" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/30"
            }`}
            title="Tree view"
          >
            <FolderTreeIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onSetNavigatorMode("json")}
            className={`rounded px-1.5 py-0.5 text-[10px] ${
              activeNavigatorMode === "json" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/30"
            }`}
            title="JSON schema view"
          >
            <BracesIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="mb-1 rounded border border-border bg-muted/20 px-2 py-1 text-[10px] text-muted-foreground">
        Selected: <span className="font-mono text-foreground">{selectedLabel}</span>
      </div>
      {children}
    </div>
  );
}
