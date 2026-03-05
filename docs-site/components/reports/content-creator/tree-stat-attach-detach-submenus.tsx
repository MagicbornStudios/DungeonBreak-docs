"use client";

import {
  IconChartBar as BarChart3Icon,
} from "@tabler/icons-react";
import {
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import { Switch } from "@/components/ui/switch";

type TreeStatAttachDetachSubmenusProps = {
  targetModelId: string;
  keyPrefix: string;
  statModelIds: string[];
  directStatIds: string[];
  statColorByModelId: Map<string, string>;
  onAttachStatModelToModel: (modelId: string, statModelId: string) => void;
  onDetachStatFromModelWithImpact: (modelId: string, statId: string) => void;
};

export function TreeStatAttachDetachSubmenus({
  targetModelId,
  keyPrefix,
  statModelIds,
  directStatIds,
  statColorByModelId,
  onAttachStatModelToModel,
  onDetachStatFromModelWithImpact,
}: TreeStatAttachDetachSubmenusProps) {
  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger>
        <span className="inline-flex items-center gap-2">
          <BarChart3Icon className="h-3.5 w-3.5" />
          Stat Sets
        </span>
      </ContextMenuSubTrigger>
      <ContextMenuSubContent className="z-[240] max-h-64 overflow-auto">
        {statModelIds.length === 0 ? (
          <ContextMenuItem disabled>No stat sets available</ContextMenuItem>
        ) : (
          statModelIds.map((statModelId) => {
            const isChecked = directStatIds.includes(statModelId);
            return (
              <ContextMenuItem
                key={`${keyPrefix}:stat:${targetModelId}:${statModelId}`}
                onSelect={(event) => {
                  // Keep submenu open for multi-check flows.
                  event.preventDefault();
                }}
                className="flex items-center justify-between gap-3"
              >
                <span className="inline-flex items-center gap-2">
                  <span
                    className="inline-block size-2 rounded-full border border-black/20"
                    style={{ backgroundColor: statColorByModelId.get(statModelId) ?? "hsl(195, 85%, 62%)" }}
                  />
                  {statModelId}
                </span>
                <Switch
                  checked={isChecked}
                  aria-label={`Toggle stat set ${statModelId}`}
                  onCheckedChange={(checked) => {
                    if (checked && !isChecked) {
                      onAttachStatModelToModel(targetModelId, statModelId);
                      return;
                    }
                    if (!checked && isChecked) {
                      onDetachStatFromModelWithImpact(targetModelId, statModelId);
                    }
                  }}
                  onClick={(event) => event.stopPropagation()}
                />
              </ContextMenuItem>
            );
          })
        )}
      </ContextMenuSubContent>
    </ContextMenuSub>
  );
}
