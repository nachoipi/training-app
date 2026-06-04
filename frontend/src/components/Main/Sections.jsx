import React, { useState } from 'react';
import { formatDate, calcStreak } from '../../utils/helpers.js';
import { StatCard, EmptyState } from '../Common/index.jsx';
import { RoutineCard, SessionCard, ExerciseCard } from '../Cards/index.jsx';
import { BarChart, DurationChart, Heatmap } from '../Charts/index.jsx';
import { DAYS } from '../../utils/constants.js';

export function RoutinesSection({ routines, sessions, user, onNewRoutine, onOpenDetail }) {
    const lastSession = [...sessions].sort((a, b) => b.date.localeCompare(a.date))[0];
    const totalExercises = routines.reduce((s, r) => s + r.exercises.length, 0);
    const isTrainer = user && user.role === 'trainer';

    return (
        <section className="section">
            <div className="section-header">
                <div>
                    <h1 className="section-title">Rutinas</h1>
                    <p className="section-subtitle">Organizá tus planes de entrenamiento</p>
                </div>
                {isTrainer && (
                    <button className="btn btn-primary" onClick={onNewRoutine}>+ Nueva Rutina</button>
                )}
            </div>

            <div className="stats-row">
                <StatCard value={routines.length} label="Rutinas activas" />
                <StatCard value={totalExercises} label="Ejercicios en total" />
                <StatCard value={lastSession ? formatDate(lastSession.date) : '—'} label="Última sesión" />
            </div>

            {routines.length === 0 ? (
                isTrainer ? (
                    <EmptyState
                        icon="📋" title="Sin rutinas todavía"
                        subtitle="Creá la primera rutina para tus alumnos"
                        onAction={onNewRoutine} actionLabel="+ Nueva Rutina"
                    />
                ) : (
                    <EmptyState
                        icon="📋" title="Aún no tenés rutinas asignadas"
                        subtitle="Tu entrenador te asignará un plan pronto"
                    />
                )
            ) : (
                <div className="routines-grid">
                    {routines.map(r => (
                        <RoutineCard key={r.id} routine={r} onClick={() => onOpenDetail(r)} />
                    ))}
                </div>
            )}
        </section>
    );
}

export function SessionsSection({ sessions, onLogSession, onDeleteSession }) {
    const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const thisWeek = sessions.filter(s => new Date(s.date + 'T12:00:00') >= weekStart).length;
    const streak = calcStreak(sessions);

    return (
        <section className="section">
            <div className="section-header">
                <div>
                    <h1 className="section-title">Registro</h1>
                    <p className="section-subtitle">Seguí cada sesión de entrenamiento</p>
                </div>
                <button className="btn btn-primary" onClick={onLogSession}>+ Registrar Sesión</button>
            </div>

            <div className="stats-row">
                <StatCard value={sessions.length} label="Sesiones totales" accent="green" />
                <StatCard value={thisWeek} label="Esta semana" accent="blue" />
                <StatCard value={streak} label="Racha (días)" accent="orange" />
            </div>

            {sorted.length === 0 ? (
                <EmptyState
                    icon="🏋️" title="Sin sesiones registradas"
                    subtitle="Registrá tu primer entrenamiento hoy"
                    onAction={onLogSession} actionLabel="+ Registrar Sesión"
                />
            ) : (
                <div className="sessions-list">
                    {sorted.map(s => (
                        <SessionCard key={s.id} session={s} onDelete={onDeleteSession} />
                    ))}
                </div>
            )}
        </section>
    );
}

