# Task Registry

High-level tasks are tracked here; per-phase task detail lives in `.planning/phases/<phase>/` (PLAN and SUMMARY files).

## Phase 01 – Planning docs baseline

| Id | Task | Status |
|----|------|--------|
| 01-1 | Align PROJECT, ROADMAP, REQUIREMENTS with DungeonBreak / Narrative Engine | Done (docs updated) |
| 01-2 | Run discuss-phase 1: capture desired outcome, constraints, non-goals | Done |
| 01-3 | Run plan-phase 1: create/refine Phase 01 plan(s) | Done |
| 01-4 | Execute Phase 01 plan(s) and write summary | Done |
| 01-5 | Run verify-work 1 | Done |

## Phase 02 – Planning docs cleanup and simulations

| Id | Task | Status |
|----|------|--------|
| 02-1 | PRD and developer guide in .planning; docs/ pointers only | Done |
| 02-2 | discuss-phase 2, plan-phase 2 | Done |
| 02-3 | Notebooks: state-space-saliency, verlet-constraints | Done |
| 02-4 | verify-work 2 | Done |

## Phase 03 – Narrative Engine first slice (Verlet + constraints)

| Id | Task | Status |
|----|------|--------|
| 03-1 | Implement Verlet integration in Narrative Engine | Superseded (archived after Escape the Dungeon pivot) |
| 03-2 | Add per-axis min/max constraints and old_p reprojection | Superseded (archived after Escape the Dungeon pivot) |
| 03-3 | Unit tests for constrained Verlet | Superseded (archived after Escape the Dungeon pivot) |

## Phase 04 – Dialog selection and integration

| Id | Task | Status |
|----|------|--------|
| 04-1 | Dialog selection by entity position + dialog Location (saliency) | Superseded (archived after Escape the Dungeon pivot) |
| 04-2 | Integration point for DialogComponent / Yarn Spinner | Superseded (archived after Escape the Dungeon pivot) |

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
| 11-1 | Define archetype compass vectors and emergent class labeling rules | Done |
| 11-2 | Expand skill tree/action/dialogue/item/event packs with data-driven authoring format | Done |
| 11-3 | Add balancing tools and simulation harness for curve tuning | Done |
| 11-4 | Add onboarding/API docs for new systems and verify maintainability | Done |

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
| 13-10 | Fulfill Python release path (vendor tracking fix, publish docs, tag/release verification) and finalize summaries | Done |

## Phase 14 - Browser combat simulation parity (no combat grid)

| Id | Task | Status |
|----|------|--------|
| 14-01 | Planning loop: lock no-grid combat direction, interaction boundaries (`fight`/`flee`), and draft Definition of Done | Done |
| 14-02 | Define encounter simulation contracts (inputs, formulas, deterministic ordering, no-grid policy) and publish machine-readable action-outcome mapping | Done |
| 14-03 | Implement browser combat mode flow (`fight` resolution + deterministic `flee` movement with possible later chase) | Done |
| 14-04 | Implement deed misinformation model (source, confidence, about-self/about-other) and rumor propagation rules | Done |
| 14-05 | Publish shared JSON schemas/data packs for actions/items/skills/traits/cutscenes/room templates; TS canonical runtime policy | Done |
| 14-06 | Add deterministic 25-turn golden playthrough suite with canonical seed (`CANONICAL_SEED_V1`) that exercises all core systems and validates page logs/cutscenes | Done |
| 14-07 | Add deterministic golden trace replay harness for TS runtime consumers (package + docs app) | Done |
| 14-08 | Add vector/feature usage analytics report and CI artifact for low-usage/unused content | Done |
| 14-09 | Add long-run pressure/performance tests and enforce browser turn budget (`p95 <= 2s`) with pressure cap 120 (item-aware counting) and pruning policy | Done |
| 14-10 | Finalize Phase 14 DoD, parity matrix closure, and planning summaries | Done |
| 14-11 | Python sunset planning item | Superseded by Phase 15 immediate cutover |

## Phase 15 - TypeScript cutover and `DungeonBreak/engine` package

| Id | Task | Status |
|----|------|--------|
| 15-01 | Planning loop: lock immediate Python/notebook removal and package contract (`DungeonBreak/engine`) | Done |
| 15-02 | Remove Python gameplay runtime and notebook artifacts from active repo paths; keep archive via tags/releases | Done |
| 15-03 | Retain and retarget `npm run lab` and install helpers for TypeScript package/dev workflows | Done |
| 15-04 | Extract/package engine as installable JS package (`@dungeonbreak/engine` implementation id) | Done |
| 15-05 | Package bundled default content/data so game runs out of box in consumers | Done |
| 15-06 | Expose React component + engine APIs and ship complete working example integration in repo | Done |
| 15-07 | Update docs, onboarding, and publish guidance for package-first distribution | Done |
| 15-08 | Add CI install/build/smoke validation from consumer perspective and finalize cutover summary | Done |

## Phase 16 - Publish hardening (browser package, GitHub Releases only)

