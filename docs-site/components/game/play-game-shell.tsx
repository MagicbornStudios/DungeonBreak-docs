"use client";

import { useRef } from "react";

export function PlayGameShell() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  return (
    <div className="play-shell" data-testid="play-game-shell">
      <div className="mx-auto flex w-full max-w-5xl justify-center p-4">
        <iframe
          ref={iframeRef}
          src="/game/index.html"
          title="Escape the Dungeon (ASCII Grid)"
          className="h-[620px] w-full max-w-[920px] border border-border bg-background"
          data-testid="play-grid-iframe"
          tabIndex={0}
        />
      </div>
    </div>
  );
}