export function ProgressSection({ sessions, progressPeriod, onChangePeriod }) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - progressPeriod);
    const filtered = sessions.filter(s => new Date(s.date + 'T12:00:00') >= cutoff);

    const avgPerWeek = ((filtered.length / (progressPeriod / 7))).toFixed(1);
    const totalMinutes = filtered.reduce((s, se) => s + (se.duration || 0), 0);
    const bestStreak = calcStreak(sessions);

    return (
        <section className="section">
            <div className="section-header">
                <div>
                    <h1 className="section-title">Progreso</h1>
                    <p className="section-subtitle">Visualizá tu evolución en el tiempo</p>
                </div>
                <select
                    className="select-filter"
                    value={progressPeriod}
                    onChange={e => onChangePeriod(parseInt(e.target.value))}
                >
                    <option value="7">7 días</option>
                    <option value="30">30 días</option>
                    <option value="90">3 meses</option>
                </select>
            </div>

            {sessions.length === 0 ? (
                <EmptyState
                    icon="📈" title="Sin datos de progreso"
                    subtitle="Registrá algunas sesiones para ver tus estadísticas"
                />
            ) : (
                <>
                    <div className="stats-row">
                        <StatCard value={avgPerWeek} label="Sesiones / semana" accent="purple" />
                        <StatCard value={bestStreak} label="Mejor racha" accent="green" />
                        <StatCard value={totalMinutes} label="Minutos totales" accent="blue" />
                    </div>

                    <div className="charts-grid">
                        <div className="chart-card">
                            <h3 className="chart-title">Sesiones por día</h3>
                            <BarChart sessions={filtered} period={progressPeriod} color="var(--accent)" />
                        </div>
                        <div className="chart-card">
                            <h3 className="chart-title">Duración promedio (min)</h3>
                            <DurationChart sessions={filtered} period={progressPeriod} />
                        </div>
                    </div>

                    <div className="chart-card full-width">
                        <h3 className="chart-title">Actividad — últimos 90 días</h3>
                        <Heatmap sessions={sessions} />
                    </div>
                </>
            )}
        </section>
    );
}

export function ExercisesSection({ exercises, user, muscleFilter, onFilterChange, onNewExercise, onEditExercise, onDeleteExercise }) {
    const [search, setSearch] = useState('');
    const isTrainer = user && user.role === 'trainer';
    const muscles = ['all', 'pecho', 'espalda', 'piernas', 'hombros', 'brazos', 'core'];
    const muscleLabels = { all: 'Todos', pecho: 'Pecho', espalda: 'Espalda', piernas: 'Piernas', hombros: 'Hombros', brazos: 'Brazos', core: 'Core' };

    // Matches the chip against either primary or secondary muscles so a chest
    // exercise that also targets shoulders shows up under the Hombros chip.
    const filtered = exercises.filter(e => {
        const tags = [...(e.primaryMuscles || []), ...(e.secondaryMuscles || [])];
        const matchMuscle = muscleFilter === 'all' || tags.includes(muscleFilter);
        const haystack = `${e.name} ${e.secondName || ''} ${e.desc || ''}`.toLowerCase();
        const matchSearch = !search || haystack.includes(search.toLowerCase());
        return matchMuscle && matchSearch;
    });

    return (
        <section className="section">
            <div className="section-header">
                <div>
                    <h1 className="section-title">Ejercicios</h1>
                    <p className="section-subtitle">Biblioteca de ejercicios disponibles</p>
                </div>
                {isTrainer && (
                    <button className="btn btn-primary" onClick={onNewExercise}>+ Agregar Ejercicio</button>
                )}
            </div>

            <div className="search-filter-row">
                <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Buscar ejercicio..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="filter-chips">
                    {muscles.map(m => (
                        <button
                            key={m}
                            className={`chip ${muscleFilter === m ? 'active' : ''}`}
                            onClick={() => onFilterChange(m)}
                        >
                            {muscleLabels[m]}
                        </button>
                    ))}
                </div>
            </div>

            {filtered.length === 0 ? (
                <EmptyState icon="🔍" title="Sin resultados" subtitle="Probá con otro filtro" />
            ) : (
                <div className="exercises-grid">
                    {filtered.map(e => (
                        <ExerciseCard
                            key={e.id}
                            exercise={e}
                            canEdit={isTrainer && !e.builtIn}
                            canDelete={isTrainer && !e.builtIn}
                            onEdit={onEditExercise}
                            onDelete={onDeleteExercise}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

