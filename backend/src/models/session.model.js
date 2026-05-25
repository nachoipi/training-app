import { uid } from '../services/auth.service.js';

let sessions = [];

export const SessionModel = {
    findAll: async ({ userId, isTrainer, from, to, filterUserId } = {}) => {
        let result = isTrainer ? [...sessions] : sessions.filter(s => s.userId === userId);
        if (from) result = result.filter(s => s.date >= from);
        if (to)   result = result.filter(s => s.date <= to);
        if (filterUserId && isTrainer) result = result.filter(s => s.userId === filterUserId);
        result.sort((a, b) => b.date.localeCompare(a.date));
        return result;
    },
    findById: async (id) => sessions.find(s => s.id === id) || null,
    create: async ({ date, routineId, routineName, duration, notes, intensity, userId }) => {
        const session = {
            id: uid(),
            date,
            routineId: routineId || null,
            routineName: routineName || 'Sesión libre',
            duration: duration ? parseInt(duration) : null,
            notes: notes || '',
            intensity: intensity || 2,
            userId,
            createdAt: new Date().toISOString(),
        };
        sessions.push(session);
        return session;
    },
    remove: async (id) => {
        const idx = sessions.findIndex(s => s.id === id);
        if (idx === -1) return false;
        sessions.splice(idx, 1);
        return true;
    },
    allForUser: async (userId, isTrainer) =>
        isTrainer ? [...sessions] : sessions.filter(s => s.userId === userId),
};
