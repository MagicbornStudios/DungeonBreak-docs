# Portfolio context: DungeonBreak-docs → Blitzpanel alignment

This document summarizes **what exists in this repository**, **what problem it solves**, and **how that maps to a founding engineer role** at a company building industrial control-panel automation (quote → BOM → drawings → build packet) and in-house CAD-adjacent tooling.

Use it as a **paste-in brief for Codex** or as raw material for applications. It is written to be honest about domain (game + docs + engine) while highlighting **transferable craft**.

---

## One-sentence pitch

**DungeonBreak-docs** is a TypeScript-first monorepo that ships a **deterministic game engine package**, a **Next.js docs / CMS / play surface**, and **internal automation** around content ingest, validation, test reporting, and a static “ops hub” that bundles artifacts for review—effectively a **build-and-review pipeline** over messy, schema-heavy data. Architecturally it also **keeps a C++ / Unreal consumption path in mind**: contracts are **JSON Schema–driven**, with **generated C++ and C#** alongside TypeScript, and **3D transforms** on dungeon layout payloads so multiple runtimes (browser demo now, Unreal/plugin later) can share placement semantics.

---

## What we are trying to accomplish (product/engineering goals)

1. **Single source of truth for design** — XML-first planning (`.planning/`), gameplay design references, and structured requirements that agents and humans can execute against.
2. **Reliable static data → runtime** — Authoring flows merge into JSON “packs,” with schemas/codecs and a normalized access layer consumed by the engine and tools.
3. **Cross-runtime contracts (TS today, C++ / Unreal tomorrow)** — Shared schemas and generated codecs so the **same content packs** can be validated once and consumed by TypeScript (current engine + web), **generated C++** (Unreal-friendly path), and **C#** where needed—avoiding forked “truth” per platform.
4. **Spatial truth for automatic placement** — Dungeons, rooms, levels, entities, and placed items carry **`Transform3d` / `Vec3`** in the **layout snapshot** (`buildDungeonLayoutSnapshot` and related content), so **automatic placement and visualization** (e.g. explorer tools, future Unreal scene assembly) read from one structured model rather than ad-hoc coordinates per client.
5. **Shippable surfaces** — Browser-playable game (`/play`), public/static bundles, and reviewable HTML artifacts (tests, coverage, guides) without manual copy-paste.
6. **Operator-grade internal UX** — Dense dashboards, shadcn/Radix patterns, keyboard-friendly controls where it matters; “people actually use this” bar for maintainers and collaborators.
7. **Velocity with discipline** — CI runs unit reports; static review hub tolerates `file://` and static hosting; placeholder/fallback behavior when optional reports weren’t generated.

Blitzpanel’s world is **panels and CAD**; this repo’s world is **game rules and content**. The **shape of the work** overlaps: **portable geometry/structure**, **long-lived schemas**, **multi-step pipelines**, integration between authoring tools and runtime consumers, and UIs that must stay fast and legible under real data.

---

## What has been built (concrete inventory)

### Core packages

| Area | Role |
|------|------|
| **`packages/engine`** (`@dungeonbreak/engine`) | Deterministic Escape-the-Dungeon runtime: contracts, JSON packs, **`generate-contract-codecs.mjs`** (Quicktype) → **TypeScript + C++ + C#** from JSON Schema, normalized access layer, **dungeon layout snapshots with 3D transforms** for rooms/items/entities, game loop, replay/testing hooks. |
| **`packages/kaplay-demo`** | Standalone KAPLAY shell (human-playable), scenes, overlay UX; build scripts publish into `docs-site/public/game`. |
| **`docs-site`** | Next.js app: Fumadocs, **Payload CMS**, `/play`, API routes, migrations, scripts for ingest, precompute (e.g. dungeon layout, space data), **Vitest** + **Playwright** workflows. |
| **`packages/review-site`** | **Astro + React + Tailwind** static **review hub** (Overview, Tests, Guides, Game data). Not the CMS—purpose-built for bundled artifacts. |

### Data & pipeline concepts

- **Layered content model** — Authoring source → runtime pack files → normalized contract layer (see `GAME_STRUCTURE.md` for the map).
- **Content pack bundle** — e.g. `content-pack.bundle.v1.json` consumed by the hub’s **Game data** explorer and the playable build.
- **Schema discipline** — JSON Schemas and generated types/codecs; imperfect inputs are expected at boundaries—validation and normalization are first-class.

