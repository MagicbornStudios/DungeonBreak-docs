import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('owner', 'admin', 'user');
  CREATE TYPE "public"."enum_docs_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__docs_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_audio_assets_asset_type" AS ENUM('dialogue_voice', 'weapon_sfx', 'item_sfx');
  CREATE TYPE "public"."enum_audio_assets_provider" AS ENUM('elevenlabs');
  CREATE TYPE "public"."enum_audio_assets_status" AS ENUM('queued', 'processing', 'succeeded', 'failed');
  CREATE TYPE "public"."enum_image_assets_asset_type" AS ENUM('character_portrait', 'weapon_art', 'item_art');
  CREATE TYPE "public"."enum_image_assets_provider" AS ENUM('openai');
  CREATE TYPE "public"."enum_image_assets_status" AS ENUM('queued', 'processing', 'succeeded', 'failed');
  CREATE TYPE "public"."enum_image_assets_size" AS ENUM('1024x1024', '1024x1536', '1536x1024');
  CREATE TYPE "public"."enum_image_assets_quality" AS ENUM('auto', 'low', 'medium', 'high');
  CREATE TYPE "public"."enum_exports_format" AS ENUM('csv', 'json');
  CREATE TYPE "public"."enum_exports_sort_order" AS ENUM('asc', 'desc');
  CREATE TYPE "public"."enum_exports_drafts" AS ENUM('yes', 'no');
  CREATE TYPE "public"."enum_imports_collection_slug" AS ENUM('docs', 'categories');
  CREATE TYPE "public"."enum_imports_import_mode" AS ENUM('create', 'update', 'upsert');
  CREATE TYPE "public"."enum_imports_status" AS ENUM('pending', 'completed', 'partial', 'failed');
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'generate-dialogue-audio', 'generate-weapon-sfx', 'generate-item-sfx', 'generate-character-image', 'generate-weapon-image', 'generate-item-image', 'createCollectionExport', 'createCollectionImport', 'schedulePublish');
  CREATE TYPE "public"."enum_payload_jobs_log_state" AS ENUM('failed', 'succeeded');
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'generate-dialogue-audio', 'generate-weapon-sfx', 'generate-item-sfx', 'generate-character-image', 'generate-weapon-image', 'generate-item-image', 'createCollectionExport', 'createCollectionImport', 'schedulePublish');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"role" "enum_users_role" DEFAULT 'user',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar,
  	"icon_id" integer,
  	"order" numeric DEFAULT 0 NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "docs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"description" varchar,
  	"category_id" integer,
  	"parent_id" integer,
  	"order" numeric DEFAULT 0,
  	"content" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_docs_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_docs_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_description" varchar,
  	"version_category_id" integer,
  	"version_parent_id" integer,
  	"version_order" numeric DEFAULT 0,
  	"version_content" jsonb,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__docs_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "game_traits" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"source_key" varchar NOT NULL,
  	"source_version" numeric DEFAULT 1 NOT NULL,
  	"synced_at" timestamp(3) with time zone NOT NULL,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "narrative_entities" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"source_key" varchar NOT NULL,
  	"starting_coordinates" jsonb DEFAULT '{}'::jsonb NOT NULL,
  	"previous_coordinates" jsonb DEFAULT '{}'::jsonb NOT NULL,
  	"source_version" numeric DEFAULT 1 NOT NULL,
  	"synced_at" timestamp(3) with time zone NOT NULL,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "narrative_dialogs_scenes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"scene" varchar NOT NULL
  );
  
  CREATE TABLE "narrative_dialogs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"phrase" varchar,
  	"location" jsonb DEFAULT '{}'::jsonb NOT NULL,
  	"force" jsonb DEFAULT '{}'::jsonb NOT NULL,
  	"source_key" varchar NOT NULL,
  	"source_version" numeric DEFAULT 1 NOT NULL,
  	"synced_at" timestamp(3) with time zone NOT NULL,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "characters" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"summary" varchar,
  	"canonical_entity_id" integer,
  	"voice_id" varchar,
  	"voice_model_id" varchar DEFAULT 'eleven_multilingual_v2',
  	"portrait_prompt" varchar,
  	"latest_portrait_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "characters_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"game_traits_id" integer
  );
  
  CREATE TABLE "dialogue_lines" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"character_id" integer NOT NULL,
  	"canonical_dialog_id" integer,
  	"scene" varchar,
  	"line_text" varchar NOT NULL,
  	"audio_voice_id" varchar,
  	"audio_model_id" varchar,
  	"audio_seed" numeric,
  	"latest_audio_asset_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "weapons" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar,
  	"sound_effect_prompt" varchar NOT NULL,
  	"image_prompt" varchar,
  	"audio_model_id" varchar DEFAULT 'eleven_multilingual_v2',
  	"audio_seed" numeric,
  	"latest_audio_asset_id" integer,
  	"latest_image_asset_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "items" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar,
  	"sound_effect_prompt" varchar NOT NULL,
  	"image_prompt" varchar,
  	"audio_model_id" varchar DEFAULT 'eleven_multilingual_v2',
  	"audio_seed" numeric,
  	"latest_audio_asset_id" integer,
  	"latest_image_asset_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "audio_assets" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"asset_type" "enum_audio_assets_asset_type" NOT NULL,
  	"provider" "enum_audio_assets_provider" DEFAULT 'elevenlabs' NOT NULL,
  	"status" "enum_audio_assets_status" DEFAULT 'queued' NOT NULL,
  	"source_text_or_prompt" varchar NOT NULL,
  	"voice_id" varchar NOT NULL,
  	"model_id" varchar NOT NULL,
  	"duration_seconds" numeric,
  	"seed" numeric,
  	"media_id" integer,
  	"character_id" integer,
  	"dialogue_line_id" integer,
  	"weapon_id" integer,
  	"item_id" integer,
  	"job_i_d" varchar,
  	"provider_request_i_d" varchar,
  	"idempotency_key" varchar,
  	"error_message" varchar,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "image_assets" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"asset_type" "enum_image_assets_asset_type" NOT NULL,
  	"provider" "enum_image_assets_provider" DEFAULT 'openai' NOT NULL,
  	"status" "enum_image_assets_status" DEFAULT 'queued' NOT NULL,
  	"prompt" varchar NOT NULL,
  	"model" varchar DEFAULT 'gpt-image-1' NOT NULL,
  	"size" "enum_image_assets_size" DEFAULT '1024x1024' NOT NULL,
  	"quality" "enum_image_assets_quality" DEFAULT 'auto' NOT NULL,
  	"media_id" integer,
  	"character_id" integer,
  	"weapon_id" integer,
  	"item_id" integer,
  	"job_i_d" varchar,
  	"provider_request_i_d" varchar,
  	"idempotency_key" varchar,
  	"error_message" varchar,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "exports" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"format" "enum_exports_format" DEFAULT 'csv',
  	"limit" numeric,
  	"page" numeric DEFAULT 1,
  	"sort" varchar,
  	"sort_order" "enum_exports_sort_order",
  	"drafts" "enum_exports_drafts" DEFAULT 'yes',
  	"collection_slug" varchar NOT NULL,
  	"where" jsonb DEFAULT '{}'::jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "exports_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "imports" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"collection_slug" "enum_imports_collection_slug" NOT NULL,
  	"import_mode" "enum_imports_import_mode",
  	"match_field" varchar DEFAULT 'id',
  	"status" "enum_imports_status" DEFAULT 'pending',
  	"summary_imported" numeric,
  	"summary_updated" numeric,
  	"summary_total" numeric,
  	"summary_issues" numeric,
  	"summary_issue_details" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "payload_mcp_api_keys" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"label" varchar,
  	"description" varchar,
  	"docs_find" boolean DEFAULT false,
  	"docs_create" boolean DEFAULT false,
  	"docs_update" boolean DEFAULT false,
  	"docs_delete" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"enable_a_p_i_key" boolean,
  	"api_key" varchar,
  	"api_key_index" varchar
  );
  
  CREATE TABLE "search" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"priority" numeric,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "search_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"docs_id" integer
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_jobs_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"executed_at" timestamp(3) with time zone NOT NULL,
  	"completed_at" timestamp(3) with time zone NOT NULL,
  	"task_slug" "enum_payload_jobs_log_task_slug" NOT NULL,
  	"task_i_d" varchar NOT NULL,
  	"input" jsonb,
  	"output" jsonb,
  	"state" "enum_payload_jobs_log_state" NOT NULL,
  	"error" jsonb
  );
  
  CREATE TABLE "payload_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"input" jsonb,
  	"completed_at" timestamp(3) with time zone,
  	"total_tried" numeric DEFAULT 0,
  	"has_error" boolean DEFAULT false,
  	"error" jsonb,
  	"task_slug" "enum_payload_jobs_task_slug",
  	"queue" varchar DEFAULT 'default',
  	"wait_until" timestamp(3) with time zone,
  	"processing" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"media_id" integer,
  	"categories_id" integer,
  	"docs_id" integer,
  	"game_traits_id" integer,
  	"narrative_entities_id" integer,
  	"narrative_dialogs_id" integer,
  	"characters_id" integer,
  	"dialogue_lines_id" integer,
  	"weapons_id" integer,
  	"items_id" integer,
  	"audio_assets_id" integer,
  	"image_assets_id" integer,
  	"payload_mcp_api_keys_id" integer,
  	"search_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"payload_mcp_api_keys_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "env_variables" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"env_all" boolean DEFAULT true,
  	"env_development" boolean DEFAULT false,
  	"env_production" boolean DEFAULT false,
  	"env_staging" boolean DEFAULT false,
  	"key" varchar NOT NULL,
  	"value" varchar
  );
  
  CREATE TABLE "env" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"env_content" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "docs" ADD CONSTRAINT "docs_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "docs" ADD CONSTRAINT "docs_parent_id_docs_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."docs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_docs_v" ADD CONSTRAINT "_docs_v_parent_id_docs_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."docs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_docs_v" ADD CONSTRAINT "_docs_v_version_category_id_categories_id_fk" FOREIGN KEY ("version_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_docs_v" ADD CONSTRAINT "_docs_v_version_parent_id_docs_id_fk" FOREIGN KEY ("version_parent_id") REFERENCES "public"."docs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "narrative_dialogs_scenes" ADD CONSTRAINT "narrative_dialogs_scenes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."narrative_dialogs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "characters" ADD CONSTRAINT "characters_canonical_entity_id_narrative_entities_id_fk" FOREIGN KEY ("canonical_entity_id") REFERENCES "public"."narrative_entities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "characters" ADD CONSTRAINT "characters_latest_portrait_id_image_assets_id_fk" FOREIGN KEY ("latest_portrait_id") REFERENCES "public"."image_assets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "characters_rels" ADD CONSTRAINT "characters_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "characters_rels" ADD CONSTRAINT "characters_rels_game_traits_fk" FOREIGN KEY ("game_traits_id") REFERENCES "public"."game_traits"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dialogue_lines" ADD CONSTRAINT "dialogue_lines_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "dialogue_lines" ADD CONSTRAINT "dialogue_lines_canonical_dialog_id_narrative_dialogs_id_fk" FOREIGN KEY ("canonical_dialog_id") REFERENCES "public"."narrative_dialogs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "dialogue_lines" ADD CONSTRAINT "dialogue_lines_latest_audio_asset_id_audio_assets_id_fk" FOREIGN KEY ("latest_audio_asset_id") REFERENCES "public"."audio_assets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "weapons" ADD CONSTRAINT "weapons_latest_audio_asset_id_audio_assets_id_fk" FOREIGN KEY ("latest_audio_asset_id") REFERENCES "public"."audio_assets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "weapons" ADD CONSTRAINT "weapons_latest_image_asset_id_image_assets_id_fk" FOREIGN KEY ("latest_image_asset_id") REFERENCES "public"."image_assets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "items" ADD CONSTRAINT "items_latest_audio_asset_id_audio_assets_id_fk" FOREIGN KEY ("latest_audio_asset_id") REFERENCES "public"."audio_assets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "items" ADD CONSTRAINT "items_latest_image_asset_id_image_assets_id_fk" FOREIGN KEY ("latest_image_asset_id") REFERENCES "public"."image_assets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "audio_assets" ADD CONSTRAINT "audio_assets_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "audio_assets" ADD CONSTRAINT "audio_assets_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "audio_assets" ADD CONSTRAINT "audio_assets_dialogue_line_id_dialogue_lines_id_fk" FOREIGN KEY ("dialogue_line_id") REFERENCES "public"."dialogue_lines"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "audio_assets" ADD CONSTRAINT "audio_assets_weapon_id_weapons_id_fk" FOREIGN KEY ("weapon_id") REFERENCES "public"."weapons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "audio_assets" ADD CONSTRAINT "audio_assets_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "image_assets" ADD CONSTRAINT "image_assets_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "image_assets" ADD CONSTRAINT "image_assets_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "image_assets" ADD CONSTRAINT "image_assets_weapon_id_weapons_id_fk" FOREIGN KEY ("weapon_id") REFERENCES "public"."weapons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "image_assets" ADD CONSTRAINT "image_assets_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "exports_texts" ADD CONSTRAINT "exports_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."exports"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_mcp_api_keys" ADD CONSTRAINT "payload_mcp_api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "search_rels" ADD CONSTRAINT "search_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."search"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "search_rels" ADD CONSTRAINT "search_rels_docs_fk" FOREIGN KEY ("docs_id") REFERENCES "public"."docs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_docs_fk" FOREIGN KEY ("docs_id") REFERENCES "public"."docs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_game_traits_fk" FOREIGN KEY ("game_traits_id") REFERENCES "public"."game_traits"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_narrative_entities_fk" FOREIGN KEY ("narrative_entities_id") REFERENCES "public"."narrative_entities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_narrative_dialogs_fk" FOREIGN KEY ("narrative_dialogs_id") REFERENCES "public"."narrative_dialogs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_characters_fk" FOREIGN KEY ("characters_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_dialogue_lines_fk" FOREIGN KEY ("dialogue_lines_id") REFERENCES "public"."dialogue_lines"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_weapons_fk" FOREIGN KEY ("weapons_id") REFERENCES "public"."weapons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_items_fk" FOREIGN KEY ("items_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audio_assets_fk" FOREIGN KEY ("audio_assets_id") REFERENCES "public"."audio_assets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_image_assets_fk" FOREIGN KEY ("image_assets_id") REFERENCES "public"."image_assets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payload_mcp_api_keys_fk" FOREIGN KEY ("payload_mcp_api_keys_id") REFERENCES "public"."payload_mcp_api_keys"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_search_fk" FOREIGN KEY ("search_id") REFERENCES "public"."search"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_payload_mcp_api_keys_fk" FOREIGN KEY ("payload_mcp_api_keys_id") REFERENCES "public"."payload_mcp_api_keys"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "env_variables" ADD CONSTRAINT "env_variables_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."env"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE UNIQUE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");
  CREATE INDEX "categories_icon_idx" ON "categories" USING btree ("icon_id");
  CREATE INDEX "categories_updated_at_idx" ON "categories" USING btree ("updated_at");
  CREATE INDEX "categories_created_at_idx" ON "categories" USING btree ("created_at");
  CREATE INDEX "docs_category_idx" ON "docs" USING btree ("category_id");
  CREATE INDEX "docs_parent_idx" ON "docs" USING btree ("parent_id");
  CREATE INDEX "docs_updated_at_idx" ON "docs" USING btree ("updated_at");
  CREATE INDEX "docs_created_at_idx" ON "docs" USING btree ("created_at");
  CREATE INDEX "docs__status_idx" ON "docs" USING btree ("_status");
  CREATE INDEX "_docs_v_parent_idx" ON "_docs_v" USING btree ("parent_id");
  CREATE INDEX "_docs_v_version_version_category_idx" ON "_docs_v" USING btree ("version_category_id");
  CREATE INDEX "_docs_v_version_version_parent_idx" ON "_docs_v" USING btree ("version_parent_id");
  CREATE INDEX "_docs_v_version_version_updated_at_idx" ON "_docs_v" USING btree ("version_updated_at");
  CREATE INDEX "_docs_v_version_version_created_at_idx" ON "_docs_v" USING btree ("version_created_at");
  CREATE INDEX "_docs_v_version_version__status_idx" ON "_docs_v" USING btree ("version__status");
  CREATE INDEX "_docs_v_created_at_idx" ON "_docs_v" USING btree ("created_at");
  CREATE INDEX "_docs_v_updated_at_idx" ON "_docs_v" USING btree ("updated_at");
  CREATE INDEX "_docs_v_latest_idx" ON "_docs_v" USING btree ("latest");
  CREATE INDEX "_docs_v_autosave_idx" ON "_docs_v" USING btree ("autosave");
  CREATE UNIQUE INDEX "game_traits_name_idx" ON "game_traits" USING btree ("name");
  CREATE UNIQUE INDEX "game_traits_source_key_idx" ON "game_traits" USING btree ("source_key");
  CREATE INDEX "game_traits_updated_at_idx" ON "game_traits" USING btree ("updated_at");
  CREATE INDEX "game_traits_created_at_idx" ON "game_traits" USING btree ("created_at");
  CREATE UNIQUE INDEX "narrative_entities_name_idx" ON "narrative_entities" USING btree ("name");
  CREATE UNIQUE INDEX "narrative_entities_source_key_idx" ON "narrative_entities" USING btree ("source_key");
  CREATE INDEX "narrative_entities_updated_at_idx" ON "narrative_entities" USING btree ("updated_at");
  CREATE INDEX "narrative_entities_created_at_idx" ON "narrative_entities" USING btree ("created_at");
  CREATE INDEX "narrative_dialogs_scenes_order_idx" ON "narrative_dialogs_scenes" USING btree ("_order");
  CREATE INDEX "narrative_dialogs_scenes_parent_id_idx" ON "narrative_dialogs_scenes" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "narrative_dialogs_label_idx" ON "narrative_dialogs" USING btree ("label");
  CREATE UNIQUE INDEX "narrative_dialogs_source_key_idx" ON "narrative_dialogs" USING btree ("source_key");
  CREATE INDEX "narrative_dialogs_updated_at_idx" ON "narrative_dialogs" USING btree ("updated_at");
  CREATE INDEX "narrative_dialogs_created_at_idx" ON "narrative_dialogs" USING btree ("created_at");
  CREATE UNIQUE INDEX "characters_name_idx" ON "characters" USING btree ("name");
  CREATE UNIQUE INDEX "characters_slug_idx" ON "characters" USING btree ("slug");
  CREATE INDEX "characters_canonical_entity_idx" ON "characters" USING btree ("canonical_entity_id");
  CREATE INDEX "characters_latest_portrait_idx" ON "characters" USING btree ("latest_portrait_id");
  CREATE INDEX "characters_updated_at_idx" ON "characters" USING btree ("updated_at");
  CREATE INDEX "characters_created_at_idx" ON "characters" USING btree ("created_at");
  CREATE INDEX "characters_rels_order_idx" ON "characters_rels" USING btree ("order");
  CREATE INDEX "characters_rels_parent_idx" ON "characters_rels" USING btree ("parent_id");
  CREATE INDEX "characters_rels_path_idx" ON "characters_rels" USING btree ("path");
  CREATE INDEX "characters_rels_game_traits_id_idx" ON "characters_rels" USING btree ("game_traits_id");
  CREATE UNIQUE INDEX "dialogue_lines_label_idx" ON "dialogue_lines" USING btree ("label");
  CREATE UNIQUE INDEX "dialogue_lines_slug_idx" ON "dialogue_lines" USING btree ("slug");
  CREATE INDEX "dialogue_lines_character_idx" ON "dialogue_lines" USING btree ("character_id");
  CREATE INDEX "dialogue_lines_canonical_dialog_idx" ON "dialogue_lines" USING btree ("canonical_dialog_id");
  CREATE INDEX "dialogue_lines_latest_audio_asset_idx" ON "dialogue_lines" USING btree ("latest_audio_asset_id");
  CREATE INDEX "dialogue_lines_updated_at_idx" ON "dialogue_lines" USING btree ("updated_at");
  CREATE INDEX "dialogue_lines_created_at_idx" ON "dialogue_lines" USING btree ("created_at");
  CREATE UNIQUE INDEX "weapons_name_idx" ON "weapons" USING btree ("name");
  CREATE UNIQUE INDEX "weapons_slug_idx" ON "weapons" USING btree ("slug");
  CREATE INDEX "weapons_latest_audio_asset_idx" ON "weapons" USING btree ("latest_audio_asset_id");
  CREATE INDEX "weapons_latest_image_asset_idx" ON "weapons" USING btree ("latest_image_asset_id");
  CREATE INDEX "weapons_updated_at_idx" ON "weapons" USING btree ("updated_at");
  CREATE INDEX "weapons_created_at_idx" ON "weapons" USING btree ("created_at");
  CREATE UNIQUE INDEX "items_name_idx" ON "items" USING btree ("name");
  CREATE UNIQUE INDEX "items_slug_idx" ON "items" USING btree ("slug");
  CREATE INDEX "items_latest_audio_asset_idx" ON "items" USING btree ("latest_audio_asset_id");
  CREATE INDEX "items_latest_image_asset_idx" ON "items" USING btree ("latest_image_asset_id");
  CREATE INDEX "items_updated_at_idx" ON "items" USING btree ("updated_at");
  CREATE INDEX "items_created_at_idx" ON "items" USING btree ("created_at");
  CREATE INDEX "audio_assets_media_idx" ON "audio_assets" USING btree ("media_id");
  CREATE INDEX "audio_assets_character_idx" ON "audio_assets" USING btree ("character_id");
  CREATE INDEX "audio_assets_dialogue_line_idx" ON "audio_assets" USING btree ("dialogue_line_id");
  CREATE INDEX "audio_assets_weapon_idx" ON "audio_assets" USING btree ("weapon_id");
  CREATE INDEX "audio_assets_item_idx" ON "audio_assets" USING btree ("item_id");
  CREATE INDEX "audio_assets_idempotency_key_idx" ON "audio_assets" USING btree ("idempotency_key");
  CREATE INDEX "audio_assets_updated_at_idx" ON "audio_assets" USING btree ("updated_at");
  CREATE INDEX "audio_assets_created_at_idx" ON "audio_assets" USING btree ("created_at");
  CREATE INDEX "image_assets_media_idx" ON "image_assets" USING btree ("media_id");
  CREATE INDEX "image_assets_character_idx" ON "image_assets" USING btree ("character_id");
  CREATE INDEX "image_assets_weapon_idx" ON "image_assets" USING btree ("weapon_id");
  CREATE INDEX "image_assets_item_idx" ON "image_assets" USING btree ("item_id");
  CREATE INDEX "image_assets_idempotency_key_idx" ON "image_assets" USING btree ("idempotency_key");
  CREATE INDEX "image_assets_updated_at_idx" ON "image_assets" USING btree ("updated_at");
  CREATE INDEX "image_assets_created_at_idx" ON "image_assets" USING btree ("created_at");
  CREATE INDEX "exports_updated_at_idx" ON "exports" USING btree ("updated_at");
  CREATE INDEX "exports_created_at_idx" ON "exports" USING btree ("created_at");
  CREATE UNIQUE INDEX "exports_filename_idx" ON "exports" USING btree ("filename");
  CREATE INDEX "exports_texts_order_parent" ON "exports_texts" USING btree ("order","parent_id");
  CREATE INDEX "imports_updated_at_idx" ON "imports" USING btree ("updated_at");
  CREATE INDEX "imports_created_at_idx" ON "imports" USING btree ("created_at");
  CREATE UNIQUE INDEX "imports_filename_idx" ON "imports" USING btree ("filename");
  CREATE INDEX "payload_mcp_api_keys_user_idx" ON "payload_mcp_api_keys" USING btree ("user_id");
  CREATE INDEX "payload_mcp_api_keys_updated_at_idx" ON "payload_mcp_api_keys" USING btree ("updated_at");
  CREATE INDEX "payload_mcp_api_keys_created_at_idx" ON "payload_mcp_api_keys" USING btree ("created_at");
  CREATE INDEX "search_updated_at_idx" ON "search" USING btree ("updated_at");
  CREATE INDEX "search_created_at_idx" ON "search" USING btree ("created_at");
  CREATE INDEX "search_rels_order_idx" ON "search_rels" USING btree ("order");
  CREATE INDEX "search_rels_parent_idx" ON "search_rels" USING btree ("parent_id");
  CREATE INDEX "search_rels_path_idx" ON "search_rels" USING btree ("path");
  CREATE INDEX "search_rels_docs_id_idx" ON "search_rels" USING btree ("docs_id");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_jobs_log_order_idx" ON "payload_jobs_log" USING btree ("_order");
  CREATE INDEX "payload_jobs_log_parent_id_idx" ON "payload_jobs_log" USING btree ("_parent_id");
  CREATE INDEX "payload_jobs_completed_at_idx" ON "payload_jobs" USING btree ("completed_at");
  CREATE INDEX "payload_jobs_total_tried_idx" ON "payload_jobs" USING btree ("total_tried");
  CREATE INDEX "payload_jobs_has_error_idx" ON "payload_jobs" USING btree ("has_error");
  CREATE INDEX "payload_jobs_task_slug_idx" ON "payload_jobs" USING btree ("task_slug");
  CREATE INDEX "payload_jobs_queue_idx" ON "payload_jobs" USING btree ("queue");
  CREATE INDEX "payload_jobs_wait_until_idx" ON "payload_jobs" USING btree ("wait_until");
  CREATE INDEX "payload_jobs_processing_idx" ON "payload_jobs" USING btree ("processing");
  CREATE INDEX "payload_jobs_updated_at_idx" ON "payload_jobs" USING btree ("updated_at");
  CREATE INDEX "payload_jobs_created_at_idx" ON "payload_jobs" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("categories_id");
  CREATE INDEX "payload_locked_documents_rels_docs_id_idx" ON "payload_locked_documents_rels" USING btree ("docs_id");
  CREATE INDEX "payload_locked_documents_rels_game_traits_id_idx" ON "payload_locked_documents_rels" USING btree ("game_traits_id");
  CREATE INDEX "payload_locked_documents_rels_narrative_entities_id_idx" ON "payload_locked_documents_rels" USING btree ("narrative_entities_id");
  CREATE INDEX "payload_locked_documents_rels_narrative_dialogs_id_idx" ON "payload_locked_documents_rels" USING btree ("narrative_dialogs_id");
  CREATE INDEX "payload_locked_documents_rels_characters_id_idx" ON "payload_locked_documents_rels" USING btree ("characters_id");
  CREATE INDEX "payload_locked_documents_rels_dialogue_lines_id_idx" ON "payload_locked_documents_rels" USING btree ("dialogue_lines_id");
  CREATE INDEX "payload_locked_documents_rels_weapons_id_idx" ON "payload_locked_documents_rels" USING btree ("weapons_id");
  CREATE INDEX "payload_locked_documents_rels_items_id_idx" ON "payload_locked_documents_rels" USING btree ("items_id");
  CREATE INDEX "payload_locked_documents_rels_audio_assets_id_idx" ON "payload_locked_documents_rels" USING btree ("audio_assets_id");
  CREATE INDEX "payload_locked_documents_rels_image_assets_id_idx" ON "payload_locked_documents_rels" USING btree ("image_assets_id");
  CREATE INDEX "payload_locked_documents_rels_payload_mcp_api_keys_id_idx" ON "payload_locked_documents_rels" USING btree ("payload_mcp_api_keys_id");
  CREATE INDEX "payload_locked_documents_rels_search_id_idx" ON "payload_locked_documents_rels" USING btree ("search_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_rels_payload_mcp_api_keys_id_idx" ON "payload_preferences_rels" USING btree ("payload_mcp_api_keys_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "env_variables_order_idx" ON "env_variables" USING btree ("_order");
  CREATE INDEX "env_variables_parent_id_idx" ON "env_variables" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "categories" CASCADE;
  DROP TABLE "docs" CASCADE;
  DROP TABLE "_docs_v" CASCADE;
  DROP TABLE "game_traits" CASCADE;
  DROP TABLE "narrative_entities" CASCADE;
  DROP TABLE "narrative_dialogs_scenes" CASCADE;
  DROP TABLE "narrative_dialogs" CASCADE;
  DROP TABLE "characters" CASCADE;
  DROP TABLE "characters_rels" CASCADE;
  DROP TABLE "dialogue_lines" CASCADE;
  DROP TABLE "weapons" CASCADE;
  DROP TABLE "items" CASCADE;
  DROP TABLE "audio_assets" CASCADE;
  DROP TABLE "image_assets" CASCADE;
  DROP TABLE "exports" CASCADE;
  DROP TABLE "exports_texts" CASCADE;
  DROP TABLE "imports" CASCADE;
  DROP TABLE "payload_mcp_api_keys" CASCADE;
  DROP TABLE "search" CASCADE;
  DROP TABLE "search_rels" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_jobs_log" CASCADE;
  DROP TABLE "payload_jobs" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "env_variables" CASCADE;
  DROP TABLE "env" CASCADE;
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_docs_status";
  DROP TYPE "public"."enum__docs_v_version_status";
  DROP TYPE "public"."enum_audio_assets_asset_type";
  DROP TYPE "public"."enum_audio_assets_provider";
  DROP TYPE "public"."enum_audio_assets_status";
  DROP TYPE "public"."enum_image_assets_asset_type";
  DROP TYPE "public"."enum_image_assets_provider";
  DROP TYPE "public"."enum_image_assets_status";
  DROP TYPE "public"."enum_image_assets_size";
  DROP TYPE "public"."enum_image_assets_quality";
  DROP TYPE "public"."enum_exports_format";
  DROP TYPE "public"."enum_exports_sort_order";
  DROP TYPE "public"."enum_exports_drafts";
  DROP TYPE "public"."enum_imports_collection_slug";
  DROP TYPE "public"."enum_imports_import_mode";
  DROP TYPE "public"."enum_imports_status";
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  DROP TYPE "public"."enum_payload_jobs_log_state";
  DROP TYPE "public"."enum_payload_jobs_task_slug";`)
}
