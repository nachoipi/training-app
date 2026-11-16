// "Evolución por ejercicio" (trainer, AthleteProfile): for each exercise of a plan, what the
// athlete actually did session after session (series × reps · carga), the RPE they gave it and
// the realized volume (sum of reps × load) and its change vs the previous session. Basis for deciding how to adjust future days.
import React, { useState } from 'react';
import { exerciseHistory } from '../../utils/helpers.js';
import { RPE_CLASSES, RPE_LABELS } from './SessionLogDetail.jsx';

const fmt = n => String(Math.round(n * 10) / 10);

function delta(cur, prev) {
    if (!Number.isFinite(cur) || !Number.isFinite(prev) || cur === prev) return null;
    const d = cur - prev;
    return { text: `${d > 0 ? '+' : ''}${fmt(d)}`, up: d > 0 };
}

export function ExerciseProgress({ plan, sessionLogs, onOpenLog }) {
    const groups = exerciseHistory(plan, sessionLogs);
    const [open, setOpen] = useState(null);
    if (!groups.length) return <p className="profile-empty">Todavía no hay sesiones completadas para comparar.</p>;

    return (
        <div className="exercise-progress">
            {groups.map(g => {
                const isOpen = open === g.key;
                return (
                    <div key={g.key} className="exercise-progress-group">
                        <button className="plan-group-head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : g.key)}>
                            <svg className="chev" width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            {g.name || '—'}
                            <span className="plan-group-meta">{g.entries.length} sesión{g.entries.length !== 1 ? 'es' : ''}</span>
                        </button>
                        {isOpen && (
                            <table className="plan-sheet exercise-progress-table">
                                <thead><tr><th>Sesión</th><th>Realizado</th><th>Volumen</th><th>RPE</th></tr></thead>
                                <tbody>
                                    {g.entries.map((e, i) => {
                                        const d = delta(e.volume, g.entries[i - 1]?.volume);
                                        return (
                                            <tr key={`${e.week}-${e.dayNumber}-${e.ex.position}`}>
                                                <td><button type="button" className="plan-sheet-cell is-done" onClick={() => onOpenLog(e.log)}>S{e.week} · D{e.dayNumber}</button></td>
                                                <td>{e.text}</td>
                                                <td>
                                                    {Number.isFinite(e.volume) ? `${fmt(e.volume)} KG` : '—'}
                                                    {d && <span style={{ marginLeft: 6, color: d.up ? 'var(--success, #3ecf8e)' : 'var(--danger, #e5534b)' }}>{d.text}</span>}
                                                </td>
                                                <td>{e.rpe ? <span className={`plan-sheet-cell is-done ${RPE_CLASSES[e.rpe] || ''}`}>{RPE_LABELS[e.rpe] || e.rpe}</span> : '—'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
