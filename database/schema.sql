-- FitCore — MySQL schema
-- Apply with: mysql -u root -p fitcore < database/schema.sql

CREATE DATABASE IF NOT EXISTS fitcore
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE fitcore;

DROP TABLE IF EXISTS session_logs;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS planifications;
DROP TABLE IF EXISTS routines;
DROP TABLE IF EXISTS exercises;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id            VARCHAR(32)  PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          ENUM('trainer','athlete') NOT NULL,
    name          VARCHAR(120) NOT NULL,
    avatar        VARCHAR(8)   NULL,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE exercises (
    id         VARCHAR(32)  PRIMARY KEY,
    name       VARCHAR(120) NOT NULL,
    muscle     VARCHAR(40)  NOT NULL,
    type       VARCHAR(40)  NOT NULL,
    description TEXT        NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_exercises_muscle (muscle),
    INDEX idx_exercises_type (type)
) ENGINE=InnoDB;

CREATE TABLE routines (
    id          VARCHAR(32)  PRIMARY KEY,
    user_id     VARCHAR(32)  NOT NULL,
    created_by  VARCHAR(32)  NOT NULL,
    name        VARCHAR(120) NOT NULL,
    description TEXT         NULL,
    days        JSON         NULL,
    exercises   JSON         NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE planifications (
    id          VARCHAR(32)  PRIMARY KEY,
    athlete_id  VARCHAR(32)  NOT NULL,
    created_by  VARCHAR(32)  NOT NULL,
    name        VARCHAR(120) NOT NULL,
    weeks       INT          NOT NULL DEFAULT 4,
    week_days   JSON         NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (athlete_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE sessions (
    id           VARCHAR(32)  PRIMARY KEY,
    user_id      VARCHAR(32)  NOT NULL,
    routine_id   VARCHAR(32)  NULL,
    routine_name VARCHAR(120) NULL,
    date         DATE         NOT NULL,
    duration     INT          NULL,
    notes        TEXT         NULL,
    intensity    TINYINT      NOT NULL DEFAULT 2,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE SET NULL,
    INDEX idx_sessions_user_date (user_id, date)
) ENGINE=InnoDB;

CREATE TABLE session_logs (
    id          BIGINT       AUTO_INCREMENT PRIMARY KEY,
    athlete_id  VARCHAR(32)  NOT NULL,
    plan_id     VARCHAR(32)  NOT NULL,
    week        INT          NOT NULL,
    day_number  INT          NOT NULL,
    payload     JSON         NULL,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_athlete_plan_week_day (athlete_id, plan_id, week, day_number),
    FOREIGN KEY (athlete_id) REFERENCES users(id)         ON DELETE CASCADE,
    FOREIGN KEY (plan_id)    REFERENCES planifications(id) ON DELETE CASCADE
) ENGINE=InnoDB;
