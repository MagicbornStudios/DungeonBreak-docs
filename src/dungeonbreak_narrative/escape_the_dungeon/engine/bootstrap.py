"""Bootstrapping helpers for notebooks and scripts."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .adventurelib_shell import EscapeDungeonShell
from .game import EscapeDungeonGame, GameEvent


@dataclass
class EscapeDungeonSession:
    game: EscapeDungeonGame
    shell: EscapeDungeonShell


def create_session(
    player_name: str = "Kael",
    prefer_sentence_transformer: bool = False,
) -> EscapeDungeonSession:
    game = EscapeDungeonGame.create(
        player_name=player_name,
        prefer_sentence_transformer=prefer_sentence_transformer,
    )
    shell = EscapeDungeonShell(game=game)
    return EscapeDungeonSession(game=game, shell=shell)


def create_notebook_widget(game: EscapeDungeonGame):
    from ipywidgets import Button, HBox, HTML, Layout, Output, Text, VBox

    stats_html = HTML()
    intent_input = Text(
        placeholder="Speak intent text (embeddings projection)",
        layout=Layout(width="560px"),
    )
    option_input = Text(
        placeholder="Dialogue option id (example: loot_treasure)",
        layout=Layout(width="420px"),
    )
    target_input = Text(
        placeholder="Target entity id for talk/steal (optional)",
        layout=Layout(width="340px"),
    )
    output = Output(layout=Layout(border="1px solid #ddd", padding="8px", max_height="320px", overflow="auto"))
    action_row = HBox(layout=Layout(flex_flow="wrap", gap="6px"))
    move_row = HBox(layout=Layout(flex_flow="wrap", gap="6px"))

    def append_events(events: list[GameEvent]) -> None:
        with output:
            for event in events:
                print(
                    f"[{event.turn_index}] {event.actor_name} {event.action_type} "
                    f"(depth {event.depth}): {event.message}"
                )
                if event.warnings:
                    print(" WARN:", "; ".join(event.warnings))
            print("---")

    def render_stats() -> None:
        snapshot = game.status()
        quests = snapshot["quests"]
        quest_rows: list[str] = []
        for key, value in quests.items():
            if value["complete"]:
                quest_rows.append(f"{key}:done")
            else:
                required = game.quests[key].required_progress
                quest_rows.append(f"{key}:{value['progress']}/{required}")
        quests_text = ", ".join(quest_rows)
        options = snapshot.get("available_dialogue_options", [])
        options_text = ", ".join([row["option_id"] for row in options[:5]]) if options else "none"
        skills_text = ", ".join(snapshot.get("skills_unlocked", [])) or "none"
        available_actions = [row["label"] for row in snapshot.get("available_actions", []) if row["available"]]
        actions_text = ", ".join(available_actions[:8]) if available_actions else "none"
        stats_html.value = (
            f"<b>{snapshot['title']}</b> | <b>Player:</b> {snapshot['player']} "
            f"| <b>Depth:</b> {snapshot['depth']} | <b>Chapter:</b> {snapshot['chapter']} "
            f"| <b>Act:</b> {snapshot['act']} | <b>Lvl:</b> {snapshot['level']} "
            f"| <b>HP:</b> {snapshot['health']} | <b>Energy:</b> {snapshot['energy']}"
            f"| <b>Fame:</b> {snapshot['fame']} | <b>Effort:</b> {snapshot['effort']}"
            f"<br/><b>Room:</b> {snapshot['room_id']} | <b>Inventory:</b> "
            f"{', '.join(snapshot['inventory']) if snapshot['inventory'] else 'none'}"
            f"<br/><b>Top Traits:</b> "
            f"{', '.join([f'{k}={v:+.2f}' for k, v in snapshot['top_traits']])}"
            f"<br/><b>Skills:</b> {skills_text}"
            f"<br/><b>Quests:</b> {quests_text}"
            f"<br/><b>Dialogue Options:</b> {options_text}"
            f"<br/><b>Available Actions:</b> {actions_text}"
        )

    def bind_actions() -> None:
        children: list[Any] = []
        for label, fn in [
            ("Train", lambda: game.train()),
            ("Rest", lambda: game.rest()),
            ("Talk", lambda: game.talk(target_input.value or None)),
            ("Search", lambda: game.search()),
            ("Speak Intent", lambda: game.speak(intent_input.value)),
            ("Choose Option", lambda: game.choose_dialogue(option_input.value)),
            ("Stream", lambda: game.live_stream()),
            ("Steal", lambda: game.steal(target_input.value or None)),
        ]:
            btn = Button(description=label)
            btn.on_click(lambda _, action_fn=fn: on_events(action_fn()))
            children.append(btn)
        look_btn = Button(description="Look")
        look_btn.on_click(lambda _: on_look())
        children.insert(0, look_btn)
        action_row.children = children

        move_buttons: list[Any] = []
        for direction in ["north", "south", "east", "west", "up", "down"]:
            btn = Button(description=f"Go {direction}")
            btn.on_click(lambda _, d=direction: on_events(game.move(d)))
            move_buttons.append(btn)
        move_row.children = move_buttons

    def on_events(events: list[GameEvent]) -> None:
        if events:
            append_events(events)
        render_stats()

    def on_look() -> None:
        with output:
            print(game.look())
            print("---")
        render_stats()

    render_stats()
    bind_actions()
    with output:
        print(game.look())
        print("---")
        print("Goal: escape from depth 12 to the surface gate.")
        print("Each level = chapter. Every 4 chapters = act.")
        print("NPCs simulate in the background after each player action.")
        print("Use 'Choose Option' with an option id from the status line.")
        print("---")

    return VBox([stats_html, intent_input, option_input, target_input, action_row, move_row, output])
