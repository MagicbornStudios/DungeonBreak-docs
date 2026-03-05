"use client";

import type { ReactNode } from "react";
import { IconFolder as FolderTreeIcon } from "@tabler/icons-react";

export function ContentCreatorModalShell(props: {
  onClose: () => void;
  helpNode: ReactNode;
  sidebar: ReactNode;
  infoPanel: ReactNode;
}) {
  const { onClose, helpNode, sidebar, infoPanel } = props;

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="h-[88vh] w-[96vw] max-w-[1500px] overflow-hidden rounded border border-border bg-card p-4 shadow-lg"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderTreeIcon className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Content Creator</p>
            {helpNode}
          </div>
          <button
            type="button"
            className="rounded border border-border px-2 py-0.5 text-xs hover:bg-muted/30"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="grid h-[calc(88vh-88px)] min-h-0 gap-3 md:grid-cols-[380px_minmax(0,1fr)]">
          {sidebar}
          {infoPanel}
        </div>
      </div>
    </div>
  );
}

