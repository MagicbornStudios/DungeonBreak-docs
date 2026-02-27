"""Core game loop for Escape the Dungeon."""

from __future__ import annotations

from dataclasses import dataclass, field
from random import Random
from typing import Mapping

from ..combat.system import CombatSystem
from ..config import EscapeDungeonConfig
from ..entities.models import (
    ActiveEffect,
    AttributeBlock,
    DeedMemory,
    EntityState,
    FeatureVector,
    ItemInstance,
    QuestState,
    RumorMemory,
    TraitVector,
)
from ..entities.simulation import BackgroundSimulator
from ..narrative.cutscenes import (
    CutsceneContext,
    CutsceneDirector,
    CutsceneHit,
    build_default_cutscene_director,
)
from ..narrative.deeds import Deed, DeedVectorizer
from ..narrative.dialogue import DialogueDirector, build_default_dialogue_director
from ..narrative.fame import FameFormulaInput, FameFormulaResult, compute_fame_gain
from ..narrative.journal import StoryJournal
from ..narrative.prerequisites import (
    AvailabilityResult,
    Prerequisite,
    PrerequisiteContext,
    evaluate_prerequisites,
)
from ..narrative.projection import (
    AnchorProjector,
    EmbeddingStore,
    NarrativeProjector,
    ProjectionBudget,
    build_embedding_provider,
)
from ..narrative.skills import SkillDirector, build_default_skill_director
from ..player.actions import (
    PlayerAction,
    action_choose_dialogue,
    action_evolve_skill,
    action_live_stream,
    action_murder,
    action_move,
    action_recruit,
    action_rest,
    action_search,
    action_speak,
    action_steal,
    action_talk,
    action_train,
)
from ..world.map import (
    ROOM_FEATURE_COMBAT,
    ROOM_FEATURE_DIALOGUE,
    ROOM_FEATURE_ESCAPE_GATE,
    ROOM_FEATURE_RUNE_FORGE,
    ROOM_FEATURE_REST,
    ROOM_FEATURE_TRAINING,
    ROOM_FEATURE_TREASURE,
    Dungeon,
    RoomItemState,
    RoomNode,
    build_dungeon_world,
)

DEFAULT_FEATURE_ANCHORS: dict[str, str] = {
    "Fame": "attention, audience reach, public recognition, crowd engagement",
    "Effort": "spent stamina, sustained work, exertion, focus cost",
    "Awareness": "perception, noticing details, situational awareness",
    "Guile": "deception, stealth, opportunistic manipulation",
    "Momentum": "building pace, escalating progress, rising pressure",
}


@dataclass(frozen=True)
class ActionAvailability:
    action_type: str
    label: str
    available: bool
    blocked_reasons: tuple[str, ...] = ()
    payload: dict[str, object] = field(default_factory=dict)


@dataclass
class GameEvent:
    turn_index: int
    actor_id: str
    actor_name: str
    action_type: str
    depth: int
    room_id: str
    chapter_number: int
    act_number: int
    message: str
    warnings: list[str] = field(default_factory=list)
    trait_delta: dict[str, float] = field(default_factory=dict)
    feature_delta: dict[str, float] = field(default_factory=dict)
    metadata: dict[str, object] = field(default_factory=dict)

    def to_dict(self) -> dict[str, object]:
        return {
            "turn_index": self.turn_index,
            "actor_id": self.actor_id,
            "actor_name": self.actor_name,
            "action_type": self.action_type,
            "depth": self.depth,
            "room_id": self.room_id,
            "chapter_number": self.chapter_number,
            "act_number": self.act_number,
            "message": self.message,
            "warnings": list(self.warnings),
            "trait_delta": dict(self.trait_delta),
            "feature_delta": dict(self.feature_delta),
            "metadata": dict(self.metadata),
        }


def _scale_map(values: Mapping[str, float], factor: float) -> dict[str, float]:
    return {k: float(v) * float(factor) for k, v in values.items()}


def _top_nonzero(values: Mapping[str, float], limit: int = 3) -> list[tuple[str, float]]:
    rows = [(k, float(v)) for k, v in values.items() if abs(float(v)) > 1e-6]
    rows.sort(key=lambda row: abs(row[1]), reverse=True)
    return rows[: max(1, int(limit))]


def _diff_map(before: Mapping[str, float], after: Mapping[str, float]) -> dict[str, float]:
    keys = set(before) | set(after)
    rows = {
        key: float(after.get(key, 0.0)) - float(before.get(key, 0.0))
        for key in keys
    }
    return {key: value for key, value in rows.items() if abs(value) > 1e-9}


