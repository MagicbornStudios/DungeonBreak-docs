# PRD: Engineering/Scientific UI Aesthetic

**Status:** In progress  
**Scope:** Docs-site, Play, Planning, Kaplay integration

---

## Goals

1. **Text-heavy, subtle** — Engineering/scientific team preference; reduce visual noise.
2. **Less rounded** — Reduce border-radius across the site.
3. **Remove gradient** — Flat backgrounds; no decorative gradients.
4. **Compact cards** — Smaller, denser cards on Play and reports.
5. **Sidebar + ToC everywhere** — All pages show nav sidebar; content pages show ToC where applicable.
6. **Better planning markdown** — Planning docs render cleanly.

## Kaplay ASCII Grid

- **Fix:** "Styled text error: unclosed tags" — Escape `[` and `]` in engine output before passing to `k.text()` so they are not parsed as Kaplay style tags.
- **Dev:** Reload iframe when kaplay-demo dist changes (e.g. cache-bust query param, or dev proxy).
- **Production:** Build kaplay in CI; artifact at `docs-site/public/game/index.html`; deploy as static asset.
- **Debug:** Forward iframe console errors to parent; surface in dev tools.

## Out of scope (for now)

- First-person mode removal (still needed for React/play shell).
- Full redesign of Play layout (incremental).
