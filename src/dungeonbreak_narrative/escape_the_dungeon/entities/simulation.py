"""Background NPC simulation."""

from __future__ import annotations

from dataclasses import dataclass
from random import Random

from .models import EntityState
from ..player.actions import (
    PlayerAction,
)


@dataclass
class BackgroundSimulator:
    random_seed: int = 17

    def __post_init__(self) -> None:
        self._rng = Random(self.random_seed)

    def choose_from_legal_actions(
        self,
        actor: EntityState,
        legal_actions: list[PlayerAction],
        room_feature: str,
        nearby_enemy_count: int,
    ) -> PlayerAction:
        if not legal_actions:
            return PlayerAction(action_type="rest", payload={})

        # High-priority hostile policy.
        if actor.entity_kind in {"hostile", "boss"}:
            fight_actions = [action for action in legal_actions if action.action_type in {"fight", "murder"}]
            if fight_actions and nearby_enemy_count > 0:
                return self._rng.choice(fight_actions)
            move_actions = [action for action in legal_actions if action.action_type == "move"]
            if move_actions:
                return self._rng.choice(move_actions)

        weighted: list[tuple[PlayerAction, float]] = []
        for action in legal_actions:
            weight = 1.0
            if action.action_type == "rest":
                weight += max(0.0, 0.6 - actor.energy) * 3.0
            if action.action_type == "train":
                weight += max(0.0, actor.traits.values.get("Constraint", 0.0)) * 2.0
            if action.action_type == "search":
                weight += max(0.0, actor.traits.values.get("Projection", 0.0)) * 2.0
            if action.action_type in {"talk", "choose_dialogue"}:
                weight += max(0.0, actor.traits.values.get("Empathy", 0.0)) * 2.0
            if action.action_type in {"fight", "steal"}:
                weight += max(0.0, actor.traits.values.get("Survival", 0.0)) * 2.0
            if action.action_type == "live_stream":
                weight += max(0.0, actor.features.get("Fame")) * 0.15
            if action.action_type == "move":
                weight += 0.8
                if room_feature == "rune_forge":
                    weight += 0.8
            if action.action_type == "murder":
                weight += max(0.0, actor.traits.values.get("Survival", 0.0)) * 3.0
            weighted.append((action, max(0.05, weight)))

        total = sum(weight for _, weight in weighted)
        roll = self._rng.random() * total
        cursor = 0.0
        for action, weight in weighted:
            cursor += weight
            if cursor >= roll:
                return action
        return weighted[-1][0]
