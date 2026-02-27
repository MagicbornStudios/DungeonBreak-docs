"""Embeddings and projection utilities for narrative and gameplay spaces."""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field
from typing import Any, Mapping, Protocol, Sequence

import numpy as np

from ..entities.models import TraitVector

Vector = np.ndarray


def _unit(vector: Sequence[float]) -> Vector:
    arr = np.array(vector, dtype=float)
    norm = float(np.linalg.norm(arr))
    if norm <= 1e-12:
        return arr
    return arr / norm


def _normalize_rows(matrix: Vector) -> Vector:
    arr = np.array(matrix, dtype=float)
    if arr.size == 0:
        return arr
    norms = np.linalg.norm(arr, axis=1, keepdims=True)
    norms[norms <= 1e-12] = 1.0
    return arr / norms


def normalize_text(text: str) -> str:
    return " ".join((text or "").strip().lower().split())


def cosine_similarity(a: Sequence[float], b: Sequence[float]) -> float:
    ua = _unit(a)
    ub = _unit(b)
    if ua.size == 0 or ub.size == 0:
        return 0.0
    return float(np.dot(ua, ub))


class EmbeddingProvider(Protocol):
    def encode(self, texts: Sequence[str]) -> Vector:
        ...


@dataclass
class HashEmbeddingProvider:
    dimension: int = 96
    _token_re: re.Pattern[str] = field(default=re.compile(r"[A-Za-z0-9_']+"), init=False, repr=False)

    def model_name(self) -> str:
        return "hash-token-embedding"

    def model_version(self) -> str:
        return "1"

    def _token_vector(self, token: str) -> Vector:
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        vec = np.zeros(self.dimension, dtype=float)
        for i in range(self.dimension):
            vec[i] = (float(digest[i % len(digest)]) / 127.5) - 1.0
        return vec

    def encode(self, texts: Sequence[str]) -> Vector:
        rows: list[Vector] = []
        for text in texts:
            tokens = self._token_re.findall((text or "").lower())
            if not tokens:
                rows.append(np.zeros(self.dimension, dtype=float))
                continue
            agg = np.zeros(self.dimension, dtype=float)
            for token in tokens:
                agg += self._token_vector(token)
            rows.append(_unit(agg))
        return np.vstack(rows)


@dataclass
class SentenceTransformerProvider:
    model_name_value: str = "sentence-transformers/all-MiniLM-L6-v2"
    _model: Any = field(init=False, repr=False)
    _dimension: int = field(init=False, repr=False)

    def __post_init__(self) -> None:
        from sentence_transformers import SentenceTransformer  # type: ignore

        self._model = SentenceTransformer(self.model_name_value)
        self._dimension = int(self._model.get_sentence_embedding_dimension())

    def model_name(self) -> str:
        return self.model_name_value

    def model_version(self) -> str:
        return "runtime"

    def encode(self, texts: Sequence[str]) -> Vector:
        return np.array(self._model.encode(list(texts)), dtype=float)


def _provider_model_name(provider: EmbeddingProvider) -> str:
    fn = getattr(provider, "model_name", None)
    return str(fn()) if callable(fn) else provider.__class__.__name__


def _provider_model_version(provider: EmbeddingProvider) -> str:
    fn = getattr(provider, "model_version", None)
    return str(fn()) if callable(fn) else "unknown"


def _provider_dimension(provider: EmbeddingProvider) -> int:
    vector = provider.encode(["dimension probe"])[0]
    return int(vector.shape[0])


def build_embedding_provider(prefer_sentence_transformer: bool = False) -> EmbeddingProvider:
    if prefer_sentence_transformer:
        try:
            return SentenceTransformerProvider()
        except Exception:
            return HashEmbeddingProvider()
    return HashEmbeddingProvider()


@dataclass(frozen=True)
class EmbeddingRecord:
    source_type: str
    source_id: str
    canonical_text: str
    text_hash: str
    model_name: str
    model_version: str
    dimension: int
    vector: tuple[float, ...]


@dataclass
class EmbeddingStore:
    provider: EmbeddingProvider
    records: dict[str, EmbeddingRecord] = field(default_factory=dict)

    def embed_canonical(self, source_type: str, source_id: str, canonical_text: str) -> EmbeddingRecord:
        normalized = normalize_text(canonical_text)
        text_hash = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
        model_name = _provider_model_name(self.provider)
        model_version = _provider_model_version(self.provider)
        key = f"{source_type}:{source_id}:{text_hash}:{model_name}:{model_version}"
        cached = self.records.get(key)
        if cached is not None:
            return cached

        vector = self.provider.encode([normalized])[0]
        record = EmbeddingRecord(
            source_type=source_type,
            source_id=source_id,
            canonical_text=normalized,
            text_hash=text_hash,
            model_name=model_name,
            model_version=model_version,
            dimension=int(vector.shape[0]),
            vector=tuple(float(v) for v in vector),
        )
        self.records[key] = record
        return record


@dataclass(frozen=True)
class ProjectionBudget:
    per_feature_cap: float = 0.20
    global_budget: float = 0.35
    per_feature_caps: Mapping[str, float] = field(default_factory=dict)

    def cap_for(self, feature_name: str) -> float:
        if feature_name in self.per_feature_caps:
            return float(self.per_feature_caps[feature_name])
        return float(self.per_feature_cap)


