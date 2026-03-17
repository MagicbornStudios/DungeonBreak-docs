# Notebooks

Content-focused tools: view, rebalance, and inspect behaviour of game content. Data is read from `packages/engine/.../contracts/data/` (JSON). Running `pnpm lab` does not build or generate engine artifacts.

**Pattern for each tool:** (1) **Schema(s)** that define the data, (2) **Asset / pack** we load, (3) **View** the content, (4) **Rebalance** (tune numbers in the pack), (5) **Behaviour** (assignments: room feature, narrative stats, policies, etc.). Edit the JSON packs and re-run the load cell to apply changes.

| Notebook | Schema(s) | Pack(s) | View / rebalance / behaviour |
|----------|-----------|---------|------------------------------|
| **entity-archetype-explorer.ipynb** | archetypes.schema.json | content_archetypes.json | Narrative stats → picked archetype; rebalance vectorProfile/featureProfile, preferredSkills |
| **spell-rune-explorer.ipynb** | spells, spell-evolution, spell-forge-costs, runes | content_spells, content_spell_evolution, config_spell_forge_costs, lookup_runes | Filter by category/rarity/type; evolution table; rebalance mana/power/forge; behaviour = category, effectIds, evolution gates |
| **dialogue-explorer.ipynb** | dialogue.schema.json | content_dialogue.json | By scene/room feature; anchor/effect vectors; rebalance radius/effectVector; behaviour = requiresRoomFeature, requiresSkillId, item tags |
| **dungeon-room-explorer.ipynb** | dungeons, rooms, room-templates | content_dungeons, content_rooms, content_room_templates | Dungeons, rooms, room type (room feature); rebalance room assignments |
| **spawn-table-viewer.ipynb** | spawn-table.schema.json | content_spawn_table.json | Entries by depth; rebalance weight, minDepth, maxDepth; behaviour = archetypeId per depth band |
| **action-catalog-viewer.ipynb** | action-catalog, action-intents, action-policies, action-formulas | config_action_* | Actions by group; requiresRoomFeature (room type); rebalance formula deltas |

**Run:** Open in Jupyter Lab or VS Code; run cells in order. For entity-archetype-explorer interactive app you need:

```bash
pip install ipywidgets
```

Restart the kernel after installing. Without `ipywidgets`, the notebook shows an install message and you can still use the programmatic cells (edit the narrative-stat dicts and re-run the result cell).

Data path: `packages/engine/.../contracts/data/content_archetypes.json` (resolved from repo root).
