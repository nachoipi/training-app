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

// Runs `fn(client)` inside BEGIN/COMMIT on a single pooled connection and rolls
// back if it throws. `client.query` returns the raw pg result (use `.rows`).
export async function transaction(fn) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const out = await fn(client);
        await client.query('COMMIT');
        return out;
    } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
    } finally {
        client.release();
    }
}
