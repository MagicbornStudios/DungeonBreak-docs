"""Player actions and intent modeling."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class PlayerAction:
    action_type: str
    payload: dict[str, Any]


def action_move(direction: str) -> PlayerAction:
    return PlayerAction(action_type="move", payload={"direction": direction.lower()})


def action_train() -> PlayerAction:
    return PlayerAction(action_type="train", payload={})


def action_talk(target_id: str | None = None) -> PlayerAction:
    payload = {"target_id": target_id} if target_id else {}
    return PlayerAction(action_type="talk", payload=payload)


def action_rest() -> PlayerAction:
    return PlayerAction(action_type="rest", payload={})


def action_search() -> PlayerAction:
    return PlayerAction(action_type="search", payload={})


def action_speak(intent_text: str) -> PlayerAction:
    return PlayerAction(action_type="speak", payload={"intent_text": intent_text})


def action_choose_dialogue(option_id: str) -> PlayerAction:
    return PlayerAction(action_type="choose_dialogue", payload={"option_id": option_id})


def action_live_stream(effort: float = 10.0) -> PlayerAction:
    return PlayerAction(action_type="live_stream", payload={"effort": float(effort)})


def action_steal(target_id: str | None = None) -> PlayerAction:
    payload = {"target_id": target_id} if target_id else {}
    return PlayerAction(action_type="steal", payload=payload)
