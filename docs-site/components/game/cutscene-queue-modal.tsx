"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { CutsceneMessage } from "@/lib/escape-the-dungeon/ui/types";

type CutsceneQueueModalProps = {
  queue: CutsceneMessage[];
  onDismissNext: () => void;
};

export function CutsceneQueueModal({ queue, onDismissNext }: CutsceneQueueModalProps) {
  const current = queue[0];
  if (!current) {
    return null;
  }

  return (
    <div className="play-cutscene-overlay" data-testid="cutscene-modal">
      <Card className="play-cutscene-card">
        <CardHeader>
          <CardTitle>{current.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p data-testid="cutscene-text">{current.text}</p>
          <p className="play-cutscene-turn">Turn {current.turnIndex}</p>
        </CardContent>
        <CardFooter>
          <Button data-testid="cutscene-dismiss" onClick={onDismissNext}>
            Continue
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
