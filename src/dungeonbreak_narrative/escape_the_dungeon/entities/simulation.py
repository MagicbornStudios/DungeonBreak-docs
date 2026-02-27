"""Background NPC simulation."""

from __future__ import annotations

from dataclasses import dataclass
from random import Random

from ..player.actions import (
    PlayerAction,
    action_live_stream,
    action_move,
    action_rest,
    action_speak,
    action_talk,
    action_train,
)
from ..world.map import (
    ROOM_FEATURE_DIALOGUE,
    ROOM_FEATURE_REST,
    ROOM_FEATURE_TRAINING,
    DungeonWorld,
)


@dataclass
class BackgroundSimulator:
    random_seed: int = 17

    def __post_init__(self) -> None:
        self._rng = Random(self.random_seed)

    def choose_action(
        self,
        world: DungeonWorld,
        depth: int,
        room_id: str,
        energy: float,
        effort: float = 0.0,
        fame: float = 0.0,
    ) -> PlayerAction:
        room = world.get_room(depth, room_id)
        exits = world.exits_for(depth, room_id)

        if energy < 0.25:
            return action_rest()
        if room.feature == ROOM_FEATURE_TRAINING and self._rng.random() < 0.45:
            return action_train()
        if room.feature == ROOM_FEATURE_DIALOGUE and self._rng.random() < 0.5:
            return action_talk()
        if room.feature == ROOM_FEATURE_REST and self._rng.random() < 0.6:
            return action_rest()
        if effort >= 10.0 and (fame > 2.0 or room.feature == ROOM_FEATURE_DIALOGUE) and self._rng.random() < 0.18:
            return action_live_stream(10.0)

        roll = self._rng.random()
        if exits and roll < 0.65:
            direction = self._rng.choice(exits)
            return action_move(direction)
        if roll < 0.85:
            return action_speak("I keep searching for a safer way upward.")
        return action_rest()
