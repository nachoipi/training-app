import { uid } from '../services/auth.service.js';
import { query } from '../config/db.js';

const SELECT = `
    SELECT id,
           user_id     AS "userId",
           created_by  AS "createdBy",
           name,
           description AS desc,
           days,
           exercises,
           created_at  AS "createdAt"
      FROM routines`;

export const RoutineModel = {
    findAll: async ({ userId, isTrainer } = {}) => {
        if (isTrainer) return query(`${SELECT} ORDER BY created_at DESC`);
        return query(`${SELECT} WHERE user_id = $1 ORDER BY created_at DESC`, [userId]);
    },

    findById: async (id) => {
        const rows = await query(`${SELECT} WHERE id = $1 LIMIT 1`, [id]);
        return rows[0] || null;
    },

    create: async ({ name, desc, days, exercises, userId, createdBy }) => {
        const rows = await query(
            `INSERT INTO routines (id, user_id, created_by, name, description, days, exercises)
             VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)
             RETURNING id, user_id AS "userId", created_by AS "createdBy",
                       name, description AS desc, days, exercises,
                       created_at AS "createdAt"`,
            [uid(), userId, createdBy, name, desc || '',
             JSON.stringify(days || []), JSON.stringify(exercises || [])]
        );
        return rows[0];
    },

    update: async (id, patch) => {
        const COLS = {
            name:        (v) => v,
            desc:        (v) => v,
            days:        (v) => JSON.stringify(v),
            exercises:   (v) => JSON.stringify(v),
            userId:      (v) => v,
            createdBy:   (v) => v,
        };
        const COLUMN = {
            name: 'name', desc: 'description', days: 'days',
            exercises: 'exercises', userId: 'user_id', createdBy: 'created_by',
        };
        const CAST = { days: '::jsonb', exercises: '::jsonb' };

        const sets = [];
        const params = [];
        for (const [key, transform] of Object.entries(COLS)) {
            if (patch[key] !== undefined) {
                params.push(transform(patch[key]));
                sets.push(`${COLUMN[key]} = $${params.length}${CAST[key] || ''}`);
            }
        }
        if (!sets.length) return RoutineModel.findById(id);

        params.push(id);
        const rows = await query(
            `UPDATE routines SET ${sets.join(', ')}
              WHERE id = $${params.length}
             RETURNING id, user_id AS "userId", created_by AS "createdBy",
                       name, description AS desc, days, exercises,
                       created_at AS "createdAt"`,
            params
        );
        return rows[0] || null;
    },

    remove: async (id) => {
        const rows = await query(`DELETE FROM routines WHERE id = $1 RETURNING id`, [id]);
        return rows.length > 0;
    },

    count: async () => {
        const rows = await query(`SELECT COUNT(*)::int AS count FROM routines`);
        return rows[0].count;
    },
};
