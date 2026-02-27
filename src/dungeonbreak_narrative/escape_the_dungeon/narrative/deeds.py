"""DeeD models and canonical text vectorization."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from .projection import EmbeddingRecord, EmbeddingStore, normalize_text


def _clean_tags(values: Iterable[str]) -> tuple[str, ...]:
    rows = {normalize_text(value) for value in values if normalize_text(value)}
    return tuple(sorted(rows))


@dataclass(frozen=True)
class Deed:
    deed_id: str
    actor_id: str
    actor_name: str
    deed_type: str
    title: str
    summary: str
    depth: int
    chapter_number: int
    room_id: str
    room_feature: str
    turn_index: int
    tags: tuple[str, ...] = ()
    outcome_tags: tuple[str, ...] = ()
    tone_tags: tuple[str, ...] = ()

    def canonical_text(self) -> str:
        tags_text = ", ".join(_clean_tags(self.tags))
        outcome_text = ", ".join(_clean_tags(self.outcome_tags))
        tone_text = ", ".join(_clean_tags(self.tone_tags))
        return "\n".join(
            [
                f"type: {normalize_text(self.deed_type)}",
                f"title: {normalize_text(self.title)}",
                f"actor: {normalize_text(self.actor_name)} ({normalize_text(self.actor_id)})",
                f"depth: {int(self.depth)}",
                f"chapter: {int(self.chapter_number)}",
                f"room: {normalize_text(self.room_id)}",
                f"room_feature: {normalize_text(self.room_feature)}",
                f"tags: {tags_text}",
                f"outcome_tags: {outcome_text}",
                f"tone_tags: {tone_text}",
                f"summary: {normalize_text(self.summary)}",
            ]
        )


@dataclass
class DeedVectorizer:
    store: EmbeddingStore

    def vectorize(self, deed: Deed) -> EmbeddingRecord:
        return self.store.embed_canonical(
            source_type="deed",
            source_id=deed.deed_id,
            canonical_text=deed.canonical_text(),
        )
