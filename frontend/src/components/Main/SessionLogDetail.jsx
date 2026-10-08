// Plan-vs-actual detail of one completed session log (trainer side). Shared by the
// athlete profile history accordion and the trainer dashboard's session-detail screen,
// so both always show the same table, per-exercise comments and athlete summary.
// When `onReview` is given it also renders the coach's review box (comment + "Marcar
// como revisada"); the parent persists it through sessionLogService.review.
import React, { useState, useEffect } from 'react';
import { formatCarga } from '../../utils/helpers.js';
import { SELF_EVALUATION_LABELS } from '../../utils/constants.js';

export const RPE_CLASSES = { '1': 'session-rpe-1', '2': 'session-rpe-2', '3': 'session-rpe-3', '4': 'session-rpe-4' };
export const RPE_LABELS  = { '1': 'RPE 1', '2': 'RPE 2', '3': 'RPE 3', '4': 'RPE 4' };

// Return the day object from a planification for a given (week, dayNumber) pair.
export function findDay(plan, week, dayNumber) {
    const days = plan.weekDays?.[week - 1] ?? plan.days ?? [];
    return days.find(d => d.dayNumber === dayNumber) ?? null;
}

// Rows for the athlete's "Resumen de la sesión" (log.sessionSummary). Only filled fields are
// returned, so an empty/missing summary yields [] and the block is not rendered.
function summaryRows(summary) {
    if (!summary) return [];
    const rows = [];
    if (summary.dateTime) {
        const d = new Date(summary.dateTime);
        rows.push(['Fecha y hora', Number.isNaN(d.getTime()) ? summary.dateTime : d.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })]);
    }
    if (summary.durationMin) rows.push(['Duración', `${summary.durationMin} min`]);
    if (summary.selfEvaluation) rows.push(['Autoevaluación', `${summary.selfEvaluation}/5 · ${SELF_EVALUATION_LABELS[summary.selfEvaluation] || ''}`.replace(/ · $/, '')]);
    if (summary.effortLevel) rows.push(['Esfuerzo de la sesión', `${summary.effortLevel}/10`]);
    if (summary.comment) rows.push(['Comentario', `"${summary.comment}"`]);
    return rows;
}

// Review box. The draft resets when the log changes (different session or after a save)
// so a stale comment is never shown against another session.
function ReviewBox({ log, onReview }) {
    const [draft, setDraft] = useState(log.trainerComment || '');
    const [saving, setSaving] = useState(false);
    useEffect(() => { setDraft(log.trainerComment || ''); }, [log.planId, log.week, log.dayNumber, log.trainerComment]);

    const unchanged = draft.trim() === (log.trainerComment || '');
    const reviewed = !!log.reviewedAt;

    async function submit() {
        setSaving(true);
        try { await onReview(log, draft.trim()); } finally { setSaving(false); }
    }

    return (
        <div className="session-history-comments session-review-box">
            <div className="session-history-comment-name">Revisión del coach</div>
            <textarea
                className="form-input session-review-textarea"
                rows={3}
                maxLength={1000}
                placeholder="Dejá un comentario para tu alumno (opcional)"
                value={draft}
                onChange={e => setDraft(e.target.value)}
            />
            <div className="session-review-actions">
                <button className="btn btn-primary btn-sm" onClick={submit} disabled={saving || (reviewed && unchanged)}>
                    {saving ? 'Guardando…' : reviewed ? 'Actualizar comentario' : 'Marcar como revisada'}
                </button>
                {reviewed && <span className="session-review-state">Revisada</span>}
            </div>
        </div>
    );
}

export function SessionLogDetail({ log, plan, onReview }) {
    const day = plan ? findDay(plan, log.week, log.dayNumber) : null;
    const exercises = day ? day.blocks.flatMap(b => b.exercises) : [];
    const rows = summaryRows(log.sessionSummary);

    return (
        <div className="session-history-card-body">
            {!day ? (
                <p className="session-history-no-detail">Día no encontrado en la planificación.</p>
            ) : exercises.length === 0 ? (
                <p className="session-history-no-detail">Sin ejercicios en este día.</p>
            ) : (
                <>
                    <div className="session-history-table-header">
                        <span>Ejercicio</span>
                        <span>Prescripto</span>
                        <span>Realizado</span>
                        <span>RPE</span>
                    </div>
                    {exercises.map(ex => {
                        const summary   = (log.exerciseSummaries || []).find(s => s.position === ex.position);
                        const serieRows = (log.exercises || []).filter(e => e.position === ex.position);
                        const rpeKey    = summary?.rpe || '';
                        const rpeClass  = RPE_CLASSES[rpeKey] || '';

                        // Build "actualReps @ actualCarga" strings per serie, skip blanks.
                        const actualParts = [...serieRows]
                            .sort((a, b) => a.serieIndex - b.serieIndex)
                            .map(e => {
                                const r = e.actualReps  !== '' && e.actualReps  != null ? e.actualReps  : '—';
                                const c = e.actualCarga !== '' && e.actualCarga != null ? e.actualCarga : null;
                                return c ? `${r} @ ${c}` : `${r}`;
                            });
                        const actualStr = actualParts.length ? actualParts.join(' / ') : '—';

                        return (
                            <div key={ex.position} className={`session-history-table-row ${rpeClass}`}>
                                <span className="session-history-ex-name">{ex.exerciseName || '—'}</span>
                                <span className="session-history-prescribed">
                                    {ex.series || '—'} × {ex.reps || '—'}
                                    {ex.carga ? ` @ ${formatCarga(ex)}` : ''}
                                </span>
                                <span className="session-history-actual">{actualStr}</span>
                                <span className="session-history-rpe">
                                    {rpeKey
                                        ? <span className={`session-history-rpe-badge ${rpeClass}`}>{RPE_LABELS[rpeKey]}</span>
                                        : <span className="session-history-rpe-none">—</span>
                                    }
                                </span>
                            </div>
                        );
                    })}
                    {(log.exerciseSummaries || []).some(s => s.comment) && (
                        <div className="session-history-comments">
                            {(log.exerciseSummaries || []).filter(s => s.comment).map(s => {
                                const ex = exercises.find(e => e.position === s.position);
                                return (
                                    <div key={s.position} className="session-history-comment-row">
                                        <span className="session-history-comment-name">{ex?.exerciseName || '—'}</span>
                                        <span className="session-history-comment-text">"{s.comment}"</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
            {rows.length > 0 && (
                <div className="session-history-comments">
                    <div className="session-history-comment-name">Resumen de la sesión</div>
                    {rows.map(([label, value]) => (
                        <div key={label} className="session-history-comment-row">
                            <span className="session-history-comment-name">{label}</span>
                            <span className="session-history-comment-text" style={label === 'Comentario' ? undefined : { fontStyle: 'normal' }}>{value}</span>
                        </div>
                    ))}
                </div>
            )}
            {onReview && <ReviewBox log={log} onReview={onReview} />}
        </div>
    );
}
