import React from 'react';
import { getDayMonth, formatDate } from '../../utils/helpers.js';
import { INTENSITY_LABELS, TYPE_ICONS } from '../../utils/constants.js';

export function RoutineCard({ routine, onClick }) {
    return (
        <div className="routine-card" onClick={onClick}>
            <div className="routine-card-header">
                <span className="routine-name">{routine.name}</span>
            </div>
            <div className="routine-days">
                {(routine.days || []).map(d => (
                    <span key={d} className="day-tag">{d}</span>
                ))}
            </div>
            <div className="routine-exercise-count">
                {routine.exercises.length} ejercicio{routine.exercises.length !== 1 ? 's' : ''}
            </div>
            {routine.desc && <p className="routine-desc">{routine.desc}</p>}
        </div>
    );
}

export function SessionCard({ session, onDelete }) {
    const { day, month } = getDayMonth(session.date);
    return (
        <div className="session-card">
            <div className="session-date-block">
                <div className="session-day">{day}</div>
                <div className="session-month">{month}</div>
            </div>
            <div className="session-info">
                <div className="session-routine-name">{session.routineName || 'Sesión libre'}</div>
                {session.duration && (
                    <div className="session-meta">⏱ {session.duration} min</div>
                )}
                {session.notes && (
                    <div className="session-notes">{session.notes}</div>
                )}
            </div>
            <span className={`intensity-badge intensity-${session.intensity || 2}`}>
                {INTENSITY_LABELS[session.intensity || 2]}
            </span>
            <button className="btn-delete-session" onClick={() => onDelete(session.id)} title="Eliminar">🗑</button>
        </div>
    );
}

export function ExerciseCard({ exercise, canDelete, onDelete }) {
    return (
        <div className="exercise-card">
            <div className="exercise-card-top">
                <div className="exercise-card-name">{exercise.name}</div>
                <span className={`muscle-badge muscle-${exercise.muscle}`}>{exercise.muscle}</span>
            </div>
            <div className="exercise-type-tag">{TYPE_ICONS[exercise.type] || exercise.type}</div>
            {exercise.desc && <p className="exercise-desc">{exercise.desc}</p>}
            {canDelete && (
                <div style={{ marginTop: '10px' }}>
                    <button className="btn btn-danger btn-sm" onClick={() => onDelete(exercise.id)}>
                        Eliminar
                    </button>
                </div>
            )}
        </div>
    );
}
