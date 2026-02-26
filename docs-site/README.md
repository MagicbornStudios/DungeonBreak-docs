# DungeonBreak Docs Site (Payload + Fumadocs)

Documentation site for DungeonBreak: [Payload CMS](https://payloadcms.com) backend with [Fumadocs](https://fumadocs.dev/) for the docs UI. Content is managed in the admin panel; the public site renders from Payload collections.

## What's Included

- **Payload CMS**: Full headless CMS for docs and game-data collections
- **Fumadocs source adapter**: Transforms Payload categories/docs into fumadocs format
- **Postgres**: Database via [Supabase](https://supabase.com) (or any Postgres); migrations in `migrations/postgres/`
- **S3-compatible storage**: Media uploads (e.g. [Supabase Storage](https://supabase.com/docs/guides/storage))
- **RBAC**: Owner, Admin, and User roles
- **Sidebar tabs**: Each category is a sidebar tab; hierarchical docs with parent/child
- **Lexical editor**: Rich text for doc content
- **Search**: Fumadocs search over docs
- **MCP**: Model Context Protocol for AI/LLM access to documentation
- **LLM routes**: `/llms.txt` and `/llms-full.txt` for LLM-friendly content
- **OG images**: Dynamic OpenGraph image generation

## Project Structure

```
docs-site/
├── app/
│   ├── (fumadocs)/           # Public documentation routes
│   │   ├── (home)/           # Landing page with category cards
│   │   ├── docs/             # Documentation pages
│   │   │   ├── [[...slug]]/  # Dynamic doc pages
│   │   │   └── layout.tsx    # Docs layout with sidebar tabs
│   │   ├── api/search/       # Search API endpoint
│   │   ├── docs-og/          # OpenGraph image generation
│   │   ├── llms.txt/         # LLM-friendly content index
│   │   └── llms-full.txt/    # Full LLM content dump
│   └── (payload)/            # Payload admin (protected)
├── collections/
│   ├── Categories.ts         # Doc categories
│   ├── Docs.ts              # Documentation pages
│   └── Media.ts             # File uploads
├── components/
│   └── ui/                  # UI components
├── lib/
│   ├── source.ts            # 🔑 Fumadocs source adapter
│   ├── lexical-serializer.ts # Lexical to HTML converter
│   └── utils.ts             # Helper functions
└── payload.config.ts        # Payload CMS config
```

## Getting Started

### Prerequisites

- **Node.js 20+** (see `.nvmrc` or `engines` in `package.json`)
- **pnpm** (or npm)
- **Postgres**: [Supabase](https://supabase.com) or any Postgres (use the **pooler** connection string for serverless/production)
- **S3-compatible storage**: For media uploads (e.g. Supabase Storage); required for production

### Installation

1. **Install dependencies** (from `docs-site/`):
   ```bash
   pnpm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set at least:
   - `PAYLOAD_SECRET` – any long random string
   - `DATABASE_URL` – Postgres connection string (Supabase pooler URL for production)
   - `NEXT_PUBLIC_APP_URL` – e.g. `http://localhost:3000` for local
   - `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION`, `S3_ENDPOINT` – for media (e.g. from Supabase Storage)

3. **Run migrations** (first time):
   ```bash
   pnpm run migrate
   ```

4. **Start development**:
   ```bash
   pnpm run dev
   ```

5. **Access the app**:
   - **Public docs**: http://localhost:3000
   - **Admin panel**: http://localhost:3000/admin  

   First time? Create an admin user in the admin panel, or run `pnpm run seed` (with seed env vars set) to create default users.

**From the repo root** (DungeonBreak monorepo): `npm run lab` starts the docs site plus Jupyter Lab; `npm run docs:serve` starts only the docs site (after generating API docs and content).

## Collections

### Categories
Organize documentation into sections:
- `title`: Category name
- `slug`: URL identifier (e.g., "getting-started")
- `description`: Brief description
- `icon`: Optional icon image
- `order`: Display order (ascending)

### Docs
Documentation pages:
- `title`: Page title
- `slug`: URL-friendly slug
- `description`: Page excerpt/description
- `content`: Rich content (Lexical editor)
- `category`: Belongs to which category
- `parent`: Optional parent doc (for nesting)
- `order`: Sort order within category (ascending)
- `_status`: Draft or Published
- **MCP Enabled**: Exposed through Model Context Protocol for AI access

### Media
File uploads:
- `alt`: Alt text for images
- Stored in S3 or local filesystem
- Automatic optimization

## DungeonBreak Game Data + AI Generation

This repo extends the base docs CMS with game-data authoring and AI generation workflows.

### New game collections

- `game-traits`: Canonical trait names synced from game export
- `narrative-entities`: Canonical entity coordinates synced from snapshot
- `narrative-dialogs`: Canonical dialog vectors synced from snapshot
- `characters`: Curated character records (voice defaults, portrait prompts)
- `dialogue-lines`: Curated dialogue lines linked to characters and canonical dialogs
- `weapons`: Curated weapon records with SFX/image prompts
- `items`: Curated item records with SFX/image prompts
- `audio-assets`: Generated ElevenLabs records (status, media, metadata)
- `image-assets`: Generated OpenAI image records (status, media, metadata)

### AI generation workflow

1. In Payload admin, open a `dialogue-line`, `weapon`, `item`, or `character`.
2. Use `Generate Audio` or `Generate Image` buttons.
3. A generation record is created with status `queued`.
4. Payload background jobs process it, upload output into `media`, and mark `succeeded` or `failed`.

### Sync canonical game snapshot data

Run from repo root:

```bash
npm run payload:sync-game-data
```

This reads:

- `src/dungeonbreak_narrative/data/game_traits_manifest.json`
- `src/dungeonbreak_narrative/data/narrative_snapshot.json`

and upserts canonical data collections without deleting curated content.

### Required env vars for generation

Add to `docs-site/.env`:

```env
ELEVENLABS_API_KEY=...
ELEVENLABS_TTS_MODEL_ID=eleven_multilingual_v2
OPENAI_API_KEY=...
OPENAI_IMAGE_MODEL=gpt-image-1
```

## How It Works

### Source Adapter Pattern

The heart of this example is `lib/source.ts` - the fumadocs source adapter:

```typescript
import { loader } from "fumadocs-core/source";
import { getPayload } from "payload";

// Create cached source
export const getSource = cache(async () => {
  const payloadSource = await createPayloadSource();
  return loader({
    baseUrl: "/docs",
    source: payloadSource,
  });
});
```

**What it does**:
1. Fetches categories and docs from Payload
2. Transforms Payload data into fumadocs `VirtualFile` format
3. Builds hierarchical paths (e.g., `/docs/category/parent/child`)
4. Creates meta files for sidebar tabs and ordering
5. Provides standard fumadocs APIs

**In your routes**:
```typescript
const source = await getSource();
const page = source.getPage(slugs);
const tree = source.pageTree;
```

### Sidebar Tabs

Each category becomes an isolated sidebar tab:

1. **Meta files** with `root: true` mark categories as root folders
2. **Pages array** defines document order (preserves Payload `order` field)
3. **Auto-detection** by fumadocs creates the tab interface

When viewing a doc, only that category's docs appear in the sidebar.

### Content Flow

```
Payload CMS (Lexical)
       ↓
Source Adapter (Transform)
       ↓
VirtualFiles (Fumadocs format)
       ↓
Lexical Serializer (HTML)
       ↓
Rendered Page
```

## Usage Guide

### Creating Content

1. **Add a Category** (Admin → Categories):
   - Set title, slug, and order
   - Upload an icon (optional)

2. **Create Docs** (Admin → Docs):
   - Assign to a category
   - Set order for positioning
   - Use parent field for nesting
   - Write content in Lexical editor

3. **Publish**:
   - Change status to "Published"
   - Content appears immediately (with revalidation)

### Hierarchical Documentation

To create nested docs:
1. Create parent doc (leave `parent` empty)
2. Create child doc, set `parent` to the parent doc
3. Order determines child position under parent

Example:
```
Getting Started (order: 1)
├── Installation (order: 1, parent: Getting Started)
└── Configuration (order: 2, parent: Getting Started)
```

### Custom Ordering

Documents are ordered by the `order` field (ascending) within their level:
- Categories: Sorted by `order` (sidebar tab order)
- Top-level docs: Sorted by `order` within category
- Child docs: Sorted by `order` under their parent

The source adapter preserves this order using `pages` arrays in meta files.

## Important Considerations

### Async Source Access

⚠️ The `source.pageTree` getter requires async access:

```typescript
// ❌ This won't work (synchronous access)
import { source } from '@/lib/source';
const tree = source.pageTree; // Error!

// ✅ Do this instead (async access)
import { getSource } from '@/lib/source';
const source = await getSource();
const tree = source.pageTree; // Works!
```

This is due to React's cache() requiring async initialization.

### Meta File Ordering

The source adapter uses meta files with `pages` arrays to preserve order:

```typescript
// Category meta file
{
  title: "Getting Started",
  root: true,
  pages: ["installation", "configuration"] // Explicit order
}
```

Without this, fumadocs sorts alphabetically. The adapter automatically generates these based on Payload's `order` field.

### Top-Level vs Nested Docs

The `pages` array only includes **top-level docs** (no parent):
- ✅ Docs without a parent
- ❌ Child docs (they appear under their parent automatically)

This prevents duplicates and maintains hierarchy.

### Content Serialization

Lexical content must be serialized to HTML:

```typescript
import { serializeLexical } from '@/lib/lexical-serializer';

const htmlContent = await serializeLexical(doc.content, payload);
```

The serializer handles:
- Headings, paragraphs, lists
- Links, images, code blocks
- Custom Lexical nodes
- Table of contents extraction

### Database

Payload uses Postgres via the `@payloadcms/db-postgres` adapter. Migrations live in `migrations/postgres/`. For serverless (e.g. Vercel), use a Postgres connection pooler URL (e.g. Supabase pooler on port 6543).

### MCP (Model Context Protocol) Support

This template includes MCP integration for enhanced AI/LLM capabilities:
- **AI-Friendly Content**: Structured data access for AI models
- **Standardized Protocol**: Uses industry-standard Model Context Protocol
- **Documentation Access**: Enables AI systems to query and understand your documentation
- **Enhanced Search**: Improves AI-powered search and content discovery

The MCP plugin exposes your documentation collections through a standardized API that AI systems can consume, making your content more accessible to LLMs and other AI tools.

### Database Depth

When querying Payload, use `depth: 2` for collections:

```typescript
const { docs } = await payload.find({
  collection: 'docs',
  depth: 2, // Resolves category and parent relationships
});
```

This ensures relationships are populated, not just IDs.

### Revalidation

The example uses Next.js revalidation:

```typescript
export const revalidate = 30; // Revalidate every 30 seconds
```

Adjust based on your needs:
- `revalidate: 0` - No cache (always fresh)
- `revalidate: 3600` - Cache for 1 hour
- `revalidate: false` - Cache indefinitely

### Media Storage

- **Production**: Use S3-compatible storage (e.g. Supabase Storage). Set all `S3_*` env vars.
- **Local dev**: You can use the same S3 bucket or a separate one; local filesystem storage is not used by this app.

## Deployment

### Deploy to Vercel

This app lives in the `docs-site/` directory of the repo. Configure Vercel so it builds and runs from that directory.

1. **Vercel project settings**
   - **Root Directory**: Set to `docs-site` (this repo is a monorepo; the Next.js app is inside `docs-site`).
   - **Framework Preset**: Next.js (auto-detected).
   - **Build Command**: Leave default or set to `pnpm run build` (uses `next build --webpack` for Payload).
   - **Install Command**: Default; Vercel will use `pnpm install` when it sees `packageManager` in `package.json`.
   - **Node.js**: 20.x is used automatically via `engines.node` in `package.json`.

2. **Environment variables** (Vercel → Project → Settings → Environment Variables)

   **Required for the app to run:**
   - `PAYLOAD_SECRET` – long random string (e.g. `openssl rand -hex 32`)
   - `DATABASE_URL` – Postgres connection string; use the **pooler** URL for serverless (e.g. Supabase: Transaction mode pooler, port 6543)
   - `NEXT_PUBLIC_APP_URL` – your deployment URL (e.g. `https://your-app.vercel.app`)

   **Required for media uploads:**
   - `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION`, `S3_ENDPOINT` (e.g. from Supabase Storage → S3 API)

   **Optional** (for AI generation, email, analytics, etc.): add any of the other variables from `.env.example` as needed.

3. **Database migrations**

   Vercel does not run the app against the database at build time, so migrations are not run automatically. Use one of these:

   - **Option A (recommended):** Run migrations once from your machine before or after the first deploy. From `docs-site/` with `DATABASE_URL` pointing at the same Postgres DB used by Vercel:
     ```bash
     pnpm run migrate
     ```
   - **Option B:** Run migrations in the build: add a script in `package.json`, e.g. `"vercel-build": "payload migrate && next build --webpack"`, and set Vercel Build Command to `pnpm run vercel-build`. Then `DATABASE_URL` must be available at build time (Vercel exposes env vars during build).

4. **Deploy**

   Push to your connected Git branch; Vercel will build and deploy. After the first deploy, create an admin user at `https://your-app.vercel.app/admin` (or run `pnpm run seed` locally with production `DATABASE_URL` to create seed users).

**Note:** On Vercel there is no local `payload.db` file. The admin header will show “Local DB” as not present and “Push local to Supabase” will stay disabled; that’s expected. The app uses Postgres and S3 only in production.

### S3-compatible storage (e.g. Supabase Storage)

- Create a bucket in Supabase Dashboard → Storage.
- In Storage → Settings, create S3 access keys and use the S3 endpoint and region shown there.
- Set `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION`, and `S3_ENDPOINT` in `.env` or Vercel env vars.

## Customization

### Adding Fields to Docs

1. **Update Collection** (`collections/Docs.ts`):
   ```typescript
   fields: [
     // ... existing fields
     {
       name: 'author',
       type: 'text',
     }
   ]
   ```

2. **Update Source Adapter** (`lib/source.ts`):
   ```typescript
   data: {
     ...doc,
     author: doc.author, // Include new field
   }
   ```

3. **Use in Pages**:
   ```typescript
   const page = source.getPage(slugs);
   console.log(page.data.author);
   ```

### Custom Styling

- Tailwind config: `tailwind.config.ts`
- Global styles: `app/global.css`
- Fumadocs theme: `app/(fumadocs)/layout.config.tsx`

### Adding Routes

Create LLM-friendly or custom routes following the pattern:
- Use `getSource()` for data access
- Leverage `source.getPages()`, `source.getPage()`
- Serialize Lexical content when needed

## Troubleshooting

### "pageTree must be accessed via getSource()"

You're trying to access `source.pageTree` directly. Use:
```typescript
const src = await getSource();
const tree = src.pageTree;
```

### Docs not appearing in sidebar

Check:
1. Doc is Published (not Draft)
2. Doc is assigned to a category
3. Category exists and has an `order` value
4. Clear cache and restart dev server

### Images not loading

1. Verify all S3 env vars are set (`S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION`, `S3_ENDPOINT`).
2. Check bucket permissions and that the bucket exists (e.g. Supabase Storage).
3. Ensure `next.config.mjs` images.remotePatterns includes your S3 endpoint host.

### Sidebar order is wrong

The source adapter preserves Payload's `order` field. Verify:
1. Docs have `order` values set
2. Order is ascending (1, 2, 3...)
3. No duplicate orders at the same level

## Scripts

```bash
pnpm run dev          # Development server
pnpm run build        # Production build (next build --webpack)
pnpm run start        # Start production server
pnpm run migrate      # Run Postgres migrations
pnpm run seed         # Seed admin/user (set SEED_* in .env)
pnpm run payload      # Payload CLI
```

## Learn More

- [Fumadocs Documentation](https://fumadocs.vercel.app)
- [Payload CMS Documentation](https://payloadcms.com/docs)
- [Source API Reference](https://fumadocs.vercel.app/docs/headless/source-api)
- [Lexical Editor](https://lexical.dev)
- [Payload MCP Plugin](https://payloadcms.com/docs/plugins/mcp)
- [Payload Postgres Adapter](https://payloadcms.com/docs/database/postgres)

## License

MIT
