// Request handlers for /api/session-logs: list logs, save the athlete's session,
// and (trainer only) mark a completed session as reviewed with a comment.
// Sits between sessionLog.routes.js and sessionLog.model.js; also raises the
// "session completed" / "session reviewed" notifications (notify.service.js).
// Trainers only see/review logs of their own athletes (users.trainer_id).
import { SessionLogModel } from '../models/sessionLog.model.js';
import { PlanificationModel } from '../models/planification.model.js';
import { UserModel } from '../models/user.model.js';
import { notifySessionCompleted, notifySessionReviewed } from '../services/notify.service.js';

// Flatten a DB row: spread payload fields to the top level so the frontend
// receives a flat object (e.g. sessionLog.exercises, sessionLog.completed).
function flattenLog({ payload, ...rest }) {
    return { ...rest, ...(payload ?? {}) };
}

export const getSessionLogs = async (req, res, next) => {
    try {
        const { athleteId } = req.query;
        const data = await SessionLogModel.findAll({
            athleteId: req.user.userId,
            trainerId: req.user.userId,
            isTrainer: req.user.role === 'trainer',
            filterAthleteId: athleteId,
        });
        res.json({ data: data.map(flattenLog) });
    } catch (err) { next(err); }
};

export const saveSessionLog = async (req, res, next) => {
    try {
        // Separate DB key fields from the session payload so the model can
        // store them correctly in the payload JSONB column.
        const { planId, week, dayNumber, ...payloadFields } = req.body;
        // An athlete can only log against their own plans.
        const plan = planId ? await PlanificationModel.findById(planId) : null;
        if (!plan || plan.athleteId !== req.user.userId) {
            return res.status(404).json({ error: 'Planificación no encontrada' });
        }
        const log = {
            athleteId: req.user.userId,
            planId,
            week,
            dayNumber,
            payload: payloadFields,
        };
        // Read the previous state first: this endpoint is an upsert hit on EVERY
        // athlete save, so we notify only on the not-completed -> completed
        // transition, otherwise each re-save would ping the trainer again.
        const prev = await SessionLogModel.find({ athleteId: log.athleteId, planId, week, dayNumber });
        const saved = await SessionLogModel.upsert(log);
        if (!prev?.payload?.completed && saved.payload?.completed) {
            // Notify only the athlete's own trainer, never every trainer.
            const trainerId = await UserModel.trainerIdOf(req.user.userId);
            if (trainerId) {
                await notifySessionCompleted({
                    trainerId, athleteName: req.user.name ?? 'Un atleta',
                    planName: plan.name, planId, week, dayNumber,
                });
            }
        }
        res.json(flattenLog(saved));
    } catch (err) { next(err); }
};

const MAX_TRAINER_COMMENT = 1000;

// Trainer-only (enforced in the route). Body: { planId, week, dayNumber, comment? }.
// Idempotent: calling it again just updates the comment.
export const reviewSessionLog = async (req, res, next) => {
    try {
        const { planId, week, dayNumber } = req.body;
        const comment = req.body.comment ?? '';
        if (!planId || !Number.isInteger(week) || !Number.isInteger(dayNumber)) {
            return res.status(400).json({ error: 'planId, week y dayNumber son requeridos' });
        }
        if (typeof comment !== 'string' || comment.length > MAX_TRAINER_COMMENT) {
            return res.status(400).json({ error: `El comentario no puede superar ${MAX_TRAINER_COMMENT} caracteres` });
        }
        // Ownership comes from the plan's athlete; anything foreign is a 404.
        const plan = await PlanificationModel.findById(planId);
        if (!plan || !(await UserModel.ownsAthlete(req.user.userId, plan.athleteId))) {
            return res.status(404).json({ error: 'Sesión no encontrada' });
        }
        const prev = await SessionLogModel.find({ athleteId: plan.athleteId, planId, week, dayNumber });
        const saved = await SessionLogModel.review({ athleteId: plan.athleteId, planId, week, dayNumber, comment: comment.trim() });
        if (!saved) return res.status(404).json({ error: 'Sesión no encontrada' });
        // Notify the athlete on the first review, or when the comment text changed;
        // re-submitting an unchanged review stays silent.
        const trimmed = comment.trim();
        if (!prev?.reviewedAt || (prev.trainerComment ?? '') !== trimmed) {
            await notifySessionReviewed({
                athleteId: saved.athleteId, planName: plan.name,
                planId, week, dayNumber, comment: trimmed,
            });
        }
        res.json(flattenLog(saved));
    } catch (err) { next(err); }
};
