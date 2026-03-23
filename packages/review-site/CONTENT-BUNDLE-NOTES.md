# Content bundle display — follow-ups (not blocking UI)

## What the hub shows today

The **Game data** tab reads `docs-site/public/game/content-pack.bundle.v1.json` (copied into `static-review-site/game/`). The explorer lists **top-level keys under `packs`** exactly as emitted by the ingest pipeline.

## Naming vs. mental model (“entity pack”, etc.)

- There is **no** `entityPack` key in the current public bundle; entities may live under **`contentSource`**, **`contentSchema`**, or a pack that is **not** included in this snapshot (canonical project packs under `content-projects/` can differ from what `content-pack-ingest` publishes to `public/game/`).
- **`spaceVectors`** and **`skillPack`** are present in the bundle JSON by design until ingest/schema changes remove or rename them.

## Why “pack keys” felt wrong

1. **Raw keys** are pipeline identifiers, not product “collections” names — the UI now maps them to titles/categories; deeper renaming belongs in ingest or docs.
2. **Completeness** depends on the **ingest script** and which packs are merged into `content-pack.bundle.v1.json`, not the review site.

## Planned / optional next steps

- Align ingest output with a stable **catalog** (ordered list + human labels) checked into repo or generated next to the bundle.
- Add **`entityTypes`** (or equivalent) to the published bundle if gameplay/editor requires it as a first-class pack.
- Optional: diff bundle keys between **canonical project** vs **public snapshot** in CI and surface in review hub.
