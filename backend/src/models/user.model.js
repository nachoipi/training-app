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
