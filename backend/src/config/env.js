import 'dotenv/config';

export const PORT = parseInt(process.env.PORT || '3000', 10);

// Postgres connection string. Works unchanged against Supabase and GCP Cloud SQL.
// Supabase:  postgresql://postgres:[PWD]@db.[REF].supabase.co:5432/postgres
// Cloud SQL: postgresql://[USER]:[PWD]@[HOST]:5432/[DB]
export const DATABASE_URL = process.env.DATABASE_URL || '';

// Enable TLS for managed Postgres (Supabase requires it). Set PGSSL=false for local.
export const PGSSL = (process.env.PGSSL || 'true').toLowerCase() !== 'false';

export const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
