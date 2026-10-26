-- Real trainer <-> athlete link.
--
--   users.trainer_id  — the athlete's trainer (NULL = not linked). Replaces the
--                       "creator of the latest planification" stand-in used by
--                       chat/notifications and scopes every trainer query.
--   athlete_invites   — single-use invitation links (sha256 of the token only).
--
-- The backfill derives trainer_id from each athlete's latest planification.
-- Athletes without plans stay unlinked (invisible to every trainer until linked).
-- Idempotent. Apply on the live DB BEFORE deploying the matching backend:
--   psql "$DATABASE_URL" -f database/migrations/2026-10-09_trainer_athlete_link.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS trainer_id VARCHAR(32)
    REFERENCES users(id) ON DELETE SET NULL;

DO $$ BEGIN
    ALTER TABLE users ADD CONSTRAINT chk_trainer_only_athletes
        CHECK (trainer_id IS NULL OR role = 'athlete');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_users_trainer ON users (trainer_id);

UPDATE users u
   SET trainer_id = lt.created_by
  FROM (SELECT DISTINCT ON (athlete_id) athlete_id, created_by
          FROM planifications
         ORDER BY athlete_id, created_at DESC) lt
 WHERE u.id = lt.athlete_id
   AND u.role = 'athlete'
   AND u.trainer_id IS NULL;

CREATE TABLE IF NOT EXISTS athlete_invites (
    id          BIGSERIAL    PRIMARY KEY,
    trainer_id  VARCHAR(32)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  CHAR(64)     NOT NULL UNIQUE,
    email       VARCHAR(255),
    name        VARCHAR(120),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ  NOT NULL,
    used_at     TIMESTAMPTZ,
    used_by     VARCHAR(32)  REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_athlete_invites_trainer ON athlete_invites (trainer_id);
ALTER TABLE athlete_invites ENABLE ROW LEVEL SECURITY;
