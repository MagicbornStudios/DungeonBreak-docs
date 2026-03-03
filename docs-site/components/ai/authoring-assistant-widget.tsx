"use client";

import { useState } from "react";
import { AssistantModalPrimitive } from "@assistant-ui/react";
import { CircleHelpIcon, MessageCircleIcon, XIcon } from "lucide-react";
import { AuthoringChatPanel, type AuthoringApplyResult, type AuthoringChatOperation } from "@/components/ai/authoring-chat-panel";
import { Button } from "@/components/ui/button";

type AuthoringAssistantWidgetProps = {
  endpoint: string;
  context?: Record<string, unknown>;
  title?: string;
  description?: string;
  onApplyOperations?: (operations: AuthoringChatOperation[]) => Promise<AuthoringApplyResult> | AuthoringApplyResult;
};

export function AuthoringAssistantWidget({
  endpoint,
  context,
  title = "Codex Authoring Chat",
  description = "Discuss and edit models, stats, content schema, and canonical asset workflows.",
  onApplyOperations,
}: AuthoringAssistantWidgetProps) {
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <AssistantModalPrimitive.Root>
      <AssistantModalPrimitive.Anchor className="fixed bottom-4 right-4 z-40 size-11">
        <AssistantModalPrimitive.Trigger asChild>
          <Button
            size="icon"
            className="size-11 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
            aria-label="Open Codex authoring chat"
            title="Open Codex authoring chat"
          >
            <MessageCircleIcon className="size-5" />
          </Button>
        </AssistantModalPrimitive.Trigger>
      </AssistantModalPrimitive.Anchor>

      <AssistantModalPrimitive.Content
        side="top"
        align="end"
        sideOffset={12}
        className="z-50 h-[min(72vh,620px)] w-[min(430px,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-border bg-popover p-0 text-popover-foreground shadow-2xl outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
      >
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{title}</p>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground"
              aria-label="Authoring chat help"
              title="Authoring chat help"
              onClick={() => setInfoOpen((prev) => !prev)}
            >
              <CircleHelpIcon className="size-3.5" />
            </Button>
          </div>
          <AssistantModalPrimitive.Trigger asChild>
            <Button variant="ghost" size="icon" className="size-8" aria-label="Close Codex authoring chat">
              <XIcon className="size-4" />
            </Button>
          </AssistantModalPrimitive.Trigger>
        </div>
        {infoOpen ? (
          <div className="border-b border-border bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
            {description}
          </div>
        ) : null}
        <div className="h-[calc(100%-41px)] p-3">
          <AuthoringChatPanel
            endpoint={endpoint}
            context={context}
            onApplyOperations={onApplyOperations}
            className="h-full border-0 bg-transparent p-0"
          />
        </div>
      </AssistantModalPrimitive.Content>
    </AssistantModalPrimitive.Root>
  );
}