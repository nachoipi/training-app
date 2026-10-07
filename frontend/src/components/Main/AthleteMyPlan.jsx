// Athlete "Mi Plan" screen. Renders Plan -> Week -> Day accordions for every viewport:
// on mobile weeks and their days stack vertically; on desktop each week is a full-width
// row with its days laid out as columns (layout lives in planification.css). Completed
// weeks turn green; on desktop only they start collapsed (mobile keeps them open). Only
// the upcoming session starts expanded, and each expanded day offers Realizar / Ver Sesión.
// Consumes `planifications` and `sessionLogs` from Dashboard to colorize completed
// exercises by RPE.

import React, { useState, useEffect } from 'react';
import { Icon } from '../Icon/index.jsx';
import { formatCarga } from '../../utils/helpers.js';

const RPE_CLASSES = { '1': 'session-rpe-1', '2': 'session-rpe-2', '3': 'session-rpe-3', '4': 'session-rpe-4' };

// `position` (e.g. "A1") is the join key between the plan entry and the
// saved exerciseSummary on the session log.
function rpeClassFor(log, ex) {
    const key = log?.exerciseSummaries?.find(s => s.position === ex.position)?.rpe || '';
    return RPE_CLASSES[key] || '';
}

// Drops the Carga stat when the exercise has none (formatCarga returns the '—'
// placeholder) and re-splits the grid in two so Series/Reps stay centered.
function ExerciseRow({ ex, rpeClass }) {
    const carga = formatCarga(ex);
    const showCarga = carga !== '—';
    return (
        <div className={`plan-session-exercise ${rpeClass}`}>
            <div className="plan-session-exercise-header">
                <span className="plan-session-exercise-name">{ex.exerciseName || '—'}</span>
            </div>
            <div className="plan-session-exercise-stats" style={showCarga ? undefined : { gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <div className="stat"><span className="stat-label">Series</span><span className="stat-value">{ex.series || '—'}</span></div>
                <div className="stat"><span className="stat-label">Reps</span><span className="stat-value">{ex.reps || '—'}</span></div>
                {showCarga && <div className="stat"><span className="stat-label">Carga</span><span className="stat-value">{carga}</span></div>}
            </div>
        </div>
    );
}

// True on viewports >= 769px (the same breakpoint planification.css uses for the
// desktop week/day layout). Subscribes to changes so a window resize re-renders.
function useIsDesktop() {
    const query = '(min-width: 769px)';
    const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
    useEffect(() => {
        const mq = window.matchMedia(query);
        const onChange = e => setMatches(e.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);
    return matches;
}

// Day card — the same accordion used for the trainer's session history
// (.session-history-card). On mobile every day starts collapsed to a single row; tapping
// it wraps the exercises inside the card body. Completed days keep the green
// Mis Sesiones tint via .assigned-routine-row--completed. `log` is the completed
// session log, or undefined; `isNext` marks the upcoming session, the only day
// that starts expanded. A completed day in a week that is not fully done gets the
// green header + check badge (the body stays dark so the RPE colors read clearly);
// inside a fully done week the week card already carries both, so the day stays dark.
// The upcoming session (`isNext`) shows a "Realizar sesión" button and completed days
// a "Ver Sesión" button, both opening the session screen via `onStart`.
// On desktop days are not accordions: they are always expanded (the week row is the
// only toggle), so the header is static and has no chevron.
function PlanDay({ day, log, isNext, weekDone, onStart }) {
    const done = !!log;
    const desktop = useIsDesktop();
    const [open, setOpen] = useState(!!isNext);
    const expanded = desktop || open;
    const Header = desktop ? 'div' : 'button';
    const headerProps = desktop ? {} : { type: 'button', onClick: () => setOpen(o => !o), 'aria-expanded': open };

    return (
        <div className={`session-history-card${expanded ? ' session-history-card--open' : ''}${done ? ' assigned-routine-row--completed' : ''}${done && !weekDone ? ' plan-stack-day--solo-done' : ''}${desktop ? ' plan-stack-day--static' : ''}`}>
            <Header className="session-history-card-header" {...headerProps}>
                <span className="session-history-card-meta">
                    <span className="assigned-routine-name">Día {day.dayNumber}</span>
                </span>
                {done && !weekDone && (
                    <span className="session-completed-check" title="Sesión completada" aria-label="Sesión completada">
                        <Icon name="check" size={18} />
                    </span>
                )}
                {!desktop && (
                    <svg
                        className="session-history-card-chevron"
                        width="16" height="16" viewBox="0 0 16 16" fill="none"
                        aria-hidden="true"
                    >
                        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                )}
            </Header>
            {expanded && (
                <div className="session-history-card-body plan-stack-day-blocks">
                    {day.blocks.map(block => (
                        // Every block sits in its own labelled box (Bloque A/B…) on all viewports so
                        // supersets read clearly; a dotted line separates the exercises inside it.
                        <div key={block.label} className="plan-session-block">
                            <div className="plan-session-block-label">Bloque {block.label}</div>
                            {block.exercises.map((ex, i) => (
                                <ExerciseRow key={i} ex={ex} rpeClass={rpeClassFor(log, ex)} />
                            ))}
                        </div>
                    ))}
                    {(isNext || done) && onStart && (
                        <button type="button" className={`btn ${done ? 'btn-success' : 'btn-primary'}`} onClick={onStart}>
                            {done ? 'Ver Sesión' : 'Realizar sesión'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// Week card. Same accordion logic as PlanDay one level up: on desktop a week whose
// days are all completed starts collapsed (title + chevron only); every other week,
// and every week on mobile, starts open. The `days.length > 0` guard keeps an empty week from counting as
// "all done". The chevron reuses the session-history class; rotation is driven by `.is-open`
// (not `--open`, which would also flip the nested day chevrons). Fully completed
// weeks also get the green background and the same check badge as a completed session. `nextDayNumber` is set only on the
// week that contains the upcoming session.
function PlanWeek({ number, days, logForDay, nextDayNumber, onStartSession }) {
    const allDone = days.length > 0 && days.every(d => logForDay(d));
    // Collapse-when-done is a desktop-only default (decided once, when the week mounts).
    const desktop = useIsDesktop();
    const [open, setOpen] = useState(!(allDone && desktop));

    return (
        <div className={`plan-stack-week${open ? ' is-open' : ''}${allDone ? ' assigned-routine-row--completed' : ''}`}>
            <button
                type="button"
                className="session-history-card-header"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
            >
                <span className="session-history-card-meta">
                    <span className="plan-stack-week-title">Semana {number}</span>
                </span>
                {allDone && (
                    <span className="session-completed-check" title="Semana completada" aria-label="Semana completada">
                        <Icon name="check" size={18} />
                    </span>
                )}
                <svg
                    className="session-history-card-chevron"
                    width="16" height="16" viewBox="0 0 16 16" fill="none"
                    aria-hidden="true"
                >
                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
            {open && (
                <div className="plan-stack-week-days" style={{ '--days': days.length }}>
                    {days.map(day => (
                        <PlanDay key={day.dayNumber} day={day} log={logForDay(day)} isNext={day.dayNumber === nextDayNumber} weekDone={allDone} onStart={() => onStartSession(day)} />
                    ))}
                </div>
            )}
        </div>
    );
}

export function AthleteMyPlan({ planifications, sessionLogs = [], onOpenSession }) {
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
                    // Upcoming session = the day right after the last completed one in plan
                    // order (the first day if nothing is done yet; none if the last day is done).
                    const ordered = Array.from({ length: plan.weeks }, (_, w) =>
                        (plan.weekDays?.[w] ?? plan.days ?? []).map(day => ({ week: w + 1, day }))
                    ).flat();
                    const lastDone = ordered.reduce((acc, { week, day }, i) =>
                        sessionLogs.some(l => l.planId === plan.id && l.week === week && l.dayNumber === day.dayNumber && l.completed) ? i : acc, -1);
                    const next = ordered[lastDone + 1] || null;
                    const dayLogFor = (w, day) => sessionLogs.find(
                        l => l.planId === plan.id && l.week === w + 1 && l.dayNumber === day.dayNumber && l.completed
                    );
                    return (
                        <div key={plan.id} className="plan-sessions-group">
                            <div className="plan-stack-title">{plan.name}</div>
                            {/* One render for every viewport: weeks are stacked rows; each week lays
                                its days out as columns on desktop (see planification.css). */}
                            <div className="plan-stack-weeks" style={{ '--weeks': plan.weeks }}>
                                {Array.from({ length: plan.weeks }, (_, w) => (
                                    <PlanWeek
                                        key={w}
                                        number={w + 1}
                                        days={plan.weekDays?.[w] ?? plan.days ?? []}
                                        logForDay={day => dayLogFor(w, day)}
                                        nextDayNumber={next && next.week === w + 1 ? next.day.dayNumber : null}
                                        onStartSession={day => onOpenSession?.({ plan, week: w + 1, day })}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })
            )}
        </section>
    );
}
