import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_content_draft_revisions_target_type" AS ENUM('pack-document', 'custom-schema', 'platform-data');
  CREATE TYPE "public"."enum_content_draft_revisions_change_kind" AS ENUM('import', 'edit', 'publish');
  CREATE TYPE "public"."enum_content_publish_jobs_status" AS ENUM('running', 'succeeded', 'failed');
  CREATE TABLE "content_draft_revisions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"project_id" integer NOT NULL,
  	"target_type" "enum_content_draft_revisions_target_type" NOT NULL,
  	"target_key" varchar NOT NULL,
  	"target_name" varchar NOT NULL,
  	"target_document_id" varchar NOT NULL,
  	"change_kind" "enum_content_draft_revisions_change_kind" DEFAULT 'edit' NOT NULL,
  	"notes" varchar,
  	"document" jsonb NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "content_publish_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"job_id" varchar NOT NULL,
  	"project_id" integer NOT NULL,
  	"status" "enum_content_publish_jobs_status" DEFAULT 'running' NOT NULL,
  	"export_root" varchar,
  	"commands" jsonb,
  	"export_files" jsonb,
  	"engine_files" jsonb,
  	"skipped_packs" jsonb,
  	"error_message" varchar,
  	"summary" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "content_draft_revisions_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "content_publish_jobs_id" integer;
  ALTER TABLE "content_draft_revisions" ADD CONSTRAINT "content_draft_revisions_project_id_content_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."content_projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_publish_jobs" ADD CONSTRAINT "content_publish_jobs_project_id_content_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."content_projects"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "content_draft_revisions_key_idx" ON "content_draft_revisions" USING btree ("key");
  CREATE INDEX "content_draft_revisions_project_idx" ON "content_draft_revisions" USING btree ("project_id");
  CREATE INDEX "content_draft_revisions_updated_at_idx" ON "content_draft_revisions" USING btree ("updated_at");
  CREATE INDEX "content_draft_revisions_created_at_idx" ON "content_draft_revisions" USING btree ("created_at");
  CREATE UNIQUE INDEX "content_publish_jobs_job_id_idx" ON "content_publish_jobs" USING btree ("job_id");
  CREATE INDEX "content_publish_jobs_project_idx" ON "content_publish_jobs" USING btree ("project_id");
  CREATE INDEX "content_publish_jobs_updated_at_idx" ON "content_publish_jobs" USING btree ("updated_at");
  CREATE INDEX "content_publish_jobs_created_at_idx" ON "content_publish_jobs" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_content_draft_revisions_fk" FOREIGN KEY ("content_draft_revisions_id") REFERENCES "public"."content_draft_revisions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_content_publish_jobs_fk" FOREIGN KEY ("content_publish_jobs_id") REFERENCES "public"."content_publish_jobs"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_content_draft_revisions_id_idx" ON "payload_locked_documents_rels" USING btree ("content_draft_revisions_id");
  CREATE INDEX "payload_locked_documents_rels_content_publish_jobs_id_idx" ON "payload_locked_documents_rels" USING btree ("content_publish_jobs_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "content_draft_revisions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "content_publish_jobs" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "content_draft_revisions" CASCADE;
  DROP TABLE "content_publish_jobs" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_content_draft_revisions_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_content_publish_jobs_fk";
  
  DROP INDEX "payload_locked_documents_rels_content_draft_revisions_id_idx";
  DROP INDEX "payload_locked_documents_rels_content_publish_jobs_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "content_draft_revisions_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "content_publish_jobs_id";
  DROP TYPE "public"."enum_content_draft_revisions_target_type";
  DROP TYPE "public"."enum_content_draft_revisions_change_kind";
  DROP TYPE "public"."enum_content_publish_jobs_status";`)
}
