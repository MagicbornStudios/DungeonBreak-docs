# REQUIREMENTS Suggestions (Phase 64)

1. Add a command-board input contract requirement:
- Gameplay-facing menus should show the actual keyboard keycap beside each command/action row.
- Avoid cursor-like form selection, fake control labels such as `change filter`, and duplicate detail headers in overlays.
- Navigation, map, room, bag, and spellbook should all use one keyboard/input language.

2. Add gameplay-facing inventory taxonomy requirements:
- Default bag/equipment screens must not expose merchant-only sell flow.
- Non-equipment treasure containers or meta-loot ids should not surface as ordinary carried items.
- Weapons, equipment, consumables, quest items, and utility items should have clear visual classification.

3. Add content visual coverage requirements:
- Provide icon/sprite/placeholder coverage for rooms, spells, runes, rarities, titles, gear slots, and surfaced item classes.
- Missing art should have a deterministic placeholder language so the UI still reads intentionally.
- Shared visual contracts should be reusable across KAPLAY, docs review surfaces, and downstream runtime consumers.

4. Add livestream parity requirements:
- Livestream must be a persistent on/off mode, not a one-shot action.
- While active, dungeon ticks should consume mana and grant Fame using content-defined values.
- Feed, deeds, and fame unlocks should all reference the same livestream state contract.

5. Add maintainability and performance requirements for the playable shell:
- Menu and overlay rendering should prefer persistent mounted nodes with targeted updates over broad rebuilds.
- Repeated menu-shell derivations should be consolidated behind shared helpers/components instead of diverging scene-local logic.
- Perf work should continue using explicit turn/overlay budgets so readability changes remain measurable.
