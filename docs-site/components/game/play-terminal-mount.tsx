"use client";

import dynamic from "next/dynamic";

const PlayTerminalClient = dynamic(
  () => import("@/components/game/play-terminal").then((mod) => mod.PlayTerminal),
  {
    loading: () => (
      <div className="play-shell">
        <div className="play-terminal-skeleton h-[540px] animate-pulse bg-card" />
      </div>
    ),
    ssr: false,
  },
);

export function PlayTerminalMount() {
  return <PlayTerminalClient />;
}
