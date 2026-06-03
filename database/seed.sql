-- FitCore — seed data (PostgreSQL)
-- Apply with: psql "$DATABASE_URL" -f database/seed.sql
--
-- Seeds TEST USERS ONLY. Real trainer/athlete accounts are created through the app
-- (signup or PATCH /api/users/me). Real exercises are loaded from a CSV/XLS file
-- via the importer in database/migrations/exercises/ (see its README).
--
-- NOTE: password_hash is a bcrypt hash of the placeholder password '123456'.
--       Regenerate per-user before any real deployment.

INSERT INTO users (id, email, password_hash, role, name, avatar) VALUES
    ('test_trainer1', 'test_trainer@fitcore.com', '$2a$10$QvQSeNXOD0th7J6D8dHOIOXN.uK.Yh3XVTvrDPKW/Trgj9eVU7NfO', 'trainer', 'Test Trainer', 'T'),
    ('test_athlete1', 'test_athlete@fitcore.com', '$2a$10$QvQSeNXOD0th7J6D8dHOIOXN.uK.Yh3XVTvrDPKW/Trgj9eVU7NfO', 'athlete', 'Test Athlete', 'T')
ON CONFLICT (id) DO NOTHING;
