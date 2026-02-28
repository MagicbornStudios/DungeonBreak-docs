# Browser Parity Matrix (Phase 14/15 Closeout)

Status date: 2026-02-28  
Canonical runtime: TypeScript (`@dungeonbreak/engine`)  
Consumers: docs-site `/play`, package consumer tests

## Legend

- `Done`: implemented and covered by tests
- `Partial`: implemented with known follow-up
- `Pending`: not implemented yet

## Matrix

| Capability | Package Runtime | Docs `/play` | Status | Evidence |
|---|---|---|---|---|
| World topology (12 levels, 50 rooms) | Yes | Yes | Done | unit: world generation counts |
| Room composition (20 treasure, 5 rune forge) | Yes | Yes | Done | unit: per-level feature counts |
| Shared action catalog (player/NPC) | Yes | Yes | Done | engine availability + NPC simulation |
| High-level combat controls (`fight`, `flee`) | Yes | Yes | Done | unit: flee deterministic movement |
| No-grid encounter combat simulation | Yes | Yes | Done | combat system + GRD contract |
| Action gating with blocked reasons | Yes | Yes | Done | unit + presenter + e2e blocked states |
| Deed misinformation model (`verified/rumor/misinformed`) | Yes | Yes | Done | unit: misinformation propagation |
| Action outcome contract data (machine-readable) | Yes | Yes | Done | `contracts/data/action-formulas.json` |
| Shared JSON content packs + schemas | Yes | Yes | Done | `contracts/data/*`, `contracts/schemas/*` |
| Canonical deterministic replay fixture | Yes | Yes | Done | fixture + replay harness hash lock |
| Deterministic 25-turn reference run | Yes | Yes | Done | unit: 25-turn integrated scenario |
| Vector usage analytics report | Yes | Yes | Done | `report:vector-usage` + CI artifact |
| Pressure cap/pruning + perf target (`p95 <= 2s`) | Yes | Yes | Done | unit: performance + pressure-control event |
| Browser 3-column playable UX | N/A | Yes | Done | e2e `/play` click-flow |
| Cutscene blocking queue | N/A | Yes | Done | e2e modal assertion |
| Autosave restore on reload | N/A | Yes | Done | e2e reload assertion |
| Package export (`GameEngine`, `DungeonBreakGame`) | Yes | Consumed | Done | package-consumer unit tests |
| CI package + docs consumer gates | Yes | Yes | Done | workflows: docs-browser + engine-package-release |

## Known Deltas

| Area | Delta | Impact | Follow-up |
|---|---|---|---|
| Browser embeddings | Deterministic hash projection is still v1 baseline | Lower semantic richness vs model-backed embeddings | Phase 16+ optional model-backed embedding mode |

## Closeout Checklist

- [x] TypeScript runtime is canonical source of truth
- [x] Python gameplay runtime removed from active repo paths
- [x] Notebook gameplay artifacts removed from active repo paths
- [x] Package `@dungeonbreak/engine` built with bundled data/component
- [x] Docs `/play` remains playable and publishing-compatible for Vercel
