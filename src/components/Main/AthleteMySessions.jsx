import React from 'react';

export function AthleteMySessions({ planifications, sessionLogs, onOpenSession }) {
    function isCompleted(planId, week, dayNumber) {
        return sessionLogs.some(l => l.planId === planId && l.week === week && l.dayNumber === dayNumber && l.completed);
    }

    return (
        <section className="section">
            <div className="section-header">
                <div>
                    <h1 className="section-title">Mis Sesiones</h1>
                    <p className="section-subtitle">Sesiones creadas por tu entrenador</p>
                </div>
            </div>

            {planifications.length === 0 ? (
                <p className="profile-empty">Todavía no tenés sesiones asignadas.</p>
            ) : (
                planifications.map(plan => (
                    <div key={plan.id} className="plan-sessions-group">
                        <div className="plan-sessions-group-title">{plan.name}</div>
                        <div className="assigned-routines-list">
                            {Array.from({ length: plan.weeks }, (_, w) => (
                                (plan.weekDays?.[w] ?? plan.days ?? []).map(day => {
                                    const done = isCompleted(plan.id, w + 1, day.dayNumber);
                                    return (
                                        <div
                                            key={`${plan.id}-${w}-${day.dayNumber}`}
                                            className={`assigned-routine-row${done ? ' assigned-routine-row--completed' : ''}`}
                                        >
                                            <div className="assigned-routine-info">
                                                <span className="assigned-routine-name">
                                                    Semana {w + 1} - Día {day.dayNumber}
                                                </span>
                                            </div>
                                            <button
                                                className={`btn btn-sm ${done ? 'btn-success' : 'btn-primary'}`}
                                                onClick={() => onOpenSession({ plan, week: w + 1, day })}
                                            >
                                                {done ? 'Ver Sesión' : 'Realizar Sesión'}
                                            </button>
                                        </div>
                                    );
                                })
                            ))}
                        </div>
                    </div>
                ))
            )}
        </section>
    );
}
