// Centralised environment loader. Reads backend/.env via dotenv and exposes
// typed, validated constants to the rest of the backend. Failing fast here
// (e.g. missing JWT_SECRET) is intentional — it surfaces config errors at boot
// instead of letting requests die later with confusing messages.
import 'dotenv/config';

export const PORT = parseInt(process.env.PORT || '3000', 10);

// Postgres connection string. Works unchanged against Supabase and GCP Cloud SQL.
// Supabase:  postgresql://postgres:[PWD]@db.[REF].supabase.co:5432/postgres
// Cloud SQL: postgresql://[USER]:[PWD]@[HOST]:5432/[DB]
export const DATABASE_URL = process.env.DATABASE_URL || '';

// Enable TLS for managed Postgres (Supabase requires it). Set PGSSL=false for local.
export const PGSSL = (process.env.PGSSL || 'true').toLowerCase() !== 'false';

// HS256 signing secret. Required — refuse to boot without it so we never run
// with an empty/insecure key. Generate with `openssl rand -hex 32`.
export const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is required. Set it in backend/.env');
}

// Token lifetime, expressed as any string jsonwebtoken accepts ('7d', '12h',
// '30m', ...). Defaulted to 7 days to preserve the previous behaviour.
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Supabase Storage — optional. When all three are set the backend can accept
// athlete exercise-video uploads and proxy them to the bucket. When any are
// missing, the upload endpoint responds 503 so the UI can degrade gracefully
// instead of crashing the whole server at boot.
export const SUPABASE_URL              = process.env.SUPABASE_URL || '';
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
export const SUPABASE_VIDEO_BUCKET     = process.env.SUPABASE_VIDEO_BUCKET || 'exercise-videos';
