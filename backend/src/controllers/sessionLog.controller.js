import { SessionLogModel } from '../models/sessionLog.model.js';

export const getSessionLogs = async (req, res, next) => {
    try {
        const { athleteId } = req.query;
        const data = await SessionLogModel.findAll({
            athleteId: req.user.userId,
            isTrainer: req.user.role === 'trainer',
            filterAthleteId: athleteId,
        });
        res.json({ data });
    } catch (err) { next(err); }
};

export const saveSessionLog = async (req, res, next) => {
    try {
        const log = { ...req.body, athleteId: req.user.userId };
        const saved = await SessionLogModel.upsert(log);
        res.json(saved);
    } catch (err) { next(err); }
};
