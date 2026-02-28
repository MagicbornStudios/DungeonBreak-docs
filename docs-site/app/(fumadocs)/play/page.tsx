import Link from "next/link";
import { PlayTerminalMount } from "@/components/game/play-terminal-mount";

export default function PlayPage() {
  return (
    <main className="play-page">
      <section className="play-page-hero">
        <h1>Escape the Dungeon</h1>
        <p>
          Browser gameplay build. One action equals one turn. Kael starts on
          depth 12 and must climb while the dungeon simulates around you.
        </p>
        <p>
          Left column: actions. Center: story feed. Right column: status and
          nearby context. The game autosaves to your browser.
        </p>
        <p>
          Assistant Frame tools are exposed for window agents while preserving
          button-first play for humans.
        </p>
        <p>
          <Link href="/">Back to docs home</Link>
          {" · "}
          <Link href="/play/reports">Playthrough reports</Link>
          {" · "}
          <Link href="/play/content">Content packs</Link>
        </p>
      </section>
      <PlayTerminalMount />
    </main>
  );
}
