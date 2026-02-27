# Task Registry

High-level tasks are tracked here; per-phase task detail lives in `.planning/phases/<phase>/` (PLAN and SUMMARY files).

## Phase 01 – Planning docs baseline

| Id | Task | Status |
|----|------|--------|
| 01-1 | Align PROJECT, ROADMAP, REQUIREMENTS with DungeonBreak / Narrative Engine | Done (docs updated) |
| 01-2 | Run discuss-phase 1: capture desired outcome, constraints, non-goals | Pending |
| 01-3 | Run plan-phase 1: create/refine Phase 01 plan(s) | Pending |
| 01-4 | Execute Phase 01 plan(s) and write summary | Pending |
| 01-5 | Run verify-work 1 | Pending |

## Phase 02 – Planning docs cleanup and simulations

| Id | Task | Status |
|----|------|--------|
| 02-1 | PRD and developer guide in .planning; docs/ pointers only | Done |
| 02-2 | discuss-phase 2, plan-phase 2 | Done |
| 02-3 | Notebooks: state-space-saliency, verlet-constraints | Done |
| 02-4 | verify-work 2 | Pending |

## Phase 03 – Narrative Engine first slice (Verlet + constraints)

| Id | Task | Status |
|----|------|--------|
| 03-1 | Implement Verlet integration in Narrative Engine | Pending |
| 03-2 | Add per-axis min/max constraints and old_p reprojection | Pending |
| 03-3 | Unit tests for constrained Verlet | Pending |

## Phase 04 – Dialog selection and integration

| Id | Task | Status |
|----|------|--------|
| 04-1 | Dialog selection by entity position + dialog Location (saliency) | Pending |
| 04-2 | Integration point for DialogComponent / Yarn Spinner | Pending |

## Phase 05 – Docs fold and notebook tooling

| Id | Task | Status |
|----|------|--------|
| 05-1 | Game PRD, design decisions, implementation roadmap folded into .planning | Done |
| 05-2 | Remove narrative-engine PRD/guide, PRD, design-decisions, implementation-roadmap from docs/ | Done |
| 05-3 | Notebook venv + JupyterLab scripts (notebooks:install, notebooks) | Done |
| 05-4 | verify-work 5 | Done |

## Phase 06 – Lab setup and notebook improvements

| Id | Task | Status |
|----|------|--------|
| 06-1 | Add Phase 06, REQ-08, TASK-REGISTRY | Done |
| 06-2 | uv-based lab: install uv if missing, lab/lab:install scripts | Done |
| 06-3 | .planning/REFERENCES.md with GDC/video links for agents | Done |
| 06-4 | Notebooks: Kaiza, stats, dialogue vectors, threshold, labels | Done |
| 06-5 | discuss-phase 6, plan-phase 6, execute, verify-work 6 | Done |

## Phase 07 â€“ Escape the Dungeon

| Id | Task | Status |
|----|------|--------|
| 07-1 | Update PRD for Escape the Dungeon (12 levels, chapters/acts/pages, Kael start) | Done |
| 07-2 | Vendor adventurelib and use it as base text-adventure engine | Done |
| 07-3 | Refactor monolithic text adventure into domain modules (world/entities/player/combat/narrative/engine) | Done |
| 07-4 | Implement Kael + NPC simulation loop (movement, training, talk, rest, search, speak) | Done |
| 07-5 | Implement chapter/act/page logging and quest progression | Done |
| 07-6 | Ship notebook demo for Escape the Dungeon and run smoke tests | Done |

## Phase 08 â€“ Vector-space simulation depth

| Id | Task | Status |
|----|------|--------|
| 08-1 | Start new planning phase for vector-space simulation clarity and extensibility | Done |
| 08-2 | Define explicit world/story objects (`Dungeon`, `Level`, `Room`, `Act`, `Chapter`, `Page`) and relation model | Done |
| 08-3 | Upgrade levels to 50 rooms each with one start and one exit | Done |
| 08-4 | Add room vectors + item vectors and apply room influence every turn | Done |
| 08-5 | Implement dialogue clusters/ranges with room-state conditions and option selection APIs | Done |
| 08-6 | Add CLI entry point for Escape the Dungeon command gameplay | Done |
| 08-7 | Update notebook/docs/planning artifacts and smoke-validate flow | Done |
| 08-8 | Add teen-readable architecture guide for classes, vectors, and turn simulation | Done |

## Phase 09 â€“ Cutscenes, action gating, skills, and fame economy

