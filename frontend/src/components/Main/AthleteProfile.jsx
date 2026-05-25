import React from 'react';
import { formatDate, formatCarga } from '../../utils/helpers.js';
import { StatCard } from '../Common/index.jsx';

const RPE_CLASSES = { '1': 'session-rpe-1', '2': 'session-rpe-2', '3': 'session-rpe-3', '4': 'session-rpe-4' };

export function AthleteProfile({ athlete, planifications, sessionLogs, onBack, onOpenPlanification, onViewPlanification, onDeletePlanification, onShowToast }) {
    const athletePlanIds = new Set(planifications.map(p => p.id));
    const completedLogs = (sessionLogs || [])
        .filter(l => athletePlanIds.has(l.planId) && l.completed)
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

    return (
        <section className="section">
            <div className="athlete-profile-header">
                <button className="athlete-profile-back-btn" onClick={onBack}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M10.5 3L5.5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    </svg>
                    Volver a Alumnos
                </button>
                <div className="athlete-profile-identity">
                    <div className="athlete-avatar athlete-avatar-lg">{athlete.avatar}</div>
                    <div>
                        <div className="athlete-name athlete-profile-name">{athlete.name}</div>
                        <div className="athlete-email">{athlete.email}</div>
                    </div>
                </div>
            </div>

            <div className="stats-row">
                <StatCard value={athlete.sessions} label="Sesiones totales" accent="blue" />
                <StatCard value={athlete.routines} label="Rutinas asignadas" accent="lime" />
                <StatCard value={formatDate(athlete.lastSession)} label="Última sesión" accent="green" />
            </div>

            <div className="profile-section">
                <div className="profile-section-header">
                    <h2 className="profile-section-title">Planificación</h2>
                    <button className="btn btn-primary btn-sm" onClick={onOpenPlanification}>
                        + Agregar Planificación
                    </button>
                </div>
                {planifications.length === 0 ? (
                    <p className="profile-empty">No hay planificaciones asignadas.</p>
                ) : (
                    <div className="assigned-routines-list">
                        {planifications.map(p => (
                            <div key={p.id} className="assigned-routine-row">
                                <div className="assigned-routine-info">
                                    <span className="assigned-routine-name">{p.name}</span>
                                    <span className="assigned-routine-meta">
                                        {p.weeks} semanas · {(p.weekDays?.[0] ?? p.days ?? []).length} días
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => onViewPlanification(p)}
                                    >
                                        Ver
                                    </button>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => onDeletePlanification(p.id)}
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="profile-section">
                <div className="profile-section-header">
                    <h2 className="profile-section-title">Sesiones del plan</h2>
                </div>
                {planifications.length === 0 ? (
                    <p className="profile-empty">Sin planificación asignada.</p>
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
                                        {(plan.weekDays?.[w] ?? plan.days ?? []).map(day => {
                                            const log = sessionLogs.find(
                                                l => l.planId === plan.id && l.week === w + 1 && l.dayNumber === day.dayNumber && l.completed
                                            );
                                            return (
                                                <div key={`${plan.id}-${w}-${day.dayNumber}`} className="plan-session-card">
                                                    <div className="plan-session-card-label">Día {day.dayNumber}</div>
                                                    <div className="plan-session-card-blocks">
                                                        {day.blocks.map(block => (
                                                            <div key={block.label} className="plan-session-block">
                                                                {block.exercises.map((ex, i) => {
                                                                    const rpeKey = log?.exerciseSummaries?.find(s => s.position === ex.position)?.rpe || '';
                                                                    const rpeClass = RPE_CLASSES[rpeKey] || '';
                                                                    return (
                                                                        <div key={i} className={`plan-session-exercise ${rpeClass}`}>
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
                                                                })}
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
                    ))
                )}
            </div>

            <div className="profile-section">
                <div className="profile-section-header">
                    <h2 className="profile-section-title">Historial de sesiones</h2>
                </div>
                {completedLogs.length === 0 ? (
                    <p className="profile-empty">Sin sesiones completadas.</p>
                ) : (
                    <div className="session-history-list">
                        <div className="session-history-header">
                            <span>Fecha</span>
                            <span>Plan</span>
                            <span>Semana / Día</span>
                        </div>
                        {completedLogs.map(log => {
                            const plan = planifications.find(p => p.id === log.planId);
                            return (
                                <div key={log.id} className="session-history-row">
                                    <span>{formatDate(log.completedAt.slice(0, 10))}</span>
                                    <span>{plan?.name || '—'}</span>
                                    <span>Semana {log.week} — Día {log.dayNumber}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}
