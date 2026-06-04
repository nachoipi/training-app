// Exercise catalog HTTP layer. Routes mounted at /api/exercises by
// routes/exercise.routes.js. GET is public; POST/DELETE require a trainer
// role (enforced at the route level).
import { ExerciseModel } from '../models/exercise.model.js';

export const getExercises = async (req, res, next) => {
    try {
        const { muscle, type, q } = req.query;
        const data = await ExerciseModel.findAll({ muscle, type, q });
        res.json({ data, total: data.length });
    } catch (err) { next(err); }
};

// Validates the minimum required shape before delegating to the model.
// primaryMuscles must be a non-empty array — the muscle filter UI relies on
// every exercise having at least one primary tag.
export const createExercise = async (req, res, next) => {
    try {
        const {
            name, secondName, type, equipment,
            primaryMuscles, secondaryMuscles,
            iconUrl, videoUrl, modelImageUrl, desc,
        } = req.body;

        if (!name || !type) {
            return res.status(400).json({ error: 'name y type son requeridos' });
        }
        if (!Array.isArray(primaryMuscles) || primaryMuscles.length === 0) {
            return res.status(400).json({ error: 'primaryMuscles debe tener al menos un valor' });
        }

        const ex = await ExerciseModel.create({
            name,
            secondName,
            type,
            equipment,
            primaryMuscles,
            secondaryMuscles: Array.isArray(secondaryMuscles) ? secondaryMuscles : [],
            iconUrl,
            videoUrl,
            modelImageUrl,
            desc,
        });
        res.status(201).json(ex);
    } catch (err) { next(err); }
};

// Same validation as createExercise. URL :id wins over any body.id so the
// row can't be renamed onto a different primary key by mistake.
export const updateExercise = async (req, res, next) => {
    try {
        const {
            name, secondName, type, equipment,
            primaryMuscles, secondaryMuscles,
            iconUrl, videoUrl, modelImageUrl, desc,
        } = req.body;

        if (!name || !type) {
            return res.status(400).json({ error: 'name y type son requeridos' });
        }
        if (!Array.isArray(primaryMuscles) || primaryMuscles.length === 0) {
            return res.status(400).json({ error: 'primaryMuscles debe tener al menos un valor' });
        }

        const ex = await ExerciseModel.update(req.params.id, {
            name,
            secondName,
            type,
            equipment,
            primaryMuscles,
            secondaryMuscles: Array.isArray(secondaryMuscles) ? secondaryMuscles : [],
            iconUrl,
            videoUrl,
            modelImageUrl,
            desc,
        });
        if (!ex) return res.status(404).json({ error: 'Ejercicio no encontrado' });
        res.json(ex);
    } catch (err) { next(err); }
};

export const deleteExercise = async (req, res, next) => {
    try {
        const ok = await ExerciseModel.remove(req.params.id);
        if (!ok) return res.status(404).json({ error: 'Ejercicio no encontrado' });
        res.json({ message: 'Eliminado' });
    } catch (err) { next(err); }
};
