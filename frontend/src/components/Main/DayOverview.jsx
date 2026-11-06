// Day-at-a-glance block list shared by the athlete home hero (AthleteDashboard) and the
// session screen's pre-start overview (AthleteMySession). Each block is its own box: title with
// its series count, then per exercise the name with repeticiones / carga underneath. Rests are
// never listed. The caller decides which blocks come in (the home hero passes them through
// visibleInPlan so warm-ups stay hidden; the session overview passes the full day).
import React from 'react';
import { formatTiempoLargo, blockTitles } from '../../utils/helpers.js';

export function DayOverview({ blocks, feedbackFor }) {
    const shown = blocks.filter(b => b.exercises.some(e => !e.isRest));
    const titles = blockTitles(shown);
    return (
        <div className="dash-hero-blocks session-overview-blocks">
            {shown.map((block, bi) => {
                const training = block.exercises.filter(e => !e.isRest);
                const sameSeries = training.every(e => e.series === training[0].series);
                return (
                    <div key={block.label} className="dash-hero-block session-overview-block">
                        <span className="dash-hero-block-label">
                            {titles[bi]}{sameSeries ? ` · ${training[0].series} ${String(training[0].series) === '1' ? 'serie' : 'series'}` : ''}
                        </span>
                        <ul className="dash-hero-exercises">
                            {training.map(ex => {
                                const carga = formatTiempoLargo(ex);
                                const meta = [
                                    ex.reps ? `${ex.reps} ${String(ex.reps) === '1' ? 'repetición' : 'repeticiones'}` : '',
                                    carga !== '—' ? carga : '',
                                ].filter(Boolean).join(' · ');
                                return (
                                    <li key={ex.position}>
                                        <span className="session-overview-name">{ex.exerciseName || '—'}</span>
                                        <span className="dash-hero-ex-meta">{meta}</span>
                                        {feedbackFor?.(ex) && (
                                            <span className="session-overview-coach-fix">
                                                Corrección de tu coach: {feedbackFor(ex).comment}
                                            </span>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                );
            })}
        </div>
    );
}
