import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_content_projects_status" AS ENUM('draft', 'validated', 'published');
  CREATE TYPE "public"."enum_content_projects_source_mode" AS ENUM('payload');
  CREATE TYPE "public"."enum_content_schema_imports_import_status" AS ENUM('imported', 'refreshed');
  CREATE TYPE "public"."enum_content_pack_documents_status" AS ENUM('imported', 'edited', 'exported');
  CREATE TABLE "content_projects" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar,
  	"status" "enum_content_projects_status" DEFAULT 'draft' NOT NULL,
  	"export_root" varchar DEFAULT 'content-projects' NOT NULL,
  	"source_mode" "enum_content_projects_source_mode" DEFAULT 'payload' NOT NULL,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "content_schema_imports" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"project_id" integer NOT NULL,
  	"pack_id" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"kind" varchar NOT NULL,
  	"export_name" varchar NOT NULL,
  	"source_file" varchar NOT NULL,
  	"bundle_key" varchar,
  	"content_source_path" varchar,
  	"schema_version" varchar,
  	"schema_ref" varchar,
  	"top_level_counts" jsonb,
  	"canonical_document" jsonb,
  	"import_status" "enum_content_schema_imports_import_status" DEFAULT 'imported' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "content_pack_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"project_id" integer NOT NULL,
  	"schema_import_id" integer,
  	"pack_id" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"kind" varchar NOT NULL,
  	"export_name" varchar NOT NULL,
  	"source_file" varchar NOT NULL,
  	"bundle_key" varchar,
  	"content_source_path" varchar,
  	"schema_version" varchar,
  	"document" jsonb NOT NULL,
  	"status" "enum_content_pack_documents_status" DEFAULT 'imported' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "content_projects_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "content_schema_imports_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "content_pack_documents_id" integer;
  ALTER TABLE "content_schema_imports" ADD CONSTRAINT "content_schema_imports_project_id_content_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."content_projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_pack_documents" ADD CONSTRAINT "content_pack_documents_project_id_content_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."content_projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_pack_documents" ADD CONSTRAINT "content_pack_documents_schema_import_id_content_schema_imports_id_fk" FOREIGN KEY ("schema_import_id") REFERENCES "public"."content_schema_imports"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "content_projects_slug_idx" ON "content_projects" USING btree ("slug");
  CREATE INDEX "content_projects_updated_at_idx" ON "content_projects" USING btree ("updated_at");
  CREATE INDEX "content_projects_created_at_idx" ON "content_projects" USING btree ("created_at");
  CREATE UNIQUE INDEX "content_schema_imports_key_idx" ON "content_schema_imports" USING btree ("key");
  CREATE INDEX "content_schema_imports_project_idx" ON "content_schema_imports" USING btree ("project_id");
  CREATE INDEX "content_schema_imports_updated_at_idx" ON "content_schema_imports" USING btree ("updated_at");
  CREATE INDEX "content_schema_imports_created_at_idx" ON "content_schema_imports" USING btree ("created_at");
  CREATE UNIQUE INDEX "content_pack_documents_key_idx" ON "content_pack_documents" USING btree ("key");
  CREATE INDEX "content_pack_documents_project_idx" ON "content_pack_documents" USING btree ("project_id");
  CREATE INDEX "content_pack_documents_schema_import_idx" ON "content_pack_documents" USING btree ("schema_import_id");
  CREATE INDEX "content_pack_documents_updated_at_idx" ON "content_pack_documents" USING btree ("updated_at");
  CREATE INDEX "content_pack_documents_created_at_idx" ON "content_pack_documents" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_content_projects_fk" FOREIGN KEY ("content_projects_id") REFERENCES "public"."content_projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_content_schema_imports_fk" FOREIGN KEY ("content_schema_imports_id") REFERENCES "public"."content_schema_imports"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_content_pack_documents_fk" FOREIGN KEY ("content_pack_documents_id") REFERENCES "public"."content_pack_documents"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_content_projects_id_idx" ON "payload_locked_documents_rels" USING btree ("content_projects_id");
  CREATE INDEX "payload_locked_documents_rels_content_schema_imports_id_idx" ON "payload_locked_documents_rels" USING btree ("content_schema_imports_id");
  CREATE INDEX "payload_locked_documents_rels_content_pack_documents_id_idx" ON "payload_locked_documents_rels" USING btree ("content_pack_documents_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "content_projects" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "content_schema_imports" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "content_pack_documents" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "content_projects" CASCADE;
  DROP TABLE "content_schema_imports" CASCADE;
  DROP TABLE "content_pack_documents" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_content_projects_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_content_schema_imports_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_content_pack_documents_fk";
  
  DROP INDEX "payload_locked_documents_rels_content_projects_id_idx";
  DROP INDEX "payload_locked_documents_rels_content_schema_imports_id_idx";
  DROP INDEX "payload_locked_documents_rels_content_pack_documents_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "content_projects_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "content_schema_imports_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "content_pack_documents_id";
  DROP TYPE "public"."enum_content_projects_status";
  DROP TYPE "public"."enum_content_projects_source_mode";
  DROP TYPE "public"."enum_content_schema_imports_import_status";
  DROP TYPE "public"."enum_content_pack_documents_status";`)
}
