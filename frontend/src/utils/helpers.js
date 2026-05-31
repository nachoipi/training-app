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
