// Data layer for `athlete_invites`: single-use signup links a trainer gives to
// an athlete who has no profile yet. Only the sha256 of the random token is
// stored (a DB leak never exposes usable links). Used by athlete.controller.js
// (create / list / revoke) and auth.controller.js (lookup / consume).
import crypto from 'crypto';
import { query } from '../config/db.js';

const INVITE_TTL_DAYS = 7;

export const hashToken = (token) =>
    crypto.createHash('sha256').update(String(token)).digest('hex');

export const InviteModel = {
    // Returns the row plus the RAW token, which is shown to the trainer once.
    create: async ({ trainerId, email, name }) => {
        const token = crypto.randomBytes(32).toString('base64url');
        const rows = await query(
            `INSERT INTO athlete_invites (trainer_id, token_hash, email, name, expires_at)
             VALUES ($1, $2, $3, $4, now() + ($5 || ' days')::interval)
             RETURNING id, email, name, created_at AS "createdAt", expires_at AS "expiresAt"`,
            [trainerId, hashToken(token), email || null, name || null, String(INVITE_TTL_DAYS)]
        );
        return { ...rows[0], token };
    },

    // Pending = not used and not expired. Revoked invites are deleted.
    listPending: (trainerId) => query(
        `SELECT id, email, name, created_at AS "createdAt", expires_at AS "expiresAt"
           FROM athlete_invites
          WHERE trainer_id = $1 AND used_at IS NULL AND expires_at > now()
          ORDER BY created_at DESC`, [trainerId]),

    // Only the owning trainer can revoke, and only while still unused.
    revoke: async (trainerId, id) => {
        const rows = await query(
            `DELETE FROM athlete_invites WHERE id = $1 AND trainer_id = $2 AND used_at IS NULL RETURNING id`,
            [id, trainerId]);
        return rows.length > 0;
    },

    // Valid = exists, unused, unexpired. Joins the trainer's name for the signup page.
    findValid: async (token) => {
        const rows = await query(
            `SELECT i.id, i.trainer_id AS "trainerId", i.email, i.name, u.name AS "trainerName"
               FROM athlete_invites i JOIN users u ON u.id = i.trainer_id
              WHERE i.token_hash = $1 AND i.used_at IS NULL AND i.expires_at > now()
              LIMIT 1`, [hashToken(token)]);
        return rows[0] || null;
    },

    // Inside a transaction: atomically claims the invite (the WHERE makes a
    // second concurrent use fail). Returns the invite row or null.
    claim: async (client, token) => {
        const res = await client.query(
            `UPDATE athlete_invites SET used_at = now()
              WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
              RETURNING id, trainer_id AS "trainerId", email`, [hashToken(token)]);
        return res.rows[0] || null;
    },

    markUsedBy: (client, id, userId) =>
        client.query(`UPDATE athlete_invites SET used_by = $2 WHERE id = $1`, [id, userId]),
};
