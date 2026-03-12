"use client";

import { useCallback, useEffect, useMemo, useState, type FC } from "react";
import {
  ActionBarPrimitive,
  AuiIf,
  AssistantRuntimeProvider,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useLocalRuntime,
  useMessagePartText,
} from "@assistant-ui/react";
import { ArrowUpIcon, CheckIcon, CopyIcon, PanelLeftIcon, RefreshCwIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/planning-ui/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/planning-ui/ui/select";
import {
  PlanningEditReview,
  type PlanningEdit,
} from "@/planning-ui/planning-edit-review";
import { cn } from "@/lib/utils";

type CodexModel = { id: string; label: string };

type PlanPayload = {
  id: string;
  title: string;
  description?: string;
  todos: Array<{ id: string; label: string; status: string; description?: string }>;
};

type QuestionStep = {
  id: string;
  title: string;
  description?: string;
  options: Array<{ id: string; label: string }>;
};

type PlanningChatPanelProps = {
  context?: Record<string, unknown>;
  className?: string;
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

function PlanStub({
  plan,
  onApprove,
  onRequestChanges,
}: {
  plan: PlanPayload;
  onApprove: () => void;
  onRequestChanges: () => void;
}) {
  return (
    <div className="space-y-2 rounded-md border border-border/50 bg-muted/10 p-3 text-sm">
      <p className="font-semibold">{plan.title}</p>
      {plan.description ? (
        <p className="text-xs text-muted-foreground">{plan.description}</p>
      ) : null}
      <ul className="list-inside list-disc text-xs">
        {plan.todos.map((t) => (
          <li key={t.id}>{t.label}</li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2">
        <Button size="sm" onClick={onApprove}>
          Approve plan
        </Button>
        <Button size="sm" variant="outline" onClick={onRequestChanges}>
          Request changes
        </Button>
      </div>
    </div>
  );
}

function QuestionFlowPlaceholder({
  steps,
  onComplete,
}: {
  steps: QuestionStep[];
  onComplete: (answers: Record<string, string[]>) => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const step = steps[stepIndex];
  if (!step) return null;
  const isLast = stepIndex === steps.length - 1;
  const select = (optionId: string) => {
    const next = { ...answers, [step.id]: [optionId] };
    setAnswers(next);
    if (isLast) {
      onComplete(next);
    } else {
      setStepIndex((i) => i + 1);
    }
  };
  return (
    <div className="space-y-2 rounded-md border border-border/50 bg-muted/10 p-3 text-sm">
      <p className="font-medium">{step.title}</p>
      {step.description ? (
        <p className="text-xs text-muted-foreground">{step.description}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        {step.options.map((opt) => (
          <Button
            key={opt.id}
            variant="outline"
            size="sm"
            onClick={() => select(opt.id)}
          >
            {opt.label}
          </Button>
        ))}
      </div>
      {!isLast && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
        >
          Back
        </Button>
      )}
    </div>
  );
}

/** Icon-only button with tooltip via title (assistant-ui style, no labels). */
function TooltipIconButton({
  tooltip,
  children,
  className,
  ...props
}: {
  tooltip: string;
  children: React.ReactNode;
} & React.ComponentProps<typeof Button>) {
  return (
    <Button
      size="icon"
      variant="ghost"
      className={cn("size-8 shrink-0", className)}
      title={tooltip}
      aria-label={tooltip}
      {...props}
    >
      {children}
    </Button>
  );
}

/** Renders text part as markdown (no avatar). */
const MarkdownTextPart: FC = () => {
  const part = useMessagePartText();
  const text = part?.type === "text" ? (part as { text?: string }).text ?? "" : "";
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
};

const PlanningAssistantMessage: FC = () => (
  <MessagePrimitive.Root
    className="relative mx-auto w-full max-w-3xl py-3"
    data-role="assistant"
  >
    <div className="px-2 text-foreground leading-relaxed">
      <MessagePrimitive.Parts
        components={{
          Text: MarkdownTextPart,
        }}
      />
      <MessagePrimitive.Error>
        <ErrorPrimitive.Root className="mt-2 rounded-md border border-destructive bg-destructive/10 p-3 text-destructive text-sm">
          <ErrorPrimitive.Message className="line-clamp-2" />
        </ErrorPrimitive.Root>
      </MessagePrimitive.Error>
    </div>
    <div className="mt-1 ml-2 flex min-h-6 items-center gap-1 text-muted-foreground">
      <ActionBarPrimitive.Root hideWhenRunning autohide="not-last">
        <ActionBarPrimitive.Copy asChild>
          <TooltipIconButton tooltip="Copy">
            <AuiIf condition={(s) => s.message.isCopied}>
              <CheckIcon className="size-4" />
            </AuiIf>
            <AuiIf condition={(s) => !s.message.isCopied}>
              <CopyIcon className="size-4" />
            </AuiIf>
          </TooltipIconButton>
        </ActionBarPrimitive.Copy>
        <ActionBarPrimitive.Reload asChild>
          <TooltipIconButton tooltip="Refresh">
            <RefreshCwIcon className="size-4" />
          </TooltipIconButton>
        </ActionBarPrimitive.Reload>
      </ActionBarPrimitive.Root>
    </div>
  </MessagePrimitive.Root>
);

const PlanningUserMessage: FC = () => (
  <MessagePrimitive.Root
    className="mx-auto grid w-full max-w-3xl grid-cols-[minmax(72px,1fr)_auto] gap-y-2 px-2 py-3 [&>*]:col-start-2"
    data-role="user"
  >
    <div className="min-w-0 rounded-2xl bg-muted px-4 py-2.5 text-foreground">
      <MessagePrimitive.Parts components={{}} />
    </div>
  </MessagePrimitive.Root>
);

const PlanningEditComposer: FC = () => (
  <MessagePrimitive.Root className="mx-auto flex w-full max-w-3xl flex-col px-2 py-3">
    <ComposerPrimitive.Root className="ml-auto flex w-full max-w-[85%] flex-col rounded-2xl bg-muted">
      <ComposerPrimitive.Input
        className="min-h-14 w-full resize-none bg-transparent p-4 text-foreground text-sm outline-none"
        autoFocus
      />
      <div className="mx-3 mb-3 flex items-center gap-2 self-end">
        <ComposerPrimitive.Cancel asChild>
          <Button variant="ghost" size="sm">
            Cancel
          </Button>
        </ComposerPrimitive.Cancel>
        <ComposerPrimitive.Send asChild>
          <Button size="sm">Update</Button>
        </ComposerPrimitive.Send>
      </div>
    </ComposerPrimitive.Root>
  </MessagePrimitive.Root>
);

function ThreadWelcome() {
  return (
    <div className="mx-auto my-auto flex w-full max-w-3xl grow flex-col px-4">
      <div className="flex w-full grow flex-col items-center justify-center">
        <div className="flex size-full flex-col justify-center">
          <h1 className="font-semibold text-2xl text-foreground">
            Hello there!
          </h1>
          <p className="text-xl text-muted-foreground">
            How can I help you today?
          </p>
        </div>
      </div>
    </div>
  );
}

function ChatSidebar({ collapsed }: { collapsed: boolean }) {
  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-muted/30 transition-all duration-200",
        collapsed ? "w-0 overflow-hidden opacity-0" : "w-65 opacity-100",
      )}
    >
      <div className="flex h-14 shrink-0 items-center px-4 font-medium text-sm text-foreground/90">
        Planning
      </div>
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        <Button variant="ghost" size="sm" className="w-full justify-start" type="button">
          New chat
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start font-normal text-muted-foreground"
          type="button"
        >
          <span className="truncate">Current chat</span>
        </Button>
      </div>
    </aside>
  );
}

export function PlanningChatPanel({ context, className }: PlanningChatPanelProps) {
  const [error, setError] = useState<string | null>(null);
  const [pendingEdits, setPendingEdits] = useState<PlanningEdit[]>([]);
  const [applying, setApplying] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<PlanPayload | null>(null);
  const [pendingQuestions, setPendingQuestions] = useState<{
    steps: QuestionStep[];
  } | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [models, setModels] = useState<CodexModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>("gpt-5.4");

  useEffect(() => {
    fetch("/api/codex/models")
      .then((r) => r.json())
      .then((data: { models?: CodexModel[] }) => setModels(data.models ?? []))
      .catch(() => setModels([{ id: "gpt-5.4", label: "GPT-5.4 (recommended)" }]));
  }, []);

  const adapter = useMemo(
    () => ({
      run: async function* (options: unknown) {
        setError(null);
        setPendingEdits([]);
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
              .filter((row): row is { role: "user" | "assistant"; content: string } =>
                Boolean(row),
              )
          : [];

        const body = JSON.stringify({ messages, context, model: selectedModelId || undefined });
        const tryNonStreaming = async (): Promise<string | null> => {
          const r = await fetch("/api/planning-chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
          });
          if (!r.ok) return null;
          const data = (await r.json()) as {
            reply?: string;
            plan?: PlanPayload;
            questions?: { steps: QuestionStep[] };
            edits?: PlanningEdit[];
          };
          if (Array.isArray(data.edits) && data.edits.length > 0) setPendingEdits(data.edits);
          if (data.plan) setPendingPlan(data.plan);
          if (data.questions?.steps?.length) setPendingQuestions(data.questions);
          return (data.reply ?? "").trim() || null;
        };

        const res = await fetch("/api/planning-chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setError((err as { error?: string }).error ?? `Request failed (${res.status})`);
          const fallbackReply = await tryNonStreaming();
          yield { content: asTextContent(fallbackReply ?? `Error: ${(err as { error?: string }).error ?? res.status}`) };
          return;
        }
        const reader = res.body?.getReader();
        if (!reader) {
          yield { content: asTextContent("No response body.") };
          return;
        }
        const dec = new TextDecoder();
        let buffer = "";
        let currentEvent = "";
        let currentData = "";
        let yieldedAny = false;
        let streamHadError = false;
        let doneReply = "";
        const flushChunk = () => {
          if (!currentData) return;
          try {
            const text = JSON.parse(currentData) as string;
            if (text) {
              yieldedAny = true;
              return asTextContent(text);
            }
          } catch {
            if (currentData) {
              yieldedAny = true;
              return asTextContent(currentData);
            }
          }
        };
        const flushDone = () => {
          if (!currentData) return;
          try {
            const payload = JSON.parse(currentData) as {
              reply?: string;
              plan?: PlanPayload;
              questions?: { steps: QuestionStep[] };
              edits?: PlanningEdit[];
            };
            if (Array.isArray(payload.edits) && payload.edits.length > 0) setPendingEdits(payload.edits);
            if (payload.plan) setPendingPlan(payload.plan);
            if (payload.questions?.steps?.length) setPendingQuestions(payload.questions);
            doneReply = (payload.reply ?? "").trim() || "No reply.";
            if (!yieldedAny) return asTextContent(doneReply);
          } catch {
            // ignore
          }
        };
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += dec.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (line.startsWith("event:")) {
              if (currentEvent === "chunk") {
                const content = flushChunk();
                if (content) yield { content };
              }
              if (currentEvent === "error" && currentData) {
                streamHadError = true;
                try {
                  setError(JSON.parse(currentData) as string);
                } catch {
                  setError(currentData);
                }
              }
              if (currentEvent === "done") {
                const content = flushDone();
                if (content) yield { content };
              }
              currentEvent = line.replace(/^event:\s*/, "").trim();
              currentData = "";
              continue;
            }
            if (line.startsWith("data:")) {
              currentData = line.replace(/^data:\s*/, "").trim();
            }
          }
        }
        if (currentEvent === "chunk") {
          const content = flushChunk();
          if (content) yield { content };
        }
        if (currentEvent === "done") {
          const content = flushDone();
          if (content) yield { content };
        }
        const needsFallback =
          streamHadError ||
          doneReply === "No reply." ||
          (currentEvent === "done" && !doneReply);
        if (needsFallback) {
          const fallbackReply = await tryNonStreaming();
          if (fallbackReply) yield { content: asTextContent(fallbackReply) };
        }
      },
    }),
    [context, selectedModelId],
  );

  const runtime = useLocalRuntime(adapter);

  const onApply = useCallback(async (edits: PlanningEdit[]) => {
    setApplying(true);
    setError(null);
    try {
      const res = await fetch("/api/planning-edits/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          edits: edits.map((e) => ({ path: e.path, newContent: e.newContent })),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        applied?: string[];
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Apply failed.");
        return;
      }
      setPendingEdits([]);
    } finally {
      setApplying(false);
    }
  }, []);

  const onReject = useCallback(() => {
    setPendingEdits([]);
  }, []);

  const hasEdits = pendingEdits.length > 0;

  return (
    <section
      className={cn(
        "flex h-full min-h-0",
        hasEdits ? "flex-row gap-0" : "flex-col",
        className ?? "",
      )}
    >
      <div
        className={
          hasEdits
            ? "flex min-w-0 shrink-0 flex-col border-r border-border/60"
            : "flex min-h-0 flex-1 flex-col"
        }
        style={hasEdits ? { width: "40%" } : undefined}
      >
        <AssistantRuntimeProvider runtime={runtime}>
          <div className="flex h-full w-full bg-background">
            <div className="hidden md:block">
              <ChatSidebar collapsed={sidebarCollapsed} />
            </div>
            <div className="flex flex-1 flex-col overflow-hidden">
              <header className="flex h-14 shrink-0 items-center gap-2 px-4">
                <TooltipIconButton
                  tooltip={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
                  onClick={() => setSidebarCollapsed((c) => !c)}
                  className="hidden size-9 md:flex"
                >
                  <PanelLeftIcon className="size-4" />
                </TooltipIconButton>
                <Select
                  value={selectedModelId}
                  onValueChange={(v) => setSelectedModelId(v)}
                >
                  <SelectTrigger size="sm" className="w-[180px]">
                    <SelectValue placeholder="Model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </header>
              <main className="flex-1 overflow-hidden">
                <ThreadPrimitive.Root
                  className="flex h-full flex-col bg-background"
                  style={{ ["--thread-max-width" as string]: "44rem" }}
                >
                  <ThreadPrimitive.Viewport
                    turnAnchor="top"
                    className="relative flex flex-1 flex-col overflow-x-auto overflow-y-scroll scroll-smooth px-4 pt-4"
                  >
                    <AuiIf condition={(s) => s.thread.isEmpty}>
                      <ThreadWelcome />
                    </AuiIf>
                    <ThreadPrimitive.Messages
                      components={{
                        UserMessage: PlanningUserMessage,
                        EditComposer: PlanningEditComposer,
                        AssistantMessage: PlanningAssistantMessage,
                      }}
                    />
                    <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mx-auto mt-auto flex w-full max-w-[var(--thread-max-width)] flex-col gap-4 overflow-visible rounded-t-3xl bg-background pb-4 md:pb-6">
                      <div className="flex flex-col gap-4">
                        <ComposerPrimitive.Root className="relative flex w-full flex-col rounded-2xl border border-input bg-background px-1 pt-2 outline-none transition-shadow has-[textarea:focus-visible]:border-ring has-[textarea:focus-visible]:ring-2 has-[textarea:focus-visible]:ring-ring/20">
                          <ComposerPrimitive.Input
                            placeholder="Send a message..."
                            className="mb-1 max-h-32 min-h-14 w-full resize-none bg-transparent px-4 pt-2 pb-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-0"
                            rows={1}
                            aria-label="Message input"
                          />
                          <div className="relative mx-1 mb-1.75 flex items-center justify-between">
                            <AuiIf condition={(s) => !s.thread.isRunning}>
                              <ComposerPrimitive.Send asChild>
                                <TooltipIconButton
                                  tooltip="Send message"
                                  variant="default"
                                  className="ml-auto size-8 rounded-full"
                                >
                                  <ArrowUpIcon className="size-4" />
                                </TooltipIconButton>
                              </ComposerPrimitive.Send>
                            </AuiIf>
                          </div>
                        </ComposerPrimitive.Root>
                      </div>
                    </ThreadPrimitive.ViewportFooter>
                  </ThreadPrimitive.Viewport>
                </ThreadPrimitive.Root>
              </main>
            </div>
          </div>

          {error ? (
            <p className="px-3 pb-2 text-xs text-red-400">{error}</p>
          ) : null}

          {pendingPlan ? (
            <div className="border-t border-border/60 px-3 py-2">
              <PlanStub
                plan={pendingPlan}
                onApprove={() => setPendingPlan(null)}
                onRequestChanges={() => setPendingPlan(null)}
              />
            </div>
          ) : null}

          {pendingQuestions?.steps?.length ? (
            <div className="border-t border-border/60 px-3 py-2">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Answer these to continue
              </p>
              <QuestionFlowPlaceholder
                steps={pendingQuestions.steps}
                onComplete={() => setPendingQuestions(null)}
              />
            </div>
          ) : null}
        </AssistantRuntimeProvider>
      </div>

      {hasEdits ? (
        <div className="flex min-h-0 min-w-0 flex-[3] flex-col">
          <PlanningEditReview
            edits={pendingEdits}
            onApply={onApply}
            onReject={onReject}
            applying={applying}
          />
        </div>
      ) : null}
    </section>
  );
}
