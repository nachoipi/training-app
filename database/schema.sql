-- FitCore — PostgreSQL schema
-- Apply with: psql "$DATABASE_URL" -f database/schema.sql
-- Portable across Supabase and GCP Cloud SQL for Postgres.

DROP TABLE IF EXISTS session_logs   CASCADE;
DROP TABLE IF EXISTS sessions       CASCADE;
DROP TABLE IF EXISTS planifications CASCADE;
DROP TABLE IF EXISTS routines       CASCADE;
DROP TABLE IF EXISTS exercises      CASCADE;
DROP TABLE IF EXISTS users          CASCADE;

CREATE TABLE users (
    id            VARCHAR(32)  PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(16)  NOT NULL CHECK (role IN ('trainer', 'athlete')),
    name          VARCHAR(120) NOT NULL,
    avatar        VARCHAR(8),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Exercise catalog. Muscle tagging is now an array (primary/secondary) instead
-- of the single VARCHAR `muscle` column the table originally had — see
-- database/migrations/2026-06-04_extend_exercises.sql for the live-DB path.
CREATE TABLE exercises (
    id                VARCHAR(32)  PRIMARY KEY,
    name              VARCHAR(120) NOT NULL,
    second_name       VARCHAR(120),
    type              VARCHAR(40)  NOT NULL,
    equipment         VARCHAR(40),
    primary_muscles   TEXT[]       NOT NULL DEFAULT '{}',
    secondary_muscles TEXT[]       NOT NULL DEFAULT '{}',
    icon_url          VARCHAR(500),
    video_url         VARCHAR(500),
    model_image_url   VARCHAR(500),
    description       TEXT,
    built_in          BOOLEAN      NOT NULL DEFAULT false,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_exercises_type ON exercises (type);
-- GIN indexes let us filter exercises by primary/secondary muscle with
-- `WHERE primary_muscles @> ARRAY['piernas']` in O(log n).
CREATE INDEX idx_exercises_primary_muscles   ON exercises USING GIN (primary_muscles);
CREATE INDEX idx_exercises_secondary_muscles ON exercises USING GIN (secondary_muscles);

CREATE TABLE routines (
    id          VARCHAR(32)  PRIMARY KEY,
    user_id     VARCHAR(32)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_by  VARCHAR(32)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(120) NOT NULL,
    description TEXT,
    days        JSONB,
    exercises   JSONB,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE planifications (
    id          VARCHAR(32)  PRIMARY KEY,
    athlete_id  VARCHAR(32)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_by  VARCHAR(32)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(120) NOT NULL,
    weeks       INTEGER      NOT NULL DEFAULT 4,
    week_days   JSONB,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
    id           VARCHAR(32)  PRIMARY KEY,
    user_id      VARCHAR(32)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    routine_id   VARCHAR(32)  REFERENCES routines(id) ON DELETE SET NULL,
    routine_name VARCHAR(120),
    date         DATE         NOT NULL,
    duration     INTEGER,
    notes        TEXT,
    intensity    SMALLINT     NOT NULL DEFAULT 2,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_user_date ON sessions (user_id, date);

CREATE TABLE session_logs (
    id          BIGSERIAL    PRIMARY KEY,
    athlete_id  VARCHAR(32)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id     VARCHAR(32)  NOT NULL REFERENCES planifications(id) ON DELETE CASCADE,
    week        INTEGER      NOT NULL,
    day_number  INTEGER      NOT NULL,
    payload     JSONB,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_athlete_plan_week_day UNIQUE (athlete_id, plan_id, week, day_number)
);

-- Keep session_logs.updated_at fresh on every UPDATE (Postgres has no
-- ON UPDATE clause like MySQL).
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_session_logs_updated_at
    BEFORE UPDATE ON session_logs
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
