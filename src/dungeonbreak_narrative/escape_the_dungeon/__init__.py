"""Escape the Dungeon modular text-adventure package."""

from .config import EscapeDungeonConfig
from .engine.bootstrap import EscapeDungeonSession, create_notebook_widget, create_session
from .engine.game import ActionAvailability, EscapeDungeonGame, GameEvent
from .narrative import Act, Chapter, Page
from .world import Dungeon, Level, RoomNode

__all__ = [
    "Act",
    "ActionAvailability",
    "Chapter",
    "Dungeon",
    "EscapeDungeonConfig",
    "EscapeDungeonSession",
    "EscapeDungeonGame",
    "GameEvent",
    "Level",
    "Page",
    "RoomNode",
    "create_notebook_widget",
    "create_session",
]
