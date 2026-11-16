-- Manual archiving of planifications (trainer side).
--
-- A plan is shown in the trainer's "Archivadas" folds when it is completed
-- (derived, every session done) OR when the trainer archived it by hand, which
-- sets this column. NULL = not archived. The athlete's views ignore it.
--
-- Apply on the live DB before deploying the matching backend:
--   psql "$DATABASE_URL" -f database/migrations/2026-11-09_planification_archived.sql

ALTER TABLE planifications ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
