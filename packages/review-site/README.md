# `@dungeonbreak/review-site`

**Next.js (static export) + React + Tailwind** hub for the standalone game build, test reports, guides (`GAME_STRUCTURE.md`), and bundled content pack summary.

This package is **not** the DungeonBreak content editor, Payload app, or main docs site — those live under `docs-site/`.

## Tabs

| Tab | Route | Purpose |
| --- | --- | --- |
| **Overview** | `/` | Metrics, manifest, artifact links |
| **Tests** | `/tests/` | Vitest / Playwright detail, CodeMirror-highlighted test sources |
| **Guides** | `/guides/` | Source-of-truth paths, `GAMEPLAY-DESIGN.xml` link, rendered **GAME_STRUCTURE.md** |
| **Game data** | `/game-data/` | Stats + explorer for `content-pack.bundle.v1.json` |

## Build (typical)

From `docs-site/`:

```bash
pnpm review-site:build
```

That runs `prepareStaticReviewSite` (writes `data.json`, copies `game/` + `reports/` + optional `references/GAMEPLAY-DESIGN.xml`), syncs into `packages/review-site/public/`, then `next build` with `output: "export"`. The export is copied to `docs-site/static-review-site/` for CI and GitHub Pages.

### Environment

Copy [`.env.example`](./.env.example) to `.env.local` when needed:

- **`NEXT_PUBLIC_BASE_PATH`** — set to `/YourRepoName` for GitHub **project** Pages.
- **`NEXT_PUBLIC_MAIN_APP_URL`** — full URL of the main docs-site app for outbound links (play, asset explorer).

### `file://` and nested routes

The build runs **`fixNextStaticExportPaths`** in [`docs-site/scripts/build-static-review-site.ts`](../docs-site/scripts/build-static-review-site.ts): it rewrites absolute `/_next/…` and `href="/…"` URLs to **paths relative to each HTML file**, so opening `static-review-site/index.html` from disk loads CSS/JS correctly.

You can still use **`pnpm review-site:serve`** from `docs-site` (HTTP) or **`index.html`** paths under nested folders (`tests/index.html`, etc.).

## Vitest JSON (important)

`docs-site/vitest.config.ts` uses the **default** reporter only. A plain `pnpm test:unit` run **does not** write `test-reports/unit/results.json`.

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

## Fumadocs

Guides use **markdown rendering** (remark + rehype-pretty-code) at build time. File-based **Fumadocs** can be added later under this package only; it was not required for the Next migration.
