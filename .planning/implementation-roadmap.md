# DungeonBreak Implementation Roadmap

Phased development with explicit acceptance criteria per Ralph Wiggum loop methodology. Each phase ends when its completion criteria are met.

**Narrative Engine (plugin):** State model (N-D basis vectors, Verlet, constraints), dialog/storylet selection by saliency and threshold, alignment and canon/subjective knowledge — see `.planning/DECISIONS.md` (Narrative Engine subsection) and `.planning/PROJECT.md` (Game and narrative scope). **First testable slice:** Verlet integration + constraint application (per-axis min/max, reproject old_p) implemented and unit-tested so narrative state stays within bounds. Later: dialog selection by position/Location, integration with DialogComponent and Yarn Spinner.

---

## Phase 1: Core Systems Foundation

**Scope**: Stabilize existing modules (Quaterra, Narrative, Combat, Economy) and establish integration patterns.

**Milestones**:
| Milestone | Description | Acceptance criteria |
|-----------|-------------|---------------------|
| 1.1 | Interaction System | UInteractionSystem handles Friendly/Hostile toggle; FInteractionHandle lifecycle correct |
| 1.2 | Narrative Pipeline | Dialog flows from Narrative module through HUD; keywords and goals wired |
| 1.3 | Combat Baseline | GAS attributes, damage execution, auto-attack functional |
| 1.4 | Economy Baseline | Inventory, equipment slots, currency; UInventoryComponent operational |

**Done**: All four milestones pass; no regressions in existing tests.  
**Output**: `<promise>PHASE1_DONE</promise>`

---

## Phase 2: World & Linear Path

**Scope**: Implement linear world structure; towns and dungeons as POIs; basic world map navigation.

**Milestones**:
| Milestone | Description | Acceptance criteria |
|-----------|-------------|---------------------|
| 2.1 | World Map | Linear path visible; player knows "where to go next" |
| 2.2 | POI Spawning | Towns and dungeons spawn along path; predicate-based placement |
| 2.3 | Dungeon Layout | Tile/grammar-based dungeon generation; no perceptual oatmeal in layouts |
| 2.4 | Travel Flow | Fast-forward time; towns safe for resting/training; risk on road |

**Done**: Player can traverse linear path; POIs feel distinct.  
**Output**: `<promise>PHASE2_DONE</promise>`

---

## Phase 3: Character Systems

**Scope**: Orthogonal traits, progression, training regimens, time-spend economy for characters.

**Milestones**:
| Milestone | Description | Acceptance criteria |
|-----------|-------------|---------------------|
| 3.1 | Orthogonal Traits | Trait axes defined; no overlapping behavior (per DECISIONS) |
| 3.2 | Progression | Skills improve by use; attributes via items; combat metrics feed XP |
| 3.3 | Training Regimens | Trainers teach regimens; training grounds functional |
| 3.4 | Character Simulation | All characters simulate on time-spend; NPC growth independent of player |
| 3.5 | Aging & Death | Death frequent; respawn with retained experience/regimens; visible aging |

**Done**: Character system supports modular, perceptually unique NPCs.  
**Output**: `<promise>PHASE3_DONE</promise>`

---

## Phase 4: Ever Growing Threat

**Scope**: Dungeon breaks, emergent threats, society-driven crisis escalation.

**Milestones**:
| Milestone | Description | Acceptance criteria |
|-----------|-------------|---------------------|
| 4.1 | Dungeon Gates | Gates spawn creatures (goblins, kobolds, etc.); threaten roads/towns |
| 4.2 | Threat Escalation | Frequency and severity scale with societal/crisis variables |
| 4.3 | Safe Zones | Towns safer than roads; "none safe forever" enforced |
| 4.4 | NPC Response | NPCs react to threats; some become allies, some competition |

**Done**: Threat loop feels dynamic; player understands "ever growing" pressure.  
**Output**: `<promise>PHASE4_DONE</promise>`

---

## Phase 5: Economy & Guild Hierarchy

**Scope**: In-depth economy; guild power structure; adventurer stratification.

**Milestones**:
| Milestone | Description | Acceptance criteria |
|-----------|-------------|---------------------|
| 5.1 | Economy Loop | Shops, currencies, items; economy ties into core loops |
| 5.2 | Guilds | Guilds control adventuring means; top-down power structure |
| 5.3 | Stratification | Top adventurers have privilege; lower tiers struggle (streaming/livelihood theme) |
| 5.4 | Time-Spend Economy | Character growth and world state tied to game time; emergent competition/alliances |

**Done**: Economy and guild systems support narrative themes.  
**Output**: `<promise>PHASE5_DONE</promise>`

---

## Phase 6: Dialog & TTRPG Feel

**Scope**: Effort resource, alignment, dialog options with requirements/rewards; companion walk-and-talk.

**Milestones**:
| Milestone | Description | Acceptance criteria |
|-----------|-------------|---------------------|
| 6.1 | Effort System | Effort (⚡) consumed by actions; Pause, Reconsider, Vow, etc. |
| 6.2 | Alignment | Actions affect alignment; +Alignment feedback visible |
| 6.3 | Dialog Requirements | Options have attribute/skill/alignment requirements and rewards |
| 6.4 | Companion Dialogue | Walk and talk with companions; light-hearted exchanges feed narrative |
| 6.5 | TTRPG Feel | Feels like playing in a TTRPG; DM-like pacing and discovery |

**Done**: Interaction loop matches dialog mockup; TTRPG feel achieved.  
**Output**: `<promise>PHASE6_DONE</promise>`

---

## Phase 7: Time Travel & Branching

**Scope**: Time travel mechanics; bifurcation from choices; retained vs. reset state.

**Milestones**:
| Milestone | Description | Acceptance criteria |
|-----------|-------------|---------------------|
| 7.1 | Time Travel | Time travel possible; systemically discouraged but necessary at times |
| 7.2 | Reset Rules | Currency/items reset; experience, regimens, visual progression retained |
| 7.3 | Bifurcation | Choices create divergent outcomes within same world space |
| 7.4 | Future Trunks Arc | Guaranteed grim future; player can prepare via friends and choices |

**Done**: Time loop supports Re:Zero–style iteration with retained knowledge.  
**Output**: `<promise>PHASE7_DONE</promise>`

---

## Phase 8: Polish & Content

**Scope**: UI polish, content authoring, perceptual uniqueness pass.

**Milestones**:
| Milestone | Description | Acceptance criteria |
|-----------|-------------|---------------------|
| 8.1 | UI Polish | Party builder, loadouts, RTS controls match reference |
| 8.2 | Content Volume | Story volume populated; sufficient variety for perceptual uniqueness |
| 8.3 | Oatmeal Pass | No "10,000 bowls" feeling in characters, events, or locations |
| 8.4 | Exceptions | Hand-authored flourishes that break rules where appropriate |

**Done**: Game feels complete and distinct; no placeholder-only content.  
**Output**: `<promise>PHASE8_DONE</promise>`

---

## Ralph Wiggum Loop Application

For each phase:
1. Define scope and completion criteria (above).
2. Implement milestones; self-check against criteria.
3. If failing: note blockers, refine, retry.
4. Output `<promise>PHASE_N_DONE</promise>` when done.
5. Cap iterations per phase (e.g., max 2–3 planning refinements) to avoid over-planning.
