# UI Component Registry

**Status:** Living doc — stubs for layout; hook-in as we build  
**Location:** `.planning/UI-COMPONENT-REGISTRY.md`  
**Related:** [KAPLAY Interface Spec](.planning/KAPLAY-INTERFACE-SPEC.md) | [GRD](.planning/GRD-escape-the-dungeon.md)

---

## Purpose

Registry of all UI components/screens needed for Escape the Dungeon. Each entry has:
- **Layout** (greybox)
- **Engine hook** (what state/actions drive it)
- **Build target** (React/shadcn vs KAPLAY)
- **Status** (stub | partial | complete)

Composable: design once, implement in React (shadcn) and/or KAPLAY (rect/text).

---

## Component List

| Id | Component | Build | Engine Hook | Status |
|----|-----------|-------|-------------|--------|
| UI-01 | Navigation (grid) | KAPLAY | move, roomId, exits | stub |
| UI-02 | Combat | KAPLAY, React | fight, flee | stub |
| UI-03 | Action menu | KAPLAY | buildActionGroups | stub |
| UI-04 | Rune Forge | KAPLAY | rest, evolve_skill, room=rune_forge | stub |
| UI-05 | Inventory | KAPLAY, React | entity.inventory | stub |
| UI-06 | Dialogue | KAPLAY, React | choose_dialogue | partial (React) |
| UI-07 | Cutscene | KAPLAY, React | extractCutsceneQueue | partial (React) |
| UI-08 | Room info panel | KAPLAY, React | roomId, feature, exits, entities | stub |
| UI-09 | Status strip | KAPLAY, React | engine.status() | partial (React) |
| UI-10 | Feed / log | KAPLAY, React | toFeedMessages | partial (React) |
| UI-11 | First-person narrative | KAPLAY | engine.look() | stub |
| UI-12 | System menu (Esc) | KAPLAY | Save, Load | stub |
| UI-13 | Purchase (Rune Forge) | — | future | not in engine |
| UI-14 | Re-equip / Equip | — | future | not in engine |

---

## Layout Stubs

### UI-01: Navigation (Grid)

```
┌─ ASCII Map ─────────────────────┐
│  #####  #.T#  #.R#              │
│  #.@.   #.D#  #.^#              │
│  #...   #...  #...              │
└─────────────────────────────────┘
```
- **Content:** Room glyphs; player position; discovered vs `#`
- **Input:** WASD, arrows

---

### UI-02: Combat

```
┌──────────────────────────────────────────────────┐
│  Enemy: [name]  HP [bar]  Lv [n]                 │
│  Kael   HP [bar]  Energy  Lv                     │
│  [Fight] [Flee] [Item] [Skill]                   │
│  [Feed: last 1–2 combat messages]                │
└──────────────────────────────────────────────────┘
```
- **Content:** Opponent stats, player stats, action buttons
- **Engine:** fight, flee dispatch; outcome in feed
- **Future:** Item, Skill if engine gains them

---

### UI-03: Action Menu

```
┌──────────────────────────────────────────────────┐
│  Movement: [N] [S] [E] [W]                       │
│  Room: [Train] [Rest] [Search]                   │
│  Dialogue: [Talk] [Choose…]                      │
│  Combat: [Fight] [Flee] [Steal] [Recruit]        │
│  Special: [Stream] [Evolve] [Rune Forge]         │
│  Utility: [Inventory] [Save] [Load]              │
└──────────────────────────────────────────────────┘
```
- **Content:** buildActionGroups(engine), filtered by room/state
- **Trigger:** Interact key (E/Space)

---

### UI-04: Rune Forge

```
┌──────────────────────────────────────────────────┐
│  RUNE FORGE                                      │
│  [Rest] [Inventory] [Evolve skill]               │
│  [Purchase] [Re-equip]  (future)                 │
│  ┌─ Evolvable skills ──────────────────────┐   │
│  │  Appraisal → Deep Appraisal  [Evolve]     │   │
│  │  X-Ray → …  (locked: …)                   │   │
│  └──────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```
- **Content:** Skills with requiresRuneForge; prereq check
- **Engine:** evolve_skill, rest; room feature = rune_forge

---

### UI-05: Inventory

```
┌──────────────────────────────────────────────────┐
│  INVENTORY                                       │
│  ┌────────────────────────────────────────────┐  │
│  │  1. Worn Blade (weapon, common)             │  │
│  │  2. Treasure Cache (loot, rare)             │  │
│  │  3. — empty —                               │  │
│  └────────────────────────────────────────────┘  │
│  [Select] [Equip] [Drop] [Back]                  │
└──────────────────────────────────────────────────┘
```
- **Content:** entity.inventory; itemId, name, tags, rarity
- **Engine:** display only; Equip/Drop future

---

### UI-06: Dialogue

```
┌──────────────────────────────────────────────────┐
│  [NPC name]: "[Line]"                            │
│  ┌────────────────────────────────────────────┐  │
│  │  [Option A]                                 │  │
│  │  [Option B]                                 │  │
│  │  [Option C]                                 │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```
- **Content:** Dialogue cluster options by vector distance
- **Engine:** choose_dialogue with optionId

---

### UI-07: Cutscene

```
┌──────────────────────────────────────────────────┐
│  *** [Title] ***                                 │
│  [Prose text...]                                 │
│  [Continue]                                      │
└──────────────────────────────────────────────────┘
```
- **Content:** extractCutsceneQueue
- **Engine:** Blocking until dismissed

---

### UI-08: Room Info Panel

```
┌──────────────────────────────────────────────────┐
│  L12_R042 · training                             │
│  Exits: N S E W  │  Nearby: Mira, Hostile_001   │
└──────────────────────────────────────────────────┘
```
- **Content:** roomId, feature, exits, nearby entities
- **Shared:** First-person and grid use same data

---

### UI-09: Status Strip

```
Depth 12  HP 100  E 0.85  Lv12  [▼]
```
- **Expand:** Traits, features, archetype, quests
- **Engine:** engine.status()

---

### UI-10: Feed

```
t45 Kael move@L12_R042: Moved north.
t45 Room influence: +Survival 0.02
```
- **Content:** toFeedMessages (last N lines)
- **Engine:** Turn result events

---

## Composability Notes

- **React build:** Use shadcn Card, Button, etc. Map each stub to a component.
- **KAPLAY build:** Each stub = scene or scene layer. Primitives: rect, text, area (click).
- **Shared:** Data contracts from engine (status, actions, inventory, dialogue options).

---

## Update Log

| Date | Change |
|------|--------|
| 2026-02 | Initial stub registry; screen-based model; Combat, Rune Forge, Inventory, Dialogue layouts |
