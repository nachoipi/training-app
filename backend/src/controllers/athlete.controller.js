// Trainer-side athlete management (all routes are trainer-only, see
// athlete.routes.js): list my athletes, link an existing athlete by email, and
// create / list / revoke invitation links for athletes without a profile.
import { UserModel } from '../models/user.model.js';
import { InviteModel } from '../models/invite.model.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const getAthletes = async (req, res, next) => {
    try {
        const data = await UserModel.findAthletes(req.user.userId);
        res.json({ data, total: data.length });
    } catch (err) { next(err); }
};

// POST /api/athletes/link { email }. One generic failure message on purpose:
// "unknown email", "not an athlete" and "already has a trainer" must be
// indistinguishable, otherwise this endpoint enumerates registered users.
export const linkAthlete = async (req, res, next) => {
    try {
        const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
        if (!email || !EMAIL_RE.test(email)) {
            return res.status(400).json({ error: 'Ingresá un email válido.' });
        }
        const athlete = await UserModel.linkAthleteByEmail(req.user.userId, email);
        if (!athlete) {
            return res.status(404).json({ error: 'No existe un alumno con ese email o ya tiene entrenador.' });
        }
        res.status(201).json({ athlete });
    } catch (err) { next(err); }
};

// POST /api/athletes/invites { name?, email? } -> { invite, link }. The raw
// token only exists in this response; afterwards only its hash is in the DB.
export const createInvite = async (req, res, next) => {
    try {
        const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 120) : '';
        const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
        if (email && (email.length > 255 || !EMAIL_RE.test(email))) {
            return res.status(400).json({ error: 'Email inválido.' });
        }
        const { token, ...invite } = await InviteModel.create({ trainerId: req.user.userId, name, email });
        // Prefer the browser's Origin (Vite in dev, the real host in prod) so the
        // link points at the page the athlete must open, not at the API port.
        const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
        res.status(201).json({ invite, link: `${origin}/invite/${token}` });
    } catch (err) { next(err); }
};

export const listInvites = async (req, res, next) => {
    try {
        res.json({ data: await InviteModel.listPending(req.user.userId) });
    } catch (err) { next(err); }
};

export const revokeInvite = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || !(await InviteModel.revoke(req.user.userId, id))) {
            return res.status(404).json({ error: 'Invitación no encontrada.' });
        }
        res.json({ message: 'Invitación revocada.' });
    } catch (err) { next(err); }
};
