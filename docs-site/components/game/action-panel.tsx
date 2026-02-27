"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActionGroup, PlayUiAction } from "@/lib/escape-the-dungeon/ui/types";

type ActionPanelProps = {
  groups: ActionGroup[];
  onAction: (action: PlayUiAction) => void;
  busy: boolean;
  blockedByCutscene: boolean;
};

export function ActionPanel({ groups, onAction, busy, blockedByCutscene }: ActionPanelProps) {
  return (
    <section className="play-column play-actions" data-testid="play-actions-panel">
      {groups.map((group) => (
        <Card key={group.id} className="play-panel-card">
          <CardHeader>
            <CardTitle>{group.title}</CardTitle>
          </CardHeader>
          <CardContent className="play-action-list">
            {group.items.map((item) => {
              const disabled = busy || blockedByCutscene || !item.available;
              return (
                <div key={item.id} className="play-action-row">
                  <Button
                    className="play-action-button"
                    data-testid={item.id}
                    disabled={disabled}
                    onClick={() => onAction(item.action)}
                    size="sm"
                    variant={item.available ? "secondary" : "outline"}
                  >
                    {item.label}
                  </Button>
                  {!item.available && item.blockedReasons.length > 0 ? (
                    <p className="play-blocked-reasons" data-testid={`${item.id}-blocked`}>
                      {item.blockedReasons.join("; ")}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
