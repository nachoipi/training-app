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
