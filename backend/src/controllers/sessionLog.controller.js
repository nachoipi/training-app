// Request handlers for /api/session-logs: list logs, save the athlete's session,
// and (trainer only) mark a completed session as reviewed with a comment.
// Sits between sessionLog.routes.js and sessionLog.model.js.
import { SessionLogModel } from '../models/sessionLog.model.js';

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
        const log = {
            athleteId: req.user.userId,
            planId,
            week,
            dayNumber,
            payload: payloadFields,
        };
        const saved = await SessionLogModel.upsert(log);
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
        const saved = await SessionLogModel.review({ planId, week, dayNumber, comment: comment.trim() });
        if (!saved) return res.status(404).json({ error: 'Sesión no encontrada' });
        res.json(flattenLog(saved));
    } catch (err) { next(err); }
};
