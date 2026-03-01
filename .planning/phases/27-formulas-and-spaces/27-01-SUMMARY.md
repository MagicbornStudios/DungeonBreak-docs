# Phase 27-01 Summary: Formulas and Spaces Documentation

## Done

1. **PRD** — `.planning/PRD-formulas-and-spaces.md` captures vision: formulas visible, spaces framework, reasoning, future entity-input → space-position on reports.
2. **Formulas reference** — `docs/formulas/index.mdx`: vector primitives (distance, cosine, clamp), action effects table, combat damage, room influence, deed projection, archetype ranking, skill/dialogue distance, analysis metrics.
3. **Spaces framework** — `docs/formulas/spaces.mdx`: trait, feature, skill, dialogue, archetype spaces; definitions, expansion strategies, gradient-descent analogy; mathematical size and density.
4. **Analysis metrics** — `docs/formulas/analysis-metrics.mdx`: replayability (entropy, coverage, flags), excitement (per-turn, rolling), emergent (novel combos, action entropy); future space-position reporting.
5. **Nav and links** — Formulas in layout.config; reports page links to Formulas, Spaces, Analysis metrics.

## Files

- `.planning/PRD-formulas-and-spaces.md` — new
- `docs-site/content/docs/formulas/index.mdx` — new
- `docs-site/content/docs/formulas/spaces.mdx` — new
- `docs-site/content/docs/formulas/analysis-metrics.mdx` — new
- `docs-site/content/docs/formulas/meta.json` — new
- `docs-site/content/docs/meta.json` — formulas in pages
- `docs-site/app/(fumadocs)/layout.config.tsx` — Formulas nav
- `docs-site/app/(fumadocs)/play/reports/page.tsx` — links to formula docs
- `.planning/TASK-REGISTRY.md` — Phase 27

## Remaining (27-5)

Entity-input → space-position calculator on reports page: input snapshot at turn N, output position in each space (skill distance, archetype rank, dialogue clusters in range). Requires API or client-side engine replay + space computation.
