import { SessionModel } from '../models/session.model.js';
import { RoutineModel } from '../models/routine.model.js';

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
        const routine = routineId ? await RoutineModel.findById(routineId) : null;
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
        if (req.user.role !== 'trainer' && existing.userId !== req.user.userId) {
            return res.status(403).json({ error: 'Sin permiso' });
        }
        await SessionModel.remove(req.params.id);
        res.json({ message: 'Eliminada' });
    } catch (err) { next(err); }
};
