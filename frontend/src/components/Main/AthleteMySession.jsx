// Athlete-side session execution view. Opened from AthleteMySessions when the
// athlete taps "Realizar Sesión" / "Ver Sesión" (Dashboard sets section to
// 'my-session'). Renders blocks → series → per-exercise cards with media tile,
// reps/carga steppers, done checkbox and the trainer's prescription comment.
// Per-exercise RPE + athlete comment stay in the block footer. Persists via
// onSave({ ...log }) provided by Dashboard.
import React, { useState, useEffect } from 'react';
import { uid, formatCarga } from '../../utils/helpers.js';
import { MUSCLE_LABELS, EQUIPMENT_LABELS } from '../../utils/constants.js';
import { Icon } from '../Icon/index.jsx';
import { ExerciseVideoModal } from '../Modals/ExerciseVideoModal.jsx';

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

// Recognises direct video files we can render with a <video> tag. Strips query
// strings before matching (Supabase Storage URLs can carry `?token=…`).
// Anything not in the list (Vimeo, Loom share pages, etc.) falls back to the
// static icon — the detail modal still surfaces an "Abrir video" link for them.
function isDirectVideoUrl(url) {
    if (!url) return false;
    const clean = url.split('?')[0].toLowerCase();
    return /\.(mp4|webm|mov|m4v|ogv|ogg)$/.test(clean);
}

