"""
Game-aligned narrative demo engine.

This module consumes game trait names and optional exported narrative snapshot
data. It avoids inventing substitute demo axes.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Mapping

import numpy as np


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


DATA_DIR = Path(__file__).resolve().parent / "data"
TRAITS_MANIFEST_PATH = DATA_DIR / "game_traits_manifest.json"
SNAPSHOT_PATH = DATA_DIR / "narrative_snapshot.json"
THEMATIC_BASIS_VECTOR_DIR = (
    _repo_root() / "Content" / "DungeonBreak" / "Narrative" / "ThematicBasisVectors"
)

# Game-space scene ids are still useful for text-adventure demos.
SCENE_TOWN_SQUARE = "town_square"
SCENE_HOME_MOTHER = "home_mother"
SCENE_HOME_MERCHANT = "home_merchant"
SCENE_TO_NPC = {
    SCENE_TOWN_SQUARE: None,
    SCENE_HOME_MOTHER: "Mother",
    SCENE_HOME_MERCHANT: "Merchant",
}

# Event ids for notebook and text-adventure flows.
EVENT_TRAINING = "TRAINING"
EVENT_REST = "REST"
EVENT_DIALOG = "DIALOG"
EVENT_TRAVEL = "TRAVEL"

DEFAULT_DIALOG_THRESHOLD = 0.35
DEFAULT_EFFORT_COST_DIALOG = 0.15
EFFORT_RECOVERY_REST = 0.25
EFFORT_RECOVERY_PER_EVENT = 0.03
XP_GAIN_TRAINING = 10
XP_GAIN_DIALOG = 5
XP_PER_LEVEL = 30


def _load_json(path: Path, fallback: dict[str, Any]) -> dict[str, Any]:
    if not path.exists():
        return dict(fallback)
    with path.open("r", encoding="utf-8") as fp:
        return json.load(fp)


def _scan_folder_traits(traits_dir: Path | None = None) -> list[str]:
    folder = traits_dir or THEMATIC_BASIS_VECTOR_DIR
    if not folder.exists():
        return []
    traits = sorted(
        {
            asset.stem
            for asset in folder.iterdir()
            if asset.is_file() and asset.suffix.lower() == ".uasset"
        }
    )
    return traits


def load_game_traits_manifest(path: str | Path | None = None) -> list[str]:
    """Load canonical trait names from game_traits_manifest.json."""
    manifest_path = Path(path) if path is not None else TRAITS_MANIFEST_PATH
    manifest = _load_json(manifest_path, {"traits": []})
    return [str(name) for name in manifest.get("traits", [])]


def load_narrative_snapshot(path: str | Path | None = None) -> dict[str, Any]:
    """Load exported narrative snapshot data (entities/dialogs/basis vectors)."""
    snapshot_path = Path(path) if path is not None else SNAPSHOT_PATH
    snapshot = _load_json(
        snapshot_path,
        {"basis_vectors": [], "entities": [], "dialogs": [], "event_forces": {}, "quests": {}},
    )
    snapshot.setdefault("basis_vectors", [])
    snapshot.setdefault("entities", [])
    snapshot.setdefault("dialogs", [])
    snapshot.setdefault("event_forces", {})
    snapshot.setdefault("quests", {})
    return snapshot


def validate_game_alignment_warn_only(
    manifest_path: str | Path | None = None,
    snapshot_path: str | Path | None = None,
    traits_dir: str | Path | None = None,
) -> dict[str, Any]:
    """
    Compare folder trait assets vs manifest vs snapshot.

    Warn-only behavior: returns warnings list but never raises.
    """
    folder_traits = _scan_folder_traits(Path(traits_dir) if traits_dir else None)
    manifest_traits = load_game_traits_manifest(manifest_path)
    snapshot = load_narrative_snapshot(snapshot_path)
    snapshot_traits = [str(name) for name in snapshot.get("basis_vectors", [])]

    warnings: list[str] = []

    def _cmp(left: list[str], right: list[str], left_name: str, right_name: str) -> None:
        left_only = sorted(set(left) - set(right))
        right_only = sorted(set(right) - set(left))
        if left_only:
            warnings.append(f"{left_name} missing in {right_name}: {', '.join(left_only)}")
        if right_only:
            warnings.append(f"{right_name} extra vs {left_name}: {', '.join(right_only)}")
        if left == right:
            return
        if not left_only and not right_only:
            warnings.append(f"{left_name} and {right_name} contain same names but in different order")

    _cmp(folder_traits, manifest_traits, "Folder traits", "Manifest traits")
    _cmp(manifest_traits, snapshot_traits, "Manifest traits", "Snapshot basis_vectors")

    return {
        "ok": len(warnings) == 0,
        "warnings": warnings,
        "folder_traits": folder_traits,
        "manifest_traits": manifest_traits,
        "snapshot_traits": snapshot_traits,
    }


def trait_index(name: str, trait_names: list[str] | None = None) -> int:
    traits = trait_names if trait_names is not None else load_game_traits_manifest()
    return traits.index(name)


def position(*coords: float) -> np.ndarray:
    return np.array(coords, dtype=float)


def vector_from_trait_map(
    trait_values: Mapping[str, float], trait_names: list[str] | None = None, default: float = 0.0
) -> np.ndarray:
    traits = trait_names if trait_names is not None else load_game_traits_manifest()
    vector = np.full(len(traits), float(default), dtype=float)
    for i, trait in enumerate(traits):
        raw = trait_values.get(trait, default)
        vector[i] = float(raw)
    return vector


def trait_map_from_vector(vector: np.ndarray, trait_names: list[str] | None = None) -> dict[str, float]:
    traits = trait_names if trait_names is not None else load_game_traits_manifest()
    arr = np.array(vector, float)
    if arr.shape[0] != len(traits):
        raise ValueError("Vector size does not match trait list length.")
    return {trait: float(arr[i]) for i, trait in enumerate(traits)}


def distance(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.sqrt(np.sum((np.array(a, float) - np.array(b, float)) ** 2)))


def saliency_weight(d: float, radius: float = 0.5) -> float:
    return float(np.exp(-(d**2) / (2 * radius**2)))


def _dialog_location_vectors(
    snapshot: dict[str, Any], trait_names: list[str]
) -> list[tuple[np.ndarray, dict[str, Any]]]:
    dialog_vectors: list[tuple[np.ndarray, dict[str, Any]]] = []
    for dialog in snapshot.get("dialogs", []):
        location_map = dialog.get("location") or {}
        if not location_map:
            continue
        dialog_vectors.append((vector_from_trait_map(location_map, trait_names), dialog))
    return dialog_vectors


def options_above_threshold(
    entity_pos: np.ndarray,
    dialog_vectors: list[tuple[np.ndarray, dict[str, Any]]],
    threshold: float,
) -> list[tuple[dict[str, Any], float]]:
    in_range: list[tuple[dict[str, Any], float]] = []
    for location, dialog in dialog_vectors:
        d = distance(entity_pos, location)
        if d <= threshold:
            in_range.append((dialog, d))
    return in_range


def available_dialogs(
    entity_pos: np.ndarray,
    scene_id: str | None = None,
    snapshot: dict[str, Any] | None = None,
    trait_names: list[str] | None = None,
    threshold: float = DEFAULT_DIALOG_THRESHOLD,
) -> list[tuple[str, float, dict[str, Any]]]:
    """
    Returns available dialogs as tuples of:
    (label, distance, full_dialog_record).
    """
    traits = trait_names if trait_names is not None else load_game_traits_manifest()
    snap = snapshot if snapshot is not None else load_narrative_snapshot()
    dialog_vectors = _dialog_location_vectors(snap, traits)
    in_range = options_above_threshold(np.array(entity_pos, float), dialog_vectors, threshold)

    result: list[tuple[str, float, dict[str, Any]]] = []
    for dialog, d in in_range:
        allowed_scenes = dialog.get("scenes") or []
        if scene_id and allowed_scenes and scene_id not in allowed_scenes:
            continue
        label = str(dialog.get("label", ""))
        result.append((label, float(d), dialog))

    result.sort(key=lambda row: row[1])
    return result


def _find_entity(snapshot: dict[str, Any], entity_name: str) -> dict[str, Any] | None:
    lowered = entity_name.lower()
    for entity in snapshot.get("entities", []):
        if str(entity.get("name", "")).lower() == lowered:
            return entity
    return None


def _find_dialog(snapshot: dict[str, Any], label: str) -> dict[str, Any] | None:
    lowered = label.lower()
    for dialog in snapshot.get("dialogs", []):
        if str(dialog.get("label", "")).lower() == lowered:
            return dialog
    return None


def initial_state(
    scene_id: str = SCENE_TOWN_SQUARE,
    entity_name: str = "Kaiza",
    snapshot: dict[str, Any] | None = None,
    trait_names: list[str] | None = None,
) -> dict[str, Any]:
    """Build initial state aligned to game trait manifest and optional entity snapshot."""
    traits = trait_names if trait_names is not None else load_game_traits_manifest()
    snap = snapshot if snapshot is not None else load_narrative_snapshot()
    warnings: list[str] = []

    vector = np.zeros(len(traits), dtype=float)
    old_vector = np.zeros(len(traits), dtype=float)
    data_available = False

    entity = _find_entity(snap, entity_name)
    if entity is None:
        warnings.append(f"entity_not_found:{entity_name}")
    else:
        start_map = entity.get("starting_coordinates") or {}
        prev_map = entity.get("previous_coordinates") or {}
        if start_map:
            vector = vector_from_trait_map(start_map, traits)
            data_available = True
        else:
            warnings.append(f"starting_coordinates_missing:{entity_name}")
        if prev_map:
            old_vector = vector_from_trait_map(prev_map, traits)
        else:
            old_vector = vector.copy()

    return {
        "entity_name": entity_name,
        "trait_names": traits,
        "vector": vector.copy(),
        "old_vector": old_vector.copy(),
        "total_xp": 0.0,
        "effort_pool": 1.0,
        "cumulative_effort_spent": 0.0,
        "scene_id": scene_id,
        "data_available": data_available,
        "warnings": warnings,
    }


def in_quest_region(
    vector: np.ndarray, region: dict[str, Any] | None, trait_names: list[str] | None = None
) -> bool:
    if not region:
        return False
    traits = trait_names if trait_names is not None else load_game_traits_manifest()
    values = trait_map_from_vector(np.array(vector, float), traits)

    for trait, min_value in (region.get("min") or {}).items():
        if values.get(trait, 0.0) < float(min_value):
            return False
    for trait, max_value in (region.get("max") or {}).items():
        if values.get(trait, 0.0) > float(max_value):
            return False
    return True


def _event_force_map(
    event: Mapping[str, Any], snapshot: dict[str, Any]
) -> tuple[dict[str, float], str | None]:
    event_type = event.get("event_type", event.get("type", ""))
    if event_type == EVENT_DIALOG:
        chosen = event.get("chosen_dialog")
        if not chosen:
            return {}, "dialog_missing_selection"
        dialog = _find_dialog(snapshot, str(chosen))
        if dialog is None:
            return {}, f"dialog_not_found:{chosen}"
        force_map = dialog.get("force") or {}
        if not force_map:
            return {}, f"dialog_force_missing:{chosen}"
        return force_map, None

    event_forces = snapshot.get("event_forces") or {}
    force_map = event_forces.get(str(event_type)) or {}
    if not force_map:
        return {}, f"event_force_missing:{event_type}"
    return force_map, None


def apply_one_event(state: dict[str, Any], event: Mapping[str, Any], snapshot: dict[str, Any] | None = None):
    """
    Apply one event in trait space.

    Returns (new_state, log_row). Uses snapshot force data when available and
    warns instead of inventing fallback force vectors.
    """
    snap = snapshot if snapshot is not None else load_narrative_snapshot()
    traits = list(state.get("trait_names") or load_game_traits_manifest())

    vector = np.array(state["vector"], float)
    previous_vector = vector.copy()
    total_xp = float(state.get("total_xp", 0.0))
    effort_pool = float(state.get("effort_pool", 1.0))
    cumulative_effort_spent = float(state.get("cumulative_effort_spent", 0.0))
    warnings = list(state.get("warnings", []))

    event_type = event.get("event_type", event.get("type", ""))
    scene_id = str(event.get("scene_id", state.get("scene_id", SCENE_TOWN_SQUARE)))
    chosen_dialog = event.get("chosen_dialog")

    force_applied = False
    dialog_can_apply_force = True
    force_map, force_warning = _event_force_map(event, snap)

    if event_type == EVENT_TRAINING:
        total_xp += XP_GAIN_TRAINING
    elif event_type == EVENT_REST:
        effort_pool = min(1.0, effort_pool + EFFORT_RECOVERY_REST)
    elif event_type == EVENT_DIALOG and chosen_dialog and effort_pool >= DEFAULT_EFFORT_COST_DIALOG:
        effort_pool -= DEFAULT_EFFORT_COST_DIALOG
        cumulative_effort_spent += DEFAULT_EFFORT_COST_DIALOG
        total_xp += XP_GAIN_DIALOG
    elif event_type == EVENT_DIALOG and chosen_dialog and effort_pool < DEFAULT_EFFORT_COST_DIALOG:
        warnings.append("dialog_blocked_low_effort")
        dialog_can_apply_force = False

    # Apply snapshot-defined force only when available.
    if force_map:
        if event_type != EVENT_DIALOG or dialog_can_apply_force:
            vector = vector + vector_from_trait_map(force_map, traits)
            force_applied = True
    elif force_warning:
        warnings.append(force_warning)

    effort_pool = min(1.0, max(0.0, effort_pool + EFFORT_RECOVERY_PER_EVENT))
    level = 1 + int(total_xp // XP_PER_LEVEL)

    quest_region = (snap.get("quests") or {}).get("main_ch1")
    quest_ch1 = in_quest_region(vector, quest_region, traits) if quest_region else False
    available = [label for label, _, _ in available_dialogs(vector, scene_id, snap, traits)]

    new_state = {
        "entity_name": state.get("entity_name", "Kaiza"),
        "trait_names": traits,
        "vector": vector.copy(),
        "old_vector": previous_vector.copy(),
        "total_xp": total_xp,
        "effort_pool": effort_pool,
        "cumulative_effort_spent": cumulative_effort_spent,
        "scene_id": scene_id,
        "data_available": bool(state.get("data_available", False) or force_applied),
        "warnings": warnings,
    }
    log_row = {
        "event_type": event_type,
        "scene_id": scene_id,
        "npc_id": SCENE_TO_NPC.get(scene_id),
        "vector": vector.copy(),
        "trait_map": trait_map_from_vector(vector, traits),
        "level": level,
        "total_xp": total_xp,
        "effort_pool": effort_pool,
        "cumulative_effort_spent": cumulative_effort_spent,
        "quest_ch1_available": quest_ch1,
        "available_options": available,
        "chosen_dialog": chosen_dialog,
        "force_applied": force_applied,
        "warnings": list(warnings),
    }
    return new_state, log_row


def run_playthrough(
    events: list[Mapping[str, Any]],
    start_state: dict[str, Any] | None = None,
    snapshot: dict[str, Any] | None = None,
    entity_name: str = "Kaiza",
) -> list[dict[str, Any]]:
    """Simulate an event sequence in game-aligned trait space."""
    snap = snapshot if snapshot is not None else load_narrative_snapshot()
    state = dict(start_state) if start_state is not None else initial_state(entity_name=entity_name, snapshot=snap)
    event_log: list[dict[str, Any]] = []
    for i, ev in enumerate(events):
        state, row = apply_one_event(state, ev, snapshot=snap)
        row["event_index"] = i
        event_log.append(row)
    return event_log
