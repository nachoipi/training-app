import { EXERCISE_KINDS_HIDDEN_IN_PLAN } from './constants.js';
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
    // Tiempo loads are entered as m:ss and shown as typed; older plain numbers are seconds.
    if (ex?.medida === 'Tiempo' && typeof raw === 'string' && raw.includes(':')) return raw;
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

// Exercises of a block that plan previews (athlete Mi Plan / home, coach "Sesiones del plan")
// show: hidden kinds (warm-up) are dropped, and so is a rest that follows a hidden exercise
// (that rest belongs to the warm-up). The session screen itself still shows everything.
export function visibleInPlan(exercises) {
    let lastHidden = false;
    return exercises.filter(ex => {
        if (ex.isRest) return !lastHidden;
        lastHidden = EXERCISE_KINDS_HIDDEN_IN_PLAN.includes(ex.kind);
        return !lastHidden;
    });
}

// What a rest row shows as its length: its Carga (Medida Tiempo -> m:ss), or the legacy
// `duration` text of rests created before rests had Medida / Carga.
export function restLabel(ex) {
    const raw = ex?.carga;
    return raw !== '' && raw != null ? formatCarga(ex) : (ex?.duration || '');
}

// Tiempo load in words ("40 Segundos", "2 Minutos", "1 Minuto 30 Segundos") for athlete-facing
// previews. Accepts m:ss or plain seconds; anything else falls back to formatCarga.
export function formatTiempoLargo(ex) {
    const raw = String(ex?.carga ?? '').trim();
    let total = null;
    if (/^\d+:\d{1,2}$/.test(raw)) { const [m, sec] = raw.split(':').map(Number); total = m * 60 + sec; }
    else if (/^\d+$/.test(raw)) total = Number(raw);
    if (ex?.medida !== 'Tiempo' || total === null || total === 0) return formatCarga(ex);
    const m = Math.floor(total / 60), sec = total % 60;
    const parts = [];
    if (m) parts.push(`${m} ${m === 1 ? 'Minuto' : 'Minutos'}`);
    if (sec) parts.push(`${sec} ${sec === 1 ? 'Segundo' : 'Segundos'}`);
    return parts.join(' ');
}

// Block labels A..Z, then AA, AB… — a day has no block limit.
export function blockLabelAt(i) {
    let n = i, label = '';
    do { label = String.fromCharCode(65 + (n % 26)) + label; n = Math.floor(n / 26) - 1; } while (n >= 0);
    return label;
}

// Display titles for a day's blocks, in order: a block made only of warm-up exercises (and
// their rests) is "Calentamiento"; the others are "Bloque A", "Bloque B"… counted among
// themselves, so the first non-warm-up block is always "Bloque A". Pass the blocks as they are
// shown (views that hide warm-ups pass them already filtered). Only a display name: the plan's
// own `label` / exercise positions (B1…) are untouched.
export function blockTitles(blocks) {
    let n = 0;
    return blocks.map(b => {
        const training = (b.exercises || []).filter(e => !e.isRest);
        return training.length > 0 && training.every(e => e.kind === 'warmup') ? 'Calentamiento' : `Bloque ${blockLabelAt(n++)}`;
    });
}

// "m:ss" (or plain seconds) -> seconds, or null when it is not a time. Used by the live
// training timers (timed exercises and rests).
export function timeToSeconds(raw) {
    const t = String(raw ?? '').trim();
    if (/^\d+:\d{1,2}$/.test(t)) { const [m, s] = t.split(':').map(Number); return m * 60 + s; }
    if (/^\d+$/.test(t) && Number(t) > 0) return Number(t);
    return null;
}

// seconds -> "m:ss"
export function secondsToClock(total) {
    const t = Math.max(0, total);
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

// ── Prescribed vs actual, per serie (trainer's session detail) ────────────────────────────────
// Both columns use the same shape `[{ reps, carga }]` and the same formatter so they read alike.
// `ex.reps` may be one value ("8") or one per serie ("10,8,6"); carga is a single prescribed value.
export function prescribedSeries(ex) {
    const n = Math.max(1, Number(ex?.series) || 1);
    const repsArr = ex?.reps ? String(ex.reps).split(',').map(r => r.trim()) : [];
    return Array.from({ length: n }, (_, i) => ({
        reps: repsArr[i] ?? repsArr[0] ?? '',
        carga: ex?.carga ?? '',
    }));
}

// "8 × 20 kg" · "8" when there is no load · "—" when nothing was entered.
export function formatSerie(serie, ex) {
    const hasReps = serie.reps !== '' && serie.reps != null;
    const load = formatCarga({ ...ex, carga: serie.carga });
    if (!hasReps && load === '—') return '—';
    const reps = hasReps ? String(serie.reps) : '—';
    return load === '—' ? reps : `${reps} × ${load}`;
}

// ── Coach feedback that follows an exercise through the plan ──────────────────────────────────
// Latest per-exercise coach comment for `ex` from sessions of the SAME plan that come before
// (week, dayNumber): matched by exerciseId (name as fallback), at any position. A newer comment
// replaces an older one; only from sessions marked as reviewed; being plan-scoped, it ends with the plan. Returns { comment, week, dayNumber } | null.
export function carriedExerciseFeedback(planId, sessionLogs, week, dayNumber, ex) {
    if (!ex || ex.isRest) return null;
    const sameEx = fb => (ex.exerciseId && fb.exerciseId)
        ? fb.exerciseId === ex.exerciseId
        : (fb.name || '').trim().toLowerCase() === (ex.exerciseName || '').trim().toLowerCase();
    let best = null;
    for (const log of sessionLogs || []) {
        // Only sessions the coach marked as reviewed release their per-exercise comments.
        if (log.planId !== planId || !log.reviewedAt) continue;
        if (log.week > week || (log.week === week && log.dayNumber >= dayNumber)) continue;
        for (const fb of Object.values(log.exerciseFeedback || {})) {
            if (!fb.comment || !sameEx(fb)) continue;
            const newer = !best || log.week > best.week || (log.week === best.week && log.dayNumber > best.dayNumber);
            if (newer) best = { comment: fb.comment, week: log.week, dayNumber: log.dayNumber };
        }
    }
    return best;
}

// Progress of a plan: `total` sessions (weeks × days) and how many have a completed log.
// A plan is "completed" (archived on the coach side) when it is published and every session is done.
export function planProgress(plan, sessionLogs) {
    let total = 0;
    for (let w = 0; w < (plan.weeks || 0); w++) total += (plan.weekDays?.[w] ?? plan.days ?? []).length;
    const done = (sessionLogs || []).filter(l => l.planId === plan.id && l.completed).length;
    return { total, done: Math.min(done, total) };
}

export function isPlanCompleted(plan, sessionLogs) {
    const { total, done } = planProgress(plan, sessionLogs);
    return plan.status !== 'draft' && total > 0 && done >= total;
}

// Athlete side: a plan is archived once every session is done AND the coach reviewed all of them.
export function isPlanArchivedForAthlete(plan, sessionLogs) {
    if (!isPlanCompleted(plan, sessionLogs)) return false;
    return (sessionLogs || []).filter(l => l.planId === plan.id && l.completed).every(l => !!l.reviewedAt);
}
