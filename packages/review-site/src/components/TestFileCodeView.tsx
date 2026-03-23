import { javascript } from "@codemirror/lang-javascript";
import { type Extension, RangeSetBuilder } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { FileCode2 } from "lucide-react";
import { useMemo } from "react";

function buildDecorations(
  view: EditorView,
  startLine: number,
  endLine: number,
): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;
  const max = doc.lines;
  const from = Math.min(Math.max(1, startLine), max);
  const to = Math.min(Math.max(from, endLine), max);
  for (let ln = from; ln <= to; ln++) {
    const line = doc.line(ln);
    builder.add(
      line.from,
      line.from,
      Decoration.line({ class: "cm-test-snippet-line" }),
    );
  }
  return builder.finish();
}

function lineHighlightExtension(startLine: number, endLine: number) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = buildDecorations(view, startLine, endLine);
      }
      update(update: ViewUpdate) {
        if (update.docChanged) {
          this.decorations = buildDecorations(update.view, startLine, endLine);
        }
      }
    },
    { decorations: (v) => v.decorations },
  );
}

interface Props {
  fileLabel: string;
  source: string;
  highlightFromLine: number | null | undefined;
  highlightToLine: number | null | undefined;
}

export function TestFileCodeView({
  fileLabel,
  source,
  highlightFromLine,
  highlightToLine,
}: Props) {
  const extensions = useMemo(() => {
    const base: Extension[] = [
      javascript({ jsx: true, typescript: true }),
      EditorView.editable.of(false),
      EditorView.lineWrapping,
    ];
    const a = highlightFromLine ?? 0;
    const b = highlightToLine ?? 0;
    if (a >= 1 && b >= a) {
      base.push(lineHighlightExtension(a, b));
    }
    return base;
  }, [highlightFromLine, highlightToLine]);

  const rangeLabel =
    highlightFromLine != null &&
    highlightToLine != null &&
    highlightFromLine >= 1 &&
    highlightToLine >= highlightFromLine
      ? `Lines ${highlightFromLine}–${highlightToLine} (test block)`
      : null;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-[#282c34]">
      <div className="flex items-center gap-2 border-border border-b bg-black/20 px-3 py-2 text-muted-foreground text-xs">
        <FileCode2 aria-hidden className="size-3.5 shrink-0 text-primary" />
        <span className="min-w-0 truncate font-mono text-foreground">{fileLabel}</span>
        {rangeLabel ? (
          <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
            {rangeLabel}
          </span>
        ) : null}
      </div>
      <CodeMirror
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: false,
        }}
        className="text-sm [&_.cm-editor]:min-h-[min(70vh,28rem)] [&_.cm-scroller]:overflow-auto"
        editable={false}
        extensions={extensions}
        theme={oneDark}
        value={source}
      />
    </div>
  );
}
