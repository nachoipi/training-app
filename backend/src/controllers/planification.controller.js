// Request handlers for /api/planifications: list (role-scoped), create, update,
// publish, delete. New plans are drafts (invisible to the athlete); publishing
// notifies the athlete (notify.service.js), and later edits of a published plan
// notify again, collapsed to one unread entry per plan. Trainers only reach plans of their own athletes
// (users.trainer_id); a foreign id answers 404 so ids cannot be probed.
import { PlanificationModel } from '../models/planification.model.js';
import { UserModel } from '../models/user.model.js';
import { notifyPlanChange } from '../services/notify.service.js';
import { SessionLogModel } from '../models/sessionLog.model.js';
import { changedDays, lockedDayViolations } from '../services/planDiff.service.js';
import { enrichPlanifications } from '../services/planification.enrich.service.js';

export const getPlanifications = async (req, res, next) => {
    try {
        const data = await PlanificationModel.findAll({
            athleteId: req.user.userId,
            trainerId: req.user.userId,
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
        if (!(await UserModel.ownsAthlete(req.user.userId, athleteId))) {
            return res.status(404).json({ error: 'Alumno no encontrado' });
        }
        const plan = await PlanificationModel.create({
            athleteId, name, weeks, weekDays,
            createdBy: req.user.userId,
        });
        // Created as a draft: the athlete is notified when the plan is published.
        res.status(201).json(plan);
    } catch (err) { next(err); }
};

export const updatePlanification = async (req, res, next) => {
    try {
        const existing = await PlanificationModel.findById(req.params.id);
        if (!existing || !(await UserModel.ownsAthlete(req.user.userId, existing.athleteId))) {
            return res.status(404).json({ error: 'Planificación no encontrada' });
        }
        // Mass-assignment guard: authorship never changes, and moving a plan to
        // another athlete is only allowed between the trainer's own athletes.
        // `status` only changes through the publish endpoint.
        const { createdBy: _ignored, status: _status, ...patch } = req.body;
        if (patch.athleteId !== undefined && !(await UserModel.ownsAthlete(req.user.userId, patch.athleteId))) {
            return res.status(404).json({ error: 'Alumno no encontrado' });
        }
        // Published plans: days the athlete already started (any log) are frozen so history is
        // never rewritten; only future days can change.
        if (existing.status === 'published' && patch.weekDays !== undefined) {
            const logs = await SessionLogModel.listByPlan(existing.id);
            const bad = lockedDayViolations(existing.weekDays, patch.weekDays, logs);
            if (bad.length) {
                const list = bad.map(d => `Semana ${d.week}, Día ${d.dayNumber}`).join('; ');
                return res.status(409).json({ error: `No se pueden modificar sesiones que el alumno ya empezó: ${list}` });
            }
        }
        const updated = await PlanificationModel.update(req.params.id, patch);
        if (!updated) return res.status(404).json({ error: 'Planificación no encontrada' });
        // Drafts are invisible to the athlete, so only published plans notify.
        // Repeated edits collapse into the same unread notification (dedupe key).
        // Only when something the athlete trains changed (or the plan was renamed): no-op saves stay silent.
        if (updated.status === 'published') {
            const days = changedDays(existing.weekDays, updated.weekDays);
            if (days.length || existing.name !== updated.name) {
                await notifyPlanChange({ athleteId: updated.athleteId, planId: updated.id, planName: updated.name, created: false, changedDays: days });
            }
        }
        res.json(updated);
    } catch (err) { next(err); }
};

export const publishPlanification = async (req, res, next) => {
    try {
        const existing = await PlanificationModel.findById(req.params.id);
        if (!existing || !(await UserModel.ownsAthlete(req.user.userId, existing.athleteId))) {
            return res.status(404).json({ error: 'Planificación no encontrada' });
        }
        // Idempotent: publishing an already published plan changes nothing and stays silent.
        if (existing.status === 'published') return res.json(existing);
        const published = await PlanificationModel.publish(req.params.id);
        if (!published) return res.status(404).json({ error: 'Planificación no encontrada' });
        await notifyPlanChange({ athleteId: published.athleteId, planId: published.id, planName: published.name, created: true });
        res.json(published);
    } catch (err) { next(err); }
};

// Trainer-only archive toggle ({ archived: boolean }); silent for the athlete (no notification).
export const archivePlanification = async (req, res, next) => {
    try {
        const existing = await PlanificationModel.findById(req.params.id);
        if (!existing || !(await UserModel.ownsAthlete(req.user.userId, existing.athleteId))) {
            return res.status(404).json({ error: 'Planificación no encontrada' });
        }
        if (typeof req.body?.archived !== 'boolean') return res.status(400).json({ error: 'archived debe ser true o false' });
        const plan = await PlanificationModel.setArchived(req.params.id, req.body.archived);
        if (!plan) return res.status(404).json({ error: 'Planificación no encontrada' });
        res.json(plan);
    } catch (err) { next(err); }
};

export const deletePlanification = async (req, res, next) => {
    try {
        const existing = await PlanificationModel.findById(req.params.id);
        if (!existing || !(await UserModel.ownsAthlete(req.user.userId, existing.athleteId))) {
            return res.status(404).json({ error: 'Planificación no encontrada' });
        }
        const ok = await PlanificationModel.remove(req.params.id);
        if (!ok) return res.status(404).json({ error: 'Planificación no encontrada' });
        res.json({ message: 'Eliminada' });
    } catch (err) { next(err); }
};
