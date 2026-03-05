"use client";

import { useEffect, useMemo, useState } from "react";

export type ContentCreatorCodeTab = {
  id: string;
  label: string;
  code: string;
};

export function useContentCreatorCodeEditorState(codeTabs: ContentCreatorCodeTab[]) {
  const [activeCodeTabId, setActiveCodeTabId] = useState("");
  const [objectEditorCode, setObjectEditorCode] = useState("");
  const [copiedEditorCode, setCopiedEditorCode] = useState(false);

  const activeCodeFile = useMemo(() => {
    if (codeTabs.length === 0) return null;
    return codeTabs.find((tab) => tab.id === activeCodeTabId) ?? codeTabs[0]!;
  }, [codeTabs, activeCodeTabId]);

  useEffect(() => {
    if (codeTabs.length === 0) {
      setActiveCodeTabId("");
      return;
    }
    if (!activeCodeTabId || !codeTabs.some((tab) => tab.id === activeCodeTabId)) {
      setActiveCodeTabId(codeTabs[0]!.id);
    }
  }, [codeTabs, activeCodeTabId]);

  useEffect(() => {
    if (activeCodeFile) {
      setObjectEditorCode(activeCodeFile.code);
      return;
    }
    setObjectEditorCode("");
  }, [activeCodeFile]);

  const resetEditorCode = () => {
    if (activeCodeFile) {
      setObjectEditorCode(activeCodeFile.code);
      return;
    }
    setObjectEditorCode("");
  };

  const copyEditorCode = async () => {
    await navigator.clipboard.writeText(objectEditorCode);
    setCopiedEditorCode(true);
    window.setTimeout(() => setCopiedEditorCode(false), 1200);
  };

  return {
    activeCodeTabId,
    activeCodeFile,
    objectEditorCode,
    copiedEditorCode,
    setActiveCodeTabId,
    setObjectEditorCode,
    resetEditorCode,
    copyEditorCode,
  };
}
