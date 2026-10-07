// Trainer-side athlete profile. Shows stats, assigned planifications, a plan
// session grid (weeks × days with RPE colouring), and the full session history
// accordion where each completed log expands to show prescribed vs actual loads.
// Expanded history cards also show the athlete's session summary (date/time, duration,
// self-evaluation, effort, comment) when they filled it in.
// Each assigned plan can also be copied (same or another athlete) via the Copiar dialog.
import React, { useState, useEffect } from 'react';
import { userService } from '../../services/userService.js';
import { formatDate, formatCarga } from '../../utils/helpers.js';
import { StatCard } from '../Common/index.jsx';
import { SELF_EVALUATION_LABELS } from '../../utils/constants.js';

const RPE_CLASSES = { '1': 'session-rpe-1', '2': 'session-rpe-2', '3': 'session-rpe-3', '4': 'session-rpe-4' };
const RPE_LABELS  = { '1': 'RPE 1', '2': 'RPE 2', '3': 'RPE 3', '4': 'RPE 4' };

// Return the day object from a planification for a given (week, dayNumber) pair.
function findDay(plan, week, dayNumber) {
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

export function AthleteProfile({ athlete, planifications, sessionLogs, onBack, onOpenPlanification, onViewPlanification, onDeletePlanification, onCopyPlanification, onShowToast }) {
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
                            const day  = plan ? findDay(plan, log.week, log.dayNumber) : null;
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

                                    {isOpen && (
                                        <div className="session-history-card-body">
                                            {!day ? (
                                                <p className="session-history-no-detail">Día no encontrado en la planificación.</p>
                                            ) : day.blocks.flatMap(b => b.exercises).length === 0 ? (
                                                <p className="session-history-no-detail">Sin ejercicios en este día.</p>
                                            ) : (
                                                <>
                                                    <div className="session-history-table-header">
                                                        <span>Ejercicio</span>
                                                        <span>Prescripto</span>
                                                        <span>Realizado</span>
                                                        <span>RPE</span>
                                                    </div>
                                                    {day.blocks.flatMap(b => b.exercises).map(ex => {
                                                        const summary  = (log.exerciseSummaries || []).find(s => s.position === ex.position);
                                                        const serieRows = (log.exercises || []).filter(e => e.position === ex.position);
                                                        const rpeKey   = summary?.rpe || '';
                                                        const rpeClass = RPE_CLASSES[rpeKey] || '';

                                                        // Build "actualReps @ actualCarga" strings per serie, skip blanks.
                                                        const actualParts = serieRows
                                                            .sort((a, b) => a.serieIndex - b.serieIndex)
                                                            .map(e => {
                                                                const r = e.actualReps  !== '' && e.actualReps  != null ? e.actualReps  : '—';
                                                                const c = e.actualCarga !== '' && e.actualCarga != null ? e.actualCarga : null;
                                                                return c ? `${r} @ ${c}` : `${r}`;
                                                            });
                                                        const actualStr = actualParts.length ? actualParts.join(' / ') : '—';

                                                        return (
                                                            <div key={ex.position} className={`session-history-table-row ${rpeClass}`}>
                                                                <span className="session-history-ex-name">{ex.exerciseName || '—'}</span>
                                                                <span className="session-history-prescribed">
                                                                    {ex.series || '—'} × {ex.reps || '—'}
                                                                    {ex.carga ? ` @ ${formatCarga(ex)}` : ''}
                                                                </span>
                                                                <span className="session-history-actual">{actualStr}</span>
                                                                <span className="session-history-rpe">
                                                                    {rpeKey
                                                                        ? <span className={`session-history-rpe-badge ${rpeClass}`}>{RPE_LABELS[rpeKey]}</span>
                                                                        : <span className="session-history-rpe-none">—</span>
                                                                    }
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                    {completedLogs.find(l => l.id === log.id)?.exerciseSummaries?.some(s => s.comment) && (
                                                        <div className="session-history-comments">
                                                            {(log.exerciseSummaries || []).filter(s => s.comment).map(s => {
                                                                const ex = day.blocks.flatMap(b => b.exercises).find(e => e.position === s.position);
                                                                return (
                                                                    <div key={s.position} className="session-history-comment-row">
                                                                        <span className="session-history-comment-name">{ex?.exerciseName || '—'}</span>
                                                                        <span className="session-history-comment-text">"{s.comment}"</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            {summaryRows(log.sessionSummary).length > 0 && (
                                                <div className="session-history-comments">
                                                    <div className="session-history-comment-name">Resumen de la sesión</div>
                                                    {summaryRows(log.sessionSummary).map(([label, value]) => (
                                                        <div key={label} className="session-history-comment-row">
                                                            <span className="session-history-comment-name">{label}</span>
                                                            <span className="session-history-comment-text" style={label === 'Comentario' ? undefined : { fontStyle: 'normal' }}>{value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
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
