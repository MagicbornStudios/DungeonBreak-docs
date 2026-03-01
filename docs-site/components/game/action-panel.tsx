"use client";

import { Button } from "@/components/ui/button";
import type { ActionGroup, PlayUiAction } from "@dungeonbreak/engine";

type ActionPanelProps = {
  groups: ActionGroup[];
  onAction: (action: PlayUiAction) => void;
  busy: boolean;
  blockedByCutscene: boolean;
};

export function ActionPanel({ groups, onAction, busy, blockedByCutscene }: ActionPanelProps) {
  return (
    <section className="play-column play-actions font-mono text-sm" data-testid="play-actions-panel">
      {groups.map((group) => (
        <div
          key={group.id}
          className="play-panel-card border border-border rounded p-2 bg-muted/10"
        >
          <div className="text-xs font-medium text-muted-foreground mb-2 border-b border-border/50 pb-1">
            {group.title}
          </div>
          <div className="play-action-list space-y-1">
            {group.items.map((item) => {
              const disabled = busy || blockedByCutscene || !item.available;
              return (
                <div key={item.id} className="play-action-row">
                  <Button
                    className="play-action-button w-full justify-start font-mono text-xs h-8"
                    data-testid={item.id}
                    disabled={disabled}
                    onClick={() => onAction(item.action)}
                    size="sm"
                    variant={item.available ? "secondary" : "outline"}
                  >
                    [{item.label}]
                  </Button>
                  {!item.available && item.blockedReasons.length > 0 ? (
                    <p className="play-blocked-reasons text-xs text-muted-foreground mt-0.5" data-testid={`${item.id}-blocked`}>
                      {item.blockedReasons.join("; ")}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
