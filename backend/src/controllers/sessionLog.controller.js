// Request handlers for /api/session-logs: list logs, save the athlete's session,
// discard an in-progress session (athlete), and (trainer only) mark a completed session as
// reviewed with a comment.
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

// The coach's per-exercise comments are drafts until the session is marked as reviewed, so the
// athlete never receives them before that.
function forAthlete(log) {
    return log.reviewedAt ? log : { ...log, exerciseFeedback: {} };
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
        const logs = data.map(flattenLog);
        res.json({ data: req.user.role === 'trainer' ? logs : logs.map(forAthlete) });
    } catch (err) { next(err); }
};

export const saveSessionLog = async (req, res, next) => {
    try {
        // Separate DB key fields from the session payload so the model can
        // store them correctly in the payload JSONB column.
        const { planId, week, dayNumber, ...payloadFields } = req.body;
        // An athlete can only log against their own plans.
        const plan = planId ? await PlanificationModel.findById(planId) : null;
        if (!plan || plan.athleteId !== req.user.userId || plan.status !== 'published') {
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
        res.json(forAthlete(flattenLog(saved)));
    } catch (err) { next(err); }
};

// Athlete only (enforced in the route). Query: planId, week, dayNumber. Discards a session that
// is still in progress; a completed session cannot be deleted from here (409). Idempotent for a
// session that was never saved.
export const discardSessionLog = async (req, res, next) => {
    try {
        const { planId } = req.query;
        const week = Number(req.query.week);
        const dayNumber = Number(req.query.dayNumber);
        if (!planId || !Number.isInteger(week) || !Number.isInteger(dayNumber)) {
            return res.status(400).json({ error: 'planId, week y dayNumber son requeridos' });
        }
        const plan = await PlanificationModel.findById(planId);
        if (!plan || plan.athleteId !== req.user.userId) {
            return res.status(404).json({ error: 'Planificación no encontrada' });
        }
        const existing = await SessionLogModel.find({ athleteId: req.user.userId, planId, week, dayNumber });
        if (existing?.payload?.completed) {
            return res.status(409).json({ error: 'No se puede descartar una sesión completada' });
        }
        if (existing) await SessionLogModel.removeInProgress({ athleteId: req.user.userId, planId, week, dayNumber });
        res.json({ ok: true });
    } catch (err) { next(err); }
};

const MAX_TRAINER_COMMENT = 1000;

// Trainer-only (enforced in the route). Body: { planId, week, dayNumber, comment? }.
// Idempotent: calling it again just updates the comment.
export const reviewSessionLog = async (req, res, next) => {
    try {
        const { planId, week, dayNumber, exerciseFeedback } = req.body;
        if (!planId || !Number.isInteger(week) || !Number.isInteger(dayNumber)) {
            return res.status(400).json({ error: 'planId, week y dayNumber son requeridos' });
        }
        // `comment` omitted = keep the stored general comment (a per-exercise save must not wipe it).
        const commentGiven = req.body.comment !== undefined;
        const comment = req.body.comment ?? '';
        if (typeof comment !== 'string' || comment.length > MAX_TRAINER_COMMENT) {
            return res.status(400).json({ error: `El comentario no puede superar ${MAX_TRAINER_COMMENT} caracteres` });
        }
        if (exerciseFeedback !== undefined && !Array.isArray(exerciseFeedback)) {
            return res.status(400).json({ error: 'exerciseFeedback debe ser una lista' });
        }
        // Ownership comes from the plan's athlete; anything foreign is a 404.
        const plan = await PlanificationModel.findById(planId);
        if (!plan || !(await UserModel.ownsAthlete(req.user.userId, plan.athleteId))) {
            return res.status(404).json({ error: 'Sesión no encontrada' });
        }
        const prev = await SessionLogModel.find({ athleteId: plan.athleteId, planId, week, dayNumber });
        if (!prev) return res.status(404).json({ error: 'Sesión no encontrada' });

        // Merge the per-exercise comments into the stored map. A position must exist in the plan's
        // day; exerciseId/name are copied from it so the comment can follow the exercise later.
        let mergedFeedback;
        let feedbackChanged = false;
        if (exerciseFeedback?.length) {
            const days = plan.weekDays?.[week - 1] ?? plan.days ?? [];
            const day = days.find(d => d.dayNumber === dayNumber);
            const planExercises = (day?.blocks ?? []).flatMap(b => b.exercises ?? []).filter(e => !e.isRest);
            mergedFeedback = { ...(prev.exerciseFeedback ?? {}) };
            for (const item of exerciseFeedback) {
                const text = typeof item?.comment === 'string' ? item.comment.trim() : null;
                if (!item?.position || text === null || text.length > MAX_TRAINER_COMMENT) {
                    return res.status(400).json({ error: `Cada feedback requiere position y un comentario de hasta ${MAX_TRAINER_COMMENT} caracteres` });
                }
                const ex = planExercises.find(e => e.position === item.position);
                if (!ex) return res.status(400).json({ error: `El ejercicio ${item.position} no existe en este día` });
                if ((mergedFeedback[item.position]?.comment ?? '') === text) continue;
                feedbackChanged = true;
                if (text === '') delete mergedFeedback[item.position];
                else mergedFeedback[item.position] = {
                    comment: text,
                    exerciseId: ex.exerciseId ?? null,
                    name: ex.exerciseName ?? '',
                    updatedAt: new Date().toISOString(),
                };
            }
        }

        const trimmed = commentGiven ? comment.trim() : (prev.trainerComment ?? '');
        const saved = await SessionLogModel.review({
            athleteId: plan.athleteId, planId, week, dayNumber,
            comment: trimmed, exerciseFeedback: feedbackChanged ? mergedFeedback : undefined,
            // Only the "Marcar como revisada" action (which sends `comment`) marks the session reviewed;
            // saving a per-exercise comment alone leaves it pending.
            markReviewed: commentGiven,
        });
        if (!saved) return res.status(404).json({ error: 'Sesión no encontrada' });
        // Notify the athlete when the session is marked reviewed (first time or the general comment
        // changed), or when a comment of an already-reviewed session changes. Per-exercise drafts on
        // a pending session stay silent.
        const commentChanged = (prev.trainerComment ?? '') !== trimmed;
        if ((commentGiven && (!prev.reviewedAt || commentChanged)) || (prev.reviewedAt && feedbackChanged)) {
            const firstExercise = Object.values(saved.exerciseFeedback ?? {})
                .sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1))[0]?.comment;
            await notifySessionReviewed({
                athleteId: saved.athleteId, planName: plan.name,
                planId, week, dayNumber, comment: trimmed || firstExercise || '',
            });
        }
        res.json(flattenLog(saved));
    } catch (err) { next(err); }
};
