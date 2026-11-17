// A done session cell (button) with its info icons aligned right INSIDE the same cell: a chat icon
// when that exercise has its own comment (athlete's or coach's; never the general session comment)
// and a play icon when the athlete attached a clip. Both open ExerciseNoteModal (clip + athlete
// comment + the coach's reply box). Shared by "Sesiones del plan" and "Evolución por ejercicio".
import React, { useState } from 'react';
import { Icon } from '../Icon/index.jsx';
import { ExerciseNoteModal } from '../Modals/ExerciseNoteModal.jsx';

export function ExerciseCellButton({ log, ex, sessionLogs, className = '', title, onOpen, onReview, children }) {
    const [open, setOpen] = useState(false);
    const summary = log?.exerciseSummaries?.find(s => s.position === ex.position);
    const hasNote = !!(summary?.comment || log?.exerciseFeedback?.[ex.position]?.comment);
    const hasVideo = !!summary?.videoUrl;
    // The modal shows the live log, so a saved reply appears right away.
    const live = sessionLogs?.find(l => l.planId === log.planId && l.week === log.week && l.dayNumber === log.dayNumber) ?? log;
    const pad = hasVideo && hasNote ? ' has-media-2' : hasVideo || hasNote ? ' has-media' : '';
    return (
        <div className="plan-sheet-cell-wrap">
            <button type="button" className={`plan-sheet-cell ${className}${pad}`} title={title} onClick={onOpen}>{children}</button>
            {(hasNote || hasVideo) && (
                <span className="plan-sheet-media-group">
                    {hasNote && (
                        <button type="button" className="plan-sheet-media" title="Ver comentario" aria-label="Ver comentario" onClick={() => setOpen(true)}>
                            <Icon name="chat" size={15} />
                        </button>
                    )}
                    {hasVideo && (
                        <button type="button" className="plan-sheet-media" title="Ver video del atleta" aria-label="Ver video del atleta" onClick={() => setOpen(true)}>
                            <Icon name="play-circle" size={16} />
                        </button>
                    )}
                </span>
            )}
            <ExerciseNoteModal open={open} log={live} position={ex.position} exerciseName={ex.exerciseName} summary={summary} onReview={onReview} onClose={() => setOpen(false)} />
        </div>
    );
}
