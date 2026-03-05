"use client";

import type { ReactNode } from "react";
import type { InfoPanelTone } from "@/components/reports/content-creator/selection-utils";
import {
  INFO_PANEL_HEADER_TONE_CLASSES,
  INFO_PANEL_TONE_CLASSES,
} from "@/components/reports/content-creator/info-panel-theme";

type ContentCreatorInfoPanelShellProps = {
  infoPanelTone: InfoPanelTone;
  infoPanelName: string;
  infoPanelContent: ReactNode;
  codePanelOpen: boolean;
  sharedCodeBlockPanel: ReactNode;
  helpNode: ReactNode;
};

export function ContentCreatorInfoPanelShell({
  infoPanelTone,
  infoPanelName,
  infoPanelContent,
  codePanelOpen,
  sharedCodeBlockPanel,
  helpNode,
}: ContentCreatorInfoPanelShellProps) {
  return (
    <div className={`min-h-0 overflow-auto rounded border p-2 ${INFO_PANEL_TONE_CLASSES[infoPanelTone]}`}>
      <div className={`mb-2 flex items-start justify-between gap-2 border-b pb-2 ${INFO_PANEL_HEADER_TONE_CLASSES[infoPanelTone]}`}>
        <div className="flex items-start gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-[10px] font-semibold text-muted-foreground">
            i
          </span>
          <div>
            <div className="flex items-center gap-1">
              <p className="text-sm font-semibold">Info Panel</p>
              {helpNode}
            </div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{infoPanelName}</p>
          </div>
        </div>
      </div>
      {infoPanelContent}
      {codePanelOpen ? sharedCodeBlockPanel : null}
    </div>
  );
}
