import { uid } from '../services/auth.service.js';
import { query } from '../config/db.js';

const SELECT = `
    SELECT id,
           user_id      AS "userId",
           routine_id   AS "routineId",
           routine_name AS "routineName",
           date,
           duration,
           notes,
           intensity,
           created_at   AS "createdAt"
      FROM sessions`;

// A trainer's session scope: their own plus those of their athletes ($1 = trainer id).
const TRAINER_SCOPE = `(user_id = $1 OR user_id IN (SELECT id FROM users WHERE trainer_id = $1))`;

export const SessionModel = {
    findAll: async ({ userId, isTrainer, from, to, filterUserId } = {}) => {
        const where = [];
        const params = [];
        params.push(userId);
        if (!isTrainer) where.push(`user_id = $1`);
        else where.push(`${TRAINER_SCOPE}`);
        if (isTrainer && filterUserId) { params.push(filterUserId); where.push(`user_id = $${params.length}`); }
        if (from) { params.push(from); where.push(`date >= $${params.length}`); }
        if (to)   { params.push(to);   where.push(`date <= $${params.length}`); }

        const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
        return query(`${SELECT} ${clause} ORDER BY date DESC`, params);
    },

    findById: async (id) => {
        const rows = await query(`${SELECT} WHERE id = $1 LIMIT 1`, [id]);
        return rows[0] || null;
    },

    create: async ({ date, routineId, routineName, duration, notes, intensity, userId }) => {
        const rows = await query(
            `INSERT INTO sessions
                 (id, user_id, routine_id, routine_name, date, duration, notes, intensity)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, user_id AS "userId", routine_id AS "routineId",
                       routine_name AS "routineName", date, duration, notes,
                       intensity, created_at AS "createdAt"`,
            [
                uid(),
                userId,
                routineId || null,
                routineName || 'Sesión libre',
                date,
                duration ? parseInt(duration) : null,
                notes || '',
                intensity || 2,
            ]
        );
        return rows[0];
    },

    remove: async (id) => {
        const rows = await query(`DELETE FROM sessions WHERE id = $1 RETURNING id`, [id]);
        return rows.length > 0;
    },

    allForUser: async (userId, isTrainer) => {
        if (isTrainer) return query(`${SELECT} WHERE ${TRAINER_SCOPE} ORDER BY date DESC`, [userId]);
        return query(`${SELECT} WHERE user_id = $1 ORDER BY date DESC`, [userId]);
    },
};
