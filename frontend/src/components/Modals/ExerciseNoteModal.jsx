// Modal opened from the coach's "Sesiones del plan" sheet for ONE exercise of a completed session:
// the athlete's clip (if any) and comment together, plus the coach's reply box underneath. The
// reply is the per-exercise feedback (same data as the history's ✎ box), saved through
// onReview(log, { exerciseFeedback: [{ position, comment }] }); the athlete sees it once the
// session is marked as reviewed.
import React, { useEffect, useState } from 'react';
import { Icon } from '../Icon/index.jsx';
import { AthleteVideoPlayer } from './AthleteVideoModal.jsx';

export function ExerciseNoteModal({ open, log, position, exerciseName, summary, onReview, onClose }) {
    const feedback = log?.exerciseFeedback?.[position]?.comment || '';
    const [draft, setDraft] = useState(feedback);
    const [saving, setSaving] = useState(false);
    useEffect(() => { setDraft(feedback); }, [feedback, position, log?.planId, log?.week, log?.dayNumber]);
    if (!open || !log) return null;

    async function save() {
        setSaving(true);
        try { await onReview(log, { exerciseFeedback: [{ position, comment: draft.trim() }] }); }
        finally { setSaving(false); }
    }

    return (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal exercise-detail-modal exercise-detail-modal--short">
                <div className="modal-header">
                    <h2>{exerciseName || 'Ejercicio'} — Semana {log.week}, Día {log.dayNumber}</h2>
                    <button className="modal-close" onClick={onClose} aria-label="Cerrar"><Icon name="close" size={18} /></button>
                </div>
                <div className="modal-body">
                    {summary?.videoUrl && <AthleteVideoPlayer url={summary.videoUrl} title={exerciseName || 'Ejercicio'} />}
                    {summary?.comment && (
                        <div className="session-history-comment-row">
                            <span className="session-history-comment-name">Atleta</span>
                            <span className="session-history-comment-text">"{summary.comment}"</span>
                        </div>
                    )}
                    {onReview ? (<>
                    <textarea
                        className="form-input session-review-textarea"
                        style={{ width: '100%', marginTop: 12 }}
                        rows={3}
                        maxLength={1000}
                        placeholder="Respondé / dejá feedback para este ejercicio"
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                    />
                    <div className="session-review-actions">
                        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving || draft.trim() === feedback}>
                            {saving ? 'Guardando…' : 'Guardar feedback'}
                        </button>
                        {!log.reviewedAt && <span className="session-review-state">El atleta lo verá cuando marques la sesión como revisada.</span>}
                    </div>
                    </>) : feedback && (
                        <div className="session-history-comment-row">
                            <span className="session-history-comment-name">Coach</span>
                            <span className="session-history-comment-text">"{feedback}"</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
