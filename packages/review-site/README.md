# `@dungeonbreak/review-site`

**Astro + React + Tailwind** static hub for the standalone game build, test reports, guides (source-of-truth + `GAME_STRUCTURE.md`), and a summary of the bundled content pack.

This package is **not** the DungeonBreak content editor, Payload app, or Fumadocs site — those live under `docs-site/`.

## Tabs

| Tab | Purpose |
| --- | --- |
| **Overview** | Metrics, manifest, artifact links |
| **Tests** | Vitest / Playwright detail, **Shiki**-highlighted test snippets |
| **Guides** | Source-of-truth paths, link to copied `GAMEPLAY-DESIGN.xml`, rendered **GAME_STRUCTURE.md** |
| **Game data** | Stats from `content-pack.bundle.v1.json` (read from `docs-site/public/game/` at build time) |

## Build (typical)

From `docs-site/`:

```bash
pnpm review-site:build
```

That runs `prepareStaticReviewSite` (writes `data.json`, copies `game/` + `reports/` + optional `references/GAMEPLAY-DESIGN.xml`) then `astro build` with `REVIEW_SITE_DATA_DIR` pointing at `docs-site/static-review-site/`. Output merges into that directory (`vite.build.emptyOutDir: false`). The docs-site script rewrites Astro asset URLs (including `component-url` / `renderer-url` on islands) to **relative** `_astro/` paths so GitHub Pages and `file://` work.

### `file://` and nested routes

Use explicit **`index.html`** links (`tests/index.html`, `guides/index.html`, `data/index.html`) or run `pnpm review-site:serve` from `docs-site`.

## Vitest JSON (important)

`docs-site/vitest.config.ts` uses the **default** reporter only. A plain `pnpm test:unit` run **does not** write `test-reports/unit/results.json`, so ad-hoc runs won’t shrink the Tests tab.

Refresh the snapshot with:

```bash
pnpm --dir docs-site test:unit:report
```

Then `pnpm review-site:build`. CI already runs `test:unit:report` before the review-site build.

## Local dev

After at least one successful `pnpm review-site:build` (so `docs-site/static-review-site/data.json` exists), from **this package**:

```bash
pnpm dev
```

`load-build-data.ts` falls back to `../docs-site/static-review-site` or `./public` when `REVIEW_SITE_DATA_DIR` is unset.

## Path aliases

- `@docs/*` → `docs-site/*` (shared types / parsers at build time)
- `@/*` → `packages/review-site/src/*` (UI, utilities)
