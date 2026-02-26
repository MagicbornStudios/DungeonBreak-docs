import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-sqlite";

async function addLockedRelColumn(
  db: MigrateUpArgs["db"],
  columnName: string,
  referencedTable: string
) {
  try {
    await db.run(
      sql.raw(
        `ALTER TABLE payload_locked_documents_rels ADD COLUMN ${columnName} integer REFERENCES ${referencedTable}(id) ON UPDATE no action ON DELETE cascade;`
      )
    );
  } catch {
    // Column already exists or table missing in older setups.
  }

  await db.run(
    sql.raw(
      `CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_${columnName}_idx ON payload_locked_documents_rels (${columnName});`
    )
  );
}

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE IF NOT EXISTS game_traits (
    id integer PRIMARY KEY NOT NULL,
    name text NOT NULL,
    source_key text NOT NULL,
    source_version numeric DEFAULT 1 NOT NULL,
    synced_at text NOT NULL,
    metadata text,
    updated_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );`);
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS game_traits_name_idx ON game_traits (name);`);
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS game_traits_source_key_idx ON game_traits (source_key);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS game_traits_updated_at_idx ON game_traits (updated_at);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS game_traits_created_at_idx ON game_traits (created_at);`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS narrative_entities (
    id integer PRIMARY KEY NOT NULL,
    name text NOT NULL,
    source_key text NOT NULL,
    starting_coordinates text DEFAULT '{}' NOT NULL,
    previous_coordinates text DEFAULT '{}' NOT NULL,
    source_version numeric DEFAULT 1 NOT NULL,
    synced_at text NOT NULL,
    metadata text,
    updated_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );`);
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS narrative_entities_name_idx ON narrative_entities (name);`);
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS narrative_entities_source_key_idx ON narrative_entities (source_key);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS narrative_entities_updated_at_idx ON narrative_entities (updated_at);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS narrative_entities_created_at_idx ON narrative_entities (created_at);`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS narrative_dialogs (
    id integer PRIMARY KEY NOT NULL,
    label text NOT NULL,
    phrase text,
    location text DEFAULT '{}' NOT NULL,
    force text DEFAULT '{}' NOT NULL,
    source_key text NOT NULL,
    source_version numeric DEFAULT 1 NOT NULL,
    synced_at text NOT NULL,
    metadata text,
    updated_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );`);
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS narrative_dialogs_label_idx ON narrative_dialogs (label);`);
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS narrative_dialogs_source_key_idx ON narrative_dialogs (source_key);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS narrative_dialogs_updated_at_idx ON narrative_dialogs (updated_at);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS narrative_dialogs_created_at_idx ON narrative_dialogs (created_at);`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS narrative_dialogs_scenes (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    id text PRIMARY KEY NOT NULL,
    scene text NOT NULL,
    FOREIGN KEY (_parent_id) REFERENCES narrative_dialogs(id) ON UPDATE no action ON DELETE cascade
  );`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS narrative_dialogs_scenes_order_idx ON narrative_dialogs_scenes (_order);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS narrative_dialogs_scenes_parent_id_idx ON narrative_dialogs_scenes (_parent_id);`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS characters (
    id integer PRIMARY KEY NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    summary text,
    canonical_entity_id integer,
    voice_id text,
    voice_model_id text DEFAULT 'eleven_multilingual_v2',
    portrait_prompt text,
    latest_portrait_id integer,
    updated_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (canonical_entity_id) REFERENCES narrative_entities(id) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (latest_portrait_id) REFERENCES image_assets(id) ON UPDATE no action ON DELETE set null
  );`);
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS characters_name_idx ON characters (name);`);
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS characters_slug_idx ON characters (slug);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS characters_canonical_entity_idx ON characters (canonical_entity_id);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS characters_latest_portrait_idx ON characters (latest_portrait_id);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS characters_updated_at_idx ON characters (updated_at);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS characters_created_at_idx ON characters (created_at);`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS characters_rels (
    id integer PRIMARY KEY NOT NULL,
    "order" integer,
    parent_id integer NOT NULL,
    path text NOT NULL,
    game_traits_id integer,
    FOREIGN KEY (parent_id) REFERENCES characters(id) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (game_traits_id) REFERENCES game_traits(id) ON UPDATE no action ON DELETE cascade
  );`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS characters_rels_order_idx ON characters_rels ("order");`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS characters_rels_parent_idx ON characters_rels (parent_id);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS characters_rels_path_idx ON characters_rels (path);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS characters_rels_game_traits_id_idx ON characters_rels (game_traits_id);`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS dialogue_lines (
    id integer PRIMARY KEY NOT NULL,
    label text NOT NULL,
    slug text NOT NULL,
    character_id integer NOT NULL,
    canonical_dialog_id integer,
    scene text,
    line_text text NOT NULL,
    audio_voice_id text,
    audio_model_id text,
    audio_seed numeric,
    latest_audio_asset_id integer,
    updated_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (canonical_dialog_id) REFERENCES narrative_dialogs(id) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (latest_audio_asset_id) REFERENCES audio_assets(id) ON UPDATE no action ON DELETE set null
  );`);
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS dialogue_lines_label_idx ON dialogue_lines (label);`);
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS dialogue_lines_slug_idx ON dialogue_lines (slug);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS dialogue_lines_character_idx ON dialogue_lines (character_id);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS dialogue_lines_canonical_dialog_idx ON dialogue_lines (canonical_dialog_id);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS dialogue_lines_latest_audio_asset_idx ON dialogue_lines (latest_audio_asset_id);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS dialogue_lines_updated_at_idx ON dialogue_lines (updated_at);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS dialogue_lines_created_at_idx ON dialogue_lines (created_at);`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS weapons (
    id integer PRIMARY KEY NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    sound_effect_prompt text NOT NULL,
    image_prompt text,
    audio_model_id text DEFAULT 'eleven_multilingual_v2',
    audio_seed numeric,
    latest_audio_asset_id integer,
    latest_image_asset_id integer,
    updated_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (latest_audio_asset_id) REFERENCES audio_assets(id) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (latest_image_asset_id) REFERENCES image_assets(id) ON UPDATE no action ON DELETE set null
  );`);
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS weapons_name_idx ON weapons (name);`);
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS weapons_slug_idx ON weapons (slug);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS weapons_latest_audio_asset_idx ON weapons (latest_audio_asset_id);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS weapons_latest_image_asset_idx ON weapons (latest_image_asset_id);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS weapons_updated_at_idx ON weapons (updated_at);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS weapons_created_at_idx ON weapons (created_at);`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS items (
    id integer PRIMARY KEY NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    sound_effect_prompt text NOT NULL,
    image_prompt text,
    audio_model_id text DEFAULT 'eleven_multilingual_v2',
    audio_seed numeric,
    latest_audio_asset_id integer,
    latest_image_asset_id integer,
    updated_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (latest_audio_asset_id) REFERENCES audio_assets(id) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (latest_image_asset_id) REFERENCES image_assets(id) ON UPDATE no action ON DELETE set null
  );`);
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS items_name_idx ON items (name);`);
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS items_slug_idx ON items (slug);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS items_latest_audio_asset_idx ON items (latest_audio_asset_id);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS items_latest_image_asset_idx ON items (latest_image_asset_id);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS items_updated_at_idx ON items (updated_at);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS items_created_at_idx ON items (created_at);`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS audio_assets (
    id integer PRIMARY KEY NOT NULL,
    asset_type text NOT NULL,
    provider text DEFAULT 'elevenlabs' NOT NULL,
    status text DEFAULT 'queued' NOT NULL,
    source_text_or_prompt text NOT NULL,
    voice_id text NOT NULL,
    model_id text NOT NULL,
    duration_seconds numeric,
    seed numeric,
    media_id integer,
    character_id integer,
    dialogue_line_id integer,
    weapon_id integer,
    item_id integer,
    job_i_d text,
    provider_request_i_d text,
    idempotency_key text,
    error_message text,
    metadata text,
    updated_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (media_id) REFERENCES media(id) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (dialogue_line_id) REFERENCES dialogue_lines(id) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (weapon_id) REFERENCES weapons(id) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (item_id) REFERENCES items(id) ON UPDATE no action ON DELETE set null
  );`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS audio_assets_media_idx ON audio_assets (media_id);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS audio_assets_character_idx ON audio_assets (character_id);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS audio_assets_dialogue_line_idx ON audio_assets (dialogue_line_id);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS audio_assets_weapon_idx ON audio_assets (weapon_id);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS audio_assets_item_idx ON audio_assets (item_id);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS audio_assets_idempotency_key_idx ON audio_assets (idempotency_key);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS audio_assets_updated_at_idx ON audio_assets (updated_at);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS audio_assets_created_at_idx ON audio_assets (created_at);`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS image_assets (
    id integer PRIMARY KEY NOT NULL,
    asset_type text NOT NULL,
    provider text DEFAULT 'openai' NOT NULL,
    status text DEFAULT 'queued' NOT NULL,
    prompt text NOT NULL,
    model text DEFAULT 'gpt-image-1' NOT NULL,
    size text DEFAULT '1024x1024' NOT NULL,
    quality text DEFAULT 'standard' NOT NULL,
    media_id integer,
    character_id integer,
    weapon_id integer,
    item_id integer,
    job_i_d text,
    provider_request_i_d text,
    idempotency_key text,
    error_message text,
    metadata text,
    updated_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (media_id) REFERENCES media(id) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (weapon_id) REFERENCES weapons(id) ON UPDATE no action ON DELETE set null,
    FOREIGN KEY (item_id) REFERENCES items(id) ON UPDATE no action ON DELETE set null
  );`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS image_assets_media_idx ON image_assets (media_id);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS image_assets_character_idx ON image_assets (character_id);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS image_assets_weapon_idx ON image_assets (weapon_id);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS image_assets_item_idx ON image_assets (item_id);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS image_assets_idempotency_key_idx ON image_assets (idempotency_key);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS image_assets_updated_at_idx ON image_assets (updated_at);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS image_assets_created_at_idx ON image_assets (created_at);`);

  await addLockedRelColumn(db, "game_traits_id", "game_traits");
  await addLockedRelColumn(db, "narrative_entities_id", "narrative_entities");
  await addLockedRelColumn(db, "narrative_dialogs_id", "narrative_dialogs");
  await addLockedRelColumn(db, "characters_id", "characters");
  await addLockedRelColumn(db, "dialogue_lines_id", "dialogue_lines");
  await addLockedRelColumn(db, "weapons_id", "weapons");
  await addLockedRelColumn(db, "items_id", "items");
  await addLockedRelColumn(db, "audio_assets_id", "audio_assets");
  await addLockedRelColumn(db, "image_assets_id", "image_assets");
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE IF EXISTS narrative_dialogs_scenes;`);
  await db.run(sql`DROP TABLE IF EXISTS characters_rels;`);
  await db.run(sql`DROP TABLE IF EXISTS dialogue_lines;`);
  await db.run(sql`DROP TABLE IF EXISTS audio_assets;`);
  await db.run(sql`DROP TABLE IF EXISTS image_assets;`);
  await db.run(sql`DROP TABLE IF EXISTS weapons;`);
  await db.run(sql`DROP TABLE IF EXISTS items;`);
  await db.run(sql`DROP TABLE IF EXISTS characters;`);
  await db.run(sql`DROP TABLE IF EXISTS narrative_dialogs;`);
  await db.run(sql`DROP TABLE IF EXISTS narrative_entities;`);
  await db.run(sql`DROP TABLE IF EXISTS game_traits;`);
}
