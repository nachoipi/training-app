// Routine handlers. A trainer reaches their own routines and those of their
// athletes (users.trainer_id); anything else answers 404. Athletes: own only.
import { RoutineModel } from '../models/routine.model.js';
import { UserModel } from '../models/user.model.js';

// Can the caller touch a routine owned by `ownerId`?
async function canAccess(user, ownerId) {
    if (user.role !== 'trainer') return ownerId === user.userId;
    return ownerId === user.userId || UserModel.ownsAthlete(user.userId, ownerId);
}

export const getRoutines = async (req, res, next) => {
    try {
        const data = await RoutineModel.findAll({
            userId: req.user.userId,
            isTrainer: req.user.role === 'trainer',
        });
        res.json({ data, total: data.length });
    } catch (err) { next(err); }
};

export const createRoutine = async (req, res, next) => {
    try {
        const { name, desc, days, exercises, forUserId } = req.body;
        if (!name) return res.status(400).json({ error: 'name es requerido' });
        const ownerId = forUserId || req.user.userId;
        if (!(await canAccess(req.user, ownerId))) {
            return res.status(404).json({ error: 'Alumno no encontrado' });
        }
        const routine = await RoutineModel.create({
            name,
            desc,
            days,
            exercises,
            userId: ownerId,
            createdBy: req.user.userId,
        });
        res.status(201).json(routine);
    } catch (err) { next(err); }
};

export const updateRoutine = async (req, res, next) => {
    try {
        const existing = await RoutineModel.findById(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Rutina no encontrada' });
        if (!(await canAccess(req.user, existing.userId))) {
            return res.status(404).json({ error: 'Rutina no encontrada' });
        }
        // Authorship is immutable; re-assigning is limited to people the caller may access.
        const { createdBy: _ignored, ...patch } = req.body;
        if (patch.userId !== undefined && !(await canAccess(req.user, patch.userId))) {
            return res.status(404).json({ error: 'Alumno no encontrado' });
        }
        const updated = await RoutineModel.update(req.params.id, patch);
        res.json(updated);
    } catch (err) { next(err); }
};

export const deleteRoutine = async (req, res, next) => {
    try {
        const existing = await RoutineModel.findById(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Rutina no encontrada' });
        if (!(await canAccess(req.user, existing.userId))) {
            return res.status(404).json({ error: 'Rutina no encontrada' });
        }
        await RoutineModel.remove(req.params.id);
        res.json({ message: 'Eliminada' });
    } catch (err) { next(err); }
};
