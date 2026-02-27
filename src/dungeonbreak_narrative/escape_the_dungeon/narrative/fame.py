"""Deterministic Fame context formula."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


@dataclass(frozen=True)
class FameFormulaInput:
    current_fame: float
    effort_spent: float
    room_vector: Mapping[str, float]
    action_novelty: float
    risk_level: float
    momentum: float
    has_broadcast_skill: bool


@dataclass(frozen=True)
class FameFormulaResult:
    gain: float
    base_gain: float
    context_multiplier: float
    diminishing_factor: float
    components: dict[str, float]


def compute_fame_gain(data: FameFormulaInput) -> FameFormulaResult:
    projection = float(data.room_vector.get("Projection", 0.0))
    levity = float(data.room_vector.get("Levity", 0.0))
    direction = float(data.room_vector.get("Direction", 0.0))
    survival = float(data.room_vector.get("Survival", 0.0))

    room_interest = _clamp((0.6 * projection) + (0.4 * levity) + (0.25 * direction) + (0.2 * survival), -0.6, 1.6)
    novelty = _clamp(float(data.action_novelty), 0.0, 1.6)
    risk = _clamp(float(data.risk_level), 0.0, 1.4)
    momentum_bonus = _clamp(float(data.momentum) * 0.04, 0.0, 0.30)
    skill_bonus = 0.15 if data.has_broadcast_skill else 0.0

    context_multiplier = max(
        0.15,
        1.0
        + (0.45 * room_interest)
        + (0.30 * novelty)
        + (0.25 * risk)
        + momentum_bonus
        + skill_bonus,
    )
    effort_factor = max(0.0, float(data.effort_spent) / 10.0)
    base_gain = 1.0 * effort_factor
    diminishing = 1.0 / (1.0 + (max(0.0, float(data.current_fame)) / 120.0))
    gain = round(max(0.0, base_gain * context_multiplier * diminishing), 4)
    return FameFormulaResult(
        gain=gain,
        base_gain=base_gain,
        context_multiplier=context_multiplier,
        diminishing_factor=diminishing,
        components={
            "room_interest": room_interest,
            "novelty": novelty,
            "risk": risk,
            "momentum_bonus": momentum_bonus,
            "skill_bonus": skill_bonus,
        },
    )
