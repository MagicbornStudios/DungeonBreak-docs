# Content Pack Inbox (Local)

Drop JSON patch files into `docs-site/content-packs/inbox` and run:

```bash
pnpm --dir docs-site run content:ingest
```

The ingest step merges all inbox patches into:

- `docs-site/public/game/content-pack.bundle.v1.json` (KAPLAY runtime source)
- `docs-site/public/reports/content-pack.latest.report.json` (latest summary report)
- `docs-site/content-packs/out/content-pack.bundle.generated.v1.json` (local snapshot)

Accepted patch payload shapes:

- `{ "spaceVectorsPatch": { ... } }`
- `{ "spaceVectors": { ... } }`
- `{ "packs": { "spaceVectors": { ... } } }`
- direct `spaceVectors` object with `featureSchema` and/or `modelSchemas`

Notes:

- Local-only workflow by default (no remote publish required).
- Ingest is idempotent: if merged bundle hash is unchanged, bundle file is not rewritten.
- To opt into Dolt, place a local Dolt repo at `docs-site/content-packs/dolt/` (or set `CONTENT_PACK_DOLT_PATH`) and expose a table named `content_pack_patches` with columns `id`, `created_at`, and `payload` (JSON). The ingest script will run `dolt sql --format json -q "select id, payload from content_pack_patches order by created_at"` and merge the payloads automatically; set `CONTENT_PACK_DOLT_CMD` if `dolt` is not on your path.
