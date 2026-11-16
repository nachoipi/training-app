// Spreadsheet view of one plan (trainer side, "Sesiones del plan"): one row per exercise slot,
// one column per week, grouped by day. A row is a position + exercise (A1 Chin-up): when the
// trainer swaps the exercise at a position in later weeks, that position gets a NEW row that is
// empty in the weeks before. A cell shows the prescription (series - reps × carga / reps × carga…),
// tinted by the RPE of the completed session (grey = still pending). Clicking a completed
// cell opens that session. Replaces the old week-by-week cards that repeated the same
// exercise names once per week.
import React from 'react';
import { formatCarga, collapseUnilateral, visibleInPlan, prescribedSeries, blockPrefixes, displayPosition } from '../../utils/helpers.js';
import { RPE_CLASSES } from './SessionLogDetail.jsx';

// Exercises of a day for one week, rests/hidden kinds removed and unilateral twins collapsed,
// keyed `<position>|<exercise id>` so a slot lines up across weeks only while it holds the same exercise.
function dayExercises(day, log) {
    // `pos` is the displayed position (WU1 for warm-ups, then A1, A2… counting only training blocks).
    const prefixes = blockPrefixes(day?.blocks ?? []);
    const posOf = new Map();
    const flat = (day?.blocks ?? []).flatMap((b, bi) => visibleInPlan(b.exercises).filter(e => !e.isRest).map(e => {
        posOf.set(e, displayPosition(prefixes[bi], e));
        return e;
    }));
    const seen = {};
    return collapseUnilateral(flat, log).map(ex => {
        const pos = posOf.get(ex);
        const base = `${pos}|${ex.exerciseId || ex.exerciseName || '—'}`;
        seen[base] = (seen[base] || 0) + 1;
        return { key: seen[base] > 1 ? `${base}#${seen[base]}` : base, ex, pos };
    });
}

// "A1" < "A2" < "B1" < "AA1": block label (length, then letters), then exercise number.
function positionOrder(pos) {
    const m = /^([A-Z]+)(\d+)$/.exec(pos || '');
    if (m && m[1] === 'WU') return [0, 'WU', Number(m[2])];
    return m ? [m[1].length, m[1], Number(m[2])] : [99, String(pos || ''), 0];
}
function byPosition(a, b) {
    const x = positionOrder(a.pos), y = positionOrder(b.pos);
    return x[0] - y[0] || (x[1] < y[1] ? -1 : x[1] > y[1] ? 1 : 0) || x[2] - y[2];
}

// "5 - 6 × 7.5 / 7 × 8 / 8 × 8.5 KG": series, then one "reps × carga" per serie (a single one when
// every serie is the same). The unit goes once at the end; with no carga only the reps show.
function cellText(ex) {
    const series = prescribedSeries(ex).map(s => ({ reps: s.reps === '' ? '—' : String(s.reps), carga: formatCarga({ ...ex, carga: s.carga }) }));
    const unit = series.map(s => s.carga.match(/ (KG|MTS\.|")$/)?.[1]).find(Boolean);
    const bare = c => (c === '—' || !unit) ? c : c.replace(new RegExp(` ${unit.replace('.', '\\.')}$`), '');
    const items = series.map(s => (s.carga === '—' ? s.reps : `${s.reps} × ${bare(s.carga)}`));
    const shown = items.every(i => i === items[0]) ? [items[0]] : items;
    return `${ex.series || '—'} - ${shown.join(' / ')}${unit ? ` ${unit}` : ''}`;
}

export function PlanSessionsSheet({ plan, sessionLogs, onOpenLog }) {
    const weekDays = Array.from({ length: plan.weeks }, (_, w) => plan.weekDays?.[w] ?? plan.days ?? []);
    const logOf = (w, dayNumber) => sessionLogs.find(
        l => l.planId === plan.id && l.week === w + 1 && l.dayNumber === dayNumber && l.completed);
    const dayNumbers = [...new Set(weekDays.flatMap(days => days.map(d => d.dayNumber)))].sort((a, b) => a - b);

    return (
        <div className="plan-sheet-wrap">
            <table className="plan-sheet">
                <thead>
                    <tr>
                        <th className="plan-sheet-pos"></th>
                        <th className="plan-sheet-ex">Ejercicio</th>
                        {weekDays.map((_, w) => <th key={w}>Sem {w + 1}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {dayNumbers.map(dn => {
                        // Row order: by position (A1, A2, B1…); the same position with a different exercise
                        // in later weeks becomes another row right after, in order of first appearance.
                        const perWeek = weekDays.map((days, w) => dayExercises(days.find(d => d.dayNumber === dn), logOf(w, dn)));
                        const rows = [];
                        perWeek.forEach(list => list.forEach(r => { if (!rows.some(x => x.key === r.key)) rows.push(r); }));
                        const keys = rows.sort(byPosition).map(r => r.key);
                        return (
                            <React.Fragment key={dn}>
                                <tr className="plan-sheet-day"><td colSpan={plan.weeks + 2}>Día {dn}</td></tr>
                                {keys.map(key => {
                                    const head = perWeek.flatMap(l => l).find(r => r.key === key);
                                    const first = head.ex;
                                    return (
                                        <tr key={key}>
                                            <td className="plan-sheet-pos">{head.pos || '—'}</td>
                                            <td className="plan-sheet-ex">{first.exerciseName || '—'}</td>
                                            {perWeek.map((list, w) => {
                                                const item = list.find(r => r.key === key);
                                                if (!item) return <td key={w}><span className="plan-sheet-cell is-empty">-</span></td>;
                                                const log = logOf(w, dn);
                                                const rpe = log?.exerciseSummaries?.find(s => s.position === item.ex.position)?.rpe || '';
                                                const cls = log ? `is-done ${RPE_CLASSES[rpe] || ''}` : '';
                                                const text = cellText(item.ex);
                                                return (
                                                    <td key={w}>
                                                        {log ? (
                                                            <button type="button" className={`plan-sheet-cell ${cls}`} title={`${text} — abrir sesión`} onClick={() => onOpenLog(log)}>{text}</button>
                                                        ) : (
                                                            <span className="plan-sheet-cell" title={text}>{text}</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
