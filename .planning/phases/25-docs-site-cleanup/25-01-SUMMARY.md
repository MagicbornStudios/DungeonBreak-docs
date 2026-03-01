# Phase 25-01 Summary: Docs-site Cleanup

## Done

1. **TASK-REGISTRY** — Added Phase 25 with tasks 25-1 through 25-5.
2. **Nav** — Updated `layout.config.tsx`: added Play, Reports, Downloadables, Engine, Roadmap, GRD; reduced template clutter (replaced Getting Started with Play-led nav); homeOptions aligned.
3. **Planning markdown** — Created `components/planning-markdown.tsx` (reads .planning files, renders with react-markdown) and `app/(fumadocs)/planning/[[...slug]]/page.tsx` for `/planning`, `/planning/roadmap`, `/planning/grd`.
4. **Downloadables** — Created `/play/downloads` page and `/api/reports/[filename]` route serving `.planning/test-reports/*` with `Content-Disposition: attachment`.
5. **Engine docs** — Added `content/docs/engine/index.mdx` with overview and package pointer; updated `content/docs/meta.json` to include engine.
6. **Play page** — Added link to Downloadables.

## Files changed

- `.planning/TASK-REGISTRY.md` — Phase 25 + tasks
- `.planning/phases/25-docs-site-cleanup/` — CONTEXT, PLAN, SUMMARY
- `docs-site/app/(fumadocs)/layout.config.tsx` — nav links
- `docs-site/components/planning-markdown.tsx` — new
- `docs-site/app/(fumadocs)/planning/[[...slug]]/page.tsx` — new
- `docs-site/app/api/reports/[filename]/route.ts` — new
- `docs-site/app/(fumadocs)/play/downloads/page.tsx` — new
- `docs-site/content/docs/engine/index.mdx` — new
- `docs-site/content/docs/engine/meta.json` — new
- `docs-site/content/docs/meta.json` — engine in pages
- `docs-site/app/(fumadocs)/play/page.tsx` — Downloadables link
- `docs-site/package.json` — react-markdown dependency
