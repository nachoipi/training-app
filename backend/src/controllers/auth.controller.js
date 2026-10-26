// Auth handlers: login, session info/logout and the public invite flow
// (invite lookup + athlete self-registration through a trainer's invite link).
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/user.model.js';
import { InviteModel } from '../models/invite.model.js';
import { transaction } from '../config/db.js';
import { createToken, uid } from '../services/auth.service.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVALID_INVITE = 'La invitación no es válida o ya venció.';

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos.' });
        }
        const user = await UserModel.findByEmail(email);
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: 'Credenciales incorrectas. Verificá tus datos.' });
        }
        const token = createToken(user);
        res.json({
            token,
            user: {
                id:     user.id,
                name:   user.name,
                email:  user.email,
                role:   user.role,
                avatar: user.avatar,
            },
        });
    } catch (err) { next(err); }
};

export const me = async (req, res) => {
    res.json({ user: req.user });
};

export const logout = async (req, res) => {
    res.json({ message: 'Sesión cerrada correctamente.' });
};

// GET /api/auth/invite/:token (public) - lets the signup page validate the link
// and show who invited the athlete. Same 404 for unknown / used / expired /
// revoked so a token's state can't be probed.
export const getInvite = async (req, res, next) => {
    try {
        const invite = await InviteModel.findValid(req.params.token);
        if (!invite) return res.status(404).json({ error: INVALID_INVITE });
        res.json({ trainerName: invite.trainerName, name: invite.name, email: invite.email });
    } catch (err) { next(err); }
};

// POST /api/auth/register-athlete { token, name, email, password } (public).
// Claims the invite, creates the athlete already linked to the inviting trainer
// and returns a session like login. One transaction: if anything fails (e.g.
// the email is taken) the invite is NOT consumed.
export const registerAthlete = async (req, res, next) => {
    try {
        const { token, password } = req.body || {};
        const name  = typeof req.body?.name  === 'string' ? req.body.name.trim()  : '';
        const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
        if (typeof token !== 'string' || !token) return res.status(400).json({ error: INVALID_INVITE });
        if (!name || name.length > 120) {
            return res.status(400).json({ error: 'El nombre es requerido (máx 120 caracteres).' });
        }
        if (!email || email.length > 255 || !EMAIL_RE.test(email)) {
            return res.status(400).json({ error: 'Email inválido.' });
        }
        if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
            return res.status(400).json({ error: 'La contraseña debe tener entre 8 y 72 caracteres.' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const result = await transaction(async (client) => {
            const invite = await InviteModel.claim(client, token);
            if (!invite) return { error: [400, INVALID_INVITE] };
            // An invite created for a specific email can only be used with it.
            if (invite.email && invite.email.toLowerCase() !== email.toLowerCase()) {
                throw Object.assign(new Error('email-mismatch'), { rollback: [400, 'Esta invitación es para otro email.'] });
            }
            const dup = await client.query(`SELECT 1 FROM users WHERE LOWER(email) = LOWER($1)`, [email]);
            if (dup.rowCount) throw Object.assign(new Error('dup'), { rollback: [409, 'Ese email ya está en uso.'] });
            const id = uid();
            const created = await client.query(
                `INSERT INTO users (id, email, password_hash, role, name, avatar, trainer_id)
                 VALUES ($1, $2, $3, 'athlete', $4, $5, $6)
                 RETURNING id, email, role, name, avatar`,
                [id, email, passwordHash, name, name[0].toUpperCase(), invite.trainerId]);
            await InviteModel.markUsedBy(client, invite.id, id);
            return { user: created.rows[0] };
        }).catch((err) => {
            if (err.rollback) return { error: err.rollback };
            if (err.code === '23505') return { error: [409, 'Ese email ya está en uso.'] };
            throw err;
        });

        if (result.error) return res.status(result.error[0]).json({ error: result.error[1] });
        res.status(201).json({ token: createToken(result.user), user: result.user });
    } catch (err) { next(err); }
};
