import { RoutineModel } from '../models/routine.model.js';

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
        const routine = await RoutineModel.create({
            name,
            desc,
            days,
            exercises,
            userId: forUserId || req.user.userId,
            createdBy: req.user.userId,
        });
        res.status(201).json(routine);
    } catch (err) { next(err); }
};

export const updateRoutine = async (req, res, next) => {
    try {
        const existing = await RoutineModel.findById(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Rutina no encontrada' });
        if (req.user.role !== 'trainer' && existing.userId !== req.user.userId) {
            return res.status(403).json({ error: 'Sin permiso para editar esta rutina' });
        }
        const updated = await RoutineModel.update(req.params.id, req.body);
        res.json(updated);
    } catch (err) { next(err); }
};

export const deleteRoutine = async (req, res, next) => {
    try {
        const existing = await RoutineModel.findById(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Rutina no encontrada' });
        if (req.user.role !== 'trainer' && existing.userId !== req.user.userId) {
            return res.status(403).json({ error: 'Sin permiso' });
        }
        await RoutineModel.remove(req.params.id);
        res.json({ message: 'Eliminada' });
    } catch (err) { next(err); }
};
