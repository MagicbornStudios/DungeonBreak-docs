# DungeonBreak docs and lab

Docs site (Fumadocs + Payload CMS) and Jupyter notebooks for DungeonBreak. **No Unreal** — this repo is for documentation and narrative demos only.

**Media:** Images and video are not in this repo. Upload assets to Supabase Storage and use those URLs in docs and Payload.

## Local setup

1. **Clone** and install:
   ```bash
   git clone https://github.com/MagicbornStudios/DungeonBreak-docs.git
   cd DungeonBreak-docs
   npm install
   ```

2. **Copy env** (required for docs site): Copy `docs-site/.env.example` to `docs-site/.env` and set values (Supabase, S3, etc.). See `docs-site/.env.example` for variables.

3. **Run lab** (docs site + Jupyter Lab):
   ```bash
   npm run lab
   ```
   Opens the docs site at http://localhost:3000 and Jupyter Lab (notebooks only). Optional: `npm run docs:python`, `npm run docs:generate` to refresh API docs.

4. **Play in browser (`/play`)**:
   - Open `http://localhost:3000/play`
   - Left column: clickable action lists.
   - Middle column: Assistant UI feed for narration, outcomes, and dialogue/cutscenes.
   - Right column: player stats, vectors, quests, and nearby entities.
   - Core gameplay is button-first (no required command typing).

5. **Run Escape the Dungeon CLI** (optional):
   ```bash
   escape-the-dungeon
   # or:
   python -m dungeonbreak_narrative.escape_the_dungeon.cli
   ```
   Commands include:
   `look`, `status`, `actions`, `options`, `options all`, `choose <id>`, `go <direction>`,
   `train`, `rest`, `talk`, `search`, `say <text>`, `stream`, `steal [target]`, `skills`, `deeds`, `cutscenes`, `pages`.

6. **Run Python tests**:
   ```bash
   npm run test:py
   ```

7. **Run browser runtime tests**:
   ```bash
   pnpm --dir docs-site run typecheck
   pnpm --dir docs-site run test:unit
   pnpm --dir docs-site run test:e2e
   ```

8. **Generate HTML test report**:
   ```bash
   npm run test:py:html
   ```
   Report path: `.planning/test-reports/pytest-report.html`

9. **Build terminal binary locally**:
   ```bash
   npm run build:terminal:bin
   ```
   Binary output goes to `dist/` (platform-specific executable).

10. **Release pipelines (GitHub Actions)**:
- Browser workflow: `.github/workflows/docs-browser-game.yml`
  - Runs docs-site typecheck, build, unit tests, and browser e2e smoke.
- Terminal workflow: `.github/workflows/terminal-game-release.yml`
  - Runs Python tests and terminal binary builds.
  - Enforces browser checks before terminal artifact build/release.
  - Publishes artifacts to GitHub Release when tag matches `v*`.
  - First stable release flow:
    ```bash
    git tag v0.1.0
    git push origin v0.1.0
    ```
  - Download binaries from GitHub Releases after the tag workflow finishes.

## Deploy to Vercel

1. **Import** this repo in [Vercel](https://vercel.com) (New Project → Import from GitHub).
2. Set **Root Directory** to `docs-site` (Edit next to Root Directory).
3. Add **environment variables** from `docs-site/.env.example` (do not commit real values).
4. Deploy. The docs site and Payload admin will be built from `docs-site`. Jupyter Lab is for local use only.
