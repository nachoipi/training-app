// Plan-vs-actual detail of one completed session log (trainer side). Shared by the
// athlete profile history accordion and the trainer dashboard's session-detail screen,
// so both always show the same table, per-exercise comments and athlete summary.
// When `onReview` is given it also renders the coach's review box (comment + "Marcar
// como revisada"); the parent persists it through sessionLogService.review.
import React, { useState, useEffect } from 'react';
import { prescribedSeries, formatSerie } from '../../utils/helpers.js';
import { ExerciseNoteModal } from '../Modals/ExerciseNoteModal.jsx';
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

// One exercise: prescribed vs done per serie (same format both sides), the athlete's clip and
// comment, and the coach's feedback for that exercise. Collapsible; opens by default only when the athlete
// left a comment on it (video and coach feedback stay collapsed behind the ▶ / ✎ buttons).
function ExerciseRow({ ex, summary, serieRows, feedback, rpeClass, draft, onDraft, onOpenNote, editable }) {
    const hasVideo = !!summary?.videoUrl;
    const [open, setOpen] = useState(!!summary?.comment);

    const prescribed = prescribedSeries(ex);
    const done = [...serieRows].sort((a, b) => a.serieIndex - b.serieIndex);
    const actual = prescribed.map((_, i) => {
        const row = done.find(r => r.serieIndex === i + 1);
        return { reps: row?.actualReps ?? '', carga: row?.actualCarga ?? '' };
    });

    return (
        <div className={`session-history-ex ${rpeClass}`}>
            <div className="session-history-table-row">
                <span className="session-history-ex-name">{ex.exerciseName || '—'}</span>
                <span className="session-history-series">
                    {prescribed.map((p, i) => <span key={i} className="session-history-serie">{formatSerie(p, ex)}</span>)}
                </span>
                <span className="session-history-series">
                    {actual.map((a, i) => (
                        <span key={i} className={`session-history-serie${formatSerie(a, ex) !== formatSerie(prescribed[i], ex) ? ' is-diff' : ''}`}>
                            {formatSerie(a, ex)}
                        </span>
                    ))}
                </span>
                <span className="session-history-actions">
                    {hasVideo && (
                        <button type="button" className="session-history-icon-btn has-video" title="Ver video del atleta" onClick={onOpenNote}>▶</button>
                    )}
                    <button type="button" className={`session-history-icon-btn${feedback?.comment ? ' has-feedback' : ''}`} title="Feedback del coach" onClick={() => setOpen(o => !o)}>
                        {feedback?.comment ? '✎' : '+'}
                    </button>
                </span>
            </div>
            {open && (
                <div className="session-history-ex-panel">
                    {summary?.comment && (
                        <div className="session-history-comment-row">
                            <span className="session-history-comment-name">Atleta</span>
                            <span className="session-history-comment-text">"{summary.comment}"</span>
                        </div>
                    )}
                    {!editable ? (
                        feedback?.comment && (
                            <div className="session-history-comment-row">
                                <span className="session-history-comment-name">Coach</span>
                                <span className="session-history-comment-text">"{feedback.comment}"</span>
                            </div>
                        )
                    ) : (
                        // Saved together with the general comment by "Marcar como revisada" (see ReviewBox).
                        <textarea
                            className="form-input session-review-textarea"
                            rows={2}
                            maxLength={1000}
                            placeholder="Feedback para este ejercicio (el atleta lo verá en las próximas sesiones y cuando la sesión se marque como revisada)."
                            value={draft}
                            onChange={e => onDraft(ex.position, e.target.value)}
                        />
                    )}
                </div>
            )}
        </div>
    );
}

