// Exercise catalog model. Tables: `exercises` (see database/schema.sql).
// Columns map to camelCase JS properties at the SQL boundary via `AS "..."`
// aliases so controllers/services never deal with snake_case names.
import { uid } from '../services/auth.service.js';
import { query } from '../config/db.js';

const SELECT_COLS = `
    id, name, second_name AS "secondName", type, equipment,
    primary_muscles   AS "primaryMuscles",
    secondary_muscles AS "secondaryMuscles",
    icon_url        AS "iconUrl",
    video_url       AS "videoUrl",
    model_image_url AS "modelImageUrl",
    description     AS "desc",
    built_in        AS "builtIn",
    created_at      AS "createdAt"
`;

export const ExerciseModel = {
    // findAll supports filtering by a single muscle (matched against either
    // primary_muscles or secondary_muscles via `@>`), by type, and by a name
    // ILIKE substring. GIN indexes on the muscle arrays keep array filtering
    // cheap as the catalog grows.
    findAll: async ({ muscle, type, q } = {}) => {
        const where = [];
        const params = [];
        if (muscle) {
            params.push(muscle);
            where.push(`(primary_muscles @> ARRAY[$${params.length}]::text[] OR secondary_muscles @> ARRAY[$${params.length}]::text[])`);
        }
        if (type)   { params.push(type);   where.push(`type = $${params.length}`); }
        if (q)      { params.push(`%${q}%`); where.push(`name ILIKE $${params.length}`); }

        const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
        return query(
            `SELECT ${SELECT_COLS}
               FROM exercises
               ${clause}
              ORDER BY name`,
            params
        );
    },

    // create accepts the trainer-facing shape (camelCase). primaryMuscles is
    // required (UI enforces ≥1); secondaryMuscles defaults to []. equipment
    // and secondName are optional. Returned row uses the same alias map as
    // findAll so the API surface stays consistent.
    create: async ({ name, secondName, type, equipment, primaryMuscles, secondaryMuscles, iconUrl, videoUrl, modelImageUrl, desc }) => {
        const rows = await query(
            `INSERT INTO exercises
                (id, name, second_name, type, equipment, primary_muscles, secondary_muscles, icon_url, video_url, model_image_url, description, built_in)
             VALUES ($1, $2, $3, $4, $5, $6::text[], $7::text[], $8, $9, $10, $11, false)
             RETURNING ${SELECT_COLS}`,
            [
                uid(),
                name,
                secondName || null,
                type,
                equipment || null,
                primaryMuscles || [],
                secondaryMuscles || [],
                iconUrl || null,
                videoUrl || null,
                modelImageUrl || null,
                desc || '',
            ]
        );
        return rows[0];
    },

    // Full replace of the editable fields on an existing exercise. id is
    // taken from the URL, never the body, so renaming an exercise can't
    // collide with another row's id. Returns null when the row is missing.
    update: async (id, { name, secondName, type, equipment, primaryMuscles, secondaryMuscles, iconUrl, videoUrl, modelImageUrl, desc }) => {
        const rows = await query(
            `UPDATE exercises
                SET name = $2,
                    second_name = $3,
                    type = $4,
                    equipment = $5,
                    primary_muscles = $6::text[],
                    secondary_muscles = $7::text[],
                    icon_url = $8,
                    video_url = $9,
                    model_image_url = $10,
                    description = $11
              WHERE id = $1
              RETURNING ${SELECT_COLS}`,
            [
                id,
                name,
                secondName || null,
                type,
                equipment || null,
                primaryMuscles || [],
                secondaryMuscles || [],
                iconUrl || null,
                videoUrl || null,
                modelImageUrl || null,
                desc || '',
            ]
        );
        return rows[0] || null;
    },

    remove: async (id) => {
        const rows = await query(`DELETE FROM exercises WHERE id = $1 RETURNING id`, [id]);
        return rows.length > 0;
    },
};