@dataclass(frozen=True)
class ProjectionResult:
    raw_deltas: dict[str, float]
    capped_deltas: dict[str, float]
    final_deltas: dict[str, float]
    similarities: dict[str, float]
    scale_factor: float


@dataclass
class AnchorProjector:
    feature_names: tuple[str, ...]
    provider: EmbeddingProvider
    anchors: Mapping[str, str | Sequence[str]]
    _anchor_matrix: Vector = field(init=False, repr=False)

    def __post_init__(self) -> None:
        rows: list[Vector] = []
        for feature in self.feature_names:
            prompt_value = self.anchors.get(feature, f"actions expressing {feature}")
            prompts = [prompt_value] if isinstance(prompt_value, str) else list(prompt_value)
            prompt_vectors = _normalize_rows(self.provider.encode(prompts))
            mean_vector = _unit(np.mean(prompt_vectors, axis=0))
            rows.append(mean_vector)
        self._anchor_matrix = _normalize_rows(np.vstack(rows))

    def project_vector(
        self,
        vector: Sequence[float],
        magnitude: float = 0.20,
        budget: ProjectionBudget | None = None,
    ) -> ProjectionResult:
        active_budget = budget if budget is not None else ProjectionBudget()
        query = _unit(vector)
        similarities_vec = self._anchor_matrix @ query
        similarities = {
            name: float(similarities_vec[i]) for i, name in enumerate(self.feature_names)
        }
        raw = {name: float(similarities[name]) * float(magnitude) for name in self.feature_names}
        capped: dict[str, float] = {}
        for name, value in raw.items():
            cap = active_budget.cap_for(name)
            capped[name] = max(-cap, min(cap, float(value)))
        total_abs = sum(abs(value) for value in capped.values())
        if total_abs <= 1e-12:
            return ProjectionResult(raw, capped, dict(capped), similarities, 1.0)
        scale = min(1.0, float(active_budget.global_budget) / total_abs)
        final = {name: float(value) * scale for name, value in capped.items()}
        return ProjectionResult(raw, capped, final, similarities, scale)

    def project_text(
        self,
        text: str,
        magnitude: float = 0.20,
        budget: ProjectionBudget | None = None,
    ) -> ProjectionResult:
        vector = self.provider.encode([text or ""])[0]
        return self.project_vector(vector=vector, magnitude=magnitude, budget=budget)

    def apply_to_mapping(
        self,
        values: Mapping[str, float],
        text: str,
        magnitude: float = 0.20,
        budget: ProjectionBudget | None = None,
    ) -> ProjectionResult:
        result = self.project_text(text=text, magnitude=magnitude, budget=budget)
        mutable = dict(values)
        for key, value in result.final_deltas.items():
            mutable[key] = float(mutable.get(key, 0.0)) + float(value)
        return result


DEFAULT_TRAIT_ANCHORS: dict[str, str] = {
    "Comprehension": "understanding patterns and hidden causes",
    "Constraint": "discipline, restraint, and strict control",
    "Construction": "building tools and practical structures",
    "Direction": "leadership and clear purpose",
    "Empathy": "care, compassion, and attentive listening",
    "Equilibrium": "balance, calm, and stable judgment",
    "Freedom": "independence, exploration, and improvisation",
    "Levity": "humor and hopeful lightness",
    "Projection": "future planning and ambition",
    "Survival": "resilience, safety, and endurance",
}


@dataclass
class NarrativeProjector:
    trait_names: tuple[str, ...]
    provider: EmbeddingProvider
    anchors: Mapping[str, str] = field(default_factory=dict)
    default_budget: ProjectionBudget = field(
        default_factory=lambda: ProjectionBudget(
            per_feature_cap=0.22,
            global_budget=0.35,
        )
    )
    _projector: AnchorProjector = field(init=False, repr=False)

    def __post_init__(self) -> None:
        prompts = {
            name: self.anchors.get(name, DEFAULT_TRAIT_ANCHORS.get(name, f"actions expressing {name}"))
            for name in self.trait_names
        }
        self._projector = AnchorProjector(
            feature_names=self.trait_names,
            provider=self.provider,
            anchors=prompts,
        )

    def project_text(
        self,
        text: str,
        magnitude: float = 0.2,
        budget: ProjectionBudget | None = None,
    ) -> dict[str, float]:
        result = self._projector.project_text(
            text=text,
            magnitude=magnitude,
            budget=budget or self.default_budget,
        )
        return result.final_deltas

    def project_vector(
        self,
        vector: Sequence[float],
        magnitude: float = 0.2,
        budget: ProjectionBudget | None = None,
    ) -> dict[str, float]:
        result = self._projector.project_vector(
            vector=vector,
            magnitude=magnitude,
            budget=budget or self.default_budget,
        )
        return result.final_deltas

    def apply_to_traits(
        self,
        traits: TraitVector,
        text: str,
        magnitude: float = 0.2,
        budget: ProjectionBudget | None = None,
    ) -> dict[str, float]:
        delta = self.project_text(text=text, magnitude=magnitude, budget=budget)
        traits.apply(delta)
        return delta
