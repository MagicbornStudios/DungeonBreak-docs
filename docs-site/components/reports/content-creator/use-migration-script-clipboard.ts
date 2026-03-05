"use client";

import { useState } from "react";

export function useMigrationScriptClipboard() {
  const [copiedScript, setCopiedScript] = useState(false);

  const copyMigrationScript = async (script: string) => {
    await navigator.clipboard.writeText(script);
    setCopiedScript(true);
    window.setTimeout(() => setCopiedScript(false), 1200);
  };

  return {
    copiedScript,
    copyMigrationScript,
  };
}