### C++, Unreal, and spatial placement (why this matters for a CAD-adjacent role)

- **Code generation from schema** — `packages/engine/scripts/generate-contract-codecs.mjs` drives **Quicktype** from canonical schemas (e.g. `content-source.schema.json`, `content-pack-bundle.schema.json`) into **`contracts/generated/`** including **`cpp/`** and **`csharp/`** trees, not only TS. The intent is explicit in planning/requirements: **TS runtime now**, **C++ plugin / Unreal ingestion** as the parallel consumer—not a bolt-on.
- **Unreal / DLC direction** — Repo planning and submodules target an **Unreal DLC plugin** pipeline (versioned content packs, storage/signing, editor import). The engineering bet is **materialize `.uasset` inside Unreal** from validated pack data rather than fragile binary generation from Node alone.
- **Spatial model for placement** — `packages/engine/src/escape-the-dungeon/world/layout.ts` defines **`LayoutDungeon` / `LayoutRoom` / `LayoutEntity` / `LayoutRoomItem`** with **`Transform3d`** (and optional item transform), built from live dungeon state. Content JSON (e.g. dungeon packs) also stores **transform** blocks for authored layout. That is the same *class* of problem as **CAD-ish tooling**: **canonical transforms**, **hierarchy** (level → room → item), and **downstream consumers** that place instances automatically from data.
- **Design requirements** — `.planning/REQUIREMENTS.xml` and phase docs tie **shared JSON contracts** to **cross-language portability**, **spatial / vector** semantics for narrative and placement-adjacent features, and **panel primitives** constrained so they can map to **Unreal UMG/Slate**—again, “one schema, many runtimes.”

### Internal / “automation stack” style work

- **`prepareStaticReviewSite`** (`docs-site/lib/static-review-site.ts`) — Writes `data.json`, copies game assets, test reports (unit results, optional coverage HTML, e2e HTML), references; supports **stub pages** when optional HTML reports weren’t built so links don’t dead-end as raw 404s.
- **`pnpm review-site:build`** — Orchestrates prepare + Astro build + **relative URL rewriting** for `_astro` assets so **static hosting and `file://`** work.
- **Planning loop** — XML-first task registry, roadmap, phase plans (`AGENTS.md`, `.planning/`). Same *idea* as internal ops tooling: visible state, claimable work, auditable progress (adapted for software agents + humans).

### UX / tooling highlights

- **Review hub**: metrics, test file panels with syntax-highlighted source, Playwright summary blocks, markdown guide rendering, **JSON explorer** for bundled packs (read-only “inspector” over large structured data).
- **Design system direction** — PostHog-inspired dashboard density, purple/indigo tokens, documented in `AGENTS.md` for consistency.
- **Content authoring direction** (from repo trajectory) — APIs and collections for content projects, import/export, publish jobs—**internal tools that sit on messy real-world files and normalize them** for downstream consumers.

### Testing & quality

- Unit tests tied to **JSON snapshots** of test results for the hub; e2e where configured; emphasis on **reproducible build artifacts** for review.

---

## Mapping to Blitzpanel’s job description

| They want | How this repo demonstrates related muscle |
|-----------|-------------------------------------------|
| **Own internal automation (quote → BOM → …)** | Multi-step **prepare → build → ship** pipeline; explicit staging of reports and game assets; CI-shaped workflows. |
| **CAD / diagram / spatial editors** | Not electrical panel CAD. **Strong parallel**: **3D transforms on structured layout**, **schema-driven codegen to C++** for a native client path, and **automatic instance placement** from authored data; plus explorer/review UIs over **hierarchical spatial graphs** (dungeon levels/rooms/items). |
| **Integrate across systems** | Engine ↔ docs-site ↔ public bundles ↔ review hub; **Payload** and **Next** API boundaries; import/export paths for content. |
| **Simple, fast UI for operators/designers** | Review hub and docs tooling optimized for **scannability**, dashboards, and **real bundle sizes** (not toy JSON). |
| **Messy data, imperfect inputs** | Packs evolve; schemas and codegen; optional report artifacts; graceful degradation (placeholders, partial snapshots). |
| **Full-stack, React + TypeScript** | **Primary stack** for app surfaces and hub. |
| **Python** | Not the main language of this repo (TypeScript-first). If you use Python elsewhere (notebooks, jobs, scraping), say that **outside** this file—don’t imply this repo is Python-heavy. |
| **Systems / performance when needed** | Engine concerns, large JSON handling, **generated native-language codecs**, static bundling, avoiding hydration pitfalls on static sites (`client:load` vs `client:visible`, relative asset paths). **C++** appears as **generated contract code** and **Unreal-facing** roadmap, not as hand-written gameplay loops in this repo. |
| **AI tools to move faster** | Agent loop, planning XML, Cursor rules/skills—**process** for 3–10x iteration (you can describe how *you* used AI to build/maintain this). |

