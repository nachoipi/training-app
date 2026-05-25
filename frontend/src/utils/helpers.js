import { DEFAULT_EXERCISES } from './constants.js';

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

export function stateKey(user, key) {
    const userId = user ? user.id : 'guest';
    return `fitcore_${userId}_${key}`;
}

export function loadUserData(user) {
    try {
        const r = localStorage.getItem(stateKey(user, 'routines'));
        const s = localStorage.getItem(stateKey(user, 'sessions'));
        const e = localStorage.getItem(stateKey(user, 'exercises'));
        return {
            routines:  r ? JSON.parse(r) : [],
            sessions:  s ? JSON.parse(s) : [],
            exercises: e ? JSON.parse(e) : DEFAULT_EXERCISES.slice(),
        };
    } catch {
        return { routines: [], sessions: [], exercises: DEFAULT_EXERCISES.slice() };
    }
}

export function saveUserData(user, routines, sessions, exercises) {
    try {
        localStorage.setItem(stateKey(user, 'routines'),  JSON.stringify(routines));
        localStorage.setItem(stateKey(user, 'sessions'),  JSON.stringify(sessions));
        localStorage.setItem(stateKey(user, 'exercises'), JSON.stringify(exercises));
    } catch {}
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
