// Athlete-side session execution view. Opened from AthleteMySessions when the
// athlete taps "Realizar Sesión" / "Ver Sesión" (Dashboard sets section to
// 'my-session'). Renders blocks → series → per-exercise cards with media tile,
// reps/carga steppers, done checkbox and the trainer's prescription comment.
// Per-exercise RPE + athlete comment stay in the block footer. Persists via
// onSave({ ...log }) provided by Dashboard.
import React, { useState, useEffect } from 'react';
import { uid, formatCarga } from '../../utils/helpers.js';
import { MUSCLE_LABELS, EQUIPMENT_LABELS } from '../../utils/constants.js';

const RPE_CLASSES = { '1': 'session-rpe-1', '2': 'session-rpe-2', '3': 'session-rpe-3', '4': 'session-rpe-4' };

// Extracts a YouTube video id from common URL shapes (watch?v=, youtu.be/, embed/).
// Returns null when the URL is not YouTube — caller then falls back to a
// generic play tile so unknown hosts don't break with a 404 image.
function extractYouTubeId(url) {
    if (!url) return null;
    const patterns = [
        /[?&]v=([a-zA-Z0-9_-]{11})/,
        /youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    return null;
}

// Shorts render vertically (9:16) so the detail modal switches to a portrait
// embed when the source URL is /shorts/<id>. Regular embeds stay 16:9.
function isYouTubeShort(url) {
    return !!(url && /youtube\.com\/shorts\//.test(url));
}

const GENERIC_EXERCISE_ICON = '/icons/exercise-generic.svg';

// Media tile rendered to the left of each exercise card. Always a button:
// clicking it opens ExerciseDetailModal, regardless of whether a video exists.
// Preview image preference: YouTube thumbnail → ex.iconUrl (DB, future phase) →
// generic dumbbell SVG fallback under frontend/public/icons/.
// Per-planification `ex.video` (trainer override) wins over the catalog
// `ex.videoUrl` snapshot. resolveVideo centralizes that so the tile preview
// and the detail modal stay in sync.
function resolveVideo(ex) {
    return (ex.video && ex.video.trim()) || (ex.videoUrl && ex.videoUrl.trim()) || '';
}

function ExerciseMediaThumb({ ex, onOpen }) {
    const video = resolveVideo(ex);
    const ytId = extractYouTubeId(video);
    // Preview preference: YouTube thumb → per-exercise icon → generic SVG.
    const previewSrc = ytId
        ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
        : (ex.iconUrl || GENERIC_EXERCISE_ICON);
    const isPhotoLike = !!ytId;

    return (
        <button
            type="button"
            className={`session-serie-card-media ${isPhotoLike ? '' : 'session-serie-card-media-icon'}`}
            onClick={onOpen}
            aria-label={`Ver detalle de ${ex.exerciseName || 'ejercicio'}`}
        >
            <img
                src={previewSrc}
                alt={ex.exerciseName || 'Ejercicio'}
                className={isPhotoLike ? 'session-serie-card-media-img' : 'session-serie-card-media-icon-img'}
            />
            {isPhotoLike && <span className="session-serie-card-media-play">▶</span>}
        </button>
    );
}

// Modal opened when the athlete taps an exercise tile. Shows the trainer's
// video when present (embedded YouTube iframe for YT URLs; "Abrir video" link
// for arbitrary URLs we can't safely embed) and falls back to a "3D animation
// coming soon" placeholder otherwise.
function ExerciseDetailModal({ exercise, onClose }) {
    if (!exercise) return null;
    const video = resolveVideo(exercise);
    const ytId = extractYouTubeId(video);
    const isShort = isYouTubeShort(video);
    const hasOtherVideo = video && !ytId;
    const modelImage = (exercise.modelImageUrl || '').trim();
    const primary = exercise.primaryMuscles || [];
    const secondary = exercise.secondaryMuscles || [];
    const equipmentLabel = exercise.equipment ? (EQUIPMENT_LABELS[exercise.equipment] || exercise.equipment) : null;

    function handleOverlayClick(e) {
        if (e.target === e.currentTarget) onClose();
    }

    return (
        <div className="modal-overlay open" onClick={handleOverlayClick}>
            <div className={`modal exercise-detail-modal ${isShort ? 'exercise-detail-modal--short' : ''}`}>
                <div className="modal-header">
                    <div>
                        <h2>{exercise.exerciseName || 'Ejercicio'}</h2>
                        {exercise.secondName && (
                            <div className="exercise-detail-second-name">{exercise.secondName}</div>
                        )}
                    </div>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body">
                    {ytId && (
                        <div className={`exercise-detail-video ${isShort ? 'exercise-detail-video--short' : ''}`}>
                            <iframe
                                src={`https://www.youtube.com/embed/${ytId}`}
                                title={exercise.exerciseName || 'Ejercicio'}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    )}
                    {hasOtherVideo && (
                        <div className="exercise-detail-link-row">
                            <a className="btn btn-primary btn-sm" href={video} target="_blank" rel="noreferrer">
                                Abrir video
                            </a>
                        </div>
                    )}
                    {!video && modelImage && (
                        <div className="exercise-detail-model-image">
                            <img src={modelImage} alt={exercise.exerciseName || 'Modelo 3D del ejercicio'} />
                        </div>
                    )}
                    {!video && !modelImage && (
                        <div className="exercise-detail-3d-placeholder">
                            <span className="exercise-detail-3d-cube">◆</span>
                            <span className="exercise-detail-3d-label">Animación 3D — próximamente</span>
                        </div>
                    )}

                    {exercise.comentario && (
                        <p className="exercise-detail-comment">{exercise.comentario}</p>
                    )}

                    {(equipmentLabel || primary.length > 0 || secondary.length > 0) && (
                        <div className="exercise-detail-meta">
                            {equipmentLabel && (
                                <div className="exercise-detail-meta-row">
                                    <span className="exercise-detail-meta-label">Equipamiento</span>
                                    <span className="exercise-detail-meta-value">{equipmentLabel}</span>
                                </div>
                            )}
                            {primary.length > 0 && (
                                <div className="exercise-detail-meta-row">
                                    <span className="exercise-detail-meta-label">Primarios</span>
                                    <div className="muscle-badge-group">
                                        {primary.map(m => (
                                            <span key={`p-${m}`} className={`muscle-badge muscle-${m}`}>{MUSCLE_LABELS[m] || m}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {secondary.length > 0 && (
                                <div className="exercise-detail-meta-row">
                                    <span className="exercise-detail-meta-label">Secundarios</span>
                                    <div className="muscle-badge-group">
                                        {secondary.map(m => (
                                            <span key={`s-${m}`} className={`muscle-badge muscle-badge--secondary muscle-${m}`}>{MUSCLE_LABELS[m] || m}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export function AthleteMySession({ plan, week, day, sessionLog, onBack, onSave, onShowToast }) {
    const [exerciseData, setExerciseData] = useState({});
    const [exerciseSummary, setExerciseSummary] = useState({});
    const [completed, setCompleted] = useState(false);
    const [detailExercise, setDetailExercise] = useState(null);

    // Hydrate local state from sessionLog when opening the screen.
    // hasNewFormat distinguishes per-serie logs (current shape) from legacy
    // per-exercise logs so older sessions still load without crashing.
    useEffect(() => {
        const map = {};
        const summary = {};

        day.blocks.forEach(block => {
            block.exercises.forEach(ex => {
                summary[ex.position] = { comment: '', rpe: '' };
            });
        });

        const hasNewFormat = sessionLog && sessionLog.exercises?.some(e => e.serieIndex != null);

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

    // Invariants the trainer relies on for progress tracking:
    //   - every serie must be flagged done before the session can be saved
    //   - every exercise must have an RPE so the trainer sees subjective load
    // Toast-based rather than form-validation so the athlete is guided to the
    // exact serie/exercise blocking the save.
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
                    {plan.name} — Semana {week} — Día {day.dayNumber}
                </span>
                {completed && (
                    <span className="session-completed-check" title="Sesión completada" aria-label="Sesión completada">✓</span>
                )}
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
                                                const trainerComment = (ex.comentario || '').trim();

                                                return (
                                                    <div key={ex.position} className={`session-serie-card ${rpeClass}`}>
                                                        <div className="session-serie-card-name-row">
                                                            <div className="session-serie-card-name-block">
                                                                {ex.video
                                                                    ? <a href={ex.video} target="_blank" rel="noreferrer" className="session-serie-exercise-link">{ex.exerciseName || '—'}</a>
                                                                    : <span className="session-serie-exercise-name">{ex.exerciseName || '—'}</span>
                                                                }
                                                                <span className="session-serie-exercise-prescription">
                                                                    ({repForSerie} reps{formatCarga(ex) !== '—' ? ` · ${formatCarga(ex)}` : ''})
                                                                </span>
                                                            </div>
                                                            <label className="session-serie-card-done" title="Hecho">
                                                                <input
                                                                    type="checkbox"
                                                                    className="session-done-check"
                                                                    checked={data.done ?? false}
                                                                    onChange={e => updateField(ex.position, serieNum, 'done', e.target.checked)}
                                                                />
                                                            </label>
                                                        </div>

                                                        <div className="session-serie-card-middle">
                                                            <ExerciseMediaThumb ex={ex} onOpen={() => setDetailExercise(ex)} />

                                                            <div className="session-serie-card-inputs">
                                                                <div className="session-serie-card-input-row">
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

                                                                <div className="session-serie-card-input-row">
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
                                                            </div>
                                                        </div>

                                                        {trainerComment && (
                                                            <div className="session-serie-card-trainer-comment" title="Comentario del entrenador">
                                                                {trainerComment}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                    </div>
                                );
                            })}

                            {/* Block footer: athlete's per-exercise comment + RPE */}
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

            {detailExercise && (
                <ExerciseDetailModal exercise={detailExercise} onClose={() => setDetailExercise(null)} />
            )}
        </div>
    );
}
