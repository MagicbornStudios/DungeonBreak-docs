"use client";

import { useMemo, useState } from "react";
import {
  AuiIf,
  AssistantRuntimeProvider,
  ComposerPrimitive,
  SelectionToolbarPrimitive,
  ThreadPrimitive,
  useLocalRuntime,
} from "@assistant-ui/react";
import { AssistantMessage, EditComposer, UserMessage } from "@assistant-ui/react-ui";
import { motion } from "motion/react";
import { ChevronDownIcon, ChevronUpIcon, SendHorizonalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export type AuthoringChatOperation =
  | {
      op: "add_feature_schema";
      featureId: string;
      label?: string;
      groups?: string[];
      spaces: string[];
      defaultValue?: number;
    }
  | {
      op: "set_feature_default";
      featureId: string;
      defaultValue: number;
    }
  | {
      op: "create_model_schema";
      modelId: string;
      label?: string;
      description?: string;
      extendsModelId?: string;
      featureIds?: string[];
      spaces?: string[];
    }
  | {
      op: "update_model_metadata";
      modelId: string;
      label?: string;
      description?: string;
    }
  | {
      op: "add_model_feature_ref";
      modelId: string;
      featureId: string;
      spaces?: string[];
      required?: boolean;
      defaultValue?: number;
    }
  | {
      op: "remove_model_feature_ref";
      modelId: string;
      featureId: string;
    }
  | {
      op: "create_canonical_asset";
      modelId: string;
      name?: string;
    }
  | {
      op: "rename_model_instance";
      instanceId: string;
      name: string;
    }
  | {
      op: "set_canonical_state";
      instanceId: string;
      canonical: boolean;
    }
  | {
      op: "set_active_selection";
      modelId: string;
      instanceId?: string | null;
    }
  | {
      op: "build_bundle";
      patchName?: string;
      download?: boolean;
    };

export type AuthoringApplyResult = {
  ok: boolean;
  summary: string;
  validationErrors?: string[];
};

type AuthoringChatPanelProps = {
  endpoint: string;
  context?: Record<string, unknown>;
  className?: string;
  onApplyOperations?: (operations: AuthoringChatOperation[]) => Promise<AuthoringApplyResult> | AuthoringApplyResult;
};

type ChatResponse = {
  ok: boolean;
  reply?: string;
  operations?: AuthoringChatOperation[];
  operationNotes?: string[];
  error?: string;
};

function extractTextContent(message: unknown): string {
  if (!message || typeof message !== "object") return "";
  const parts = (message as { content?: unknown }).content;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      const typed = part as { type?: unknown; text?: unknown };
      return typed.type === "text" && typeof typed.text === "string" ? typed.text : "";
    })
    .filter((text) => text.length > 0)
    .join("\n");
}

function asTextContent(text: string) {
  return [{ type: "text" as const, text }];
}

