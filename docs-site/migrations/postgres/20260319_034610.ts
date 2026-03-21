import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_content_custom_schemas_schema_type" AS ENUM('json-schema', 'object-schema', 'canonical-asset');
  CREATE TYPE "public"."enum_content_custom_schemas_status" AS ENUM('draft', 'validated', 'exported');
  CREATE TYPE "public"."enum_content_platform_data_platform_layer" AS ENUM('docs-site-payloadcms');
  CREATE TYPE "public"."enum_content_platform_data_namespace" AS ENUM('admin-ui', 'workflow', 'publishing', 'rendering', 'integration', 'generic-extension');
  CREATE TYPE "public"."enum_content_platform_data_status" AS ENUM('draft', 'validated', 'exported');
  CREATE TABLE "content_custom_schemas" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"project_id" integer NOT NULL,
  	"schema_id" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"target_pack_id" varchar,
  	"schema_type" "enum_content_custom_schemas_schema_type" DEFAULT 'json-schema' NOT NULL,
  	"document" jsonb NOT NULL,
  	"status" "enum_content_custom_schemas_status" DEFAULT 'draft' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "content_platform_data" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"project_id" integer NOT NULL,
  	"data_id" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"platform_layer" "enum_content_platform_data_platform_layer" DEFAULT 'docs-site-payloadcms' NOT NULL,
  	"namespace" "enum_content_platform_data_namespace" DEFAULT 'generic-extension' NOT NULL,
  	"target_id" varchar,
  	"document" jsonb NOT NULL,
  	"status" "enum_content_platform_data_status" DEFAULT 'draft' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "content_custom_schemas_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "content_platform_data_id" integer;
  ALTER TABLE "content_custom_schemas" ADD CONSTRAINT "content_custom_schemas_project_id_content_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."content_projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_platform_data" ADD CONSTRAINT "content_platform_data_project_id_content_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."content_projects"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "content_custom_schemas_key_idx" ON "content_custom_schemas" USING btree ("key");
  CREATE INDEX "content_custom_schemas_project_idx" ON "content_custom_schemas" USING btree ("project_id");
  CREATE INDEX "content_custom_schemas_updated_at_idx" ON "content_custom_schemas" USING btree ("updated_at");
  CREATE INDEX "content_custom_schemas_created_at_idx" ON "content_custom_schemas" USING btree ("created_at");
  CREATE UNIQUE INDEX "content_platform_data_key_idx" ON "content_platform_data" USING btree ("key");
  CREATE INDEX "content_platform_data_project_idx" ON "content_platform_data" USING btree ("project_id");
  CREATE INDEX "content_platform_data_updated_at_idx" ON "content_platform_data" USING btree ("updated_at");
  CREATE INDEX "content_platform_data_created_at_idx" ON "content_platform_data" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_content_custom_schemas_fk" FOREIGN KEY ("content_custom_schemas_id") REFERENCES "public"."content_custom_schemas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_content_platform_data_fk" FOREIGN KEY ("content_platform_data_id") REFERENCES "public"."content_platform_data"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_content_custom_schemas_id_idx" ON "payload_locked_documents_rels" USING btree ("content_custom_schemas_id");
  CREATE INDEX "payload_locked_documents_rels_content_platform_data_id_idx" ON "payload_locked_documents_rels" USING btree ("content_platform_data_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "content_custom_schemas" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "content_platform_data" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "content_custom_schemas" CASCADE;
  DROP TABLE "content_platform_data" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_content_custom_schemas_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_content_platform_data_fk";
  
  DROP INDEX "payload_locked_documents_rels_content_custom_schemas_id_idx";
  DROP INDEX "payload_locked_documents_rels_content_platform_data_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "content_custom_schemas_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "content_platform_data_id";
  DROP TYPE "public"."enum_content_custom_schemas_schema_type";
  DROP TYPE "public"."enum_content_custom_schemas_status";
  DROP TYPE "public"."enum_content_platform_data_platform_layer";
  DROP TYPE "public"."enum_content_platform_data_namespace";
  DROP TYPE "public"."enum_content_platform_data_status";`)
}
