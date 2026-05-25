import { SessionModel } from '../models/session.model.js';
import { RoutineModel } from '../models/routine.model.js';

export const getStats = async (req, res, next) => {
    try {
        const days = parseInt(req.query.days || '30', 10);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = cutoff.toISOString().slice(0, 10);

        const mySessions = await SessionModel.allForUser(req.user.userId, req.user.role === 'trainer');
        const recent = mySessions.filter(s => s.date >= cutoffStr);
        const totalMinutes = recent.reduce((s, se) => s + (se.duration || 0), 0);
        const totalRoutines = await RoutineModel.count();

        res.json({
            totalSessions: mySessions.length,
            recentSessions: recent.length,
            totalRoutines,
            totalMinutes,
            avgPerWeek: ((recent.length / days) * 7).toFixed(1),
        });
    } catch (err) { next(err); }
};
