// Session handlers. A trainer sees/deletes sessions of themselves and of their
// own athletes (users.trainer_id); anything else answers 404.
import { SessionModel } from '../models/session.model.js';
import { RoutineModel } from '../models/routine.model.js';
import { UserModel } from '../models/user.model.js';

export const getSessions = async (req, res, next) => {
    try {
        const { from, to, userId } = req.query;
        const data = await SessionModel.findAll({
            userId: req.user.userId,
            isTrainer: req.user.role === 'trainer',
            from, to, filterUserId: userId,
        });
        res.json({ data, total: data.length });
    } catch (err) { next(err); }
};

export const createSession = async (req, res, next) => {
    try {
        const { date, routineId, duration, notes, intensity } = req.body;
        if (!date) return res.status(400).json({ error: 'date es requerido' });
        const found = routineId ? await RoutineModel.findById(routineId) : null;
        // Only the caller's own routine may name the session (no id probing).
        const routine = found && found.userId === req.user.userId ? found : null;
        const session = await SessionModel.create({
            date,
            routineId,
            routineName: routine ? routine.name : 'Sesión libre',
            duration, notes, intensity,
            userId: req.user.userId,
        });
        res.status(201).json(session);
    } catch (err) { next(err); }
};

export const deleteSession = async (req, res, next) => {
    try {
        const existing = await SessionModel.findById(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Sesión no encontrada' });
        const allowed = existing.userId === req.user.userId ||
            (req.user.role === 'trainer' && await UserModel.ownsAthlete(req.user.userId, existing.userId));
        if (!allowed) return res.status(404).json({ error: 'Sesión no encontrada' });
        await SessionModel.remove(req.params.id);
        res.json({ message: 'Eliminada' });
    } catch (err) { next(err); }
};
