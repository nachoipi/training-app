import { PlanificationModel } from '../models/planification.model.js';
import { enrichPlanifications } from '../services/planification.enrich.service.js';

export const getPlanifications = async (req, res, next) => {
    try {
        const data = await PlanificationModel.findAll({
            athleteId: req.user.userId,
            isTrainer: req.user.role === 'trainer',
        });
        // Backfill empty media fields from the catalog at read time so coaches
        // updating a catalog entry (new YouTube URL, icon, etc.) see it
        // reflected immediately on every planification row referencing it.
        await enrichPlanifications(data);
        res.json({ data, total: data.length });
    } catch (err) { next(err); }
};

export const createPlanification = async (req, res, next) => {
    try {
        const { athleteId, name, weeks, weekDays } = req.body;
        if (!athleteId || !name) return res.status(400).json({ error: 'athleteId y name son requeridos' });
        const plan = await PlanificationModel.create({
            athleteId, name, weeks, weekDays,
            createdBy: req.user.userId,
        });
        res.status(201).json(plan);
    } catch (err) { next(err); }
};

export const updatePlanification = async (req, res, next) => {
    try {
        const updated = await PlanificationModel.update(req.params.id, req.body);
        if (!updated) return res.status(404).json({ error: 'Planificación no encontrada' });
        res.json(updated);
    } catch (err) { next(err); }
};

export const deletePlanification = async (req, res, next) => {
    try {
        const ok = await PlanificationModel.remove(req.params.id);
        if (!ok) return res.status(404).json({ error: 'Planificación no encontrada' });
        res.json({ message: 'Eliminada' });
    } catch (err) { next(err); }
};
