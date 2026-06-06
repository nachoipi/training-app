import React from 'react';
import { getDayMonth, formatDate } from '../../utils/helpers.js';
import { INTENSITY_LABELS, TYPE_ICONS, MUSCLE_LABELS, EQUIPMENT_LABELS } from '../../utils/constants.js';
import { Icon } from '../Icon/index.jsx';

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
                <Icon name={INTENSITY_LABELS[session.intensity || 2].icon} size={14} /> {INTENSITY_LABELS[session.intensity || 2].label}
            </span>
            <button className="btn-delete-session" onClick={() => onDelete(session.id)} title="Eliminar" aria-label="Eliminar">
                <Icon name="trash" size={16} />
            </button>
        </div>
    );
}

export function ExerciseCard({ exercise, canEdit, canDelete, onEdit, onDelete }) {
    const primary = exercise.primaryMuscles || [];
    const secondary = exercise.secondaryMuscles || [];
    const equipmentLabel = exercise.equipment ? (EQUIPMENT_LABELS[exercise.equipment] || exercise.equipment) : null;

    return (
        <div className="exercise-card">
            <div className="exercise-card-top">
                <div className="exercise-card-name-block">
                    <div className="exercise-card-name">{exercise.name}</div>
                    {exercise.secondName && (
                        <div className="exercise-card-second-name">{exercise.secondName}</div>
                    )}
                </div>
                <div className="muscle-badge-group">
                    {primary.map(m => (
                        <span key={`p-${m}`} className={`muscle-badge muscle-${m}`}>{MUSCLE_LABELS[m] || m}</span>
                    ))}
                </div>
            </div>
            <div className="exercise-card-meta">
                <span className="exercise-type-tag">
                    {TYPE_ICONS[exercise.type] ? (
                        <><Icon name={TYPE_ICONS[exercise.type].icon} size={14} /> {TYPE_ICONS[exercise.type].label}</>
                    ) : exercise.type}
                </span>
                {equipmentLabel && (
                    <span className="exercise-equipment-tag">
                        <Icon name="wrench" size={14} /> {equipmentLabel}
                    </span>
                )}
            </div>
            {secondary.length > 0 && (
                <div className="muscle-badge-group muscle-badge-group--secondary">
                    {secondary.map(m => (
                        <span key={`s-${m}`} className={`muscle-badge muscle-badge--secondary muscle-${m}`}>{MUSCLE_LABELS[m] || m}</span>
                    ))}
                </div>
            )}
            {exercise.desc && <p className="exercise-desc">{exercise.desc}</p>}
            {(canEdit || canDelete) && (
                <div className="exercise-card-actions">
                    {canEdit && (
                        <button className="btn btn-secondary btn-sm" onClick={() => onEdit(exercise)}>
                            Editar
                        </button>
                    )}
                    {canDelete && (
                        <button className="btn btn-danger btn-sm" onClick={() => onDelete(exercise.id)}>
                            Eliminar
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
