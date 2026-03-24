import { sql, type MigrateDownArgs, type MigrateUpArgs } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "characters"
    DROP CONSTRAINT IF EXISTS "characters_canonical_entity_id_narrative_entities_id_fk";

    DROP INDEX IF EXISTS "characters_canonical_entity_idx";

    ALTER TABLE "characters"
    ALTER COLUMN "canonical_entity_id"
    TYPE varchar
    USING CASE
      WHEN "canonical_entity_id" IS NULL THEN NULL
      ELSE "canonical_entity_id"::varchar
    END;

    CREATE INDEX IF NOT EXISTS "characters_canonical_entity_idx"
    ON "characters" USING btree ("canonical_entity_id");

    CREATE TABLE IF NOT EXISTS "characters_texts" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "text" varchar
    );

    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'characters_rels'
      ) THEN
        INSERT INTO "characters_texts" ("order", "parent_id", "path", "text")
        SELECT
          "order",
          "parent_id",
          "path",
          "game_traits_id"::varchar
        FROM "characters_rels"
        WHERE "game_traits_id" IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM "characters_texts" existing
            WHERE existing."parent_id" = "characters_rels"."parent_id"
              AND existing."path" = "characters_rels"."path"
              AND existing."text" = "characters_rels"."game_traits_id"::varchar
          );
      END IF;
    END $$;

    ALTER TABLE "characters_texts"
    ADD CONSTRAINT "characters_texts_parent_fk"
    FOREIGN KEY ("parent_id")
    REFERENCES "public"."characters"("id")
    ON DELETE cascade
    ON UPDATE no action;

    CREATE INDEX IF NOT EXISTS "characters_texts_order_parent"
    ON "characters_texts" USING btree ("order", "parent_id");

    DROP TABLE IF EXISTS "characters_rels" CASCADE;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "characters_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "game_traits_id" integer
    );

    ALTER TABLE "characters_rels"
    ADD CONSTRAINT "characters_rels_parent_fk"
    FOREIGN KEY ("parent_id")
    REFERENCES "public"."characters"("id")
    ON DELETE cascade
    ON UPDATE no action;

    CREATE INDEX IF NOT EXISTS "characters_rels_order_idx"
    ON "characters_rels" USING btree ("order");
    CREATE INDEX IF NOT EXISTS "characters_rels_parent_idx"
    ON "characters_rels" USING btree ("parent_id");
    CREATE INDEX IF NOT EXISTS "characters_rels_path_idx"
    ON "characters_rels" USING btree ("path");
    CREATE INDEX IF NOT EXISTS "characters_rels_game_traits_id_idx"
    ON "characters_rels" USING btree ("game_traits_id");

    DROP TABLE IF EXISTS "characters_texts" CASCADE;

    DROP INDEX IF EXISTS "characters_canonical_entity_idx";

    ALTER TABLE "characters"
    ALTER COLUMN "canonical_entity_id"
    TYPE integer
    USING NULLIF("canonical_entity_id", '')::integer;

    ALTER TABLE "characters"
    ADD CONSTRAINT "characters_canonical_entity_id_narrative_entities_id_fk"
    FOREIGN KEY ("canonical_entity_id")
    REFERENCES "public"."narrative_entities"("id")
    ON DELETE set null
    ON UPDATE no action;

    CREATE INDEX IF NOT EXISTS "characters_canonical_entity_idx"
    ON "characters" USING btree ("canonical_entity_id");
  `);
}
