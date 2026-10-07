// Athlete "Inicio" screen — the default landing page for athletes. Everything
// shown here is derived client-side from the `planifications` and `sessionLogs`
// arrays that Dashboard.jsx already loads, so it adds no API calls. Rendered by
// Main/index.jsx under the `my-dashboard` section.

import React from 'react';
import { Icon } from '../Icon/index.jsx';
import { formatDate } from '../../utils/helpers.js';
import '../../styles/athlete-dashboard.css';

const RPE_LABELS = { '1': 'Fácil', '2': 'Moderado', '3': 'Difícil', '4': 'Máximo' };

// Flatten a plan into ordered { week, day } entries (week is 1-based to match
// session_logs.week). `plan.days` is the legacy single-week format that older
// planifications still use, so the fallback must stay.
function getPlanDays(plan) {
    const out = [];
    for (let w = 0; w < plan.weeks; w++) {
        for (const day of (plan.weekDays?.[w] ?? plan.days ?? [])) out.push({ week: w + 1, day });
    }
    return out;
}

function isDone(logs, planId, { week, day }) {
    return logs.some(l => l.planId === planId && l.week === week && l.dayNumber === day.dayNumber && l.completed);
}

// The API returns plans newest-first. Focus on the newest plan that still has
// pending days; if everything is finished fall back to the newest plan so the
// screen still shows its (100%) progress instead of an empty state.
function getActivePlan(planifications, logs) {
    return planifications.find(p => getPlanDays(p).some(d => !isDone(logs, p.id, d)))
        || planifications[0]
        || null;
}

// Monday-based start of the current week, for the "esta semana" counter.
function startOfWeek() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d;
}

function computeStats(plan, logs) {
    const planLogs = logs.filter(l => l.planId === plan.id && l.completed);
    // Empty/missing RPE values are skipped so unrated exercises don't drag the average to 0.
    const rpes = planLogs
        .flatMap(l => l.exerciseSummaries || [])
        .map(s => Number(s.rpe))
        .filter(n => n > 0);
    const weekStart = startOfWeek();
    return {
        thisWeek: planLogs.filter(l => l.completedAt && new Date(l.completedAt) >= weekStart).length,
        avgRpe: rpes.length ? (rpes.reduce((a, b) => a + b, 0) / rpes.length).toFixed(1) : '—',
    };
}

export function AthleteDashboard({ user, planifications = [], sessionLogs = [], onOpenSession, onNavigate }) {
    const firstName = (user?.name || '').split(' ')[0];
    const plan = getActivePlan(planifications, sessionLogs);

    const header = (
        <div className="section-header">
            <div>
                <h1 className="section-title">Hola{firstName ? `, ${firstName}` : ''}</h1>
                <p className="section-subtitle">Tu resumen de entrenamiento</p>
            </div>
        </div>
    );

    if (!plan) {
        return (
            <section className="section">
                {header}
                <p className="profile-empty">Todavía no tenés una planificación asignada.</p>
            </section>
        );
    }

    const allDays = getPlanDays(plan);
    const completed = allDays.filter(d => isDone(sessionLogs, plan.id, d)).length;
    const percent = allDays.length ? Math.round((completed / allDays.length) * 100) : 0;
    const next = allDays.find(d => !isDone(sessionLogs, plan.id, d));
    const { thisWeek, avgRpe } = computeStats(plan, sessionLogs);

    const weekProgress = Array.from({ length: plan.weeks }, (_, w) => {
        const days = allDays.filter(d => d.week === w + 1);
        const done = days.filter(d => isDone(sessionLogs, plan.id, d)).length;
        return { week: w + 1, done, total: days.length };
    });

    // Recent activity spans every plan, not just the active one.
    const recent = sessionLogs
        .filter(l => l.completed && l.completedAt)
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
        .slice(0, 5);
    const planName = id => planifications.find(p => p.id === id)?.name || 'Plan';

    return (
        <section className="section athlete-dashboard">
            {header}

            <div className="dash-hero">
                <div className="dash-hero-label">{plan.name}</div>
                {next ? (
                    <>
                        <div className="dash-hero-title">Próxima sesión: Semana {next.week} · Día {next.day.dayNumber}</div>
                        <button
                            className="btn btn-primary"
                            onClick={() => onOpenSession({ plan, week: next.week, day: next.day })}
                        >
                            Realizar sesión
                        </button>
                    </>
                ) : (
                    <div className="dash-hero-title">¡Completaste toda la planificación!</div>
                )}
            </div>

            <div className="stats-row">
                <div className="stat-card accent-lime">
                    <div className="stat-value">{percent}%</div>
                    <div className="stat-label">Progreso del plan</div>
                </div>
                <div className="stat-card accent-blue">
                    <div className="stat-value">{thisWeek}</div>
                    <div className="stat-label">Esta semana</div>
                </div>
                <div className="stat-card accent-green">
                    <div className="stat-value">{completed}/{allDays.length}</div>
                    <div className="stat-label">Sesiones completas</div>
                </div>
                <div className="stat-card accent-orange">
                    <div className="stat-value">{avgRpe}</div>
                    <div className="stat-label">RPE promedio</div>
                </div>
            </div>

            <div className="dash-grid">
                <div className="dash-card">
                    <div className="dash-card-title">Progreso por semana</div>
                    {weekProgress.map(w => (
                        <div key={w.week} className="dash-week-row">
                            <span className="dash-week-label">Semana {w.week}</span>
                            <div className="dash-bar">
                                <div className="dash-bar-fill" style={{ width: `${w.total ? (w.done / w.total) * 100 : 0}%` }} />
                            </div>
                            <span className="dash-week-count">{w.done}/{w.total}</span>
                        </div>
                    ))}
                </div>

                <div className="dash-card">
                    <div className="dash-card-title">Actividad reciente</div>
                    {recent.length === 0 ? (
                        <p className="profile-empty">Aún no completaste sesiones.</p>
                    ) : recent.map(l => {
                        const rpes = (l.exerciseSummaries || []).map(s => Number(s.rpe)).filter(n => n > 0);
                        const avg = rpes.length ? Math.round(rpes.reduce((a, b) => a + b, 0) / rpes.length) : null;
                        return (
                            <div key={`${l.planId}-${l.week}-${l.dayNumber}`} className="dash-activity-row">
                                <div>
                                    <div className="dash-activity-name">{planName(l.planId)} · S{l.week} D{l.dayNumber}</div>
                                    <div className="dash-activity-date">{formatDate(l.completedAt.slice(0, 10))}</div>
                                </div>
                                {avg && <span className={`session-rpe-${avg} dash-rpe-badge`}>{RPE_LABELS[avg]}</span>}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="dash-links">
                <button className="btn btn-secondary" onClick={() => onNavigate('my-plan')}>
                    <Icon name="calendar" size={16} /> Ver Mi Plan
                </button>
                <button className="btn btn-secondary" onClick={() => onNavigate('my-sessions')}>
                    <Icon name="calendar-check" size={16} /> Mis Sesiones
                </button>
            </div>
        </section>
    );
}
