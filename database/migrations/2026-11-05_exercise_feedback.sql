-- Per-exercise coach feedback on a completed session.
--
-- Kept outside `payload` for the same reason as trainer_comment: the athlete's save upserts
-- the whole payload. Shape: { "<position>": { comment, exerciseId, name, updatedAt } }.
-- exerciseId/name are stored so the comment can be carried to later sessions of the same plan
-- (the same exercise, any position) without re-reading the plan.
--
--   psql "$DATABASE_URL" -f database/migrations/2026-11-05_exercise_feedback.sql

ALTER TABLE session_logs
    ADD COLUMN IF NOT EXISTS exercise_feedback JSONB NOT NULL DEFAULT '{}'::jsonb;
