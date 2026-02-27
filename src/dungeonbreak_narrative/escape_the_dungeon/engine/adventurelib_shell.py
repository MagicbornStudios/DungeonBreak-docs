"""Command-shell integration built on vendored adventurelib."""

from __future__ import annotations

from contextlib import redirect_stdout
from dataclasses import dataclass
from io import StringIO

from ..integration.adventurelib_base import get_adventurelib, reset_command_registry
from .game import EscapeDungeonGame, GameEvent


@dataclass
class EscapeDungeonShell:
    game: EscapeDungeonGame

    def __post_init__(self) -> None:
        self.adventurelib = get_adventurelib()
        reset_command_registry()
        self._register_commands()

    def _print_events(self, events: list[GameEvent]) -> None:
        for event in events:
            self.adventurelib.say(
                f"[{event.turn_index}] {event.actor_name} -> {event.action_type}: {event.message}"
            )
            if event.warnings:
                self.adventurelib.say(f"WARN: {', '.join(event.warnings)}")

    def _register_commands(self) -> None:
        adv = self.adventurelib
        game = self.game
        this = self

        @adv.when("look")
        def look() -> None:
            adv.say(game.look())

        @adv.when("status")
        def status() -> None:
            snapshot = game.status()
            adv.say(snapshot)

        @adv.when("actions")
        def actions() -> None:
            rows = game.available_actions(include_blocked=True)
            for row in rows:
                if row.available:
                    adv.say(f"[ok] {row.label}")
                else:
                    adv.say(f"[blocked] {row.label} -> {', '.join(row.blocked_reasons)}")

        @adv.when("options")
        def options() -> None:
            rows = game.available_dialogue_options()
            if not rows:
                adv.say("No dialogue options are in range right now.")
                return
            for row in rows:
                adv.say(f"{row['option_id']}: {row['label']} (dist={row['distance']})")

        @adv.when("options all")
        def options_all() -> None:
            rows = game.evaluate_dialogue_options()
            if not rows:
                adv.say("No dialogue options found.")
                return
            for row in rows:
                if row["available"]:
                    adv.say(f"[ok] {row['option_id']}: {row['label']} (dist={row['distance']})")
                else:
                    reasons = ", ".join(row["blocked_reasons"])
                    adv.say(f"[blocked] {row['option_id']}: {row['label']} -> {reasons}")

        @adv.when("go DIRECTION")
        def go(direction: str) -> None:
            this._print_events(game.move(direction))

        @adv.when("train")
        def train() -> None:
            this._print_events(game.train())

        @adv.when("rest")
        def rest() -> None:
            this._print_events(game.rest())

        @adv.when("talk")
        def talk() -> None:
            this._print_events(game.talk())

        @adv.when("search")
        def search() -> None:
            this._print_events(game.search())

        @adv.when("say TEXT")
        def say_text(text: str) -> None:
            this._print_events(game.speak(text))

        @adv.when("stream")
        def stream() -> None:
            this._print_events(game.live_stream())

        @adv.when("steal")
        def steal() -> None:
            this._print_events(game.steal())

        @adv.when("steal TARGET")
        def steal_target(target: str) -> None:
            this._print_events(game.steal(target_id=target))

        @adv.when("choose OPTION")
        def choose(option: str) -> None:
            this._print_events(game.choose_dialogue(option))

        @adv.when("skills")
        def skills() -> None:
            snapshot = game.status()
            unlocked = snapshot.get("skills_unlocked", [])
            unlockable = snapshot.get("skills_unlockable", [])
            adv.say(f"Unlocked: {', '.join(unlocked) if unlocked else 'none'}")
            adv.say("Unlock candidates:")
            for row in unlockable:
                if row["available"]:
                    adv.say(f"  [ready] {row['skill_id']} dist={row['distance']}")
                else:
                    adv.say(f"  [blocked] {row['skill_id']} -> {', '.join(row['blocked_reasons'])}")

        @adv.when("deeds")
        def deeds() -> None:
            rows = game.recent_deeds(limit=8)
            if not rows:
                adv.say("No deeds recorded yet.")
                return
            for row in rows:
                adv.say(f"{row['deed_id']} | ch{row['chapter']} t{row['turn']} | {row['summary']}")

        @adv.when("cutscenes")
        def cutscenes() -> None:
            rows = game.recent_cutscenes(limit=8)
            if not rows:
                adv.say("No cutscenes yet.")
                return
            for row in rows:
                adv.say(f"[turn {row['turn_index']}] {row['title']}: {row['message']}")

        @adv.when("pages")
        def pages() -> None:
            chapter_pages = game.chapter_pages()
            for page_id, entries in chapter_pages.items():
                adv.say(f"{page_id}:")
                for row in entries[-5:]:
                    adv.say(f"  {row}")

    def run_command(self, command: str) -> str:
        """Execute a single command and capture shell output."""
        buf = StringIO()
        with redirect_stdout(buf):
            self.adventurelib._handle_command(command)
        return buf.getvalue().strip()

    def start(self) -> None:
        self.adventurelib.start(help=True)
