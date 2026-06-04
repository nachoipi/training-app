-- Extends the exercises catalog with: second_name, equipment, primary_muscles,
-- secondary_muscles, icon_url. Drops the single-value `muscle` column after
-- backfilling primary_muscles from it. Apply with:
--   psql "$DATABASE_URL" -f database/migrations/2026-06-04_extend_exercises.sql
-- Safe to re-run (uses IF [NOT] EXISTS guards).

BEGIN;

ALTER TABLE exercises
    ADD COLUMN IF NOT EXISTS second_name       VARCHAR(120),
    ADD COLUMN IF NOT EXISTS equipment         VARCHAR(40),
    ADD COLUMN IF NOT EXISTS primary_muscles   TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS secondary_muscles TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS icon_url          VARCHAR(500),
    ADD COLUMN IF NOT EXISTS video_url         VARCHAR(500),
    ADD COLUMN IF NOT EXISTS model_image_url   VARCHAR(500);

-- Backfill + drop the legacy `muscle` column only if it still exists. A
-- second run finds the column already gone and skips this block entirely,
-- which is what makes the migration truly idempotent.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
          FROM information_schema.columns
         WHERE table_name = 'exercises' AND column_name = 'muscle'
    ) THEN
        EXECUTE 'UPDATE exercises
                    SET primary_muscles = ARRAY[muscle]
                  WHERE muscle IS NOT NULL
                    AND array_length(primary_muscles, 1) IS NULL';
        EXECUTE 'DROP INDEX IF EXISTS idx_exercises_muscle';
        EXECUTE 'ALTER TABLE exercises DROP COLUMN muscle';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_exercises_primary_muscles
    ON exercises USING GIN (primary_muscles);
CREATE INDEX IF NOT EXISTS idx_exercises_secondary_muscles
    ON exercises USING GIN (secondary_muscles);

COMMIT;
