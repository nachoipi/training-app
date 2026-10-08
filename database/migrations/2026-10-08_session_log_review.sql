-- Trainer review state for completed session logs.
--
-- Stored in real columns (not session_logs.payload): the athlete's save is an
-- upsert that replaces `payload` wholesale, so anything the trainer put inside
-- it would be wiped the next time the athlete edits the session.
--   reviewed_at     — first time the trainer marked the session as reviewed
--                     (NULL = still "Nuevo" in the trainer dashboard feed).
--   trainer_comment — short feedback the athlete sees on that session.
--
-- Apply on the live DB before deploying the matching backend:
--   psql "$DATABASE_URL" -f database/migrations/2026-10-08_session_log_review.sql

ALTER TABLE session_logs
    ADD COLUMN IF NOT EXISTS reviewed_at     TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS trainer_comment TEXT;
