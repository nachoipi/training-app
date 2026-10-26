import React, { useState } from 'react';
import { formatDate, calcStreak } from '../../utils/helpers.js';
import { StatCard, EmptyState } from '../Common/index.jsx';
import { RoutineCard, SessionCard, ExerciseRow } from '../Cards/index.jsx';
import { BarChart, DurationChart, Heatmap } from '../Charts/index.jsx';
import { Icon } from '../Icon/index.jsx';
import { DAYS, TYPE_ICONS, EQUIPMENT_OPTIONS, MUSCLE_OPTIONS } from '../../utils/constants.js';
import { SectionTitle } from '../TopBar/SectionTitle.jsx';

export function RoutinesSection({ routines, sessions, user, onNewRoutine, onOpenDetail }) {
    const lastSession = [...sessions].sort((a, b) => b.date.localeCompare(a.date))[0];
    const totalExercises = routines.reduce((s, r) => s + r.exercises.length, 0);
    const isTrainer = user && user.role === 'trainer';

    return (
        <section className="section">
            <SectionTitle title="Rutinas" subtitle="Organizá tus planes de entrenamiento" />
            <div className="section-header">
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
                        icon="clipboard" title="Sin rutinas todavía"
                        subtitle="Creá la primera rutina para tus alumnos"
                        onAction={onNewRoutine} actionLabel="+ Nueva Rutina"
                    />
                ) : (
                    <EmptyState
                        icon="clipboard" title="Aún no tenés rutinas asignadas"
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
            <SectionTitle title="Registro" subtitle="Seguí cada sesión de entrenamiento" />
            <div className="section-header">
                <button className="btn btn-primary" onClick={onLogSession}>+ Registrar Sesión</button>
            </div>

            <div className="stats-row">
                <StatCard value={sessions.length} label="Sesiones totales" accent="green" />
                <StatCard value={thisWeek} label="Esta semana" accent="blue" />
                <StatCard value={streak} label="Racha (días)" accent="orange" />
            </div>

            {sorted.length === 0 ? (
                <EmptyState
                    icon="barbell" title="Sin sesiones registradas"
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
            <SectionTitle title="Progreso" subtitle="Visualizá tu evolución en el tiempo" />
            <div className="section-header">
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
                    icon="chart-up" title="Sin datos de progreso"
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
    const [sortDir, setSortDir] = useState('asc'); // name column: 'asc' = A→Z, 'desc' = Z→A
    const [typeFilter, setTypeFilter] = useState('all');
    const [equipmentFilter, setEquipmentFilter] = useState('all');
    const isTrainer = user && user.role === 'trainer';

    const filtersActive = muscleFilter !== 'all' || typeFilter !== 'all' || equipmentFilter !== 'all' || search !== '';
    const clearFilters = () => {
        setSearch('');
        setTypeFilter('all');
        setEquipmentFilter('all');
        onFilterChange('all');
    };

    // The muscle filter matches either primary or secondary muscles so a chest
    // exercise that also targets shoulders shows up under Hombros.
    const filtered = exercises
        .filter(e => {
            const tags = [...(e.primaryMuscles || []), ...(e.secondaryMuscles || [])];
            const haystack = `${e.name} ${e.secondName || ''} ${e.desc || ''}`.toLowerCase();
            return (muscleFilter === 'all' || tags.includes(muscleFilter))
                && (typeFilter === 'all' || e.type === typeFilter)
                && (equipmentFilter === 'all' || e.equipment === equipmentFilter)
                && (!search || haystack.includes(search.toLowerCase()));
        })
        .sort((a, b) => {
            const cmp = a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
            return sortDir === 'asc' ? cmp : -cmp;
        });

    const filterSelect = (label, value, onChange, options) => (
        <select className="exercise-filter-select" aria-label={`Filtrar por ${label}`} value={value} onChange={e => onChange(e.target.value)}>
            <option value="all">{label}: todos</option>
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    );

    return (
        <section className="section">
            <SectionTitle title="Ejercicios" subtitle="Biblioteca de ejercicios disponibles" />
            <div className="section-header">
                {isTrainer && (
                    <button className="btn btn-primary" onClick={onNewExercise}>+ Agregar Ejercicio</button>
                )}
            </div>

            <div className="search-filter-row">
                <div className="search-box">
                    <span className="search-icon"><Icon name="search" size={16} /></span>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Buscar ejercicio..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="exercises-count">
                <span>{filtered.length === exercises.length ? `${exercises.length} ejercicios` : `${filtered.length} de ${exercises.length} ejercicios`}</span>
                {filtersActive && <button className="exercises-clear" onClick={clearFilters}>Limpiar filtros</button>}
            </div>

            <div className="exercise-list-head">
                <button
                    className="exercise-sort-btn"
                    onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
                    aria-label={`Ordenar por nombre, ${sortDir === 'asc' ? 'de la A a la Z' : 'de la Z a la A'}`}
                >
                    Ejercicio <span className="exercise-sort-dir">{sortDir === 'asc' ? 'A → Z' : 'Z → A'}</span>
                </button>
                {filterSelect('Tipo', typeFilter, setTypeFilter, Object.entries(TYPE_ICONS).map(([value, t]) => ({ value, label: t.label })))}
                {filterSelect('Equipamiento', equipmentFilter, setEquipmentFilter, EQUIPMENT_OPTIONS)}
                {filterSelect('Músculo', muscleFilter, onFilterChange, MUSCLE_OPTIONS)}
            </div>

            {filtered.length === 0 ? (
                <EmptyState icon="search" title="Sin resultados" subtitle="Probá con otro filtro" />
            ) : (
                <div className="exercises-rows">
                    {filtered.map(e => (
                        <ExerciseRow
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
