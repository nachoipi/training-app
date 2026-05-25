import { ExerciseModel } from '../models/exercise.model.js';

export const getExercises = async (req, res, next) => {
    try {
        const { muscle, type, q } = req.query;
        const data = await ExerciseModel.findAll({ muscle, type, q });
        res.json({ data, total: data.length });
    } catch (err) { next(err); }
};

export const createExercise = async (req, res, next) => {
    try {
        const { name, muscle, type, desc } = req.body;
        if (!name || !muscle || !type) {
            return res.status(400).json({ error: 'name, muscle, type son requeridos' });
        }
        const ex = await ExerciseModel.create({ name, muscle, type, desc });
        res.status(201).json(ex);
    } catch (err) { next(err); }
};

export const deleteExercise = async (req, res, next) => {
    try {
        const ok = await ExerciseModel.remove(req.params.id);
        if (!ok) return res.status(404).json({ error: 'Ejercicio no encontrado' });
        res.json({ message: 'Eliminado' });
    } catch (err) { next(err); }
};
