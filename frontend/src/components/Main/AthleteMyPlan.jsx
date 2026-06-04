// Athlete "Mi Plan" screen. Ships two parallel renders — a horizontal weeks-grid
// for desktop (matches the trainer-side AthleteProfile view) and a vertical
// Plan -> Week -> Day -> Exercise stack for mobile — and toggles them via the
// .desktop-only / .mobile-only wrappers (breakpoint defined in responsive.css).
// Consumes `planifications` and `sessionLogs` from Dashboard to colorize
// completed exercises by RPE.

import React from 'react';
import { formatCarga } from '../../utils/helpers.js';

const RPE_CLASSES = { '1': 'session-rpe-1', '2': 'session-rpe-2', '3': 'session-rpe-3', '4': 'session-rpe-4' };

// `position` (e.g. "A1") is the join key between the plan entry and the
// saved exerciseSummary on the session log.
function rpeClassFor(log, ex) {
    const key = log?.exerciseSummaries?.find(s => s.position === ex.position)?.rpe || '';
    return RPE_CLASSES[key] || '';
}

function ExerciseRow({ ex, rpeClass }) {
    return (
        <div className={`plan-session-exercise ${rpeClass}`}>
            <div className="plan-session-exercise-header">
                <span className="plan-session-exercise-name">{ex.exerciseName || '—'}</span>
            </div>
            <div className="plan-session-exercise-stats">
                <div className="stat"><span className="stat-label">Series</span><span className="stat-value">{ex.series || '—'}</span></div>
                <div className="stat"><span className="stat-label">Reps</span><span className="stat-value">{ex.reps || '—'}</span></div>
                <div className="stat"><span className="stat-label">Carga</span><span className="stat-value">{formatCarga(ex)}</span></div>
            </div>
        </div>
    );
}

export function AthleteMyPlan({ planifications, sessionLogs = [] }) {
    return (
        <section className="section">
            <div className="section-header">
                <div>
                    <h1 className="section-title">Mi Plan</h1>
                    <p className="section-subtitle">Sesiones asignadas por tu entrenador</p>
                </div>
            </div>

            {planifications.length === 0 ? (
                <p className="profile-empty">Todavía no tenés una planificación asignada.</p>
            ) : (
                planifications.map(plan => {
                    const dayLogFor = (w, day) => sessionLogs.find(
                        l => l.planId === plan.id && l.week === w + 1 && l.dayNumber === day.dayNumber && l.completed
                    );
                    return (
                        <div key={plan.id} className="plan-sessions-group">
                            {/* Desktop: original horizontal weeks-grid (kept intact). */}
                            <div className="desktop-only">
                                <div className="plan-sessions-group-title">{plan.name}</div>
                                <div
                                    className="plan-sessions-weeks"
                                    style={{ gridTemplateColumns: `repeat(${plan.weeks}, minmax(0, 1fr))` }}
                                >
                                    {Array.from({ length: plan.weeks }, (_, w) => (
                                        <div key={w} className="plan-week-column">
                                            <div className="plan-week-column-title">Semana {w + 1}</div>
                                            {(plan.weekDays?.[w] ?? plan.days ?? []).map(day => {
                                                const log = dayLogFor(w, day);
                                                return (
                                                    <div key={`${plan.id}-${w}-${day.dayNumber}`} className="plan-session-card">
                                                        <div className="plan-session-card-label">Día {day.dayNumber}</div>
                                                        <div className="plan-session-card-blocks">
                                                            {day.blocks.map(block => (
                                                                <div key={block.label} className="plan-session-block">
                                                                    <div className="plan-session-block-label">Bloque {block.label}</div>
                                                                    {block.exercises.map((ex, i) => (
                                                                        <ExerciseRow key={i} ex={ex} rpeClass={rpeClassFor(log, ex)} />
                                                                    ))}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Mobile: vertical Plan -> Week -> Day stack, no block labels,
                                dotted divider between blocks acts as a superset separator. */}
                            <div className="mobile-only plan-stack">
                                <div className="plan-stack-title">{plan.name}</div>
                                {Array.from({ length: plan.weeks }, (_, w) => (
                                    <div key={w} className="plan-stack-week">
                                        <div className="plan-stack-week-title">Semana {w + 1}</div>
                                        {(plan.weekDays?.[w] ?? plan.days ?? []).map(day => {
                                            const log = dayLogFor(w, day);
                                            return (
                                                <div key={`${plan.id}-${w}-${day.dayNumber}`} className="plan-stack-day">
                                                    <div className="plan-stack-day-label">Día {day.dayNumber}</div>
                                                    <div className="plan-stack-day-blocks">
                                                        {day.blocks.map(block => (
                                                            <div key={block.label} className="plan-stack-block">
                                                                {block.exercises.map((ex, i) => (
                                                                    <ExerciseRow key={i} ex={ex} rpeClass={rpeClassFor(log, ex)} />
                                                                ))}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })
            )}
        </section>
    );
}
