import { uid } from '../services/auth.service.js';

let routines = [];

export const RoutineModel = {
    findAll: async ({ userId, isTrainer } = {}) => {
        return isTrainer ? [...routines] : routines.filter(r => r.userId === userId);
    },
    findById: async (id) => routines.find(r => r.id === id) || null,
    create: async ({ name, desc, days, exercises, userId, createdBy }) => {
        const routine = {
            id: uid(),
            name,
            desc: desc || '',
            days: days || [],
            exercises: exercises || [],
            userId,
            createdBy,
            createdAt: new Date().toISOString(),
        };
        routines.push(routine);
        return routine;
    },
    update: async (id, patch) => {
        const idx = routines.findIndex(r => r.id === id);
        if (idx === -1) return null;
        routines[idx] = { ...routines[idx], ...patch, id };
        return routines[idx];
    },
    remove: async (id) => {
        const idx = routines.findIndex(r => r.id === id);
        if (idx === -1) return false;
        routines.splice(idx, 1);
        return true;
    },
    count: async () => routines.length,
};
