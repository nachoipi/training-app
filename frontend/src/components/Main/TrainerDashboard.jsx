// Trainer landing page (`trainer-dashboard` section, default after login). Client-side
// only: the feed is derived from `sessionLogs` (the API already returns every athlete's
// logs to a trainer) joined with `planifications` and the athlete list. A session is
// "Nuevo" until the trainer reviews it (log.reviewedAt, stored in its own DB column).
// Clicking a card opens the plan-vs-actual detail (TrainerSessionDetail, same file,
// section `session-detail`) via onOpenSessionDetail.
import React, { useState, useEffect } from 'react';
import { formatDate } from '../../utils/helpers.js';
import { StatCard } from '../Common/index.jsx';
import { Icon } from '../Icon/index.jsx';
import { SessionLogDetail } from './SessionLogDetail.jsx';
import { userService } from '../../services/userService.js';
import '../../styles/trainer-dashboard.css';
import { SectionTitle } from '../TopBar/SectionTitle.jsx';

const FEED_LIMIT = 20;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Rounded mean of the athlete's per-exercise RPE (1-4); null when none was rated.
function averageRpe(log) {
    const rpes = (log.exerciseSummaries || []).map(s => Number(s.rpe)).filter(n => n > 0);
    return rpes.length ? Math.round(rpes.reduce((a, b) => a + b, 0) / rpes.length) : null;
}

export function TrainerDashboard({ user, planifications = [], sessionLogs = [], onOpenSessionDetail, onNavigate, onShowToast }) {
    const [athletes, setAthletes] = useState([]);

    useEffect(() => {
        userService.listAthletes()
            .then(r => setAthletes(r.data))
            .catch(err => onShowToast && onShowToast(err.message, 'error'));
    }, []);

    // Only logs the athlete closed; drafts (completed=false) are not feed items.
    const completed = sessionLogs
        .filter(l => l.completed && l.completedAt)
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

    const pending = completed.filter(l => !l.reviewedAt).length;
    const thisWeek = completed.filter(l => Date.now() - new Date(l.completedAt).getTime() <= WEEK_MS).length;
    const feed = completed.slice(0, FEED_LIMIT);

    const planOf = id => planifications.find(p => p.id === id);
    const athleteOf = log => athletes.find(a => a.id === (log.athleteId ?? planOf(log.planId)?.athleteId));

    return (
        <section className="section">
            <SectionTitle title={`Hola, ${user?.name?.split(' ')[0] || 'coach'}`} subtitle="Lo último que hicieron tus alumnos" />
            <div className="section-header">
                <div className="section-header-actions">
                    <button className="btn btn-secondary" onClick={() => onNavigate('athletes')}>
                        <Icon name="users" size={16} /> Ver alumnos
                    </button>
                </div>
            </div>

            <div className="stats-row">
                <StatCard value={pending} label="Sesiones sin revisar" accent="lime" />
                <StatCard value={thisWeek} label="Sesiones esta semana" accent="green" />
                <StatCard value={athletes.length} label="Alumnos activos" accent="blue" />
            </div>

            <div className="profile-section">
                <div className="profile-section-header">
                    <h2 className="profile-section-title">Sesiones recientes</h2>
                </div>
                {feed.length === 0 ? (
                    <p className="profile-empty">Todavía no hay sesiones completadas por tus alumnos.</p>
                ) : (
                    <div className="trainer-feed">
                        {feed.map(log => {
                            const athlete = athleteOf(log);
                            const plan = planOf(log.planId);
                            const rpe = averageRpe(log);
                            const note = log.sessionSummary?.comment;
                            return (
                                <button
                                    key={`${log.planId}-${log.week}-${log.dayNumber}`}
                                    className={`trainer-feed-card${log.reviewedAt ? '' : ' is-new'}`}
                                    onClick={() => onOpenSessionDetail(log)}
                                >
                                    <div className="athlete-avatar athlete-avatar-sm">{athlete?.avatar || '?'}</div>
                                    <div className="trainer-feed-main">
                                        <div className="trainer-feed-title">
                                            <span className="trainer-feed-athlete">{athlete?.name || 'Alumno'}</span>
                                            {!log.reviewedAt && <span className="trainer-feed-badge">Nuevo</span>}
                                        </div>
                                        <div className="trainer-feed-meta">
                                            {plan?.name || '—'} · Semana {log.week} · Día {log.dayNumber} · {formatDate(log.completedAt.slice(0, 10))}
                                        </div>
                                        {note && <div className="trainer-feed-note">"{note}"</div>}
                                    </div>
                                    {rpe && <span className={`session-history-rpe-badge session-rpe-${rpe}`}>RPE {rpe}</span>}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}

// `session-detail` screen: one completed session, plan vs actual, with the review box.
// `log` is resolved live from Dashboard's sessionLogs, so marking it reviewed updates it here.
export function TrainerSessionDetail({ log, plan, onBack, onReview, onShowToast }) {
    const [athlete, setAthlete] = useState(null);

    useEffect(() => {
        userService.listAthletes()
            .then(r => setAthlete(r.data.find(a => a.id === (log.athleteId ?? plan?.athleteId)) ?? null))
            .catch(err => onShowToast && onShowToast(err.message, 'error'));
    }, [log.athleteId]);

    return (
        <section className="section">
            <div className="athlete-profile-header">
                <button className="athlete-profile-back-btn" onClick={onBack}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M10.5 3L5.5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    </svg>
                    Volver al Inicio
                </button>
                <div className="athlete-profile-identity">
                    <div className="athlete-avatar athlete-avatar-lg">{athlete?.avatar || '?'}</div>
                    <div>
                        <div className="athlete-name athlete-profile-name">{athlete?.name || 'Alumno'}</div>
                        <div className="athlete-email">
                            {plan?.name || '—'} · Semana {log.week} · Día {log.dayNumber}
                            {log.completedAt ? ` · ${formatDate(log.completedAt.slice(0, 10))}` : ''}
                        </div>
                    </div>
                </div>
            </div>
            <div className="session-detail-card">
                <SessionLogDetail log={log} plan={plan} onReview={onReview} />
            </div>
        </section>
    );
}
