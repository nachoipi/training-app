import { uid } from '../services/auth.service.js';
import { query } from '../config/db.js';

const SELECT = `
    SELECT id,
           athlete_id AS "athleteId",
           created_by AS "createdBy",
           name,
           weeks,
           week_days  AS "weekDays",
           created_at AS "createdAt"
      FROM planifications`;

export const PlanificationModel = {
    findAll: async ({ athleteId, isTrainer } = {}) => {
        if (isTrainer) return query(`${SELECT} ORDER BY created_at DESC`);
        return query(`${SELECT} WHERE athlete_id = $1 ORDER BY created_at DESC`, [athleteId]);
    },

    findById: async (id) => {
        const rows = await query(`${SELECT} WHERE id = $1 LIMIT 1`, [id]);
        return rows[0] || null;
    },

    create: async ({ athleteId, name, weeks, weekDays, createdBy }) => {
        const rows = await query(
            `INSERT INTO planifications (id, athlete_id, created_by, name, weeks, week_days)
             VALUES ($1, $2, $3, $4, $5, $6::jsonb)
             RETURNING id, athlete_id AS "athleteId", created_by AS "createdBy",
                       name, weeks, week_days AS "weekDays", created_at AS "createdAt"`,
            [uid(), athleteId, createdBy, name, weeks ?? 4, JSON.stringify(weekDays ?? [])]
        );
        return rows[0];
    },

    update: async (id, patch) => {
        const COLUMN = {
            athleteId: 'athlete_id', createdBy: 'created_by',
            name: 'name', weeks: 'weeks', weekDays: 'week_days',
        };
        const sets = [];
        const params = [];
        for (const [key, col] of Object.entries(COLUMN)) {
            if (patch[key] !== undefined) {
                const isJson = key === 'weekDays';
                params.push(isJson ? JSON.stringify(patch[key]) : patch[key]);
                sets.push(`${col} = $${params.length}${isJson ? '::jsonb' : ''}`);
            }
        }
        if (!sets.length) return PlanificationModel.findById(id);

        params.push(id);
        const rows = await query(
            `UPDATE planifications SET ${sets.join(', ')}
              WHERE id = $${params.length}
             RETURNING id, athlete_id AS "athleteId", created_by AS "createdBy",
                       name, weeks, week_days AS "weekDays", created_at AS "createdAt"`,
            params
        );
        return rows[0] || null;
    },

    remove: async (id) => {
        const rows = await query(`DELETE FROM planifications WHERE id = $1 RETURNING id`, [id]);
        return rows.length > 0;
    },
};
