let sessionLogs = [];

export const SessionLogModel = {
    findAll: async ({ athleteId, isTrainer, filterAthleteId } = {}) => {
        if (isTrainer) return filterAthleteId ? sessionLogs.filter(l => l.athleteId === filterAthleteId) : sessionLogs;
        return sessionLogs.filter(l => l.athleteId === athleteId);
    },
    upsert: async (log) => {
        const idx = sessionLogs.findIndex(
            l => l.athleteId === log.athleteId &&
                 l.planId === log.planId &&
                 l.week === log.week &&
                 l.dayNumber === log.dayNumber
        );
        if (idx >= 0) sessionLogs[idx] = log;
        else sessionLogs.push(log);
        return log;
    },
};