| Id | Task | Status |
|----|------|--------|
| 16-1 | Harden GitHub release workflow with strict semantic tag validation and automated release notes/changelog generation | Done |
| 16-2 | Add deterministic replay smoke-pack checks to release gating | Done |
| 16-3 | Validate docs-site consumes packaged tarball artifact (not workspace internals) in CI | Done |

## Phase 17 - Content production and long-run balancing loops

| Id | Task | Status |
|----|------|--------|
| 17-1 | Lock Phase 17 contracts and Definition of Done for content-scale + long-run balancing | Done |
| 17-2 | Expand schema-driven content packs (skills/dialogue/items/events/quests) | Done |
| 17-3 | Add long-run deterministic simulation suites (100/250/500 turns) | Done |
| 17-4 | Add balance artifact reporting for action usage/archetypes/survival and dead-content detection | Done |
| 17-5 | Tune pressure/performance with expanded content while preserving p95 and cap budgets | Done |
| 17-6 | Close phase with verification summary and planning traceability updates | Done |

## Phase 18 - Deterministic MCP playthrough and interface

| Id | Task | Status |
|----|------|--------|
| 18-1 | Define machine-playable gameplay API contract (session/state/actions/dispatch) | Done |
| 18-2 | Implement MCP server adapter exposing gameplay tools/resources to coding agents | Done |
| 18-3 | Build dense deterministic playthrough suite (>= 75 turns) with broad interaction coverage | Done |
| 18-4 | Add deterministic agent regression tests (same seed + script => same outputs) | Done |
| 18-5 | Document agent protocol/tool schemas and failure semantics in `.concept` + `.planning` | Done |
| 18-6 | Verify `/play` and MCP agent interface parity through shared engine contracts | Done |

## Phase 19 - Assistant Frame window-agent support + default remote MCP

| Id | Task | Status |
|----|------|--------|
| 19-1 | Planning loop update: roadmap/requirements/tasks/state/decisions/PRD for Assistant Frame + default remote MCP policy | Done |
| 19-2 | Integrate Assistant Frame bridge in `/play` (window-agent consumable) while preserving button-first gameplay UX | Done |
| 19-3 | Add presenter/runtime adapters for frame action dispatch + feed/status synchronization | Done |
| 19-4 | Add tests for frame dispatch flow and fallback behavior when frame host is absent | Done |
| 19-5 | Implement `/api/mcp` as default-on in deployed runtime with signed-in access control | Done |
| 19-6 | Add remote MCP hardening baseline (rate limit/session isolation/payload validation/audit metadata) | Done |
| 19-7 | Publish release-versioned play reports and build test-manifest artifacts for every shipped version | Done |
| 19-8 | Document local stdio MCP, window-agent/frame mode, and signed-in remote MCP usage and report artifact locations | Done |

## Phase 20 - Report schema normalization + streamable ledgers

| Id | Task | Status |
|----|------|--------|
| 20-1 | Lock compact report contract around reference-based storage (packed event ledger + entity/message tables) to reduce duplication | Done |
| 20-2 | Add report-viewer adapters that can replay timeline directly from packed references without loading full expanded objects | Done |
| 20-3 | Add optional split-artifact mode (summary + external event stream) for very long runs and low-memory playback | Done |
| 20-4 | Add report schema versioning/migration notes and viewer compatibility checks in CI | Done |
| 20-5 | De-scoped: MCP/LLM turn chooser mode is not planned for foreseeable delivery | Dropped |
| 20-6 | Add JSONL event-row streaming artifacts and viewer iterators so timeline consumers can read without hydrating full external ledger JSON | Done |

## Phase 21 - Tooling PRD, gameplay analysis, report viewer

| Id | Task | Status |
|----|------|--------|
| 21-1 | Tooling PRD + metric definitions (replayability, excitement, emergent) | Done |
| 21-2 | Playthrough analyzer (`playthrough-analyzer.ts`) | In Progress |
| 21-3 | Report viewer route `/reports` or `/play/reports` | Pending |

## Phase 22 - Action policies as static data

| Id | Task | Status |
|----|------|--------|
| 22-1 | `action-policies.json` + schema + engine export | Done |
| 22-2 | Agent-play uses policy instead of inline PRIORITY_ORDER | Done |
| 22-3 | simulateNpcTurns accepts policy ID (future) | Pending |

## Phase 23 - KAPLAY single-file HTML build

| Id | Task | Status |
|----|------|--------|
| 23-1 | KAPLAY package with first-person text mode | Pending |
| 23-2 | ASCII grid mode | Pending |
| 23-3 | Single-file HTML build + GitHub release workflow | Pending |

## Docs-site / Admin stability

| Id | Task | Status |
|----|------|--------|
| DS-1 | Fix RangeError at String.repeat when opening admin (guard depth in llms routes) | Done |
| DS-2 | Track any remaining docs-site/admin runtime errors (e.g. email adapter warning) | Done (no release-blocking admin/runtime regressions in current verification sweep) |