export function AuthoringChatPanel({ endpoint, context, className, onApplyOperations }: AuthoringChatPanelProps) {
  const [error, setError] = useState<string | null>(null);
  const [pendingOperations, setPendingOperations] = useState<AuthoringChatOperation[]>([]);
  const [operationNotes, setOperationNotes] = useState<string[]>([]);
  const [operationPreviewOpen, setOperationPreviewOpen] = useState(false);
  const [applyStatus, setApplyStatus] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const adapter = useMemo(
    () => ({
      run: async (options: unknown) => {
        setError(null);
        setApplyStatus(null);
        const rawMessages = (options as { messages?: unknown })?.messages;
        const messages = Array.isArray(rawMessages)
          ? rawMessages
              .map((message) => {
                if (!message || typeof message !== "object") return null;
                const role = (message as { role?: unknown }).role;
                if (role !== "user" && role !== "assistant") return null;
                const content = extractTextContent(message);
                if (!content.trim()) return null;
                return { role, content: content.trim() };
              })
              .filter((row): row is { role: "user" | "assistant"; content: string } => Boolean(row))
          : [];

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages, context }),
        });
        const body = (await response.json()) as ChatResponse;
        if (!response.ok || !body.ok) {
          const reason = body.error ?? `Request failed (${response.status})`;
          setError(reason);
          return {
            content: asTextContent(`Error: ${reason}`),
          };
        }

        const nextOperations = Array.isArray(body.operations) ? body.operations : [];
        const nextNotes = Array.isArray(body.operationNotes) ? body.operationNotes : [];
        setPendingOperations(nextOperations);
        setOperationNotes(nextNotes);

        return {
          content: asTextContent((body.reply ?? "No reply returned.").trim() || "No reply returned."),
        };
      },
    }),
    [context, endpoint],
  );

  const runtime = useLocalRuntime(adapter);

  const onApply = async () => {
    if (!onApplyOperations || pendingOperations.length === 0 || applying) return;
    setError(null);
    setApplying(true);
    try {
      const result = await onApplyOperations(pendingOperations);
      const validationSummary = result.validationErrors?.length
        ? ` Validation: ${result.validationErrors.slice(0, 2).join(" | ")}`
        : "";
      setApplyStatus(`${result.summary}${validationSummary}`);
      if (result.ok) {
        setPendingOperations([]);
        setOperationNotes([]);
        setOperationPreviewOpen(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setApplying(false);
    }
  };

  return (
    <section className={`flex h-full min-h-0 flex-col ${className ?? ""}`}>
      <AssistantRuntimeProvider runtime={runtime}>
        <ThreadPrimitive.Root className="flex h-full min-h-0 flex-col rounded border border-border bg-background/70">
          <ThreadPrimitive.Viewport className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            <AuiIf condition={(s) => s.thread.isEmpty}>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="rounded-lg border border-border bg-muted/20 p-4"
              >
                <p className="text-xl font-semibold">Hello there!</p>
                <p className="mt-1 text-sm text-muted-foreground">How can I help with your content model today?</p>
              </motion.div>
            </AuiIf>
            <ThreadPrimitive.Messages
              components={{
                EditComposer,
                UserMessage,
                AssistantMessage,
              }}
            />
            <ThreadPrimitive.ScrollToBottom className="ml-auto" />
          </ThreadPrimitive.Viewport>

          {error ? <p className="px-3 pb-2 text-xs text-red-400">{error}</p> : null}

          {pendingOperations.length > 0 ? (
            <div className="border-t border-border px-3 py-2">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs text-amber-200">{pendingOperations.length} change(s) ready</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setOperationPreviewOpen((prev) => !prev)}
                  className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  {operationPreviewOpen ? <ChevronUpIcon className="size-3.5" /> : <ChevronDownIcon className="size-3.5" />}
                  Details
                </Button>
              </div>
              {operationPreviewOpen ? (
                <pre className="mb-2 max-h-24 overflow-auto rounded border border-border bg-background p-2 text-[10px] text-muted-foreground">
                  {JSON.stringify(pendingOperations, null, 2)}
                </pre>
              ) : null}
              {operationNotes.length > 0 ? (
                <p className="mb-2 text-[11px] text-muted-foreground">{operationNotes.join(" | ")}</p>
              ) : null}
              <div className="flex justify-end">
                <Button type="button" size="sm" onClick={() => void onApply()} disabled={applying}>
                  {applying ? "Applying..." : "Apply"}
                </Button>
              </div>
            </div>
          ) : null}

          {applyStatus ? <p className="px-3 py-2 text-xs text-muted-foreground">{applyStatus}</p> : null}

          <div className="border-t border-border p-3">
            <ComposerPrimitive.Root className="flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5">
              <ComposerPrimitive.Input
                placeholder="Ask Codex to inspect or edit content models..."
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <ComposerPrimitive.Send asChild>
                <Button type="button" size="icon" className="size-8" aria-label="Send message" title="Send message">
                  <SendHorizonalIcon className="size-4" />
                </Button>
              </ComposerPrimitive.Send>
            </ComposerPrimitive.Root>
          </div>

          <SelectionToolbarPrimitive.Root>
            <SelectionToolbarPrimitive.Quote className="rounded border border-border bg-background px-2 py-1 text-xs">
              Quote
            </SelectionToolbarPrimitive.Quote>
          </SelectionToolbarPrimitive.Root>
        </ThreadPrimitive.Root>
      </AssistantRuntimeProvider>
    </section>
  );
}
