"use client";

import { useMemo } from "react";
import { AssistantRuntimeProvider, useExternalStoreRuntime, type ThreadMessage } from "@assistant-ui/react";
import { Thread } from "@assistant-ui/react-ui";
import type { FeedMessage } from "@dungeonbreak/engine";

type FeedPanelProps = {
  messages: FeedMessage[];
  status: "idle" | "busy";
};

const asThreadMessage = (entry: FeedMessage, index: number): ThreadMessage => {
  const createdAt = new Date(Date.now() + index);
  if (entry.tone === "player") {
    return {
      id: entry.id,
      role: "user",
      createdAt,
      attachments: [],
      content: [{ type: "text", text: entry.text }],
      metadata: { custom: { tone: entry.tone } },
    };
  }

  return {
    id: entry.id,
    role: "assistant",
    createdAt,
    content: [{ type: "text", text: entry.text }],
    status: { type: "complete", reason: "stop" },
    metadata: {
      unstable_state: null,
      unstable_annotations: [],
      unstable_data: [],
      steps: [],
      custom: { tone: entry.tone },
    },
  };
};

export function FeedPanel({ messages, status }: FeedPanelProps) {
  const threadMessages = useMemo(() => messages.map(asThreadMessage), [messages]);

  const runtime = useExternalStoreRuntime<ThreadMessage>({
    isRunning: status === "busy",
    messages: threadMessages,
    onNew: async () => {
      // Command-style input is disabled in this surface.
    },
    onEdit: async () => {},
    onReload: async () => {},
    onCancel: async () => {},
  });

  const last = messages[messages.length - 1];

  return (
    <section className="play-column play-feed" data-testid="play-feed-panel">
      <AssistantRuntimeProvider runtime={runtime}>
        <div className="play-feed-shell">
          <Thread
            assistantMessage={{
              allowCopy: false,
              allowFeedbackNegative: false,
              allowFeedbackPositive: false,
              allowReload: false,
              allowSpeak: false,
            }}
            branchPicker={{ allowBranchPicker: false }}
            composer={{ allowAttachments: false }}
            components={{
              Composer: () => null,
              ThreadWelcome: () => null,
            }}
            userMessage={{
              allowEdit: false,
            }}
          />
        </div>
      </AssistantRuntimeProvider>
      <p className="play-last-message" data-testid="feed-last-message">
        {last?.text ?? ""}
      </p>
    </section>
  );
}