// Extracts a Google Drive file id from common share-link shapes:
//   https://drive.google.com/file/d/<ID>/view?usp=drive_link
//   https://drive.google.com/open?id=<ID>
//   https://drive.google.com/uc?id=<ID>&export=download
// Returns null when not a Drive URL. Drive files won't play in a <video> tag
// (the URL serves an HTML viewer, not a media stream) — so the catch points
// the UI at Drive's own thumbnail + embeddable preview endpoints instead.
function extractDriveFileId(url) {
    if (!url) return null;
    const m1 = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (m1) return m1[1];
    const m2 = url.match(/drive\.google\.com\/(?:open|uc)\?[^#]*\bid=([a-zA-Z0-9_-]+)/);
    if (m2) return m2[1];
    return null;
}

function ExerciseMediaThumb({ ex, onOpen }) {
    const [driveThumbFailed, setDriveThumbFailed] = useState(false);
    const video = resolveVideo(ex);
    const ytId = extractYouTubeId(video);
    const driveId = !ytId ? extractDriveFileId(video) : null;
    const directVideo = !ytId && !driveId && isDirectVideoUrl(video) ? video : null;

    // Four rendering modes:
    //  - YouTube: still uses the YT thumbnail JPEG (cheap + cached).
    //  - Google Drive: uses Drive's thumbnail endpoint (requires the file to
    //    be shared "anyone with the link"). Same <img> tag — same play-icon
    //    overlay — only the URL builder changes.
    //  - Direct video file: render a muted <video preload=metadata> so the
    //    browser fetches just enough to display the first frame as a poster.
    //    No controls — clicking the tile still opens the detail modal.
    //  - Otherwise: per-exercise icon → generic SVG fallback.
    if (directVideo) {
        return (
            <button
                type="button"
                className="session-serie-card-media"
                onClick={onOpen}
                aria-label={`Ver detalle de ${ex.exerciseName || 'ejercicio'}`}
            >
                <video
                    src={directVideo}
                    className="session-serie-card-media-img"
                    muted
                    playsInline
                    preload="metadata"
                />
                <span className="session-serie-card-media-play"><Icon name="play-circle" size={20} /></span>
            </button>
        );
    }

    // Preview preference: YouTube thumb → Drive thumb → per-exercise icon →
    // generic SVG. `isPhotoLike` toggles the photo-style rounded frame vs
    // the icon-style padded frame.
    // Drive's /thumbnail endpoint sets CORP=same-site so a same-origin proxy
    // is required (see /api/media/drive-thumb). When the file isn't shared
    // "anyone with the link" the proxy returns 403 → <img onError> swaps to
    // the fallback icon so the tile never renders broken. Playback in the
    // detail modal still works via the /preview iframe if the athlete has
    // viewer access and is signed into their Google account.
    const previewSrc = ytId
        ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
        : driveId && !driveThumbFailed
            ? `/api/media/drive-thumb?id=${driveId}&sz=w400`
            : (ex.iconUrl || GENERIC_EXERCISE_ICON);
    // A photo-like frame is only appropriate when we actually have a real
    // photo behind it. If the Drive thumb fell back to the icon, revert to
    // the icon-style padded frame.
    const isPhotoLike = !!ytId || (!!driveId && !driveThumbFailed);

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
                // Drive thumb 403/failed → fall back to the icon on next render.
                onError={driveId && !driveThumbFailed ? () => setDriveThumbFailed(true) : undefined}
            />
            {/* Play overlay shown whenever there's a playable video source —
                including Drive files where the thumbnail failed but the modal
                iframe will still play if the athlete is signed in to Google. */}
            {(isPhotoLike || driveId || directVideo) && (
                <span className="session-serie-card-media-play"><Icon name="play-circle" size={20} /></span>
            )}
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
    const driveId = !ytId ? extractDriveFileId(video) : null;
    const directVideo = !ytId && !driveId && isDirectVideoUrl(video) ? video : null;
    // Force a portrait-shaped iframe for Drive too. We can't detect the
    // uploaded video's orientation from the URL alone, but Drive's embedded
    // player wraps the video with its own UI (loading spinner, cookie
    // consent prompt, controls) that needs vertical room to render. A 16:9
    // frame ends up cropping the cookie buttons and the Google splash. A
    // 9:16 frame gives that UI space; a landscape video inside just
    // letterboxes cleanly.
    const portrait = isShort || !!driveId;
    // "Otra URL" branch — fall back to a plain link when the URL is neither
    // YouTube, Drive, nor a direct video file (e.g. Vimeo/Loom share pages).
    const hasOtherVideo = video && !ytId && !driveId && !directVideo;
    const modelImage = (exercise.modelImageUrl || '').trim();
    const primary = exercise.primaryMuscles || [];
    const secondary = exercise.secondaryMuscles || [];
    const equipmentLabel = exercise.equipment ? (EQUIPMENT_LABELS[exercise.equipment] || exercise.equipment) : null;

    function handleOverlayClick(e) {
        if (e.target === e.currentTarget) onClose();
    }

    return (
        <div className="modal-overlay open" onClick={handleOverlayClick}>
            <div className={`modal exercise-detail-modal ${portrait ? 'exercise-detail-modal--short' : ''}`}>
                <div className="modal-header">
                    <div>
                        <h2>{exercise.exerciseName || 'Ejercicio'}</h2>
                        {exercise.secondName && (
                            <div className="exercise-detail-second-name">{exercise.secondName}</div>
                        )}
                    </div>
                    <button className="modal-close" onClick={onClose} aria-label="Cerrar"><Icon name="close" size={18} /></button>
                </div>
                <div className="modal-body">
                    {ytId && (
                        <div className={`exercise-detail-video ${portrait ? 'exercise-detail-video--short' : ''}`}>
                            <iframe
                                src={`https://www.youtube.com/embed/${ytId}`}
                                title={exercise.exerciseName || 'Ejercicio'}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    )}
                    {directVideo && (
                        // Direct file (mp4/webm/mov) — use the same short-form
                        // 9:16 frame the modal already uses for YouTube Shorts
                        // when the URL looks vertical. Defaults to letterboxed
                        // 16:9 otherwise via the existing exercise-detail-video
                        // wrapper.
                        <div className="exercise-detail-video">
                            <video
                                src={directVideo}
                                controls
                                playsInline
                                preload="metadata"
                                style={{ width: '100%', height: '100%', background: '#000' }}
                            />
                        </div>
                    )}
                    {driveId && (
                        // Google Drive uses its own embeddable player at
                        // /file/d/<id>/preview. Drive's overlay UI (control
                        // bar, "Open in Drive" affordance) lives inside a
                        // cross-origin iframe, so we can't restyle or move
                        // it. In some contexts (mobile-emulated Chrome UA,
                        // restricted-share files, aggressive anti-embed
                        // heuristics) Drive refuses to stream and shows a
                        // "Descargar" fallback. The explicit "Abrir en
                        // Drive" button below the iframe gives athletes a
                        // reliable escape hatch to the full-fidelity Drive
                        // app / web player when the embed misbehaves.
                        <>
                            <div className={`exercise-detail-video ${portrait ? 'exercise-detail-video--short' : ''}`}>
                                <iframe
                                    src={`https://drive.google.com/file/d/${driveId}/preview`}
                                    title={exercise.exerciseName || 'Ejercicio'}
                                    frameBorder="0"
                                    allow="autoplay; encrypted-media"
                                    allowFullScreen
                                />
                            </div>
                            <div className="exercise-detail-link-row">
                                <a
                                    className="btn btn-secondary btn-sm"
                                    href={`https://drive.google.com/file/d/${driveId}/view`}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Abrir en Drive
                                </a>
                            </div>
                        </>
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
                            <span className="exercise-detail-3d-cube"><Icon name="cube-3d" size={48} /></span>
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
    // Position of the exercise whose video upload modal is currently open.
    // null = closed. Kept here (not inside ExerciseVideoModal) so the modal
    // can persist its result back into exerciseSummary.
    const [videoFor, setVideoFor] = useState(null);

    // Hydrate local state from sessionLog when opening the screen.
    // hasNewFormat distinguishes per-serie logs (current shape) from legacy
    // per-exercise logs so older sessions still load without crashing.
    useEffect(() => {
        const map = {};
        const summary = {};

        day.blocks.forEach(block => {
            block.exercises.forEach(ex => {
                summary[ex.position] = { comment: '', rpe: '', videoUrl: '', videoPath: '' };
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
                summary[s.position] = {
                    comment:   s.comment   || '',
                    rpe:       s.rpe       || '',
                    videoUrl:  s.videoUrl  || '',
                    videoPath: s.videoPath || '',
                };
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
                position:  ex.position,
                comment:   exerciseSummary[ex.position]?.comment   ?? '',
                rpe:       exerciseSummary[ex.position]?.rpe       ?? '',
                videoUrl:  exerciseSummary[ex.position]?.videoUrl  ?? '',
                videoPath: exerciseSummary[ex.position]?.videoPath ?? '',
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
                    <span className="session-completed-check" title="Sesión completada" aria-label="Sesión completada">
                        <Icon name="check" size={18} />
                    </span>
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

                                                        {/* When the athlete marks the serie done, the reps & carga
                                                            steppers lock so the confirmed result can't be tweaked
                                                            by accident. Unchecking "done" re-enables them. The
                                                            .is-locked class on .session-stepper dims the row. */}
                                                        <div className="session-serie-card-middle">
                                                            <ExerciseMediaThumb ex={ex} onOpen={() => setDetailExercise(ex)} />

                                                            <div className="session-serie-card-inputs">
                                                                <div className="session-serie-card-input-row">
                                                                    <span className="session-exercise-input-label">Reps realizadas</span>
                                                                    <div className={`session-stepper ${data.done ? 'is-locked' : ''}`}>
                                                                        <button className="session-stepper-btn" disabled={data.done} onClick={() => step(ex.position, serieNum, 'actualReps', -1)}>−</button>
                                                                        <input
                                                                            className="session-exercise-input session-stepper-input"
                                                                            value={data.actualReps ?? ''}
                                                                            onChange={e => updateField(ex.position, serieNum, 'actualReps', e.target.value)}
                                                                            placeholder={repForSerie || '—'}
                                                                            disabled={data.done}
                                                                        />
                                                                        <button className="session-stepper-btn" disabled={data.done} onClick={() => step(ex.position, serieNum, 'actualReps', 1)}>+</button>
                                                                    </div>
                                                                </div>

                                                                <div className="session-serie-card-input-row">
                                                                    <span className="session-exercise-input-label">Carga utilizada</span>
                                                                    <div className={`session-stepper ${data.done ? 'is-locked' : ''}`}>
                                                                        <button className="session-stepper-btn" disabled={data.done} onClick={() => step(ex.position, serieNum, 'actualCarga', -1)}>−</button>
                                                                        <input
                                                                            className="session-exercise-input session-stepper-input"
                                                                            value={data.actualCarga ?? ''}
                                                                            onChange={e => updateField(ex.position, serieNum, 'actualCarga', e.target.value)}
                                                                            placeholder={ex.carga || '—'}
                                                                            disabled={data.done}
                                                                        />
                                                                        <button className="session-stepper-btn" disabled={data.done} onClick={() => step(ex.position, serieNum, 'actualCarga', 1)}>+</button>
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

                            {/* Block footer: per-exercise summary cards (RPE + athlete
                                comment). One card per exercise, mirroring the serie-card
                                shell above. The paperclip button is a placeholder for an
                                upcoming feature (athlete uploads their own exercise video
                                for trainer review in "Historial de sesiones"). */}
                            <div className="session-block-footer">
                                {block.exercises.map(ex => {
                                    const rpeClass = RPE_CLASSES[exerciseSummary[ex.position]?.rpe] || '';
                                    return (
                                        <div key={ex.position} className={`session-block-footer-card ${rpeClass}`}>
                                            <div className="session-block-footer-card-header">
                                                <span className="session-block-footer-card-name">{ex.exerciseName || '—'}</span>
                                                <button
                                                    type="button"
                                                    className={`session-block-footer-attach ${exerciseSummary[ex.position]?.videoUrl ? 'has-video' : ''}`}
                                                    title={exerciseSummary[ex.position]?.videoUrl ? 'Ver / cambiar video' : 'Adjuntar video'}
                                                    aria-label="Adjuntar video"
                                                    onClick={() => setVideoFor(ex.position)}
                                                >
                                                    <Icon name="paperclip" size={18} />
                                                </button>
                                            </div>
                                            <div className="session-block-footer-field">
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
                                            <div className="session-block-footer-field">
                                                <span className="session-exercise-input-label">Comentario</span>
                                                <input
                                                    className="session-exercise-input session-exercise-input-comment"
                                                    value={exerciseSummary[ex.position]?.comment ?? ''}
                                                    onChange={e => updateExerciseSummary(ex.position, 'comment', e.target.value)}
                                                    placeholder="—"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
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

            <ExerciseVideoModal
                open={videoFor != null}
                exerciseName={
                    day.blocks.flatMap(b => b.exercises).find(e => e.position === videoFor)?.exerciseName || ''
                }
                existing={
                    exerciseSummary[videoFor]?.videoUrl
                        ? { url: exerciseSummary[videoFor].videoUrl, path: exerciseSummary[videoFor].videoPath }
                        : null
                }
                planId={plan.id}
                planName={plan.name}
                week={week}
                dayNumber={day.dayNumber}
                position={videoFor}
                onClose={() => setVideoFor(null)}
                onUploaded={({ url, path }) => {
                    setExerciseSummary(prev => ({
                        ...prev,
                        [videoFor]: { ...prev[videoFor], videoUrl: url, videoPath: path },
                    }));
                    onShowToast?.('Video subido', 'success');
                }}
                onRemoved={() => {
                    setExerciseSummary(prev => ({
                        ...prev,
                        [videoFor]: { ...prev[videoFor], videoUrl: '', videoPath: '' },
                    }));
                    onShowToast?.('Video eliminado', 'success');
                }}
                onError={msg => onShowToast?.(msg, 'error')}
            />
        </div>
    );
}
