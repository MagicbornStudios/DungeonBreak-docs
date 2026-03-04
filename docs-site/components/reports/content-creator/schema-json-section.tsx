"use client";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

type SchemaJsonSectionProps = {
  title: string;
  open: boolean;
  mode: "preview" | "edit";
  draft: string;
  deferredDraft: string;
  loadingText: string;
  syntaxMounted: boolean;
  onOpenChange: (open: boolean) => void;
  onModeChange: (mode: "preview" | "edit") => void;
  onDraftChange: (next: string) => void;
  onApply: () => void;
};

export function SchemaJsonSection({
  title,
  open,
  mode,
  draft,
  deferredDraft,
  loadingText,
  syntaxMounted,
  onOpenChange,
  onModeChange,
  onDraftChange,
  onApply,
}: SchemaJsonSectionProps) {
  return (
    <details
      open={open}
      onToggle={(event) => {
        const nextOpen = (event.currentTarget as HTMLDetailsElement | null)?.open ?? false;
        onOpenChange(nextOpen);
      }}
      className="rounded border border-border bg-background/60"
    >
      <summary className="cursor-pointer px-2 py-1 text-[11px] font-medium text-foreground">{title}</summary>
      <div className="space-y-1 border-t border-border p-2">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center rounded border border-border bg-background/60 p-0.5">
            <button
              type="button"
              onClick={() => onModeChange("preview")}
              className={`rounded px-1.5 py-0.5 text-[10px] ${
                mode === "preview" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/30"
              }`}
            >
              Preview
            </button>
            <button
              type="button"
              onClick={() => onModeChange("edit")}
              className={`rounded px-1.5 py-0.5 text-[10px] ${
                mode === "edit" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/30"
              }`}
            >
              Edit
            </button>
          </div>
          <button
            type="button"
            onClick={onApply}
            className="rounded border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-100 hover:bg-emerald-500/20"
          >
            Apply
          </button>
        </div>
        {mode === "edit" ? (
          <textarea
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            spellCheck={false}
            className="h-52 w-full resize-y rounded border border-border bg-background p-2 font-mono text-[11px] text-foreground"
          />
        ) : syntaxMounted ? (
          <SyntaxHighlighter
            language="json"
            style={oneDark}
            showLineNumbers
            wrapLongLines
            customStyle={{ margin: 0, background: "transparent", fontSize: "11px", overflow: "visible", padding: "8px" }}
          >
            {deferredDraft}
          </SyntaxHighlighter>
        ) : (
          <pre className="m-0 whitespace-pre-wrap break-words bg-transparent p-2 font-mono text-[11px] leading-5 text-muted-foreground">
            {deferredDraft || loadingText}
          </pre>
        )}
      </div>
    </details>
  );
}
