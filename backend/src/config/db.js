import pg from 'pg';
import { DATABASE_URL, PGSSL } from './env.js';

// Return Postgres DATE (OID 1082) as a 'YYYY-MM-DD' string instead of a JS Date,
// so string-based date comparisons in the app layer keep working.
pg.types.setTypeParser(1082, (val) => val);

export const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: PGSSL ? { rejectUnauthorized: false } : false,
});

// Thin helper: run a parameterized query and get the rows back.
export async function query(text, params) {
    const res = await pool.query(text, params);
    return res.rows;
}
