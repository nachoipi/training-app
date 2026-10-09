// Data layer for `notifications` (unread rows only: reading one deletes it).
// Used by notify.service.js (writes) and notification.controller.js / inbox
// controller (reads). Every query is scoped by user_id so a user can never
// see or delete someone else's notifications.
import { query } from '../config/db.js';

const COLS = `id, type, title, body, data, created_at AS "createdAt"`;

export const NotificationModel = {
    // dedupe_key collapses repeated events (several edits of one plan, a
    // re-saved session) into ONE unread row: the partial unique index turns the
    // second insert into an update that bumps the time and text. A row that is
    // still an unread 'plan_assigned' keeps that type when later edits arrive,
    // so "assigned, then tweaked" still reads as a new plan to the athlete.
    upsert: async ({ userId, type, title, body = null, data = {}, dedupeKey = null }) => {
        const rows = await query(
            `INSERT INTO notifications (user_id, type, title, body, data, dedupe_key)
             VALUES ($1, $2, $3, $4, $5::jsonb, $6)
             ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL
             DO UPDATE SET title = EXCLUDED.title,
                           body = EXCLUDED.body,
                           data = EXCLUDED.data,
                           created_at = now(),
                           type = CASE WHEN notifications.type = 'plan_assigned'
                                       THEN notifications.type ELSE EXCLUDED.type END
             RETURNING ${COLS}`,
            [userId, type, title, body, JSON.stringify(data), dedupeKey]
        );
        return rows[0];
    },

    listForUser: (userId, limit = 50) =>
        query(`SELECT ${COLS} FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`, [userId, limit]),

    count: async (userId) => {
        const rows = await query(`SELECT COUNT(*)::int AS n FROM notifications WHERE user_id = $1`, [userId]);
        return rows[0].n;
    },

    remove: async (id, userId) => {
        const rows = await query(`DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id`, [id, userId]);
        return rows.length > 0;
    },

    removeAll: (userId) => query(`DELETE FROM notifications WHERE user_id = $1`, [userId]),
};
