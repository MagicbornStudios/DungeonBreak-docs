"use client";

import { useMemo, useRef } from "react";
import { useActiveContentPack } from "@/components/app-content/use-active-content-pack";
import { readActiveContentPacks, readActiveContentSignature } from "@/lib/active-content-pack";

export function PlayGameShell() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const activeSnapshot = useActiveContentPack();
  const iframeSrc = useMemo(() => {
    const params = new URLSearchParams();
    if (readActiveContentPacks(activeSnapshot)) {
      params.set("contentPackSource", "active");
      params.set("contentPackStrict", "1");
    } else {
      params.set("contentPackUrl", "default");
    }
    return `/game/index.html?${params.toString()}`;
  }, [activeSnapshot]);
  const iframeKey = useMemo(() => {
    return readActiveContentSignature(activeSnapshot) ?? "default";
  }, [activeSnapshot]);

  return (
    <div className="play-shell" data-testid="play-game-shell">
      <div className="mx-auto flex w-full max-w-5xl justify-center p-4">
        <iframe
          key={iframeKey}
          ref={iframeRef}
          src={iframeSrc}
          title="Escape the Dungeon (ASCII Grid)"
          className="h-[620px] w-full max-w-[920px] border border-border bg-background"
          data-testid="play-grid-iframe"
          tabIndex={0}
        />
      </div>
    </div>
  );
}
