# Browser Parity Matrix (Phase 13)

Status date: 2026-02-27  
Baseline: `src/dungeonbreak_narrative/escape_the_dungeon` (Python)  
Target: `docs-site/lib/escape-the-dungeon` (TypeScript browser runtime)

## Legend
- `Done`: implemented and covered by tests
- `Partial`: implemented with known delta
- `Pending`: not implemented yet

## Matrix

| Capability | Python Baseline | TS Browser | Status | Notes |
|---|---|---|---|---|
| World topology (12 levels, 50 rooms) | Yes | Yes | Done | Unit tested counts and structure |
| Room composition (20 treasure, 5 rune forge) | Yes | Yes | Done | Verified per-level in tests |
| Start/exit placement and vertical traversal | Yes | Yes | Done | Includes `up/down` links |
| Shared action catalog | Yes | Yes | Done | Player + NPC availability model |
| Action gating with blocked reasons | Yes | Yes | Done | `availableActions` includes reasons |
| Dialogue option range/room-state filtering | Yes | Yes | Done | Room/item dependent options |
| Appraisal vs xray exclusivity | Yes | Yes | Done | Run-level branch enforced |
| Rune forge skill evolution | Yes | Yes | Done | `evolve_skill` gate |
| Livestream effort/fame model | Yes | Yes | Done | Deterministic formula ported |
| Deeds and semantic projection | Yes | Yes | Done | Hash embedding v1 in browser |
| Rumor spread and talk propagation | Yes | Yes | Done | Spread + cross-pollination |
| Companion cap and recruit gating | Yes | Yes | Done | Max active companion = 1 |
| Murder faction/reputation/trait gating | Yes | Yes | Done | Laughing Face compatible |
| Hostile per-turn spawn pressure | Yes | Yes | Done | Spawn from exit per player turn |
| Rune forge exclusion for hostiles | Yes | Yes | Done | Move block in hostile pathing |
| Level curves and combat effects | Yes | Yes | Done | Base level + xp + enemy bonus |
| Chapter/act/page logs with `action@room` | Yes | Yes | Done | Player and chapter pages |
| Cutscene trigger logging | Yes | Yes | Done | Triggered events added to logs |
| Snapshot/restore | Yes | Yes | Done | Browser snapshot + restore API |
| Browser persistence autosave/slots | N/A | Yes | Done | IndexedDB with memory fallback |
| Browser 3-column UX at `/play` | N/A | Yes | Done | shadcn layout + Assistant UI feed + button actions |
| Browser e2e smoke | N/A | Yes | Done | Playwright validates click-flow + cutscene modal + autosave reload |
| Terminal binary packaging | Yes | N/A | Done | Maintained in Python workflow |

## Known Deltas

| Area | Delta | Impact | Follow-up |
|---|---|---|---|
| Embeddings | Browser uses deterministic hash projection instead of model embeddings | Semantic quality lower than optional model path | Phase 14 optional model-backed browser embeddings |

## Definition-of-Done Check (Phase 13)

- [x] `/play` route playable in docs site
- [x] Homepage links to `/play`
- [x] Core parity matrix rows implemented for required demo systems
- [x] Browser persistence works (autosave + slots)
- [x] Browser unit + e2e smoke are in CI workflow
- [x] Terminal release workflow gated by browser checks