| Id | Task | Status |
|----|------|--------|
| 09-1 | Capture discuss context for cutscene presentation and filtered action UX | Done |
| 09-2 | Define prerequisite model for actions/dialogue/skills with explainable filters | Done |
| 09-3 | Design and implement cutscene trigger pipeline (item, quest, milestone events) | Done |
| 09-4 | Design skill-vector model and emergent unlock/use rules | Done |
| 09-5 | Implement livestream action with Fame and Effort cost 10 per turn | Done |
| 09-6 | Expose gated options + cutscenes + livestream state in notebook and CLI | Done |
| 09-7 | Add tests/docs and complete phase verification | Done |

## Phase 10 â€“ Entity parity, factions, and emergent pressure

| Id | Task | Status |
|----|------|--------|
| 10-1 | Capture discuss context for parity AI, faction lethality, and deterministic/emergent boundaries | Done |
| 10-2 | Define and implement shared action catalog/policy used by player and NPCs | Done |
| 10-3 | Update level composition: 20 treasure + 5 rune forge + exit boss + 4 dungeoneers per level | Done |
| 10-4 | Implement per-turn hostile spawn loop from exit with rune forge safe-haven navigation restriction | Done |
| 10-5 | Implement skill evolution flow at rune forge and enforce run-exclusive `appraisal` vs `xray` branch | Done |
| 10-6 | Implement companion system (max 1) with recruit/alignment checks | Done |
| 10-7 | Implement faction+reputation+trait lethal/murder gates and add `Laughing Face` faction rules | Done |
| 10-8 | Add rumor spread from deeds/livestream between entities and reflect it in dialogue/action filters | Done |
| 10-9 | Implement entity/player level curves and integrate into combat/action utility scoring | Done |
| 10-10 | Add deterministic global event chain + probabilistic emergent trigger system with explicit boundaries | Done |
| 10-11 | Add extensive pytest coverage for parity simulation and long-run interaction traces | Done |

## Phase 11 â€“ Content scale and archetype compass

| Id | Task | Status |
|----|------|--------|
| 11-1 | Define archetype compass vectors and emergent class labeling rules | Pending |
| 11-2 | Expand skill tree/action/dialogue/item/event packs with data-driven authoring format | Pending |
| 11-3 | Add balancing tools and simulation harness for curve tuning | Pending |
| 11-4 | Add onboarding/API docs for new systems and verify maintainability | Pending |

## Phase 12 â€“ Terminal packaging and release automation

| Id | Task | Status |
|----|------|--------|
| 12-1 | Define packaging scope and version strategy for terminal releases | Done |
| 12-2 | Add local binary build command for CLI entrypoint | Done |
| 12-3 | Add CI workflow for python tests + cross-platform binary artifact builds | Done |
| 12-4 | Add tag-based GitHub release publishing workflow for binaries | Done |
| 12-5 | Update README/AGENTS docs for publishing process | Done |
| 12-6 | Validate workflow syntax and traceability in planning docs | Done |

## Phase 13 - Browser playable 3-column game on docs `/play`

| Id | Task | Status |
|----|------|--------|
| 13-01 | Loop 13-01 planning/contracts update across ROADMAP/REQUIREMENTS/TASK-REGISTRY/STATE/DECISIONS/PRD | Done |
| 13-02 | Add browser parity matrix doc and lock command surface + DoD for browser release | Done |
| 13-03 | Implement initial `/play` Ink Web terminal shell + homepage CTA | Superseded by Loop 13-08 pivot |
| 13-04 | Implement TS engine parity slices (world, actions, dialogue, skills, cutscenes, deeds, fame, NPC sim, combat) | Done |
| 13-05 | Add browser persistence (IndexedDB autosave + slots) and expose save/load commands | Done |
| 13-06 | Add unit test suite and initial e2e smoke for browser runtime | Done |
| 13-07 | Recovery pivot: update planning docs/contracts for button-first 3-column UI + release closeout scope | Done |
| 13-08 | Replace `/play` UI with shadcn layout (left actions, middle Assistant UI feed, right status) and blocking cutscene queue | Done |
| 13-09 | Add presenter layer, expand unit/e2e tests for click-flow gameplay and blocked-reason visibility | Done |
| 13-10 | Fulfill Python release path (vendor tracking fix, publish docs, tag/release verification) and finalize summaries | In progress |

## Docs-site / Admin stability

| Id | Task | Status |
|----|------|--------|
| DS-1 | Fix RangeError at String.repeat when opening admin (guard depth in llms routes) | Done |
| DS-2 | Track any remaining docs-site/admin runtime errors (e.g. email adapter warning) | Pending |
