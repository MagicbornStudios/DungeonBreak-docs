from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from dungeonbreak_narrative.escape_the_dungeon.engine.game import EscapeDungeonGame  # noqa: E402


@pytest.fixture
def game() -> EscapeDungeonGame:
    return EscapeDungeonGame.create(player_name="Kael", prefer_sentence_transformer=False)
