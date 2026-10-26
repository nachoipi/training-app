-- Draft / published state for planifications.
--
-- Athletes only see (and can log against) published plans; a trainer keeps a
-- plan in 'draft' while building it. Existing plans are backfilled as
-- 'published' so nobody loses a plan that is already live; new rows default
-- to 'draft'.
--
-- Apply on the live DB before deploying the matching backend:
--   psql "$DATABASE_URL" -f database/migrations/2026-10-26_planification_status.sql

ALTER TABLE planifications
    ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'published'
        CHECK (status IN ('draft', 'published'));
ALTER TABLE planifications ALTER COLUMN status SET DEFAULT 'draft';
