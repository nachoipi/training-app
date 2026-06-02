// User data layer. Queries the `users` table for the auth, athletes, and
// profile flows. All write paths go through here so the controllers stay free
// of raw SQL.
import { query } from '../config/db.js';

export const UserModel = {
    findAll: async () => {
        return query(
            `SELECT id, email, role, name, avatar, created_at AS "createdAt"
               FROM users
              ORDER BY name`
        );
    },

    // Includes password_hash for the login flow (bcrypt compare in the controller).
    findByEmail: async (email) => {
        const rows = await query(
            `SELECT id, email, password_hash, role, name, avatar
               FROM users
              WHERE LOWER(email) = LOWER($1)
              LIMIT 1`,
            [String(email).trim()]
        );
        return rows[0] || null;
    },

    findById: async (id) => {
        const rows = await query(
            `SELECT id, email, role, name, avatar, created_at AS "createdAt"
               FROM users
              WHERE id = $1
              LIMIT 1`,
            [id]
        );
        return rows[0] || null;
    },

    // Used by the profile-update controller to return a clean 409 instead of
    // letting the UNIQUE constraint surface as a raw PG 23505 error. The
    // excludeId arg lets the caller skip the user's own row when validating
    // an unchanged email.
    existsEmail: async (email, excludeId) => {
        const rows = await query(
            `SELECT 1
               FROM users
              WHERE LOWER(email) = LOWER($1)
                AND id <> $2
              LIMIT 1`,
            [String(email).trim(), excludeId]
        );
        return rows.length > 0;
    },

    // Updates the three user-editable profile fields and returns the canonical
    // row so the controller can echo it back (and re-issue the JWT with fresh
    // claims). Never touches password_hash or role — those have separate flows.
    updateProfile: async (id, { name, email, avatar }) => {
        const rows = await query(
            `UPDATE users
                SET name   = $2,
                    email  = $3,
                    avatar = $4
              WHERE id = $1
              RETURNING id, email, role, name, avatar`,
            [id, name, email, avatar]
        );
        return rows[0] || null;
    },

    findAthletes: async () => {
        return query(
            `SELECT u.id,
                    u.name,
                    u.email,
                    u.avatar,
                    COUNT(DISTINCT s.id)            AS sessions,
                    COUNT(DISTINCT r.id)            AS routines,
                    TO_CHAR(MAX(s.date), 'YYYY-MM-DD') AS "lastSession"
               FROM users u
               LEFT JOIN sessions s ON s.user_id = u.id
               LEFT JOIN routines r ON r.user_id = u.id
              WHERE u.role = 'athlete'
              GROUP BY u.id, u.name, u.email, u.avatar
              ORDER BY u.name`
        ).then((rows) =>
            rows.map((r) => ({
                ...r,
                sessions: Number(r.sessions),
                routines: Number(r.routines),
            }))
        );
    },
};
