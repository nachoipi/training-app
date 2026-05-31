import { query } from '../config/db.js';

const SELECT = `
    SELECT id,
           athlete_id AS "athleteId",
           plan_id    AS "planId",
           week,
           day_number AS "dayNumber",
           payload,
           updated_at AS "updatedAt"
      FROM session_logs`;

export const SessionLogModel = {
    findAll: async ({ athleteId, isTrainer, filterAthleteId } = {}) => {
        if (isTrainer) {
            if (filterAthleteId) {
                return query(`${SELECT} WHERE athlete_id = $1 ORDER BY updated_at DESC`, [filterAthleteId]);
            }
            return query(`${SELECT} ORDER BY updated_at DESC`);
        }
        return query(`${SELECT} WHERE athlete_id = $1 ORDER BY updated_at DESC`, [athleteId]);
    },

    upsert: async (log) => {
        const { athleteId, planId, week, dayNumber, payload } = log;
        const rows = await query(
            `INSERT INTO session_logs (athlete_id, plan_id, week, day_number, payload)
             VALUES ($1, $2, $3, $4, $5::jsonb)
             ON CONFLICT (athlete_id, plan_id, week, day_number)
             DO UPDATE SET payload = EXCLUDED.payload
             RETURNING id, athlete_id AS "athleteId", plan_id AS "planId",
                       week, day_number AS "dayNumber", payload,
                       updated_at AS "updatedAt"`,
            [athleteId, planId, week, dayNumber, JSON.stringify(payload ?? {})]
        );
        return rows[0];
    },
};
