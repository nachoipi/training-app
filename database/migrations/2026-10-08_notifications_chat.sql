-- Notification centre + trainer/athlete chat.
--
--   notifications — one row per UNREAD notification. Reading one (clicking it
--                   or "Limpiar") hard-deletes the row, so there is no read_at.
--                   dedupe_key collapses repeated events into a single unread
--                   entry (e.g. several edits of the same plan); the partial
--                   unique index makes that ON CONFLICT upsert race-safe.
--   messages      — 1-to-1 chat between a trainer and an athlete (text only).
--                   A "conversation" is just the (sender, recipient) pair.
--
-- Additive only (IF NOT EXISTS). Apply on the live DB before deploying the
-- matching backend:
--   psql "$DATABASE_URL" -f database/migrations/2026-10-08_notifications_chat.sql

CREATE TABLE IF NOT EXISTS notifications (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     VARCHAR(32)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(32)  NOT NULL,
    title       VARCHAR(160) NOT NULL,
    body        TEXT,
    data        JSONB        NOT NULL DEFAULT '{}'::jsonb,
    dedupe_key  VARCHAR(120),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
    ON notifications (user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_dedupe
    ON notifications (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS messages (
    id            BIGSERIAL    PRIMARY KEY,
    sender_id     VARCHAR(32)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id  VARCHAR(32)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body          TEXT         NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    read_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread
    ON messages (recipient_id, read_at);
CREATE INDEX IF NOT EXISTS idx_messages_pair
    ON messages (LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id), id);

-- Same lock-down as every other public table (see 2026-06-10_enable_rls.sql).
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages      ENABLE ROW LEVEL SECURITY;
