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

4. **Run Escape the Dungeon CLI** (optional):
   ```bash
   escape-the-dungeon
   # or:
   python -m dungeonbreak_narrative.escape_the_dungeon.cli
   ```
   Commands include:
   `look`, `status`, `actions`, `options`, `options all`, `choose <id>`, `go <direction>`,
   `train`, `rest`, `talk`, `search`, `say <text>`, `stream`, `steal [target]`, `skills`, `deeds`, `cutscenes`, `pages`.

5. **Run Python tests**:
   ```bash
   npm run test:py
   ```

6. **Generate HTML test report**:
   ```bash
   npm run test:py:html
   ```
   Report path: `.planning/test-reports/pytest-report.html`

## Deploy to Vercel

1. **Import** this repo in [Vercel](https://vercel.com) (New Project → Import from GitHub).
2. Set **Root Directory** to `docs-site` (Edit next to Root Directory).
3. Add **environment variables** from `docs-site/.env.example` (do not commit real values).
4. Deploy. The docs site and Payload admin will be built from `docs-site`. Jupyter Lab is for local use only.
