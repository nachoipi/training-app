import { uid } from '../services/auth.service.js';
import { query } from '../config/db.js';

export const ExerciseModel = {
    findAll: async ({ muscle, type, q } = {}) => {
        const where = [];
        const params = [];
        if (muscle) { params.push(muscle); where.push(`muscle = $${params.length}`); }
        if (type)   { params.push(type);   where.push(`type = $${params.length}`); }
        if (q)      { params.push(`%${q}%`); where.push(`name ILIKE $${params.length}`); }

        const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
        return query(
            `SELECT id, name, muscle, type, description AS desc,
                    built_in AS "builtIn", created_at AS "createdAt"
               FROM exercises
               ${clause}
              ORDER BY name`,
            params
        );
    },

    create: async ({ name, muscle, type, desc }) => {
        const rows = await query(
            `INSERT INTO exercises (id, name, muscle, type, description, built_in)
             VALUES ($1, $2, $3, $4, $5, false)
             RETURNING id, name, muscle, type, description AS desc,
                       built_in AS "builtIn", created_at AS "createdAt"`,
            [uid(), name, muscle, type, desc || '']
        );
        return rows[0];
    },

    remove: async (id) => {
        const rows = await query(`DELETE FROM exercises WHERE id = $1 RETURNING id`, [id]);
        return rows.length > 0;
    },
};
