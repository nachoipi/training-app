// Plan-vs-actual detail of one completed session log (trainer side). Shared by the
// athlete profile history accordion and the trainer dashboard's session-detail screen,
// so both always show the same table, per-exercise comments and athlete summary.
// When `onReview` is given it also renders the coach's review box (comment + "Marcar
// como revisada"); the parent persists it through sessionLogService.review.
import React, { useState, useEffect } from 'react';
import { prescribedSeries, formatSerie } from '../../utils/helpers.js';
import { AthleteVideoModal } from '../Modals/AthleteVideoModal.jsx';
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
// comment, and the coach's feedback for that exercise. Collapsible; opens by default when there
// is something to look at (a video or existing feedback).
function ExerciseRow({ ex, summary, serieRows, feedback, rpeClass, reviewed, onSaveFeedback, onPlay }) {
    const hasVideo = !!summary?.videoUrl;
    const [open, setOpen] = useState(hasVideo || !!feedback?.comment);
    const [draft, setDraft] = useState(feedback?.comment || '');
    const [saving, setSaving] = useState(false);
    useEffect(() => { setDraft(feedback?.comment || ''); }, [feedback?.comment]);

    const prescribed = prescribedSeries(ex);
    const done = [...serieRows].sort((a, b) => a.serieIndex - b.serieIndex);
    const actual = prescribed.map((_, i) => {
        const row = done.find(r => r.serieIndex === i + 1);
        return { reps: row?.actualReps ?? '', carga: row?.actualCarga ?? '' };
    });
    const unchanged = draft.trim() === (feedback?.comment || '');

    async function save() {
        setSaving(true);
        try { await onSaveFeedback(ex.position, draft.trim()); } finally { setSaving(false); }
    }

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
                        <button type="button" className="session-history-icon-btn has-video" title="Ver video del atleta" onClick={() => onPlay(summary.videoUrl, ex.exerciseName)}>▶</button>
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
                    {!onSaveFeedback ? (
                        feedback?.comment && (
                            <div className="session-history-comment-row">
                                <span className="session-history-comment-name">Coach</span>
                                <span className="session-history-comment-text">"{feedback.comment}"</span>
                            </div>
                        )
                    ) : (<>
                    <textarea
                        className="form-input session-review-textarea"
                        rows={2}
                        maxLength={1000}
                        placeholder="Feedback para este ejercicio (el atleta lo verá en las próximas sesiones)"
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                    />
                    <button className="btn btn-primary btn-sm" onClick={save} disabled={saving || unchanged}>
                        {saving ? 'Guardando…' : 'Guardar feedback'}
                    </button>
                    {!reviewed && (
                        <span className="session-review-state">
                            {feedback?.comment ? 'Guardado como borrador — ' : ''}el atleta lo verá cuando marques la sesión como revisada.
                        </span>
                    )}
                    </>)}
                </div>
            )}
        </div>
    );
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
        try { await onReview(log, { comment: draft.trim() }); } finally { setSaving(false); }
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
    const [playing, setPlaying] = useState(null);
    const day = plan ? findDay(plan, log.week, log.dayNumber) : null;
    const exercises = day ? day.blocks.flatMap(b => b.exercises).filter(e => !e.isRest) : [];
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
                                reviewed={!!log.reviewedAt}
                                onSaveFeedback={onReview ? (position, comment) => onReview(log, { exerciseFeedback: [{ position, comment }] }) : null}
                                onPlay={(url, name) => setPlaying({ url, name })}
                            />
                        );
                    })}
                </>
            )}
            <AthleteVideoModal open={!!playing} url={playing?.url} exerciseName={playing?.name} onClose={() => setPlaying(null)} />
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
