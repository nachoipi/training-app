// "Evolución por ejercicio" (trainer, AthleteProfile): one group per exercise across ALL the
// athlete's plans (an exercise trained in Mayo/Junio, Agosto and Octubre shows one chronological
// history). For each session: date trained (DD/MM/YYYY), the session cell ("Plan, SX - DX", tinted
// by RPE, with the same comment/video icons as "Sesiones del plan"), what the athlete actually did
// (series × reps · carga) and the realized volume (sum of reps × load in KG, or of the reps when
// there is no carga) with its change vs the previous session.
// Exercises no longer prescribed in an active plan go into an "Archivados" fold.
// `focus` ({ key, n }) opens and scrolls to one exercise (set when the coach clicks an exercise name
// in "Sesiones del plan"); `n` changes on every click so the same exercise can be focused again.
import React, { useEffect, useState } from 'react';
import { RPE_CLASSES } from './SessionLogDetail.jsx';
import { ExerciseCellButton } from './ExerciseCellButton.jsx';
import { trainedAt, formatDMY } from '../../utils/helpers.js';

const fmt = n => String(Math.round(n * 10) / 10);

function delta(cur, prev) {
    if (!Number.isFinite(cur) || !Number.isFinite(prev) || cur === prev) return null;
    const d = cur - prev;
    return { text: `${d > 0 ? '+' : ''}${fmt(d)}`, up: d > 0 };
}

const Chev = () => <svg className="chev" width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;

export function ExerciseProgress({ groups, sessionLogs, onOpenLog, onReview, focus }) {
    const [open, setOpen] = useState(null);
    const [showArchived, setShowArchived] = useState(false);
    useEffect(() => {
        if (!focus) return;
        setOpen(focus.key);
        if (groups.some(g => g.key === focus.key && !g.active)) setShowArchived(true);
        setTimeout(() => document.getElementById(`exprog-${focus.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }, [focus]);
    if (!groups.length) return <p className="profile-empty">Todavía no hay sesiones completadas para comparar.</p>;

    const renderGroup = g => {
        const isOpen = open === g.key;
        return (
            <div key={g.key} id={`exprog-${g.key}`} className="exercise-progress-group">
                <button className="plan-group-head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : g.key)}>
                    <Chev />
                    {g.name || '—'}
                    <span className="plan-group-meta">{g.entries.length} sesión{g.entries.length !== 1 ? 'es' : ''}</span>
                </button>
                {isOpen && (
                    <table className="plan-sheet exercise-progress-table">
                        <thead><tr><th>Fecha</th><th>Sesión</th><th>Realizado</th><th>Volumen</th></tr></thead>
                        <tbody>
                            {g.entries.map((e, i) => {
                                // The change only makes sense against a previous row measured in the same unit.
                                const prev = g.entries[i - 1];
                                const d = prev?.volumeUnit === e.volumeUnit ? delta(e.volume, prev.volume) : null;
                                return (
                                    <tr key={`${e.plan.id}-${e.week}-${e.dayNumber}-${e.ex.position}`}>
                                        <td>{formatDMY(trainedAt(e.log))}</td>
                                        <td>
                                            <ExerciseCellButton log={e.log} ex={e.ex} sessionLogs={sessionLogs} className={`is-done ${RPE_CLASSES[e.rpe] || ''}`}
                                                title="Abrir sesión" onOpen={() => onOpenLog(e.log)} onReview={onReview}>
                                                {e.planName}, S{e.week} - D{e.dayNumber}
                                            </ExerciseCellButton>
                                        </td>
                                        <td>{e.text}</td>
                                        <td>
                                            {Number.isFinite(e.volume) ? `${fmt(e.volume)} ${e.volumeUnit}` : '—'}
                                            {d && <span style={{ marginLeft: 6, color: d.up ? 'var(--success, #3ecf8e)' : 'var(--danger, #e5534b)' }}>{d.text}</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        );
    };

    const active = groups.filter(g => g.active);
    const archived = groups.filter(g => !g.active);
    return (
        <div className="exercise-progress">
            {active.map(renderGroup)}
            {archived.length > 0 && (
                <>
                    <button className="archived-fold" aria-expanded={showArchived} onClick={() => setShowArchived(v => !v)}>
                        <Chev />
                        Archivados · sin plan activo ({archived.length})
                    </button>
                    {showArchived && archived.map(renderGroup)}
                </>
            )}
        </div>
    );
}
