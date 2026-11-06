// Spreadsheet view of one plan (trainer side, "Sesiones del plan"): one row per exercise,
// one column per week, grouped by day. A cell shows the prescription (series × reps · carga),
// tinted by the RPE of the completed session (grey = still pending). Clicking a completed
// cell opens that session. Replaces the old week-by-week cards that repeated the same
// exercise names once per week.
import React from 'react';
import { formatCarga, collapseUnilateral, visibleInPlan } from '../../utils/helpers.js';
import { RPE_CLASSES } from './SessionLogDetail.jsx';

// Exercises of a day for one week, rests/hidden kinds removed and unilateral twins collapsed,
// keyed `<exercise id>#<n-th occurrence>` so the same slot lines up across weeks.
function dayExercises(day, log) {
    const flat = (day?.blocks ?? []).flatMap(b => visibleInPlan(b.exercises).filter(e => !e.isRest));
    const counts = {};
    return collapseUnilateral(flat, log).map(ex => {
        const id = ex.exerciseId || ex.exerciseName || '—';
        counts[id] = (counts[id] || 0) + 1;
        return { key: `${id}#${counts[id]}`, ex };
    });
}

function cellText(ex) {
    const carga = formatCarga(ex);
    return `${ex.series || '—'} × ${ex.reps || '—'}${carga !== '—' ? ` · ${carga}` : ''}`;
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
                        <th className="plan-sheet-ex">Ejercicio</th>
                        {weekDays.map((_, w) => <th key={w}>Sem {w + 1}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {dayNumbers.map(dn => {
                        // Row order: first appearance across weeks, so added/swapped exercises still get a row.
                        const perWeek = weekDays.map((days, w) => dayExercises(days.find(d => d.dayNumber === dn), logOf(w, dn)));
                        const keys = [];
                        perWeek.forEach(list => list.forEach(({ key }) => { if (!keys.includes(key)) keys.push(key); }));
                        return (
                            <React.Fragment key={dn}>
                                <tr className="plan-sheet-day"><td colSpan={plan.weeks + 1}>Día {dn}</td></tr>
                                {keys.map(key => {
                                    const first = perWeek.flatMap(l => l).find(r => r.key === key).ex;
                                    return (
                                        <tr key={key}>
                                            <td className="plan-sheet-ex">{first.exerciseName || '—'}</td>
                                            {perWeek.map((list, w) => {
                                                const item = list.find(r => r.key === key);
                                                if (!item) return <td key={w}><span className="plan-sheet-cell is-empty">—</span></td>;
                                                const log = logOf(w, dn);
                                                const rpe = log?.exerciseSummaries?.find(s => s.position === item.ex.position)?.rpe || '';
                                                const cls = log ? `is-done ${RPE_CLASSES[rpe] || ''}` : '';
                                                // A different exercise in the same slot shows its name so nothing is hidden.
                                                const renamed = item.ex.exerciseName && item.ex.exerciseName !== first.exerciseName;
                                                const text = (renamed ? `${item.ex.exerciseName}: ` : '') + cellText(item.ex);
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
