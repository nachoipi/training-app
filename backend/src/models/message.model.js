// Data layer for `messages` (1-to-1 trainer/athlete chat) and for the pairing
// rule that decides who may talk to whom. Used by chat.controller.js and the
// inbox summary.
//
// Pairing rule: an athlete's trainer is the `created_by` of their MOST RECENT
// planification; a trainer's athletes are those whose latest plan they created.
// There is deliberately no fallback to "any trainer", so the demo trainer and
// the test trainer never see each other's athletes.
import { query } from '../config/db.js';

// One row per athlete with the trainer who owns their latest plan.
const LATEST_TRAINER = `
    SELECT DISTINCT ON (athlete_id) athlete_id, created_by AS trainer_id
      FROM planifications
     ORDER BY athlete_id, created_at DESC`;

const MSG_COLS = `id, sender_id AS "senderId", recipient_id AS "recipientId",
                  body, created_at AS "createdAt", read_at AS "readAt"`;

export const MessageModel = {
    // Trainer id paired with this athlete, or null when they have no plan yet.
    trainerOfAthlete: async (athleteId) => {
        const rows = await query(
            `SELECT created_by AS "trainerId" FROM planifications
              WHERE athlete_id = $1 ORDER BY created_at DESC LIMIT 1`, [athleteId]);
        return rows[0]?.trainerId ?? null;
    },

    // Single authorisation check used before reading/writing a thread.
    arePaired: async (trainerId, athleteId) =>
        (await MessageModel.trainerOfAthlete(athleteId)) === trainerId,

    // Trainer's chat list: every athlete they own, with last message + unread
    // count; conversations with activity first, then the rest alphabetically.
    conversationsForTrainer: (trainerId) => query(
        `SELECT u.id, u.name, u.avatar,
                lm.body AS "lastBody", lm.created_at AS "lastAt", lm.sender_id AS "lastSenderId",
                COALESCE(un.n, 0)::int AS unread
           FROM (${LATEST_TRAINER}) lt
           JOIN users u ON u.id = lt.athlete_id
           LEFT JOIN LATERAL (
                SELECT body, created_at, sender_id FROM messages m
                 WHERE (m.sender_id = u.id AND m.recipient_id = $1)
                    OR (m.sender_id = $1 AND m.recipient_id = u.id)
                 ORDER BY m.id DESC LIMIT 1) lm ON true
           LEFT JOIN LATERAL (
                SELECT COUNT(*) AS n FROM messages m
                 WHERE m.sender_id = u.id AND m.recipient_id = $1 AND m.read_at IS NULL) un ON true
          WHERE lt.trainer_id = $1
          ORDER BY lm.created_at DESC NULLS LAST, u.name`, [trainerId]),

    // Messages between two users, oldest first. `afterId` makes polling cheap.
    thread: (a, b, afterId = 0) => query(
        `SELECT ${MSG_COLS} FROM messages
          WHERE id > $3
            AND ((sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id = $1))
          ORDER BY id ASC LIMIT 500`, [a, b, afterId]),

    insert: async ({ senderId, recipientId, body }) => {
        const rows = await query(
            `INSERT INTO messages (sender_id, recipient_id, body) VALUES ($1, $2, $3) RETURNING ${MSG_COLS}`,
            [senderId, recipientId, body]);
        return rows[0];
    },

    // Marks what `fromId` sent to `userId` as read (never the other direction).
    markRead: (userId, fromId) => query(
        `UPDATE messages SET read_at = now()
          WHERE recipient_id = $1 AND sender_id = $2 AND read_at IS NULL`, [userId, fromId]),

    unreadTotal: async (userId) => {
        const rows = await query(
            `SELECT COUNT(*)::int AS n FROM messages WHERE recipient_id = $1 AND read_at IS NULL`, [userId]);
        return rows[0].n;
    },
};
