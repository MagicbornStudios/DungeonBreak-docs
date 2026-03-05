"use client";

import { IconAdjustments as SlidersIcon } from "@tabler/icons-react";
import {
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import { Switch } from "@/components/ui/switch";

type TreeStatModifierSubmenuProps = {
  targetStatModelId: string;
  keyPrefix: string;
  statModelIds: string[];
  activeModifierIds: string[];
  statColorByModelId: Map<string, string>;
  onToggleModifier: (modifierStatModelId: string, enabled: boolean) => void;
};

export function TreeStatModifierSubmenu({
  targetStatModelId,
  keyPrefix,
  statModelIds,
  activeModifierIds,
  statColorByModelId,
  onToggleModifier,
}: TreeStatModifierSubmenuProps) {
  const options = statModelIds.filter((id) => id !== targetStatModelId);
  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger>
        <span className="inline-flex items-center gap-2">
          <SlidersIcon className="h-3.5 w-3.5" />
          Stat Modifiers
        </span>
      </ContextMenuSubTrigger>
      <ContextMenuSubContent className="z-[240] max-h-64 overflow-auto">
        {options.length === 0 ? (
          <ContextMenuItem disabled>No other stat sets available</ContextMenuItem>
        ) : (
          options.map((modifierStatModelId) => {
            const checked = activeModifierIds.includes(modifierStatModelId);
            return (
              <ContextMenuItem
                key={`${keyPrefix}:modifier:${targetStatModelId}:${modifierStatModelId}`}
                onSelect={(event) => event.preventDefault()}
                className="flex items-center justify-between gap-3"
              >
                <span className="inline-flex items-center gap-2">
                  <span
                    className="inline-block size-2 rounded-full border border-black/20"
                    style={{
                      backgroundColor:
                        statColorByModelId.get(modifierStatModelId) ??
                        "hsl(195, 85%, 62%)",
                    }}
                  />
                  {modifierStatModelId}
                </span>
                <Switch
                  checked={checked}
                  aria-label={`Toggle modifier ${modifierStatModelId}`}
                  onCheckedChange={(nextChecked) =>
                    onToggleModifier(modifierStatModelId, nextChecked)
                  }
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

