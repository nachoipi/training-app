// Trainer-side athlete profile. Shows stats, assigned planifications, a plan
// session grid (weeks × days with RPE colouring), and the full session history
// accordion where each completed log expands to show prescribed vs actual loads.
// Expanded history cards also show the athlete's session summary (date/time, duration,
// self-evaluation, effort, comment) when they filled it in.
// Each assigned plan can also be copied (same or another athlete) via the Copiar dialog.
// The expanded history body is the shared SessionLogDetail (also used by the trainer dashboard).
import React, { useState, useEffect } from 'react';
import { userService } from '../../services/userService.js';
import { formatDate, formatCarga } from '../../utils/helpers.js';
import { StatCard } from '../Common/index.jsx';
import { SessionLogDetail, RPE_CLASSES } from './SessionLogDetail.jsx';

export function AthleteProfile({ athlete, planifications, sessionLogs, onBack, onOpenPlanification, onViewPlanification, onDeletePlanification, onCopyPlanification, onReviewSessionLog, onShowToast }) {
    const athletePlanIds = new Set(planifications.map(p => p.id));
    const completedLogs = (sessionLogs || [])
        .filter(l => athletePlanIds.has(l.planId) && l.completed)
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

    const [expandedLogId, setExpandedLogId] = useState(null);

    // Copy dialog: `copyFrom` is the plan being copied (null = closed). The athlete list is
    // fetched when the dialog opens so the plan can be copied to any of the trainer's athletes.
    const [copyFrom, setCopyFrom] = useState(null);
    const [copyName, setCopyName] = useState('');
    const [copyTarget, setCopyTarget] = useState(athlete.id);
    const [allAthletes, setAllAthletes] = useState([]);
    const [copying, setCopying] = useState(false);

    useEffect(() => {
        if (!copyFrom) return;
        userService.listAthletes()
            .then(r => setAllAthletes(r.data))
            .catch(err => onShowToast && onShowToast(err.message, 'error'));
    }, [copyFrom]);

    function openCopy(plan) {
        setCopyFrom(plan);
        setCopyName(`${plan.name} (copia)`);
        setCopyTarget(athlete.id);
    }

    async function confirmCopy() {
        if (!copyName.trim()) { onShowToast('Ingresá un nombre para la copia', 'error'); return; }
        setCopying(true);
        try {
            await onCopyPlanification({ plan: copyFrom, athleteId: copyTarget, name: copyName.trim() });
            setCopyFrom(null);
        } catch (err) {
            onShowToast(err.message, 'error');
        } finally {
            setCopying(false);
        }
    }

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
                                        onClick={() => openCopy(p)}
                                    >
                                        Copiar
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
                        {completedLogs.map(log => {
                            const plan = planifications.find(p => p.id === log.planId);
                            const isOpen = expandedLogId === log.id;

                            return (
                                <div key={log.id} className={`session-history-card ${isOpen ? 'session-history-card--open' : ''}`}>
                                    <button
                                        className="session-history-card-header"
                                        onClick={() => setExpandedLogId(isOpen ? null : log.id)}
                                        aria-expanded={isOpen}
                                    >
                                        <span className="session-history-card-date">{formatDate(log.completedAt.slice(0, 10))}</span>
                                        <span className="session-history-card-meta">
                                            <span className="session-history-card-plan">{plan?.name || '—'}</span>
                                            <span className="session-history-card-week">Semana {log.week} — Día {log.dayNumber}</span>
                                        </span>
                                        <svg
                                            className="session-history-card-chevron"
                                            width="16" height="16" viewBox="0 0 16 16" fill="none"
                                        >
                                            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </button>

                                    {isOpen && <SessionLogDetail log={log} plan={plan} onReview={onReviewSessionLog} />}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {copyFrom && (
                <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget && !copying) setCopyFrom(null); }}>
                    <div className="modal">
                        <div className="modal-header"><h2>Copiar planificación</h2></div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Nombre de la copia</label>
                                <input className="form-input" value={copyName} onChange={e => setCopyName(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Copiar a</label>
                                <select className="form-input" value={copyTarget} onChange={e => setCopyTarget(e.target.value)}>
                                    {allAthletes.length === 0 && <option value={athlete.id}>{athlete.name}</option>}
                                    {allAthletes.map(a => (
                                        <option key={a.id} value={a.id}>{a.name}{a.id === athlete.id ? ' (este alumno)' : ''}</option>
                                    ))}
                                </select>
                            </div>
                            <p className="profile-empty">Se copian semanas, días, bloques y ejercicios. El progreso del alumno no se copia.</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary btn-sm" onClick={() => setCopyFrom(null)} disabled={copying}>Cancelar</button>
                            <button className="btn btn-primary btn-sm" onClick={confirmCopy} disabled={copying}>
                                {copying ? 'Copiando…' : 'Copiar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
