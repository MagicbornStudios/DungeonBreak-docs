"use client";

import type { FeedMessage } from "@dungeonbreak/engine";

type FeedPanelProps = {
  messages: FeedMessage[];
  status: "idle" | "busy";
};

export function FeedPanel({ messages, status }: FeedPanelProps) {
  return (
    <section className="play-column play-feed" data-testid="play-feed-panel">
      <div className="play-feed-shell font-mono text-xs leading-relaxed bg-muted/20 border rounded p-2 overflow-y-auto max-h-[420px] min-h-[200px]">
        {messages.length === 0 ? (
          <p className="text-muted-foreground">--- Feed ---</p>
        ) : (
          messages.map((m) => (
            <p
              key={m.id}
              className={
                m.tone === "player"
                  ? "text-foreground"
                  : m.tone === "warning"
                    ? "text-amber-600 dark:text-amber-500"
                    : m.tone === "cutscene"
                      ? "text-primary"
                      : "text-muted-foreground"
              }
              data-testid={`feed-msg-${m.id}`}
            >
              {m.text}
            </p>
          ))
        )}
      </div>
      <p className="play-last-message mt-1 font-mono text-xs truncate text-muted-foreground" data-testid="feed-last-message">
        {messages[messages.length - 1]?.text ?? ""}
      </p>
      {status === "busy" && <p className="text-xs text-muted-foreground mt-1">...</p>}
    </section>
  );
}
