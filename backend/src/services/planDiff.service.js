// Pure helpers to compare two versions of a plan's `weekDays`
// ([week][day] -> { dayNumber, blocks }). Used by updatePlanification to
//  - keep days the athlete already started (any session_logs row) untouched, so
//    history is never rewritten, and
//  - tell the athlete which future days the coach changed.
const dayOf = (weekDays, week, dayNumber) =>
    (weekDays?.[week - 1] ?? []).find(d => d.dayNumber === dayNumber) ?? null;

// Key-order independent: Postgres JSONB does not keep the order the client sent.
const canon = v => Array.isArray(v) ? v.map(canon)
    : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])]))
    : v;
const same = (a, b) => JSON.stringify(canon(a ?? null)) === JSON.stringify(canon(b ?? null));

// Days (week, dayNumber) whose content differs between two versions, including
// days added or removed. Sorted by week then day.
export function changedDays(prevWeekDays, nextWeekDays) {
    const keys = new Map();
    const collect = wd => (wd ?? []).forEach((days, wi) =>
        (days ?? []).forEach(d => keys.set(`${wi + 1}:${d.dayNumber}`, { week: wi + 1, dayNumber: d.dayNumber })));
    collect(prevWeekDays);
    collect(nextWeekDays);
    return [...keys.values()]
        .filter(({ week, dayNumber }) => !same(dayOf(prevWeekDays, week, dayNumber), dayOf(nextWeekDays, week, dayNumber)))
        .sort((a, b) => a.week - b.week || a.dayNumber - b.dayNumber);
}

// Trained days (those with a log) that the edit would alter, or drop by shrinking the plan.
export function lockedDayViolations(prevWeekDays, nextWeekDays, logs) {
    const trained = new Set(logs.map(l => `${l.week}:${l.dayNumber}`));
    return changedDays(prevWeekDays, nextWeekDays).filter(d => trained.has(`${d.week}:${d.dayNumber}`));
}
