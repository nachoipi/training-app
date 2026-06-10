-- Enable Row-Level Security on every public table.
--
-- The backend connects as the `postgres` superuser via DATABASE_URL, which
-- bypasses RLS — so the app keeps working unchanged. The goal is to block
-- Supabase's auto-exposed PostgREST endpoint (reachable with the public anon
-- key) from reading or writing these tables. Without any policies attached,
-- non-superuser roles get a default deny.

ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises      ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines       ENABLE ROW LEVEL SECURITY;
ALTER TABLE planifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_logs   ENABLE ROW LEVEL SECURITY;
