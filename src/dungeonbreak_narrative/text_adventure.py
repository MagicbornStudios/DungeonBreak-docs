"""Compatibility bridge for text-adventure APIs.

The implementation now lives in the modular
`dungeonbreak_narrative.escape_the_dungeon` package.
"""

from __future__ import annotations

from .escape_the_dungeon import (
    Act,
    ActionAvailability,
    Chapter,
    Dungeon,
    EscapeDungeonConfig,
    EscapeDungeonGame,
    EscapeDungeonSession,
    GameEvent,
    Level,
    Page,
    RoomNode,
    create_notebook_widget,
    create_session,
)
from .escape_the_dungeon.narrative import (
    EmbeddingProvider,
    HashEmbeddingProvider,
    NarrativeProjector,
    SentenceTransformerProvider,
    build_embedding_provider,
)

TextAdventureGame = EscapeDungeonGame
build_notebook_widget = create_notebook_widget


def format_event(event: GameEvent) -> str:
    warnings = f" WARN: {', '.join(event.warnings)}" if event.warnings else ""
    return (
        f"[{event.turn_index}] {event.actor_name} -> {event.action_type} "
        f"(depth {event.depth}, chapter {event.chapter_number}) {event.message}{warnings}"
    )


__all__ = [
    "EmbeddingProvider",
    "Act",
    "ActionAvailability",
    "Chapter",
    "Dungeon",
    "EscapeDungeonConfig",
    "EscapeDungeonGame",
    "EscapeDungeonSession",
    "GameEvent",
    "HashEmbeddingProvider",
    "NarrativeProjector",
    "Level",
    "Page",
    "RoomNode",
    "SentenceTransformerProvider",
    "TextAdventureGame",
    "build_embedding_provider",
    "build_notebook_widget",
    "create_notebook_widget",
    "create_session",
    "format_event",
]