@dataclass
class EscapeDungeonGame:
    config: EscapeDungeonConfig
    world: Dungeon
    player: EntityState
    entities: dict[str, EntityState]
    quests: dict[str, QuestState]
    projector: NarrativeProjector
    feature_projector: AnchorProjector
    embedding_store: EmbeddingStore
    deed_vectorizer: DeedVectorizer
    dialogue: DialogueDirector
    skills: SkillDirector
    cutscenes: CutsceneDirector
    combat: CombatSystem
    simulator: BackgroundSimulator
    journal: StoryJournal
    turn_index: int = 0
    event_log: list[GameEvent] = field(default_factory=list)
    action_history: list[str] = field(default_factory=list)
    global_enemy_level_bonus: int = 0
    hostile_spawn_index: int = 0
    active_companion_id: str | None = None
    run_branch_choice: str | None = None
    global_event_flags: set[str] = field(default_factory=set)
    escaped: bool = False

    @classmethod
    def create(
        cls,
        player_name: str = "Kael",
        prefer_sentence_transformer: bool = False,
    ) -> "EscapeDungeonGame":
        config = EscapeDungeonConfig.from_manifest(player_name=player_name)
        world = build_dungeon_world(config)
        provider = build_embedding_provider(prefer_sentence_transformer=prefer_sentence_transformer)
        embedding_store = EmbeddingStore(provider=provider)
        projector = NarrativeProjector(trait_names=config.trait_names, provider=provider)
        feature_projector = AnchorProjector(
            feature_names=("Fame", "Effort", "Awareness", "Guile", "Momentum"),
            provider=provider,
            anchors=DEFAULT_FEATURE_ANCHORS,
        )
        deed_vectorizer = DeedVectorizer(store=embedding_store)
        dialogue = build_default_dialogue_director(trait_names=config.trait_names)
        skills = build_default_skill_director(trait_names=config.trait_names)

        player = EntityState(
            entity_id="kael",
            name=config.player_name,
            is_player=True,
            entity_kind="player",
            depth=world.start_depth,
            room_id=world.start_room_id,
            traits=TraitVector.zeros(
                trait_names=config.trait_names,
                min_value=config.min_trait_value,
                max_value=config.max_trait_value,
            ),
            attributes=AttributeBlock(might=6, agility=5, insight=5, willpower=6),
            features=FeatureVector.defaults(),
            faction="freelancer",
            reputation=0.0,
            base_level=1,
            health=config.default_player_health,
            energy=config.default_player_energy,
        )

        rng = Random(config.random_seed + 11)
        dungeoneer_names = [
            "Mira", "Dagan", "Yori", "Sable", "Fen", "Ibis", "Noel", "Rook",
            "Cora", "Jex", "Vale", "Ryn", "Lio", "Tamsin", "Orin", "Bram",
        ]
        entities: dict[str, EntityState] = {"kael": player}
        dungeoneer_idx = 0

        for depth in range(config.total_levels, 0, -1):
            level = world.get_level(depth)
            candidate_rooms = [room_id for room_id, room in level.rooms.items() if room.feature != ROOM_FEATURE_RUNE_FORGE]
            rng.shuffle(candidate_rooms)

            # Per-level dungeoneers.
            for slot in range(config.dungeoneers_per_level):
                if not candidate_rooms:
                    break
                room_id = candidate_rooms.pop()
                dungeoneer_idx += 1
                name = dungeoneer_names[(dungeoneer_idx - 1) % len(dungeoneer_names)]
                faction = "laughing_face" if (dungeoneer_idx % 11 == 0) else "freelancer"
                npc = EntityState(
                    entity_id=f"dungeoneer_{depth:02d}_{slot+1:02d}",
                    name=name,
                    is_player=False,
                    entity_kind="dungeoneer",
                    depth=depth,
                    room_id=room_id,
                    traits=TraitVector.zeros(
                        trait_names=config.trait_names,
                        min_value=config.min_trait_value,
                        max_value=config.max_trait_value,
                    ),
                    attributes=AttributeBlock(might=5, agility=5, insight=5, willpower=5),
                    features=FeatureVector.defaults(),
                    faction=faction,
                    reputation=-2.0 if faction == "laughing_face" else 0.0,
                    base_level=max(1, config.total_levels - depth + 1),
                    health=94,
                    energy=1.0,
                )
                npc.features.set("Effort", 80.0)
                npc.inventory.append(
                    ItemInstance(
                        item_id=f"loot_{npc.entity_id}",
                        name="Worn Pouch",
                        rarity="common",
                        description="A pouch with mixed salvage.",
                        tags=("loot", "currency"),
                        trait_delta={"Projection": 0.03},
                    )
                )
                entities[npc.entity_id] = npc

            # Exit room boss per level.
            boss_room_id = level.exit_room_id
            boss = EntityState(
                entity_id=f"boss_{depth:02d}",
                name=f"Depth {depth} Warden",
                is_player=False,
                entity_kind="boss",
                depth=depth,
                room_id=boss_room_id,
                traits=TraitVector.zeros(
                    trait_names=config.trait_names,
                    min_value=config.min_trait_value,
                    max_value=config.max_trait_value,
                ),
                attributes=AttributeBlock(
                    might=7 + max(0, config.total_levels - depth),
                    agility=6 + max(0, (config.total_levels - depth) // 2),
                    insight=5 + max(0, (config.total_levels - depth) // 3),
                    willpower=7 + max(0, (config.total_levels - depth) // 2),
                ),
                features=FeatureVector.defaults(),
                faction="dungeon_legion",
                reputation=-5.0,
                archetype_heading="warden",
                base_level=max(2, config.total_levels - depth + 1 + config.boss_level_bonus),
                health=120,
                energy=1.0,
            )
            boss.inventory.append(
                ItemInstance(
                    item_id=f"boss_weapon_{depth:02d}",
                    name="Gatekeeper Halberd",
                    rarity="epic",
                    description="A heavy weapon used by gatekeepers.",
                    tags=("weapon", "epic"),
                    trait_delta={"Direction": 0.10, "Survival": 0.10},
                )
            )
            entities[boss.entity_id] = boss

        quests = {
            "escape": QuestState(
                quest_id="escape",
                title="Break the Surface",
                description="Find each level exit and reach the final gate.",
                target_depth=1,
            ),
            "training": QuestState(
                quest_id="training",
                title="Steel in the Dark",
                description="Train 6 times to survive upper levels.",
                target_depth=config.total_levels,
                required_progress=6,
            ),
            "chronicle": QuestState(
                quest_id="chronicle",
                title="Dungeon Chronicle",
                description="Complete chapter logs from level 12 to level 1.",
                target_depth=1,
                required_progress=config.total_levels,
            ),
        }

        journal = StoryJournal(
            chapters_per_act=config.chapters_per_act,
            total_levels=config.total_levels,
        )
        first_chapter = world.chapter_for_depth(world.start_depth)
        journal.ensure_chapter_pages(first_chapter, entities.keys())

        game = cls(
            config=config,
            world=world,
            player=player,
            entities=entities,
            quests=quests,
            projector=projector,
            feature_projector=feature_projector,
            embedding_store=embedding_store,
            deed_vectorizer=deed_vectorizer,
            dialogue=dialogue,
            skills=skills,
            cutscenes=build_default_cutscene_director(),
            combat=CombatSystem(random_seed=config.random_seed + 3),
            simulator=BackgroundSimulator(random_seed=config.random_seed + 5),
            journal=journal,
        )
        game._warm_semantic_cache()
        game._record(
            actor=player,
            action_type="start",
            message=f"{config.game_title} begins. {player.name} wakes on depth {player.depth}.",
            warnings=[],
            advance_turn=True,
        )
        return game

    def _warm_semantic_cache(self) -> None:
        for depth in self.world.levels:
            level = self.world.get_level(depth)
            for room in level.rooms.values():
                room_text = f"room {room.room_id} depth {depth} feature {room.feature} {room.description}"
                self.embedding_store.embed_canonical("room", room.room_id, room_text)
                for item in room.items:
                    item_text = f"item {item.item_id} {item.name} tags {' '.join(item.tags)}"
                    self.embedding_store.embed_canonical("room_item", item.item_id, item_text)
        for cluster in self.dialogue.clusters.values():
            for option in cluster.options:
                option_text = f"dialogue {option.option_id} {option.label} {option.line} {option.response_text}"
                self.embedding_store.embed_canonical("dialogue_option", option.option_id, option_text)

    def _record(
        self,
        actor: EntityState,
        action_type: str,
        message: str,
        warnings: list[str],
        trait_delta: Mapping[str, float] | None = None,
        feature_delta: Mapping[str, float] | None = None,
        metadata: Mapping[str, object] | None = None,
        advance_turn: bool = True,
    ) -> GameEvent:
        chapter = self.world.chapter_for_depth(actor.depth)
        act = self.world.act_for_depth(actor.depth, self.config.chapters_per_act)
        self.journal.ensure_chapter_pages(chapter, self.entities.keys())
        page_message = f"{action_type}@{actor.room_id}: {message}"
        self.journal.write(chapter=chapter, entity_id=actor.entity_id, turn_index=self.turn_index, message=page_message)
        event = GameEvent(
            turn_index=self.turn_index,
            actor_id=actor.entity_id,
            actor_name=actor.name,
            action_type=action_type,
            depth=actor.depth,
            room_id=actor.room_id,
            chapter_number=chapter,
            act_number=act,
            message=message,
            warnings=warnings,
            trait_delta={k: float(v) for k, v in (trait_delta or {}).items()},
            feature_delta={k: float(v) for k, v in (feature_delta or {}).items()},
            metadata={k: v for k, v in (metadata or {}).items()},
        )
        self.event_log.append(event)
        if advance_turn:
            self.turn_index += 1
        return event

    def _record_cutscenes(self, actor: EntityState, hits: list[CutsceneHit]) -> list[GameEvent]:
        rows: list[GameEvent] = []
        for hit in hits:
            rows.append(
                self._record(
                    actor=actor,
                    action_type="cutscene",
                    message=f"[{hit.title}] {hit.text}",
                    warnings=[],
                    metadata={"cutscene_id": hit.cutscene_id, "cutscene_title": hit.title},
                    advance_turn=False,
                )
            )
        return rows

    def _current_room(self, actor: EntityState) -> RoomNode:
        return self.world.get_room(actor.depth, actor.room_id)

    def _room_feature(self, actor: EntityState) -> str:
        return self._current_room(actor).feature

    def _same_room_entities(self, actor: EntityState) -> list[EntityState]:
        rows: list[EntityState] = []
        for entity in self.entities.values():
            if entity.entity_id == actor.entity_id:
                continue
            if entity.depth == actor.depth and entity.room_id == actor.room_id:
                rows.append(entity)
        return rows

    def _active_companion_for(self, actor: EntityState) -> str | None:
        for entity in self.entities.values():
            if entity.companion_to == actor.entity_id and entity.health > 0:
                return entity.entity_id
        return None

    def _room_vector_for(self, actor: EntityState) -> dict[str, float]:
        room = self._current_room(actor)
        return room.effective_vector(self.config.trait_names)

    def _apply_room_vector_influence(self, actor: EntityState, scale: float = 0.05) -> dict[str, float]:
        room_vector = self._room_vector_for(actor)
        delta = _scale_map(room_vector, scale)
        actor.traits.apply(delta)
        return delta

    def evaluate_dialogue_options(self, actor: EntityState | None = None) -> list[dict[str, object]]:
        entity = self.player if actor is None else actor
        room = self._current_room(entity)
        rows = self.dialogue.evaluate_options(entity, room)
        return [
            {
                "option_id": row.option_id,
                "label": row.label,
                "line": row.line,
                "cluster": row.cluster_id,
                "distance": round(float(row.distance), 4),
                "available": bool(row.available),
                "blocked_reasons": list(row.blocked_reasons),
            }
            for row in rows
        ]

    def available_dialogue_options(self, actor: EntityState | None = None) -> list[dict[str, object]]:
        return [row for row in self.evaluate_dialogue_options(actor) if row["available"]]

    def _availability_for_action(self, actor: EntityState, action: PlayerAction) -> AvailabilityResult:
        room = self._current_room(actor)
        nearby = self._same_room_entities(actor)
        exits = self.world.exits_for(actor.depth, actor.room_id)
        action_type = action.action_type
        payload = dict(action.payload)
        prereqs: tuple[Prerequisite, ...] = ()
        target: EntityState | None = None

        if action_type == "move":
            direction = str(payload.get("direction", "")).lower()
            if actor.is_player and direction == "up" and room.feature == ROOM_FEATURE_ESCAPE_GATE:
                return AvailabilityResult(available=True, blocked_reasons=())
            step = self.world.step(
                actor.depth,
                actor.room_id,
                direction,
                blocked_room_features=(ROOM_FEATURE_RUNE_FORGE,) if actor.entity_kind in {"hostile", "boss"} else (),
            )
            if step is None:
                return AvailabilityResult(available=False, blocked_reasons=(f"No exit to {direction}",))
            prereqs = ()
        elif action_type == "train":
            prereqs = (
                Prerequisite("room_feature_is", value=ROOM_FEATURE_TRAINING, description="Need training room"),
            )
        elif action_type == "talk":
            prereqs = (Prerequisite("target_exists", description="Need someone in the room"),)
        elif action_type == "fight":
            prereqs = (Prerequisite("target_exists", description="Need an opponent in the room"),)
        elif action_type == "choose_dialogue":
            option_id = str(payload.get("option_id", ""))
            rows = self.evaluate_dialogue_options(actor)
            matched = next((row for row in rows if str(row["option_id"]).lower() == option_id.lower()), None)
            if matched is None:
                return AvailabilityResult(available=False, blocked_reasons=("unknown_dialogue_option",))
            if not matched["available"]:
                return AvailabilityResult(
                    available=False,
                    blocked_reasons=tuple(str(v) for v in matched["blocked_reasons"]),
                )
            return AvailabilityResult(available=True, blocked_reasons=())
        elif action_type == "live_stream":
            prereqs = (Prerequisite("min_feature", key="Effort", value=10.0, description="Need Effort >= 10"),)
        elif action_type == "steal":
            target_id = payload.get("target_id")
            if target_id:
                target = self.entities.get(str(target_id))
                if target is not None and (target.depth != actor.depth or target.room_id != actor.room_id):
                    target = None
            if target is None and nearby:
                target = nearby[0]
            prereqs = (
                Prerequisite("skill_unlocked", key="shadow_hand", description="Need Shadow Hand skill"),
                Prerequisite("target_exists", description="Need a target"),
                Prerequisite("target_has_item_tag", key="loot", description="Target has no loot"),
            )
        elif action_type == "recruit":
            if self._active_companion_for(actor) is not None:
                return AvailabilityResult(available=False, blocked_reasons=("Companion slot is full",))
            target = self._find_target(actor, payload.get("target_id"))
            if target is None:
                return AvailabilityResult(available=False, blocked_reasons=("Need a target",))
            if target.entity_kind != "dungeoneer":
                return AvailabilityResult(available=False, blocked_reasons=("Only dungeoneers can be recruited",))
            if target.companion_to is not None:
                return AvailabilityResult(available=False, blocked_reasons=("Target already follows another entity",))
            if target.faction in {"laughing_face", "dungeon_legion"}:
                return AvailabilityResult(available=False, blocked_reasons=("Target faction refuses companionship",))
            trait_gap = abs(actor.traits.values.get("Empathy", 0.0) - target.traits.values.get("Empathy", 0.0))
            if trait_gap > 0.9:
                return AvailabilityResult(available=False, blocked_reasons=("Trait alignment too low",))
            prereqs = (
                Prerequisite("min_trait", key="Empathy", value=-0.10, description="Need social alignment"),
            )
        elif action_type == "murder":
            target = self._find_target(actor, payload.get("target_id"))
            if target is None:
                return AvailabilityResult(available=False, blocked_reasons=("Need a target",))
            if target.entity_kind == "boss":
                return AvailabilityResult(available=False, blocked_reasons=("Boss cannot be murdered instantly",))
            faction_ok = actor.faction == "laughing_face"
            rep_ok = actor.reputation <= -3.0
            if not (faction_ok or rep_ok):
                return AvailabilityResult(available=False, blocked_reasons=("Faction/Reputation gate failed",))
            prereqs = (
                Prerequisite("min_trait", key="Survival", value=0.35, description="Need violent trait threshold"),
                Prerequisite("target_exists", description="Need a target"),
            )
        elif action_type == "evolve_skill":
            skill_id = str(payload.get("skill_id", ""))
            if not skill_id:
                return AvailabilityResult(available=False, blocked_reasons=("Need skill id",))
            success_rows = self.skills.available_evolutions(actor=actor, room=room)
            row = next((item for item in success_rows if item.skill_id == skill_id), None)
            if row is None:
                return AvailabilityResult(available=False, blocked_reasons=("Unknown evolution skill",))
            if not row.available:
                return AvailabilityResult(available=False, blocked_reasons=row.blocked_reasons)
            prereqs = ()

        ctx = PrerequisiteContext(
            actor=actor,
            room=room,
            nearby_entities=nearby,
            target=target,
            exits=exits,
        )
        return evaluate_prerequisites(prereqs, ctx)

    def available_actions(self, actor: EntityState | None = None, include_blocked: bool = True) -> list[ActionAvailability]:
        entity = self.player if actor is None else actor
        rows: list[ActionAvailability] = []
        for direction in ["north", "south", "east", "west", "up", "down"]:
            availability = self._availability_for_action(entity, action_move(direction))
            rows.append(
                ActionAvailability(
                    action_type="move",
                    label=f"go {direction}",
                    available=availability.available,
                    blocked_reasons=availability.blocked_reasons,
                    payload={"direction": direction},
                )
            )
        base_actions = [
            ("train", "train", action_train()),
            ("rest", "rest", action_rest()),
            ("talk", "talk", action_talk()),
            ("search", "search", action_search()),
            ("speak", "say <text>", action_speak("...")),
            ("fight", "fight", PlayerAction(action_type="fight", payload={})),
            ("live_stream", "stream", action_live_stream(10.0)),
            ("steal", "steal", action_steal()),
            ("recruit", "recruit", action_recruit()),
            ("murder", "murder", action_murder()),
        ]
        for action_type, label, action in base_actions:
            availability = self._availability_for_action(entity, action)
            rows.append(
                ActionAvailability(
                    action_type=action_type,
                    label=label,
                    available=availability.available,
                    blocked_reasons=availability.blocked_reasons,
                    payload=dict(action.payload),
                )
            )
        if self.available_dialogue_options(entity):
            rows.append(
                ActionAvailability(
                    action_type="choose_dialogue",
                    label="choose <option_id>",
                    available=True,
                )
            )
        elif include_blocked:
            rows.append(
                ActionAvailability(
                    action_type="choose_dialogue",
                    label="choose <option_id>",
                    available=False,
                    blocked_reasons=("no_dialogue_options_in_range",),
                )
            )

        evolutions = self.skills.available_evolutions(entity, self._current_room(entity))
        for evo in evolutions:
            action = action_evolve_skill(evo.skill_id)
            availability = self._availability_for_action(entity, action)
            rows.append(
                ActionAvailability(
                    action_type="evolve_skill",
                    label=f"evolve {evo.skill_id}",
                    available=availability.available,
                    blocked_reasons=availability.blocked_reasons,
                    payload=dict(action.payload),
                )
            )
        if include_blocked:
            return rows
        return [row for row in rows if row.available]

    def look(self) -> str:
        room = self._current_room(self.player)
        exits = ", ".join(self.world.exits_for(self.player.depth, self.player.room_id))
        items = ", ".join(item.name for item in room.present_items()) or "none"
        room_vec = _top_nonzero(room.effective_vector(self.config.trait_names), limit=3)
        room_vec_text = ", ".join([f"{k}={v:+.2f}" for k, v in room_vec]) if room_vec else "neutral"
        options = self.available_dialogue_options(self.player)
        option_text = ", ".join([f"{row['option_id']}" for row in options[:4]]) if options else "none"
        actions = self.available_actions(self.player, include_blocked=False)
        action_text = ", ".join([row.label for row in actions[:8]]) if actions else "none"
        appraisal_unlocked = bool(self.player.skills.get("appraisal") or self.player.skills.get("deep_appraisal"))
        xray_unlocked = bool(self.player.skills.get("xray") or self.player.skills.get("trap_vision"))
        perception_lines: list[str] = []
        if appraisal_unlocked:
            details = ", ".join([f"{item.name}<{item.rarity}>" for item in room.present_items()[:3]]) or "none"
            nearby = self._same_room_entities(self.player)
            nearby_text = ", ".join([f"{entity.name}(lvl {entity.level},{entity.faction})" for entity in nearby[:4]]) or "none"
            perception_lines.append(f"Appraisal: items={details}; entities={nearby_text}")
        if xray_unlocked:
            trap_score = (room.index + room.depth) % 7
            if trap_score in {0, 1}:
                perception_lines.append("X-Ray: trap signatures detected near container seams.")
            else:
                perception_lines.append("X-Ray: no obvious trap signatures.")
        perception_text = "\n".join(perception_lines)
        return (
            f"Depth {self.player.depth} | Chapter {self.world.chapter_for_depth(self.player.depth)}\n"
            f"{room.description}\n"
            f"Feature: {room.feature}\n"
            f"Exits: {exits or 'none'}\n"
            f"Room items: {items}\n"
            f"Room vector: {room_vec_text}\n"
            f"Dialogue options in range: {option_text}\n"
            f"Available actions: {action_text}"
            + (f"\n{perception_text}" if perception_text else "")
        )

    def status(self) -> dict[str, object]:
        chapter = self.world.chapter_for_depth(self.player.depth)
        act = self.world.act_for_depth(self.player.depth, self.config.chapters_per_act)
        actions = self.available_actions(self.player, include_blocked=True)
        action_rows = [
            {
                "label": row.label,
                "action_type": row.action_type,
                "available": row.available,
                "blocked_reasons": list(row.blocked_reasons),
                "payload": dict(row.payload),
            }
            for row in actions
        ]
        unlocked_skills = [state.name for state in self.player.skills.values() if state.unlocked]
        skill_candidates = self.skills.evaluate_unlocks(
            actor=self.player,
            room=self._current_room(self.player),
            nearby_entities=self._same_room_entities(self.player),
        )
        return {
            "title": self.config.game_title,
            "player": self.player.name,
            "depth": self.player.depth,
            "room_id": self.player.room_id,
            "chapter": chapter,
            "act": act,
            "level": self.player.level,
            "xp": self.player.total_xp,
            "faction": self.player.faction,
            "reputation": round(self.player.reputation, 3),
            "health": self.player.health,
            "energy": round(self.player.energy, 3),
            "fame": round(self.player.features.get("Fame"), 4),
            "effort": round(self.player.features.get("Effort"), 4),
            "features": {k: round(v, 4) for k, v in sorted(self.player.features.values.items())},
            "top_traits": self.player.traits.top(limit=5),
            "inventory": [item.name for item in self.player.inventory],
            "skills_unlocked": unlocked_skills,
            "skills_unlockable": [
                {
                    "skill_id": row.skill_id,
                    "name": row.name,
                    "distance": round(row.distance, 4),
                    "available": row.available,
                    "blocked_reasons": list(row.blocked_reasons),
                }
                for row in skill_candidates[:6]
            ],
            "quests": {
                q.quest_id: {"title": q.title, "progress": q.progress, "complete": q.is_complete}
                for q in self.quests.values()
            },
            "available_actions": action_rows,
            "available_dialogue_options": self.available_dialogue_options(self.player)[:6],
            "semantic_cache_size": len(self.embedding_store.records),
            "deeds_recorded": len(self.player.deeds),
            "rumor_count": len(self.player.rumors),
            "active_companion_id": self._active_companion_for(self.player),
            "run_branch_choice": self.run_branch_choice,
            "global_enemy_level_bonus": self.global_enemy_level_bonus,
        }

    def _update_quests(self, actor: EntityState, action_type: str, chapter_completed: int | None = None) -> None:
        if actor.entity_id == "kael" and action_type == "train":
            self.quests["training"].advance(1)
        if actor.entity_id == "kael" and chapter_completed is not None:
            self.quests["chronicle"].advance(1)
        if self.escaped:
            self.quests["escape"].advance(1)

    def _move(self, actor: EntityState, direction: str) -> tuple[str, list[str], int | None]:
        warnings: list[str] = []
        step = self.world.step(
            actor.depth,
            actor.room_id,
            direction,
            blocked_room_features=(ROOM_FEATURE_RUNE_FORGE,) if actor.entity_kind in {"hostile", "boss"} else (),
        )
        old_depth = actor.depth

        # Escape condition: at the top gate, moving up wins.
        if step is None and actor.is_player:
            room = self._current_room(actor)
            if room.feature == ROOM_FEATURE_ESCAPE_GATE and direction == "up":
                self.escaped = True
                self._update_quests(actor, "move")
                return f"{actor.name} breaches the final gate and escapes the dungeon.", warnings, None

        if step is None:
            warnings.append(f"move_blocked:{direction}")
            return f"{actor.name} cannot move {direction} from here.", warnings, None

        actor.depth, actor.room_id = step
        actor.spend_energy(0.05)
        message = f"{actor.name} moves {direction} to depth {actor.depth} room {actor.room_id}."

        chapter_completed: int | None = None
        if actor.is_player and actor.depth < old_depth:
            prior_chapter = self.world.chapter_for_depth(old_depth)
            if self.journal.complete_chapter(prior_chapter):
                chapter_completed = prior_chapter
                act = self.world.act_for_depth(old_depth, self.config.chapters_per_act)
                message += f" Chapter {prior_chapter} completed."
                if self.journal.act_complete(act):
                    message += f" Act {act} completed."
            self._update_quests(actor, "move", chapter_completed=chapter_completed)
        return message, warnings, chapter_completed

    def _train(self, actor: EntityState) -> tuple[str, list[str]]:
        room_feature = self._room_feature(actor)
        warnings: list[str] = []
        if room_feature != ROOM_FEATURE_TRAINING:
            warnings.append("training_offsite")
        actor.attributes.train("might", 1)
        actor.total_xp += 6.0
        actor.spend_energy(0.12)
        self.projector.apply_to_traits(actor.traits, "discipline drills and resilient focus", magnitude=0.16)
        if actor.is_player:
            self._update_quests(actor, "train")
        return f"{actor.name} trains in the {room_feature.replace('_', ' ')} room.", warnings

    def _rest(self, actor: EntityState) -> tuple[str, list[str]]:
        room_feature = self._room_feature(actor)
        actor.recover_energy(0.3 if room_feature == ROOM_FEATURE_REST else 0.2)
        actor.health = min(100, actor.health + 2)
        actor.features.apply({"Effort": +6.0, "Momentum": -0.05})
        return f"{actor.name} rests and recovers in the {room_feature.replace('_', ' ')} room.", []

    def _talk(self, actor: EntityState, target_id: str | None) -> tuple[str, list[str], list[str]]:
        warnings: list[str] = []
        candidates = self._same_room_entities(actor)
        target = None
        if target_id:
            for entity in candidates:
                if entity.entity_id == target_id:
                    target = entity
                    break
            if target is None:
                warnings.append(f"target_not_found:{target_id}")
        if target is None and candidates:
            target = candidates[0]

        room = self._current_room(actor)
        options = self.dialogue.available_options(actor, room)
        found_tags: list[str] = []
        if options:
            selected = options[0]
            response, extra_warnings, _effect, taken_item = self.dialogue.choose_option(
                entity=actor,
                room=room,
                option_id=selected.option_id,
            )
            warnings.extend(extra_warnings)
            actor.total_xp += 3.0
            actor.spend_energy(0.08)
            actor.features.apply({"Awareness": 0.05})
            if taken_item is not None:
                actor.inventory.append(self._to_inventory_item(taken_item))
                found_tags.extend(list(taken_item.tags))
                response += f" {actor.name} also acquires {taken_item.name}."
            if target is not None and actor.rumors:
                relayed = actor.rumors[-1]
                target.add_rumor(
                    RumorMemory(
                        rumor_id=f"talk:{relayed.rumor_id}:{target.entity_id}:{self.turn_index}",
                        about_entity_id=relayed.about_entity_id,
                        source_entity_id=actor.entity_id,
                        summary=relayed.summary,
                        confidence=max(0.05, relayed.confidence * 0.85),
                        hops=relayed.hops + 1,
                    )
                )
                response += f" {actor.name} shares a rumor about {relayed.about_entity_id}."
            return response, warnings, found_tags

        target_name = target.name if target else "the empty corridor"
        self.projector.apply_to_traits(actor.traits, "conversation, empathy, and perspective", magnitude=0.11)
        actor.total_xp += 3.0
        actor.spend_energy(0.08)
        actor.features.apply({"Awareness": 0.04})
        return f"{actor.name} shares a quick update with {target_name}.", warnings, found_tags

    def _speak(self, actor: EntityState, intent_text: str) -> tuple[str, list[str]]:
        warnings: list[str] = []
        text = (intent_text or "").strip()
        if not text:
            warnings.append("speak_empty")
            return f"{actor.name} says nothing.", warnings
        self.projector.apply_to_traits(actor.traits, text, magnitude=0.2)
        actor.total_xp += 5.0
        actor.spend_energy(0.12)
        actor.features.apply({"Momentum": 0.05})
        return f"{actor.name} speaks with intent: {text}", warnings

    def _to_inventory_item(self, room_item: RoomItemState) -> ItemInstance:
        return ItemInstance(
            item_id=room_item.item_id,
            name=room_item.name,
            rarity=room_item.rarity,
            description=room_item.description,
            tags=room_item.tags,
            trait_delta=dict(room_item.vector_delta),
        )

    def _search(self, actor: EntityState) -> tuple[str, list[str], list[str]]:
        room = self._current_room(actor)
        found = room.take_first_present_item()
        if found is None:
            return f"{actor.name} searches but finds nothing new.", [], []
        item = self._to_inventory_item(found)
        actor.inventory.append(item)
        actor.traits.apply(item.trait_delta)
        actor.total_xp += 2.0
        actor.features.apply({"Awareness": 0.08})
        return f"{actor.name} finds {item.name}.", [], list(found.tags)

    def _weapon_power(self, item: ItemInstance) -> int:
        scale = {
            "common": 1,
            "rare": 2,
            "epic": 3,
            "legendary": 5,
        }
        return int(scale.get(item.rarity.lower(), 0))

    def _select_weapon(self, actor: EntityState) -> tuple[ItemInstance | None, int]:
        candidates = [item for item in actor.inventory if "weapon" in {tag.lower() for tag in item.tags}]
        if not candidates:
            return None, 0
        best = sorted(candidates, key=lambda item: self._weapon_power(item), reverse=True)[0]
        return best, self._weapon_power(best)

    def _fight(self, actor: EntityState) -> tuple[str, list[str]]:
        candidates = self._same_room_entities(actor)
        if not candidates:
            actor.features.apply({"Momentum": 0.04})
            return f"{actor.name} shadowspars alone.", []
        target = sorted(candidates, key=lambda row: row.level, reverse=True)[0]
        weapon, weapon_power = self._select_weapon(actor)
        result = self.combat.spar(
            actor,
            target,
            weapon_power=weapon_power,
            weapon_name=weapon.name if weapon else None,
            lethal=False,
        )
        actor.features.apply({"Momentum": 0.12})
        return result.summary, []

    def _murder(self, actor: EntityState, target_id: str | None) -> tuple[str, list[str]]:
        target = self._find_target(actor, target_id)
        if target is None:
            return f"{actor.name} finds no target.", ["murder_no_target"]
        weapon, weapon_power = self._select_weapon(actor)
        result = self.combat.spar(
            actor,
            target,
            weapon_power=max(1, weapon_power + 1),
            weapon_name=weapon.name if weapon else None,
            lethal=True,
        )
        actor.reputation -= 1.5
        actor.features.apply({"Momentum": 0.15, "Guile": 0.10})
        if result.defender_defeated:
            target.faction = "fallen"
            return f"{result.summary} {actor.name} commits murder.", []
        return f"{result.summary} {actor.name} attempted murder.", []

    def _recruit(self, actor: EntityState, target_id: str | None) -> tuple[str, list[str]]:
        target = self._find_target(actor, target_id)
        if target is None:
            return f"{actor.name} sees no one to recruit.", ["recruit_no_target"]
        if self._active_companion_for(actor) is not None:
            return f"{actor.name} already has a companion.", ["companion_slot_full"]
        target.companion_to = actor.entity_id
        target.faction = "party"
        target.reputation = max(target.reputation, 0.5)
        if actor.is_player:
            self.active_companion_id = target.entity_id
        actor.features.apply({"Awareness": 0.1, "Momentum": 0.08})
        return f"{target.name} joins {actor.name} as a companion.", []

    def _evolve_skill(self, actor: EntityState, skill_id: str) -> tuple[str, list[str]]:
        room = self._current_room(actor)
        ok, code = self.skills.evolve_skill(actor=actor, room=room, skill_id=skill_id)
        if not ok:
            return f"{actor.name} cannot evolve {skill_id} ({code}).", [f"evolve_failed:{code}"]
        actor.total_xp += 5.0
        return f"{actor.name} evolves skill {skill_id} at the rune forge.", []

    def _choose_dialogue(self, actor: EntityState, option_id: str) -> tuple[str, list[str], list[str]]:
        room = self._current_room(actor)
        response, warnings, _effect, taken_item = self.dialogue.choose_option(actor, room, option_id)
        actor.spend_energy(0.10)
        actor.total_xp += 4.0
        found_tags: list[str] = []
        if taken_item is not None:
            actor.inventory.append(self._to_inventory_item(taken_item))
            found_tags.extend(list(taken_item.tags))
            response = f"{response} {actor.name} acquires {taken_item.name}."
        return response, warnings, found_tags

    def _find_target(self, actor: EntityState, target_id: str | None) -> EntityState | None:
        nearby = self._same_room_entities(actor)
        if target_id:
            for entity in nearby:
                if entity.entity_id == target_id:
                    return entity
            return None
        return nearby[0] if nearby else None

    def _steal(self, actor: EntityState, target_id: str | None) -> tuple[str, list[str], list[str]]:
        target = self._find_target(actor, target_id)
        eligibility = self.skills.can_use(
            actor=actor,
            room=self._current_room(actor),
            skill_id="shadow_hand",
            nearby_entities=self._same_room_entities(actor),
        )
        if not eligibility.available:
            reasons = ", ".join(eligibility.blocked_reasons)
            return f"{actor.name} cannot steal yet ({reasons}).", [f"steal_blocked:{reasons}"], []
        if target is None:
            return f"{actor.name} sees no target to steal from.", ["steal_no_target"], []
        for item in list(target.inventory):
            if "loot" not in {value.lower() for value in item.tags}:
                continue
            target.inventory.remove(item)
            actor.inventory.append(item)
            actor.total_xp += 5.0
            actor.spend_energy(0.10)
            actor.features.apply({"Guile": 0.18, "Momentum": 0.07})
            return f"{actor.name} steals {item.name} from {target.name}.", [], list(item.tags)
        return f"{target.name} has nothing worth stealing.", ["steal_no_loot"], []

    def _live_stream(self, actor: EntityState, effort: float = 10.0) -> tuple[str, list[str], FameFormulaResult | None]:
        cost = float(effort)
        if cost <= 0.0:
            cost = 10.0
        if actor.features.get("Effort") < cost:
            return (
                f"{actor.name} tries to stream but lacks enough Effort.",
                [f"effort_insufficient:{actor.features.get('Effort'):.2f}"],
                None,
            )
        room = self._current_room(actor)
        room_vector = room.effective_vector(self.config.trait_names)
        novelty = 1.0
        if self.action_history and self.action_history[-1] == "live_stream":
            novelty = 0.3
        risk_level = 0.2
        if room.feature == ROOM_FEATURE_COMBAT:
            risk_level = 1.0
        elif room.feature == ROOM_FEATURE_TREASURE:
            risk_level = 0.6
        has_broadcast_skill = bool(actor.skills.get("battle_broadcast") and actor.skills["battle_broadcast"].unlocked)
        formula = compute_fame_gain(
            FameFormulaInput(
                current_fame=actor.features.get("Fame"),
                effort_spent=cost,
                room_vector=room_vector,
                action_novelty=novelty,
                risk_level=risk_level,
                momentum=actor.features.get("Momentum"),
                has_broadcast_skill=has_broadcast_skill,
            )
        )
        actor.features.apply(
            {
                "Effort": -cost,
                "Fame": formula.gain,
                "Momentum": 0.06 + (formula.gain * 0.03),
            }
        )
        actor.total_xp += 4.0
        actor.spend_energy(0.08)
        self.projector.apply_to_traits(actor.traits, f"live stream from {room.feature}", magnitude=0.08)
        msg = (
            f"{actor.name} streams from {room.feature}. "
            f"Fame +{formula.gain:.3f}, Effort -{cost:.1f} "
            f"(ctx={formula.context_multiplier:.2f}, dim={formula.diminishing_factor:.2f})."
        )
        return msg, [], formula

    def _apply_deed_semantics(
        self,
        actor: EntityState,
        action_type: str,
        message: str,
        found_item_tags: list[str],
    ) -> DeedMemory:
        room = self._current_room(actor)
        chapter = self.world.chapter_for_depth(actor.depth)
        deed = Deed(
            deed_id=f"{actor.entity_id}:{self.turn_index}:{action_type}:{len(actor.deeds)}",
            actor_id=actor.entity_id,
            actor_name=actor.name,
            deed_type=action_type,
            title=f"{action_type} at {room.room_id}",
            summary=message,
            depth=actor.depth,
            chapter_number=chapter,
            room_id=room.room_id,
            room_feature=room.feature,
            turn_index=self.turn_index,
            tags=(action_type, room.feature, *found_item_tags),
            outcome_tags=("escaped",) if self.escaped else (),
            tone_tags=("urgent",) if room.feature == ROOM_FEATURE_COMBAT else ("steady",),
        )
        record = self.deed_vectorizer.vectorize(deed)
        vector = list(record.vector)
        trait_delta = self.projector.project_vector(
            vector=vector,
            magnitude=0.08,
            budget=ProjectionBudget(per_feature_cap=0.08, global_budget=0.12),
        )
        feature_projection = self.feature_projector.project_vector(
            vector=vector,
            magnitude=0.9,
            budget=ProjectionBudget(
                per_feature_cap=0.22,
                global_budget=0.30,
                per_feature_caps={"Effort": 0.0, "Fame": 0.18},
            ),
        )
        actor.traits.apply(trait_delta)
        actor.features.apply(feature_projection.final_deltas)
        memory = DeedMemory(
            deed_id=deed.deed_id,
            chapter_number=chapter,
            turn_index=self.turn_index,
            summary=deed.summary,
            text_hash=record.text_hash,
            vector=tuple(vector),
            trait_delta=trait_delta,
            feature_delta=feature_projection.final_deltas,
        )
        actor.deeds.append(memory)
        if len(actor.deeds) > 300:
            actor.deeds = actor.deeds[-300:]
        return memory

    def _spread_rumor(self, actor: EntityState, summary: str, confidence: float = 0.6) -> None:
        nearby = self._same_room_entities(actor)
        for target in nearby:
            if target.entity_id == actor.entity_id:
                continue
            rumor = RumorMemory(
                rumor_id=f"rumor:{actor.entity_id}:{self.turn_index}:{len(target.rumors)}",
                about_entity_id=actor.entity_id,
                source_entity_id=actor.entity_id,
                summary=summary,
                confidence=max(0.05, min(1.0, float(confidence))),
                hops=0,
            )
            target.add_rumor(rumor)

    def _cross_pollinate_rumors(self, actor: EntityState) -> None:
        nearby = self._same_room_entities(actor)
        if not nearby or not actor.rumors:
            return
        chosen = actor.rumors[-1]
        for target in nearby:
            if target.entity_id == actor.entity_id:
                continue
            relayed = RumorMemory(
                rumor_id=f"relay:{chosen.rumor_id}:{target.entity_id}:{self.turn_index}",
                about_entity_id=chosen.about_entity_id,
                source_entity_id=actor.entity_id,
                summary=chosen.summary,
                confidence=max(0.05, chosen.confidence * 0.75),
                hops=chosen.hops + 1,
            )
            target.add_rumor(relayed)

    def _apply_action(self, actor: EntityState, action: PlayerAction) -> list[GameEvent]:
        action_type = action.action_type
        payload = dict(action.payload)

        availability = self._availability_for_action(actor, action)
        if not availability.available:
            msg = f"{actor.name} cannot use '{action_type}' right now."
            warnings = [f"blocked:{reason}" for reason in availability.blocked_reasons]
            event = self._record(actor=actor, action_type=action_type, message=msg, warnings=warnings)
            self.action_history.append(action_type)
            return [event]

        before_traits = dict(actor.traits.values)
        before_features = dict(actor.features.values)
        warnings: list[str] = []
        found_item_tags: list[str] = []
        chapter_completed: int | None = None
        fame_result: FameFormulaResult | None = None

        if action_type == "move":
            message, warnings, chapter_completed = self._move(actor, direction=str(payload.get("direction", "")))
        elif action_type == "train":
            message, warnings = self._train(actor)
        elif action_type == "rest":
            message, warnings = self._rest(actor)
        elif action_type == "talk":
            message, warnings, found_item_tags = self._talk(actor, target_id=payload.get("target_id"))
        elif action_type == "speak":
            message, warnings = self._speak(actor, intent_text=str(payload.get("intent_text", "")))
        elif action_type == "search":
            message, warnings, found_item_tags = self._search(actor)
        elif action_type == "fight":
            message, warnings = self._fight(actor)
        elif action_type == "choose_dialogue":
            message, warnings, found_item_tags = self._choose_dialogue(actor, option_id=str(payload.get("option_id", "")))
        elif action_type == "live_stream":
            message, warnings, fame_result = self._live_stream(actor, effort=float(payload.get("effort", 10.0)))
        elif action_type == "steal":
            message, warnings, found_item_tags = self._steal(actor, target_id=payload.get("target_id"))
        elif action_type == "recruit":
            message, warnings = self._recruit(actor, target_id=payload.get("target_id"))
        elif action_type == "murder":
            message, warnings = self._murder(actor, target_id=payload.get("target_id"))
        elif action_type == "evolve_skill":
            message, warnings = self._evolve_skill(actor, skill_id=str(payload.get("skill_id", "")))
        else:
            message = f"Unknown action: {action_type}"
            warnings = [f"unknown_action:{action_type}"]

        room_delta = self._apply_room_vector_influence(actor, scale=0.05)
        top_room = _top_nonzero(room_delta, limit=2)
        if top_room:
            message += " Room influence: " + ", ".join([f"{k}{v:+.2f}" for k, v in top_room]) + "."

        deed_memory = self._apply_deed_semantics(actor, action_type, message, found_item_tags)
        action_top = _top_nonzero(deed_memory.feature_delta, limit=2)
        if action_top:
            message += " Deed drift: " + ", ".join([f"{k}{v:+.2f}" for k, v in action_top]) + "."
        if action_type in {"live_stream", "murder", "fight", "search"}:
            self._spread_rumor(actor, summary=message, confidence=0.65 if action_type == "live_stream" else 0.45)
        if action_type == "talk":
            self._cross_pollinate_rumors(actor)

        unlocked = self.skills.unlock_new_skills(
            actor=actor,
            room=self._current_room(actor),
            nearby_entities=self._same_room_entities(actor),
        )
        for skill in unlocked:
            if skill.branch_group == "perception_branch" and self.run_branch_choice is None and actor.is_player:
                self.run_branch_choice = skill.skill_id
        if unlocked:
            names = ", ".join(skill.name for skill in unlocked)
            message += f" Skill unlocked: {names}."

        trait_delta = _diff_map(before_traits, actor.traits.values)
        feature_delta = _diff_map(before_features, actor.features.values)
        metadata: dict[str, object] = {
            "chapter_completed": chapter_completed,
            "found_item_tags": list(found_item_tags),
            "unlocked_skills": [skill.skill_id for skill in unlocked],
            "deed_id": deed_memory.deed_id,
        }
        if fame_result is not None:
            metadata["fame_formula"] = {
                "gain": fame_result.gain,
                "base_gain": fame_result.base_gain,
                "context_multiplier": fame_result.context_multiplier,
                "diminishing_factor": fame_result.diminishing_factor,
                "components": dict(fame_result.components),
            }
        if actor.rumors:
            metadata["rumor_count"] = len(actor.rumors)

        main_event = self._record(
            actor=actor,
            action_type=action_type,
            message=message,
            warnings=warnings,
            trait_delta=trait_delta,
            feature_delta=feature_delta,
            metadata=metadata,
            advance_turn=True,
        )
        self.action_history.append(action_type)
        actor.tick_effects()

        cutscene_hits: list[CutsceneHit] = []
        if actor.is_player:
            cutscene_hits = self.cutscenes.trigger(
                CutsceneContext(
                    actor=actor,
                    action_type=action_type,
                    found_item_tags=tuple(found_item_tags),
                    unlocked_skill_ids=tuple(skill.skill_id for skill in unlocked),
                    chapter_completed=chapter_completed,
                    escaped=self.escaped,
                )
            )
        if cutscene_hits:
            return [main_event, *self._record_cutscenes(actor, cutscene_hits)]
        return [main_event]

    def _legal_actions_for(self, actor: EntityState) -> list[PlayerAction]:
        rows = self.available_actions(actor=actor, include_blocked=False)
        legal: list[PlayerAction] = []
        for row in rows:
            if row.action_type == "choose_dialogue":
                options = self.available_dialogue_options(actor)
                if options:
                    legal.append(action_choose_dialogue(str(options[0]["option_id"])))
                continue
            if row.action_type == "move":
                legal.append(action_move(str(row.payload.get("direction", ""))))
                continue
            if row.action_type == "train":
                legal.append(action_train())
                continue
            if row.action_type == "rest":
                legal.append(action_rest())
                continue
            if row.action_type == "talk":
                legal.append(action_talk())
                continue
            if row.action_type == "search":
                legal.append(action_search())
                continue
            if row.action_type == "speak":
                legal.append(action_speak("We keep moving."))
                continue
            if row.action_type == "fight":
                legal.append(PlayerAction(action_type="fight", payload={}))
                continue
            if row.action_type == "live_stream":
                legal.append(action_live_stream(10.0))
                continue
            if row.action_type == "steal":
                legal.append(action_steal())
                continue
            if row.action_type == "recruit":
                legal.append(action_recruit())
                continue
            if row.action_type == "murder":
                legal.append(action_murder())
                continue
            if row.action_type == "evolve_skill":
                legal.append(action_evolve_skill(str(row.payload.get("skill_id", ""))))
                continue
        return legal

    def _is_enemy(self, a: EntityState, b: EntityState) -> bool:
        if a.entity_id == b.entity_id:
            return False
        if a.companion_to == b.entity_id or b.companion_to == a.entity_id:
            return False
        if a.faction == b.faction:
            return False
        if a.faction == "party" and b.entity_id == "kael":
            return False
        if b.faction == "party" and a.entity_id == "kael":
            return False
        return True

    def _nearest_enemy_on_depth(self, actor: EntityState) -> EntityState | None:
        room = self._current_room(actor)
        candidates: list[tuple[int, EntityState]] = []
        for entity in self.entities.values():
            if entity.depth != actor.depth:
                continue
            if not self._is_enemy(actor, entity):
                continue
            target_room = self._current_room(entity)
            dist = abs(room.row - target_room.row) + abs(room.column - target_room.column)
            candidates.append((dist, entity))
        if not candidates:
            return None
        candidates.sort(key=lambda row: row[0])
        return candidates[0][1]

    def _best_move_toward(self, actor: EntityState, target: EntityState) -> PlayerAction | None:
        src = self._current_room(actor)
        tgt = self._current_room(target)
        exits = self.world.exits_for(actor.depth, actor.room_id)
        ranked = sorted(
            exits,
            key=lambda direction: (
                abs((src.row + (-1 if direction == "north" else 1 if direction == "south" else 0)) - tgt.row)
                + abs((src.column + (-1 if direction == "west" else 1 if direction == "east" else 0)) - tgt.column)
            ),
        )
        for direction in ranked:
            step = self.world.step(
                actor.depth,
                actor.room_id,
                direction,
                blocked_room_features=(ROOM_FEATURE_RUNE_FORGE,) if actor.entity_kind in {"hostile", "boss"} else (),
            )
            if step is None:
                continue
            return action_move(direction)
        return None

    def _spawn_hostiles_for_turn(self) -> list[GameEvent]:
        events: list[GameEvent] = []
        for _ in range(max(0, int(self.config.hostile_spawn_per_turn))):
            depth = self.player.depth
            level = self.world.get_level(depth)
            self.hostile_spawn_index += 1
            entity_id = f"hostile_{depth:02d}_{self.hostile_spawn_index:05d}"
            hostile = EntityState(
                entity_id=entity_id,
                name=f"Dungeon Hunter {self.hostile_spawn_index}",
                is_player=False,
                entity_kind="hostile",
                depth=depth,
                room_id=level.exit_room_id,
                traits=TraitVector.zeros(
                    trait_names=self.config.trait_names,
                    min_value=self.config.min_trait_value,
                    max_value=self.config.max_trait_value,
                ),
                attributes=AttributeBlock(
                    might=5 + self.global_enemy_level_bonus,
                    agility=5 + self.global_enemy_level_bonus,
                    insight=4 + self.global_enemy_level_bonus,
                    willpower=5 + self.global_enemy_level_bonus,
                ),
                features=FeatureVector.defaults(),
                faction="dungeon_legion",
                reputation=-2.0,
                base_level=max(
                    1,
                    self.config.total_levels - depth + 1 + self.config.hostile_level_bonus + self.global_enemy_level_bonus,
                ),
                health=88,
                energy=1.0,
            )
            self.entities[entity_id] = hostile
            events.append(
                self._record(
                    actor=hostile,
                    action_type="spawn",
                    message=f"{hostile.name} emerges from exit {level.exit_room_id}.",
                    warnings=[],
                    metadata={"spawn_depth": depth},
                    advance_turn=False,
                )
            )
        return events

    def _process_global_events(self) -> list[GameEvent]:
        events: list[GameEvent] = []
        # Deterministic global event.
        if self.turn_index >= 12 and "trap_doctrine" not in self.global_event_flags:
            self.global_event_flags.add("trap_doctrine")
            self.global_enemy_level_bonus += 2
            for entity in self.entities.values():
                if entity.entity_kind in {"hostile", "boss"}:
                    entity.base_level += 2
            events.append(
                self._record(
                    actor=self.player,
                    action_type="global_event",
                    message="Global Event: Trap Doctrine spreads. Dungeon hostiles are now +2 levels.",
                    warnings=[],
                    metadata={"event_id": "trap_doctrine", "deterministic": True},
                    advance_turn=False,
                )
            )
        # Probabilistic emergent trigger.
        if "rumor_surge" not in self.global_event_flags and self.player.features.get("Fame") >= 3.0:
            roll = self.simulator._rng.random()
            if roll < 0.35:
                self.global_event_flags.add("rumor_surge")
                for entity in self.entities.values():
                    if entity.entity_id == self.player.entity_id:
                        continue
                    entity.add_rumor(
                        RumorMemory(
                            rumor_id=f"surge:{self.turn_index}:{entity.entity_id}",
                            about_entity_id=self.player.entity_id,
                            source_entity_id="world",
                            summary="Rumor Surge: Kael's deeds are spreading across the dungeon.",
                            confidence=0.7,
                            hops=0,
                        )
                    )
                events.append(
                    self._record(
                        actor=self.player,
                        action_type="global_event",
                        message="Emergent Trigger: Kael's deed rumors surge across nearby levels.",
                        warnings=[],
                        metadata={"event_id": "rumor_surge", "deterministic": False},
                        advance_turn=False,
                    )
                )
        return events

    def _npc_turns(self) -> list[GameEvent]:
        events: list[GameEvent] = []
        for entity in list(self.entities.values()):
            if entity.is_player or self.escaped:
                continue
            if entity.health <= 0:
                continue
            legal_actions = self._legal_actions_for(entity)
            if not legal_actions:
                continue
            nearby_enemy_count = len([row for row in self._same_room_entities(entity) if self._is_enemy(entity, row)])
            room_feature = self._current_room(entity).feature

            action: PlayerAction
            if entity.entity_kind in {"hostile", "boss"} and nearby_enemy_count == 0:
                target = self._nearest_enemy_on_depth(entity)
                if target is not None:
                    forced = self._best_move_toward(entity, target)
                    if forced is not None:
                        action = forced
                    else:
                        action = self.simulator.choose_from_legal_actions(entity, legal_actions, room_feature, nearby_enemy_count)
                else:
                    action = self.simulator.choose_from_legal_actions(entity, legal_actions, room_feature, nearby_enemy_count)
            else:
                action = self.simulator.choose_from_legal_actions(entity, legal_actions, room_feature, nearby_enemy_count)
            events.extend(self._apply_action(entity, action))
        return events

    def act(self, action: PlayerAction, simulate_npcs: bool = True) -> list[GameEvent]:
        events = list(self._apply_action(self.player, action))
        if simulate_npcs and not self.escaped:
            events.extend(self._process_global_events())
            events.extend(self._spawn_hostiles_for_turn())
            events.extend(self._npc_turns())
        return events

    def move(self, direction: str, simulate_npcs: bool = True) -> list[GameEvent]:
        return self.act(action_move(direction), simulate_npcs=simulate_npcs)

    def train(self, simulate_npcs: bool = True) -> list[GameEvent]:
        return self.act(action_train(), simulate_npcs=simulate_npcs)

    def rest(self, simulate_npcs: bool = True) -> list[GameEvent]:
        return self.act(action_rest(), simulate_npcs=simulate_npcs)

    def talk(self, target_id: str | None = None, simulate_npcs: bool = True) -> list[GameEvent]:
        return self.act(action_talk(target_id=target_id), simulate_npcs=simulate_npcs)

    def search(self, simulate_npcs: bool = True) -> list[GameEvent]:
        return self.act(action_search(), simulate_npcs=simulate_npcs)

    def speak(self, intent_text: str, simulate_npcs: bool = True) -> list[GameEvent]:
        return self.act(action_speak(intent_text), simulate_npcs=simulate_npcs)

    def choose_dialogue(self, option_id: str, simulate_npcs: bool = True) -> list[GameEvent]:
        return self.act(action_choose_dialogue(option_id), simulate_npcs=simulate_npcs)

    def live_stream(self, simulate_npcs: bool = True) -> list[GameEvent]:
        return self.act(action_live_stream(10.0), simulate_npcs=simulate_npcs)

    def steal(self, target_id: str | None = None, simulate_npcs: bool = True) -> list[GameEvent]:
        return self.act(action_steal(target_id), simulate_npcs=simulate_npcs)

    def recruit(self, target_id: str | None = None, simulate_npcs: bool = True) -> list[GameEvent]:
        return self.act(action_recruit(target_id), simulate_npcs=simulate_npcs)

    def murder(self, target_id: str | None = None, simulate_npcs: bool = True) -> list[GameEvent]:
        return self.act(action_murder(target_id), simulate_npcs=simulate_npcs)

    def evolve_skill(self, skill_id: str, simulate_npcs: bool = True) -> list[GameEvent]:
        return self.act(action_evolve_skill(skill_id), simulate_npcs=simulate_npcs)

    def chapter_pages(self, depth: int | None = None) -> Mapping[str, list[str]]:
        depth_value = self.player.depth if depth is None else depth
        chapter = self.world.chapter_for_depth(depth_value)
        pages = self.journal.chapter_pages(chapter)
        return {page.page_id: list(page.entries) for page in pages}

    def recent_cutscenes(self, limit: int = 10) -> list[dict[str, str]]:
        rows = [event for event in self.event_log if event.action_type == "cutscene"]
        selected = rows[-max(1, int(limit)) :]
        return [
            {
                "turn_index": str(event.turn_index),
                "title": str(event.metadata.get("cutscene_title", "Cutscene")),
                "message": event.message,
            }
            for event in selected
        ]

    def recent_deeds(self, actor: EntityState | None = None, limit: int = 8) -> list[dict[str, object]]:
        entity = self.player if actor is None else actor
        rows = entity.deeds[-max(1, int(limit)) :]
        return [
            {
                "deed_id": row.deed_id,
                "chapter": row.chapter_number,
                "turn": row.turn_index,
                "summary": row.summary,
                "trait_delta": dict(row.trait_delta),
                "feature_delta": dict(row.feature_delta),
            }
            for row in rows
        ]
