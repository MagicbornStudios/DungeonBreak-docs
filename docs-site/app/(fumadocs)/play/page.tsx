import Link from "next/link";
import { PlayTerminalMount } from "@/components/game/play-terminal-mount";

export default function PlayPage() {
  return (
    <main className="play-page">
      <section className="play-page-hero">
        <h1>Escape the Dungeon</h1>
        <p>
          Terminal-style browser run. One action equals one turn. Kael starts on
          depth 12 and must climb out while the dungeon simulates around you.
        </p>
        <p>
          Use <code>help</code> after load. The game autosaves to your browser.
        </p>
        <p>
          <Link href="/">Back to docs home</Link>
        </p>
      </section>
      <PlayTerminalMount />
    </main>
  );
}