// Review box. The draft resets when the log changes (different session or after a save)
// so a stale comment is never shown against another session.
function ReviewBox({ log, onReview, pendingFeedback }) {
    const [draft, setDraft] = useState(log.trainerComment || '');
    const [saving, setSaving] = useState(false);
    useEffect(() => { setDraft(log.trainerComment || ''); }, [log.planId, log.week, log.dayNumber, log.trainerComment]);

    const unchanged = draft.trim() === (log.trainerComment || '');
    const reviewed = !!log.reviewedAt;

    // `markReviewed` false = "Guardar": store the comments as drafts without marking the session reviewed.
    async function submit(markReviewed = true) {
        setSaving(true);
        // The per-exercise feedback edited above travels in the same request.
        try { await onReview(log, { comment: draft.trim(), ...(markReviewed ? {} : { markReviewed: false }), ...(pendingFeedback.length ? { exerciseFeedback: pendingFeedback } : {}) }); } finally { setSaving(false); }
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
                {!reviewed && (
                    <button className="btn btn-secondary btn-sm" onClick={() => submit(false)} disabled={saving || (unchanged && !pendingFeedback.length)}>
                        Guardar
                    </button>
                )}
                <button className="btn btn-primary btn-sm" onClick={() => submit(true)} disabled={saving || (reviewed && unchanged && !pendingFeedback.length)}>
                    {saving ? 'Guardando…' : reviewed ? 'Actualizar revisión' : 'Marcar como revisada'}
                </button>
                {reviewed && <span className="session-review-state">Revisada</span>}
            </div>
        </div>
    );
}

export function SessionLogDetail({ log, plan, onReview }) {
    // Exercise whose clip + comment modal is open (same modal as the "Sesiones del plan" icons).
    const [noteFor, setNoteFor] = useState(null);
    // Unsaved per-exercise feedback ({ position: text }); saved with "Marcar como revisada".
    const [drafts, setDrafts] = useState({});
    const saved = log.exerciseFeedback || {};
    // Once a save lands, drop the drafts that now match what is stored (and reset on another session).
    useEffect(() => {
        setDrafts(d => Object.fromEntries(Object.entries(d).filter(([pos, text]) => text.trim() !== (saved[pos]?.comment || ''))));
    }, [log.exerciseFeedback]);
    useEffect(() => { setDrafts({}); }, [log.planId, log.week, log.dayNumber]);
    const pendingFeedback = Object.entries(drafts)
        .filter(([pos, text]) => text.trim() !== (saved[pos]?.comment || ''))
        .map(([position, text]) => ({ position, comment: text.trim() }));
    const day = plan ? findDay(plan, log.week, log.dayNumber) : null;
    // Warm-ups (Calentamiento) are not shown to the coach: no row, prescribed or done.
    const exercises = day ? day.blocks.flatMap(b => b.exercises).filter(e => !e.isRest && e.kind !== 'warmup') : [];
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
                        <span />
                    </div>
                    {exercises.map(ex => {
                        const summary = (log.exerciseSummaries || []).find(s => s.position === ex.position);
                        return (
                            <ExerciseRow
                                key={ex.position}
                                ex={ex}
                                summary={summary}
                                serieRows={(log.exercises || []).filter(e => e.position === ex.position)}
                                feedback={log.exerciseFeedback?.[ex.position]}
                                rpeClass={RPE_CLASSES[summary?.rpe || ''] || ''}
                                editable={!!onReview}
                                draft={drafts[ex.position] ?? log.exerciseFeedback?.[ex.position]?.comment ?? ''}
                                onDraft={(position, text) => setDrafts(d => ({ ...d, [position]: text }))}
                                onOpenNote={() => setNoteFor({ position: ex.position, name: ex.exerciseName, summary })}
                            />
                        );
                    })}
                </>
            )}
            <ExerciseNoteModal open={!!noteFor} log={log} position={noteFor?.position} exerciseName={noteFor?.name} summary={noteFor?.summary} onReview={onReview} onClose={() => setNoteFor(null)} />
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
            {onReview && <ReviewBox log={log} onReview={onReview} pendingFeedback={pendingFeedback} />}
        </div>
    );
}
