export function uid() {
    return '_' + Math.random().toString(36).slice(2, 10);
}

export function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function getDayMonth(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    return {
        day:   d.getDate(),
        month: d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', ''),
    };
}

export function getCurrentUser() {
    try {
        const raw = localStorage.getItem('fitcore_user');
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

const MEDIDA_UNIT = { Distancia: 'MTS.', Tiempo: '"', Peso: 'KG' };

export function formatCarga(ex) {
    const raw = ex?.carga;
    const num = Number(raw);
    if (raw === '' || raw === null || raw === undefined || num === 0 || Number.isNaN(num)) {
        return '—';
    }
    const unit = MEDIDA_UNIT[ex.medida];
    return unit ? `${raw} ${unit}` : String(raw);
}

// Plan previews list an exercise once when the trainer entered it twice for
// the two sides of a unilateral movement. Two entries of a block collapse
// into the first one only when they are the same exercise with identical
// series, reps, measure and load, and (for completed sessions) the athlete
// rated both with the same RPE. Anything that differs stays visible.
export function collapseUnilateral(exercises, log) {
    const rpeOf = ex => log?.exerciseSummaries?.find(s => s.position === ex.position)?.rpe || '';
    const seen = new Set();
    return exercises.filter(ex => {
        const id = ex.exerciseId || ex.exerciseName;
        if (!id) return true;
        const key = JSON.stringify([id, ex.series, ex.reps, ex.medida, ex.carga, rpeOf(ex)]);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export function calcStreak(sessions) {
    if (!sessions.length) return 0;
    const dates = [...new Set(sessions.map(s => s.date))].sort().reverse();
    let streak = 0;
    let prev = new Date();
    prev.setHours(12, 0, 0, 0);
    for (const d of dates) {
        const cur  = new Date(d + 'T12:00:00');
        const diff = Math.round((prev - cur) / 86400000);
        if (diff <= 1) { streak++; prev = cur; } else break;
    }
    return streak;
}
