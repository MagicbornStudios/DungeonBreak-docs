from __future__ import annotations

from dungeonbreak_narrative.escape_the_dungeon.narrative.deeds import Deed, DeedVectorizer
from dungeonbreak_narrative.escape_the_dungeon.narrative.projection import EmbeddingStore, HashEmbeddingProvider


def _sample_deed() -> Deed:
    return Deed(
        deed_id="d1",
        actor_id="kael",
        actor_name="Kael",
        deed_type="search",
        title="Search in corridor",
        summary="Kael searches and finds a chest.",
        depth=12,
        chapter_number=1,
        room_id="L12_R001",
        room_feature="treasure",
        turn_index=2,
        tags=("loot", "search", "loot"),
        outcome_tags=("Found", "found"),
        tone_tags=("Urgent", "urgent"),
    )


def test_deed_canonical_text_is_stable_and_sorted() -> None:
    deed = _sample_deed()
    text = deed.canonical_text()
    assert "tags: loot, search" in text
    assert "outcome_tags: found" in text
    assert "tone_tags: urgent" in text


def test_deed_vectorizer_uses_embedding_cache() -> None:
    store = EmbeddingStore(provider=HashEmbeddingProvider(dimension=24))
    vectorizer = DeedVectorizer(store=store)
    deed = _sample_deed()
    r1 = vectorizer.vectorize(deed)
    r2 = vectorizer.vectorize(deed)
    assert r1.text_hash == r2.text_hash
    assert r1.vector == r2.vector
    assert len(store.records) == 1
