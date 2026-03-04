# Agent Loop Guide

XML-first planning. Use `.planning/templates/` for PLAN, SUMMARY, ROADMAP, TASK-REGISTRY, DECISIONS. Cite PRD/GRD in `references`.

**Quick start:** We have a planning CLI—run it to start. Run `planning snapshot` (or `pnpm planning snapshot` / `node scripts/loop-cli.mjs snapshot`) → register agent id in STATE.xml → claim task in TASK-REGISTRY.xml → read REQUIREMENTS.xml for phase. **When the planning MCP server (dungeonbreak-planning) is available,** prefer its tools (snapshot, open_questions, get_agent_bundle, task_update, etc.) so all agents use the same orchestration surface. **Workflow:** Update ROADMAP, phase PLAN/SUMMARY; sync TASK-REGISTRY, DECISIONS, STATE; add `requriements-suggestions` for gaps; record errors in ERRORS-AND-ATTEMPTS.xml. **Identity:** Unique `agent-YYYYMMDD-xxxx` in STATE; `planning new-agent-id`. **Loop:** Include snapshot in updates when asked; close tasks and set inactive when done; compact refs; don’t block on open questions—capture in `requriements-suggestions`.

---

# Coding Standards & Styling

**Format & lint:** `pnpm dlx ultracite fix` / `ultracite check`. Biome handles most formatting; run before commit.

**TypeScript:** Explicit types where they help; `unknown` over `any`; const assertions; type narrowing over assertions; named constants over magic numbers.

**TS/JS:** Arrow callbacks; `for...of`; `?.` and `??`; template literals; destructuring; `const` by default.

**React:** Function components; hooks at top level only; full dependency arrays; unique `key` (not index); semantic HTML + ARIA (alt, headings, labels, keyboard + mouse, `<button>`/`<nav>`); no components defined inside components.

**DRY & SOLID:** Don’t repeat yourself—extract shared logic and UI into reusable pieces. Single responsibility, open/closed, clear dependencies. Prefer composition over duplication.

**Components & UI (don’t reinvent the wheel):** Use **shadcn/ui** first. Check the [shadcn registry](https://ui.shadcn.com) and 3rd party components built on shadcn (or Radix). Prefer lightweight, well-maintained 3rd party over custom builds. Only build custom when nothing fits.

**Icons:** Use icons for context—they’re reusable and condensed. Prefer a consistent icon set (e.g. Lucide, Radix Icons) over text labels or one-off SVGs. Use icons for actions, status, and navigation so UI stays scannable and DRY.

**UI aesthetic (senior stylist):** Emulate **PostHog-style dashboard** on **compact editor density** (Unreal/Unity-inspired). Goal: good-looking, organized UI.

- **PostHog traits:** Vibrant purple primary (#5B21B6 → #A78BFA gradient); white/near-white cards (bg-white/95 dark:bg-slate-900/80); sharp shadows (shadow-md hover:shadow-xl); bold typography (font-semibold text-base+); metric cards border-none with divider lines; charts with glassmorphism overlays.
- **Core tokens:** primary purple-500/600 (#A78BFA/#7C3AED), accent indigo-500, success green-500, bg-card white dark:slate-900/90.
- **Cards:** bg-card border-0 shadow-lg rounded-xl p-4–6 hover:shadow-2xl transition-all duration-200.
- **Typography:** text-foreground font-medium tracking-tight; text-lg for headers.
- **Metrics/Charts:** Full-width, border-t pt-4 after:border-muted/50, hover:scale-[1.02].
- **Buttons:** bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 text-white shadow-lg.
- **Layout:** Mobile stack; desktop grid-1 md:grid-cols-3 for dashboards. Extend theme (colors/shadows) in config, not one-off classes.

**When delivering UI changes:** Provide refactored TSX, config diff (colors/shadows), checklist, and **PostHog vibe score (High/Med/Low)** so we keep the aesthetic consistent.

**Styling (general):** Design tokens over magic colors; semantic class names; co-located or clear structure; Next.js `<Image>` where applicable.

**Errors & flow:** Early returns over deep nesting; throw `Error` with clear messages; remove `console.log`/`debugger` from commits.

**Security:** `rel="noopener"` with `target="_blank"`; avoid `dangerouslySetInnerHTML` unless required; no `eval()`.

**Perf:** Prefer **O(1)** or **O(n log n)** over O(n) or worse; only use higher complexity when unavoidable and document why. No spread in loop accumulators; top-level regex; specific imports; proper image components. Use sets/maps for lookups; avoid repeated linear scans; sort once if needed (n log n) rather than repeated O(n) passes.

**Tests:** Assert inside `it()`/`test()`; async/await not done callbacks; no `.only`/`.skip` in repo.

Consider these when editing; run `pnpm dlx ultracite fix` before committing.
