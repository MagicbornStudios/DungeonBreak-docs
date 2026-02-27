"use client";

import dynamic from "next/dynamic";

const PlayGameClient = dynamic(
  () => import("@/components/game/play-game-shell").then((mod) => mod.PlayGameShell),
  {
    loading: () => (
      <div className="play-shell">
        <div className="play-loading h-[540px] animate-pulse bg-card" />
      </div>
    ),
    ssr: false,
  },
);

export function PlayTerminalMount() {
  return <PlayGameClient />;
}
