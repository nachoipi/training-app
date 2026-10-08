// Data layer for `session_logs` (one row per athlete + plan + week + day).
// Used by sessionLog.controller.js. The athlete's execution state lives in the
// `payload` JSONB column; the trainer's review state (reviewed_at,
// trainer_comment) lives in its own columns so athlete saves can't erase it.
import { query } from '../config/db.js';

const SELECT = `
    SELECT id,
           athlete_id AS "athleteId",
           plan_id    AS "planId",
           week,
           day_number AS "dayNumber",
           payload,
           reviewed_at     AS "reviewedAt",
           trainer_comment AS "trainerComment",
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

    // ON CONFLICT only sets `payload`: review columns are deliberately left
    // untouched so re-saving a session never un-reviews it or drops the comment.
    upsert: async (log) => {
        const { athleteId, planId, week, dayNumber, payload } = log;
        const rows = await query(
            `INSERT INTO session_logs (athlete_id, plan_id, week, day_number, payload)
             VALUES ($1, $2, $3, $4, $5::jsonb)
             ON CONFLICT (athlete_id, plan_id, week, day_number)
             DO UPDATE SET payload = EXCLUDED.payload
             RETURNING id, athlete_id AS "athleteId", plan_id AS "planId",
                       week, day_number AS "dayNumber", payload,
                       reviewed_at AS "reviewedAt", trainer_comment AS "trainerComment",
                       updated_at AS "updatedAt"`,
            [athleteId, planId, week, dayNumber, JSON.stringify(payload ?? {})]
        );
        return rows[0];
    },

    // Marks a log as reviewed and stores the trainer's comment. Addressed by the
    // table's natural key (plan + week + day) because the id the frontend sees is
    // the payload's own uid, not this row's BIGSERIAL id. COALESCE keeps the
    // first review time when the trainer later edits the comment.
    review: async ({ planId, week, dayNumber, comment }) => {
        const rows = await query(
            `UPDATE session_logs
                SET reviewed_at = COALESCE(reviewed_at, now()),
                    trainer_comment = $4
              WHERE plan_id = $1 AND week = $2 AND day_number = $3
             RETURNING id, athlete_id AS "athleteId", plan_id AS "planId",
                       week, day_number AS "dayNumber", payload,
                       reviewed_at AS "reviewedAt", trainer_comment AS "trainerComment",
                       updated_at AS "updatedAt"`,
            [planId, week, dayNumber, comment]
        );
        return rows[0] || null;
    },
};
