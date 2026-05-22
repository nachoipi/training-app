import React from 'react';
import { formatCarga } from '../../utils/helpers.js';

export function AthleteMyPlan({ planifications }) {
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
                planifications.map(plan => (
                    <div key={plan.id} className="plan-sessions-group">
                        <div className="plan-sessions-group-title">{plan.name}</div>
                        <div
                            className="plan-sessions-weeks"
                            style={{ gridTemplateColumns: `repeat(${plan.weeks}, minmax(0, 1fr))` }}
                        >
                            {Array.from({ length: plan.weeks }, (_, w) => (
                                <div key={w} className="plan-week-column">
                                    <div className="plan-week-column-title">Semana {w + 1}</div>
                                    {plan.days.map(day => (
                                        <div key={`${plan.id}-${w}-${day.dayNumber}`} className="plan-session-card">
                                            <div className="plan-session-card-label">Día {day.dayNumber}</div>
                                            <div className="plan-session-card-blocks">
                                                {day.blocks.map(block => (
                                                    <div key={block.label} className="plan-session-block">
                                                        <div className="plan-session-block-label">Bloque {block.label}</div>
                                                        {block.exercises.map((ex, i) => (
                                                            <div key={i} className="plan-session-exercise">
                                                                <div className="plan-session-exercise-header">
                                                                    <span className="plan-session-exercise-name">{ex.exerciseName || '—'}</span>
                                                                </div>
                                                                <div className="plan-session-exercise-stats">
                                                                    <div className="stat"><span className="stat-label">Series</span><span className="stat-value">{ex.series || '—'}</span></div>
                                                                    <div className="stat"><span className="stat-label">Reps</span><span className="stat-value">{ex.reps || '—'}</span></div>
                                                                    <div className="stat"><span className="stat-label">Carga</span><span className="stat-value">{formatCarga(ex)}</span></div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </section>
    );
}
