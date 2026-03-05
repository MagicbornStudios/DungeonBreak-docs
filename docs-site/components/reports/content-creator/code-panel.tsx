"use client";

import {
  IconBraces as BracesIcon,
  IconBrandCpp as SiCplusplus,
  IconBrandCSharp as SiSharp,
  IconFileCode as FileCode2Icon,
  IconFileTypeTsx as SiTypescript,
  IconJson as SiJsonwebtokens,
} from "@tabler/icons-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

type CodeTab = {
  id: string;
  label: string;
  code: string;
};

type ContentCreatorCodePanelProps = {
  codeTabs: CodeTab[];
  activeCodeFile: CodeTab | null;
  activeCodeTabId: string;
  objectEditorCode: string;
  copiedEditorCode: boolean;
  onSelectCodeTab: (tabId: string) => void;
  onResetCode: () => void;
  onCopyCode: () => Promise<void>;
  codeLanguageForTabId: (tabId: string) => string;
};

export function ContentCreatorCodePanel({
  codeTabs,
  activeCodeFile,
  activeCodeTabId,
  objectEditorCode,
  copiedEditorCode,
  onSelectCodeTab,
  onResetCode,
  onCopyCode,
  codeLanguageForTabId,
}: ContentCreatorCodePanelProps) {
  if (!activeCodeFile) return null;

  return (
    <div className="mt-2 rounded border border-border bg-background/40">
      <div className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1">
        {codeTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectCodeTab(tab.id)}
            className={`rounded border px-2 py-0.5 text-[10px] font-mono ${
              activeCodeTabId === tab.id
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:bg-muted/30"
            }`}
            title={
              tab.id === "lang:typescript"
                ? "TypeScript"
                : tab.id === "lang:cpp"
                  ? "C++"
                  : tab.id === "lang:csharp"
                    ? "C#"
                    : tab.id === "json:schema"
                      ? "Schema JSON"
                      : "Asset JSON"
            }
          >
            {tab.id === "lang:typescript" ? (
              <SiTypescript className="h-3.5 w-3.5" />
            ) : tab.id === "lang:cpp" ? (
              <SiCplusplus className="h-3.5 w-3.5" />
            ) : tab.id === "lang:csharp" ? (
              <SiSharp className="h-3.5 w-3.5" />
            ) : tab.id === "json:schema" ? (
              <SiJsonwebtokens className="h-3.5 w-3.5" />
            ) : (
              <BracesIcon className="h-3.5 w-3.5" />
            )}
          </button>
        ))}
      </div>
      <div className="group/code flex items-center justify-between border-b border-border px-2 py-1 text-[10px] text-muted-foreground">
        <span className="inline-flex min-w-0 items-center gap-1 font-mono">
          <FileCode2Icon className="h-3 w-3 shrink-0" />
          <span className="truncate">{activeCodeFile.label}</span>
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onResetCode}
            className="opacity-0 transition-opacity group-hover/code:opacity-100 hover:text-foreground"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onCopyCode}
            className="opacity-0 transition-opacity group-hover/code:opacity-100 hover:text-foreground"
          >
            {copiedEditorCode ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <div className="h-72 overflow-auto">
        <SyntaxHighlighter
          language={codeLanguageForTabId(activeCodeFile.id)}
          style={oneDark}
          showLineNumbers
          wrapLongLines
          customStyle={{
            margin: 0,
            background: "transparent",
            fontSize: "10px",
            minHeight: "100%",
          }}
          lineNumberStyle={{
            minWidth: "2.5em",
            opacity: 0.5,
            paddingRight: "0.75em",
          }}
        >
          {objectEditorCode}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