---

## Honest positioning (use in interviews)

- **Strength to sell**: End-to-end ownership of **tooling + data contracts + shipping surfaces**, comfort with **long-lived schemas**, **internal dashboards**, and **automation that must not rot**.
- **Gap to acknowledge**: Not **electrical/panel domain** or **shop-floor hardware bring-up**—but **do** sell **spatial data models**, **multi-runtime contracts**, and **placement-from-schema** as adjacent to **drawings and build packets**.
- **Bridge sentence**: “I’ve shipped **pipeline and review tooling** where the cost of being wrong is wasted engineering time and bad builds; I want to apply that same ownership to **quote → fab** automation.”
- **Second bridge (spatial / native)**: “I design **authoring data and transforms** so **web and native** (including **C++ / Unreal-style** consumers) stay aligned—same idea as **CAD exports and part placement** from a single structured source.”

---

## Suggested bullets for a resume (adapt with your metrics)

- Designed and maintained a **TypeScript monorepo** with a **published engine package**, **Next.js** docs/play app, and **static review hub** (Astro/React) bundling **tests, coverage, and game content** for offline and static hosting.
- Implemented **content ingest and bundle** workflows with **schema validation**, **normalized contract layers**, and **Quicktype-generated C++/C#/TS codecs** so native runtimes can consume the same packs as the web engine.
- Modeled **3D dungeon layout** (rooms, levels, entities, placed items) with **transforms** for **deterministic layout snapshots** and downstream **automatic placement / visualization**.
- Built **internal-facing UIs** (dashboards, explorers, test review) with **accessible, dense** UX (Radix/shadcn-style patterns).
- Ran **CI-driven test snapshots** and **multi-stage build scripts** so review artifacts stay reproducible.

---

## Files to point Codex (or a reviewer) at

| Path | Why |
|------|-----|
| `README.md` | Repo entry, lab command, engine install. |
| `GAME_STRUCTURE.md` | Deep map: where data lives, how it flows to runtime. |
| `AGENTS.md` | Planning loop + UI/coding standards. |
| `docs-site/lib/static-review-site.ts` | Artifact staging and placeholder behavior. |
| `docs-site/scripts/build-static-review-site.ts` | Astro build + asset URL fix for static/`file://`. |
| `packages/review-site/README.md` | Hub purpose and build commands. |
| `packages/engine/README.md` | Engine package scope (if present / updated). |
| `packages/engine/scripts/generate-contract-codecs.mjs` | JSON Schema → TS / C++ / C# generation entrypoint. |
| `packages/engine/src/escape-the-dungeon/world/layout.ts` | Layout snapshot types and **`Transform3d`** usage for spatial placement. |
| `.planning/REQUIREMENTS.xml` | Cross-language contracts, spatial semantics, Unreal parity notes (large file; search “C++”, “Unreal”, “schema”). |
| `.planning/` | Phases for Unreal DLC, dungeon spatial viz, panel schema portability. |

---

## Optional: “Why Blitzpanel” (one paragraph template)

> I’m drawn to **founding engineering** where the product is **real hardware outcomes** and the software has to **survive contact with the shop**: messy inputs, tight loops with domain experts, and UIs that people use daily. My recent work is in **game engine and content tooling**, but the through-line is **owning pipelines and interfaces** from **authoring → build → review**, with **schema-driven outputs for both web and native** (including **generated C++** and **3D placement data** for a future Unreal path). I want to apply that mindset to **industrial control panels**: quotes, libraries, drawings, and build packets—**fast tools**, **clear data contracts**, and **aggressive use of automation and AI** where they compound velocity without compounding risk.

---

*Last updated: generated for job-application and Codex context; extend with your personal metrics (team size, users, uptime, $ impact) where applicable.*
