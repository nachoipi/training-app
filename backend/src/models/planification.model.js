import { uid } from '../services/auth.service.js';

let planifications = [];

export const PlanificationModel = {
    findAll: async ({ athleteId, isTrainer } = {}) =>
        isTrainer ? [...planifications] : planifications.filter(p => p.athleteId === athleteId),
    findById: async (id) => planifications.find(p => p.id === id) || null,
    create: async ({ athleteId, name, weeks, weekDays, createdBy }) => {
        const plan = {
            id: uid(),
            athleteId,
            name,
            weeks: weeks ?? 4,
            weekDays: weekDays ?? [],
            createdBy,
            createdAt: new Date().toISOString(),
        };
        planifications.push(plan);
        return plan;
    },
    update: async (id, patch) => {
        const idx = planifications.findIndex(p => p.id === id);
        if (idx === -1) return null;
        planifications[idx] = { ...planifications[idx], ...patch, id };
        return planifications[idx];
    },
    remove: async (id) => {
        const idx = planifications.findIndex(p => p.id === id);
        if (idx === -1) return false;
        planifications.splice(idx, 1);
        return true;
    },
};
