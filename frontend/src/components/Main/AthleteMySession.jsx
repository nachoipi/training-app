import React, { useState, useEffect } from 'react';
import { uid, formatCarga } from '../../utils/helpers.js';

const RPE_CLASSES = { '1': 'session-rpe-1', '2': 'session-rpe-2', '3': 'session-rpe-3', '4': 'session-rpe-4' };

export function AthleteMySession({ plan, week, day, sessionLog, onBack, onSave, onShowToast }) {
    const [exerciseData, setExerciseData] = useState({});
    const [exerciseSummary, setExerciseSummary] = useState({});
    const [completed, setCompleted] = useState(false);

    useEffect(() => {
        const map = {};
        const summary = {};

        day.blocks.forEach(block => {
            block.exercises.forEach(ex => {
                summary[ex.position] = { comment: '', rpe: '' };
            });
        });

        const hasNewFormat = sessionLog && sessionLog.exercises.some(e => e.serieIndex != null);

        if (hasNewFormat) {
            sessionLog.exercises.forEach(e => {
                map[`${e.position}_s${e.serieIndex}`] = {
                    actualReps: e.actualReps,
                    actualCarga: e.actualCarga,
                    done: e.done ?? false,
                };
            });
            (sessionLog.exerciseSummaries || []).forEach(s => {
                summary[s.position] = { comment: s.comment || '', rpe: s.rpe || '' };
            });
            setCompleted(sessionLog.completed);
        } else {
            day.blocks.forEach(block => {
                block.exercises.forEach(ex => {
                    const repsArr = ex.reps ? String(ex.reps).split(',') : [];
                    for (let s = 1; s <= (ex.series || 1); s++) {
                        const prescribed = (repsArr[s - 1] ?? repsArr[0] ?? '').trim();
                        map[`${ex.position}_s${s}`] = {
                            actualReps: prescribed,
                            actualCarga: ex.carga || '',
                            done: false,
                        };
                    }
                });
            });
            setCompleted(sessionLog ? sessionLog.completed : false);
        }

        setExerciseData(map);
        setExerciseSummary(summary);
    }, [sessionLog, day]);

    function updateField(position, serieIndex, field, value) {
        const key = `${position}_s${serieIndex}`;
        setExerciseData(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
    }

    function step(position, serieIndex, field, delta) {
        const key = `${position}_s${serieIndex}`;
        const current = parseFloat(exerciseData[key]?.[field]) || 0;
        updateField(position, serieIndex, field, String(Math.max(0, current + delta)));
    }

    function updateExerciseSummary(position, field, value) {
        setExerciseSummary(prev => ({ ...prev, [position]: { ...prev[position], [field]: value } }));
    }

    function buildLog(markCompleted) {
        const exercises = [];
        day.blocks.forEach(block => {
            block.exercises.forEach(ex => {
                for (let s = 1; s <= (ex.series || 1); s++) {
                    const data = exerciseData[`${ex.position}_s${s}`] || {};
                    exercises.push({
                        position: ex.position,
                        serieIndex: s,
                        actualReps: data.actualReps ?? '',
                        actualCarga: data.actualCarga ?? '',
                        done: data.done ?? false,
                    });
                }
            });
        });
        const exerciseSummaries = day.blocks.flatMap(block =>
            block.exercises.map(ex => ({
                position: ex.position,
                comment: exerciseSummary[ex.position]?.comment ?? '',
                rpe: exerciseSummary[ex.position]?.rpe ?? '',
            }))
        );
        return {
            id: sessionLog ? sessionLog.id : uid(),
            planId: plan.id,
            week,
            dayNumber: day.dayNumber,
            completedAt: markCompleted ? new Date().toISOString() : (sessionLog?.completedAt || null),
            completed: markCompleted,
            exercises,
            exerciseSummaries,
        };
    }

    function validate() {
        for (const block of day.blocks) {
            for (const ex of block.exercises) {
                for (let s = 1; s <= (ex.series || 1); s++) {
                    const data = exerciseData[`${ex.position}_s${s}`] || {};
                    if (!data.done) {
                        onShowToast(`${ex.exerciseName || ex.position} — Serie ${s}: marcá como hecho antes de guardar.`, 'error');
                        return false;
                    }
                }
                const rpe = exerciseSummary[ex.position]?.rpe;
                if (!rpe || !['1', '2', '3', '4'].includes(rpe)) {
                    onShowToast(`${ex.exerciseName || ex.position}: seleccioná un RPE antes de guardar.`, 'error');
                    return false;
                }
            }
        }
        return true;
    }

    function handleSave() { if (validate()) onSave(buildLog(completed)); }
    function handleComplete() { if (validate()) onSave(buildLog(true)); }

    return (
        <div className="session-window">
            <div className="session-window-header">
                <button className="btn btn-secondary btn-sm" onClick={onBack}>← Volver</button>
                <span className="session-window-title">
                    Sesión de Entrenamiento — Semana {week} — Día {day.dayNumber}
                </span>
                {completed && <span className="session-completed-badge">Completada</span>}
            </div>

            <div className="session-window-body">
                {day.blocks.map(block => {
                    const allSameSeries = block.exercises.length > 0 &&
                        block.exercises.every(ex => ex.series === block.exercises[0].series);
                    const maxSeries = block.exercises.reduce((m, ex) => Math.max(m, ex.series || 1), 1);
                    const labelSuffix = allSameSeries ? ` (${block.exercises[0].series} Series)` : '';

                    return (
                        <div key={block.label} className="plan-session-block" style={{ marginBottom: 16 }}>
                            <div className="plan-session-block-label">
                                Bloque {block.label}{labelSuffix}
                            </div>

                            {/* Prescribed summary */}
                            <div className="session-block-summary">
                                {block.exercises.map((ex, i) => (
                                    <span key={ex.position}>
                                        {i > 0 && <span className="session-block-summary-sep"> + </span>}
                                        <span className="session-block-summary-name">{ex.exerciseName || '—'}</span>
                                        <span className="session-block-summary-meta">
                                            {' '}({ex.reps} reps{formatCarga(ex) !== '—' ? ` · ${formatCarga(ex)}` : ''})
                                        </span>
                                    </span>
                                ))}
                            </div>

                            {/* Serie groups */}
                            {Array.from({ length: maxSeries }, (_, idx) => {
                                const serieNum = idx + 1;
                                return (
                                    <div key={serieNum} className="session-serie-group">
                                        <div className="session-serie-header">
                                            Serie {serieNum} de {maxSeries}
                                        </div>
                                        {block.exercises
                                            .filter(ex => serieNum <= (ex.series || 1))
                                            .map(ex => {
                                                const data = exerciseData[`${ex.position}_s${serieNum}`] || {};
                                                const repsArr = ex.reps ? String(ex.reps).split(',') : [];
                                                const repForSerie = (repsArr[serieNum - 1] ?? repsArr[0] ?? ex.reps ?? '').trim();
                                                const rpeClass = RPE_CLASSES[exerciseSummary[ex.position]?.rpe] || '';

                                                return (
                                                    <div key={ex.position} className={`session-serie-exercise-row ${rpeClass}`}>
                                                        <div className="session-serie-exercise-name-row">
                                                            {ex.video
                                                                ? <a href={ex.video} target="_blank" rel="noreferrer" className="session-serie-exercise-link">{ex.exerciseName || '—'}</a>
                                                                : <span className="session-serie-exercise-name">{ex.exerciseName || '—'}</span>
                                                            }
                                                            <span className="session-serie-exercise-prescription">
                                                                ({repForSerie} reps{formatCarga(ex) !== '—' ? ` · ${formatCarga(ex)}` : ''})
                                                            </span>
                                                        </div>
                                                        <div className="session-serie-inputs">
                                                            <div className="session-exercise-input-group">
                                                                <span className="session-exercise-input-label">Reps realizadas</span>
                                                                <div className="session-stepper">
                                                                    <button className="session-stepper-btn" onClick={() => step(ex.position, serieNum, 'actualReps', -1)}>−</button>
                                                                    <input
                                                                        className="session-exercise-input session-stepper-input"
                                                                        value={data.actualReps ?? ''}
                                                                        onChange={e => updateField(ex.position, serieNum, 'actualReps', e.target.value)}
                                                                        placeholder={repForSerie || '—'}
                                                                    />
                                                                    <button className="session-stepper-btn" onClick={() => step(ex.position, serieNum, 'actualReps', 1)}>+</button>
                                                                </div>
                                                            </div>
                                                            <div className="session-exercise-input-group">
                                                                <span className="session-exercise-input-label">Carga utilizada</span>
                                                                <div className="session-stepper">
                                                                    <button className="session-stepper-btn" onClick={() => step(ex.position, serieNum, 'actualCarga', -1)}>−</button>
                                                                    <input
                                                                        className="session-exercise-input session-stepper-input"
                                                                        value={data.actualCarga ?? ''}
                                                                        onChange={e => updateField(ex.position, serieNum, 'actualCarga', e.target.value)}
                                                                        placeholder={ex.carga || '—'}
                                                                    />
                                                                    <button className="session-stepper-btn" onClick={() => step(ex.position, serieNum, 'actualCarga', 1)}>+</button>
                                                                </div>
                                                            </div>
                                                            <div className="session-exercise-input-group session-done-group">
                                                                <span className="session-exercise-input-label">Hecho</span>
                                                                <input
                                                                    type="checkbox"
                                                                    className="session-done-check"
                                                                    checked={data.done ?? false}
                                                                    onChange={e => updateField(ex.position, serieNum, 'done', e.target.checked)}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                );
                            })}

                            {/* Block footer: comment + RPE per exercise */}
                            <div className="session-block-footer">
                                {block.exercises.map(ex => (
                                    <div key={ex.position} className="session-block-footer-row">
                                        <span className="session-block-footer-label">{ex.position} — {ex.exerciseName || '—'}</span>
                                        <div className="session-exercise-input-group">
                                            <span className="session-exercise-input-label">Comentario</span>
                                            <input
                                                className="session-exercise-input session-exercise-input-comment"
                                                value={exerciseSummary[ex.position]?.comment ?? ''}
                                                onChange={e => updateExerciseSummary(ex.position, 'comment', e.target.value)}
                                                placeholder="—"
                                            />
                                        </div>
                                        <div className="session-exercise-input-group">
                                            <span className="session-exercise-input-label">RPE</span>
                                            <select
                                                className="session-rpe-select"
                                                value={exerciseSummary[ex.position]?.rpe ?? ''}
                                                onChange={e => updateExerciseSummary(ex.position, 'rpe', e.target.value)}
                                            >
                                                <option value="">—</option>
                                                <option value="1">Puedo aumentar la intensidad</option>
                                                <option value="2">Puedo mantener la intensidad</option>
                                                <option value="3">Estoy al límite</option>
                                                <option value="4">Debo disminuir la intensidad</option>
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="session-window-footer">
                {!completed && (
                    <button className="btn btn-secondary btn-sm" onClick={handleComplete}>
                        Marcar como Completada
                    </button>
                )}
                <button className="btn btn-primary btn-sm" onClick={handleSave}>
                    Guardar
                </button>
            </div>
        </div>
    );
}
