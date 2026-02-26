# DungeonBreak Image Catalog

Index of design and reference images in `docs/`, organized by folder. Paths are relative to `docs/`.

---

## Architecture

| File | Description | PRD Section |
|------|-------------|-------------|
| [architecture-component-dependencies.png](architecture/architecture-component-dependencies.png) | Component dependency diagram: Plugin (Narrative Engine, GameData, Core), Solution (HUD, Dungeon Break), Module (Narrative, World/Quaterra, Combat, Economy), and sub-components (USubjectivityComponent, UQuaterraComponent, etc.) | §7 Technical Architecture |
| [architecture-module-details.png](architecture/architecture-module-details.png) | Variant with UWorldMapComponent, UDungeonGenerator, Economy Roles (SelfStudy, ShopType, Education) | §7 Technical Architecture |
| [gameplay-loop-systems-diagram.png](architecture/gameplay-loop-systems-diagram.png) | Bubble diagram: Combat, Movement, AI, Quaterra, Characters, Narrative, Economy, Items | §7 Technical Architecture |

---

## Concepts

| File | Description | PRD Section |
|------|-------------|-------------|
| [ever-growing-threat-time-spend-economy.png](concepts/ever-growing-threat-time-spend-economy.png) | Dungeon gates, emergent threats (goblins, kobolds); society-driven crisis escalation; time-spend economy; NPC simulation as threats/allies | §5 Threat & Progression |
| [guild-hierarchy-economy-capitalism.png](concepts/guild-hierarchy-economy-capitalism.png) | Guild power structure (Hunters, Fame, White Tiger, Reaper, Knights); top adventurer privilege; economy/streaming disparity | §6 Economy |
| [influence-scale-narrative-gameplay-moodboard.png](concepts/influence-scale-narrative-gameplay-moodboard.png) | Narrative influences (Hadestown → One Piece); Gameplay influences (Black & White 2 → Dungeon Siege) | §8 Influences |
| [gameplay-pillars.png](concepts/gameplay-pillars.png) | User Stories and Tenets: Shonen Fantasy, Traverse the Narrative, Meaningful Combat | §1 Vision & Pillars |
| [dungeonbreak-one-pager.png](concepts/dungeonbreak-one-pager.png) | Concept overview, pillars, architecture, visual style, roadmap (3yr prototype, 4-6yr build, 10-30yr iterate), CStamp Games | §1 Vision & Pillars |

---

## Mechanics

| File | Description | PRD Section |
|------|-------------|-------------|
| [combat-training-dialog-mechanics.png](mechanics/combat-training-dialog-mechanics.png) | Stats, attributes, abilities, synergies; inflection points; moment-to-moment controls; Semantic Predicates, Dungeon Master LLM | §2 Core Loops, §4 Character Systems |
| [core-gameplay-loop-flowchart.png](mechanics/core-gameplay-loop-flowchart.png) | Start → Choose Action → Rise/Fall → Combat → Party Wipe → Load checkpoint → Win | §2 Core Loops |
| [gameplay-system-breakdown-vocations-economy.png](mechanics/gameplay-system-breakdown-vocations-economy.png) | Vocations (Blacksmith, Bard, Oracle, Master, Hero); Entities with wave function collapse; Mana and live streaming | §2 Core Loops, §6 Economy |
| [training-sim-progression-mechanics.png](mechanics/training-sim-progression-mechanics.png) | Skills by doing; attributes via items; power scale; trainers and regimens; party skills; time travel discouraged but necessary | §4 Character Systems |
| [time-travel-progression-aging-death.png](mechanics/time-travel-progression-aging-death.png) | Death/respawn loop (Tokyo Revengers, Re:Zero); time travel with retained experience; visible aging (One Piece, Solo Leveling) | §4 Character Systems |

---

## Narrative

| File | Description | PRD Section |
|------|-------------|-------------|
| [exploration-loop-world-environment.png](narrative/exploration-loop-world-environment.png) | Dungeon/Outskirts/Town/Wilderness loop; long form linear story | §3 World & Narrative |
| [linear-world-branching-narrative.png](narrative/linear-world-branching-narrative.png) | Linear path with variable characters/events; One Piece-style plot; Dungeon Siege map; bifurcation from choices | §3 World & Narrative |
| [narrative-chronological-arcs.png](narrative/narrative-chronological-arcs.png) | Chronological order vs frequency graph; 12 arcs (Grand War, Everbloom Isle, etc.); alternate endings (deaths); Taiyo | §3 World & Narrative |
| [narrative-state-vector-concept.png](narrative/narrative-state-vector-concept.png) | 2D slice of player state vector; Hilbert space, multivariate Gaussian; narrative entity proxies; Forest Battle, Troll Cave, Dragon's Lair | §3 World & Narrative |
| [narrative-worldbuilding-map.png](narrative/narrative-worldbuilding-map.png) | Cause/effect: Dungeons, Mana Crystals, Economy, Portals, Guilds, Demihuman; Lore-to-WorldBuilding cutoff | §3 World & Narrative |

---

## UI

| File | Description | PRD Section |
|------|-------------|-------------|
| [dialog-mockup-v3-interaction-combat-toggle.png](ui/dialog-mockup-v3-interaction-combat-toggle.png) | Friendly/Hostile toggle (ALT), action bar with effort (⚡), alignment (+15), dialog options (Vow, Laugh, Embrace, Pay), party portraits, map icon | §2 Core Loops |
| [dungeon-cast-ttrpg-companion-dialogue.png](ui/dungeon-cast-ttrpg-companion-dialogue.png) | Walk-and-talk companions, light-hearted exchanges feeding gameplay; TTRPG feel with DM screen and campfire scenes | §1 Vision & Pillars, §2 Core Loops |
| [inventory-v2-character-sheets.png](ui/inventory-v2-character-sheets.png) | Character roster, attributes, skills, callings, equipment, combat log (Kaiza, Kamaite, Hikaru vs Krug/wolf) | §2 Core Loops |
| [party-builder-rts-controls-ui-reference.png](ui/party-builder-rts-controls-ui-reference.png) | Party selection (Pokémon-style), loadout management (isometric RPG), lightweight dialog UI (TFT-style), right-click move (LoL) | §2 Core Loops |

---

## Quick Reference by PRD Section

- **§1 Vision & Pillars**: gameplay-pillars, dungeonbreak-one-pager, dungeon-cast-ttrpg-companion-dialogue
- **§2 Core Loops**: dialog-mockup-v3-interaction-combat-toggle, party-builder-rts-controls-ui-reference, inventory-v2-character-sheets, combat-training-dialog-mechanics, core-gameplay-loop-flowchart, gameplay-system-breakdown-vocations-economy
- **§3 World & Narrative**: linear-world-branching-narrative, exploration-loop-world-environment, narrative-state-vector-concept, narrative-chronological-arcs, narrative-worldbuilding-map
- **§4 Character Systems**: time-travel-progression-aging-death, training-sim-progression-mechanics
- **§5 Threat & Progression**: ever-growing-threat-time-spend-economy
- **§6 Economy**: guild-hierarchy-economy-capitalism, gameplay-system-breakdown-vocations-economy
- **§7 Technical Architecture**: architecture-component-dependencies, architecture-module-details, gameplay-loop-systems-diagram
- **§8 Influences**: influence-scale-narrative-gameplay-moodboard
- **Game PRD, Narrative Engine, implementation roadmap, decisions**: all in `.planning/`. Simulation notebooks in `notebooks/`.
