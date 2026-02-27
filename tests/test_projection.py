from __future__ import annotations

import numpy as np

from dungeonbreak_narrative.escape_the_dungeon.entities.models import TraitVector
from dungeonbreak_narrative.escape_the_dungeon.narrative.projection import (
    AnchorProjector,
    EmbeddingStore,
    HashEmbeddingProvider,
    NarrativeProjector,
    ProjectionBudget,
)


def test_hash_embedding_provider_is_deterministic() -> None:
    provider = HashEmbeddingProvider(dimension=32)
    a = provider.encode(["alpha beta"])[0]
    b = provider.encode(["alpha beta"])[0]
    c = provider.encode(["different text"])[0]
    assert np.allclose(a, b)
    assert not np.allclose(a, c)


def test_embedding_store_reuses_cache_for_same_text_hash() -> None:
    store = EmbeddingStore(provider=HashEmbeddingProvider(dimension=32))
    r1 = store.embed_canonical("deed", "a1", "hello world")
    r2 = store.embed_canonical("deed", "a1", "hello world")
    assert r1.text_hash == r2.text_hash
    assert r1.vector == r2.vector
    assert len(store.records) == 1


def test_anchor_projector_applies_caps_and_global_budget() -> None:
    provider = HashEmbeddingProvider(dimension=32)
    projector = AnchorProjector(
        feature_names=("A", "B", "C"),
        provider=provider,
        anchors={"A": "alpha", "B": "beta", "C": "gamma"},
    )
    vector = provider.encode(["alpha beta gamma"])[0]
    result = projector.project_vector(
        vector=vector,
        magnitude=1.5,
        budget=ProjectionBudget(
            per_feature_cap=0.4,
            global_budget=0.5,
            per_feature_caps={"A": 0.2},
        ),
    )
    assert abs(result.final_deltas["A"]) <= 0.2 + 1e-9
    assert sum(abs(v) for v in result.final_deltas.values()) <= 0.5 + 1e-9
    assert 0.0 < result.scale_factor <= 1.0


def test_narrative_projector_projects_and_applies_traits() -> None:
    provider = HashEmbeddingProvider(dimension=48)
    traits = TraitVector.zeros(("Comprehension", "Constraint", "Empathy"), min_value=-1.0, max_value=1.0)
    projector = NarrativeProjector(trait_names=tuple(traits.values.keys()), provider=provider)
    delta = projector.apply_to_traits(
        traits,
        "discipline with empathy and understanding",
        magnitude=0.3,
    )
    assert set(delta) == set(traits.values)
    assert any(abs(v) > 0.0 for v in delta.values())
    assert all(-1.0 <= value <= 1.0 for value in traits.values.values())
