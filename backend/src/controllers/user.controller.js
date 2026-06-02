// User-self controller. Owns PATCH /api/users/me — updates the authenticated
// user's own profile fields (name, email, avatar). Password changes and
// session issuance live in auth.controller.js; this file deliberately re-uses
// createToken so an email/name/avatar update produces a fresh JWT with
// up-to-date claims (Option 2 in the plan).
import { UserModel } from '../models/user.model.js';
import { createToken } from '../services/auth.service.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// PATCH /api/users/me — update name/email/avatar for the caller. We pull only
// the three editable fields from the body (never role/password/id) as a
// mass-assignment guard, validate them locally, then pre-check email
// uniqueness so we can return a clean 409 instead of a raw Postgres error.
// On success we re-issue the JWT so the embedded claims (name/email/avatar
// read elsewhere as req.user.*) stay in sync with the DB without forcing a
// re-login.
export const updateMe = async (req, res, next) => {
    try {
        const body = req.body || {};
        const name   = typeof body.name   === 'string' ? body.name.trim()   : '';
        const email  = typeof body.email  === 'string' ? body.email.trim()  : '';
        const avatar = typeof body.avatar === 'string' ? body.avatar.trim() : '';

        if (!name || name.length > 120) {
            return res.status(400).json({ error: 'El nombre es requerido (máx 120 caracteres).' });
        }
        if (!email || email.length > 255 || !EMAIL_RE.test(email)) {
            return res.status(400).json({ error: 'Email inválido.' });
        }
        if (avatar.length > 8) {
            return res.status(400).json({ error: 'Avatar inválido (máx 8 caracteres).' });
        }

        if (await UserModel.existsEmail(email, req.user.userId)) {
            return res.status(409).json({ error: 'Ese email ya está en uso.' });
        }

        const updated = await UserModel.updateProfile(req.user.userId, { name, email, avatar });
        if (!updated) return res.status(404).json({ error: 'Usuario no encontrado.' });

        // Re-issue the token so subsequent requests see the new name/email/avatar
        // in req.user (the middleware reads them straight from the decoded JWT).
        const token = createToken(updated);

        res.json({ user: updated, token });
    } catch (err) { next(err); }
};
