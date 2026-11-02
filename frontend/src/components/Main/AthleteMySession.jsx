// Athlete-side session execution view. Opened from AthleteMySessions when the
// athlete taps "Realizar Sesión" / "Ver Sesión" (Dashboard sets section to
// 'my-session'). Renders blocks → series → per-exercise cards with media tile,
// reps/carga steppers, done checkbox and the trainer's prescription comment.
// Per-exercise RPE + athlete comment stay in the block footer. Persists via
// onSave({ ...log }) provided by Dashboard. While a session is still in progress every change
// is also auto-saved (debounced, no validation) through onAutoSave, so closing the app
// resumes where the athlete left off; only the "Finalizar sesión" modal marks it completed.
// A session with no progress yet opens on a compact preview list (nota del día + every
// block's exercises, one line each) with an "Empezar sesión" button; then the list takes over. When the coach reviewed the session (sessionLog.trainerComment, stored outside
// the payload) a read-only banner shows it.
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { uid, formatCarga, restLabel, visibleInPlan, blockTitles, timeToSeconds, secondsToClock } from '../../utils/helpers.js';
import { MUSCLE_LABELS, EQUIPMENT_LABELS, SELF_EVALUATION_LABELS, EXERCISE_KIND_LABELS } from '../../utils/constants.js';
import { Icon } from '../Icon/index.jsx';
import { DayOverview } from './DayOverview.jsx';
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
                                // playsinline keeps iOS from forcing native fullscreen; the explicit
                                // referrerPolicy guarantees YouTube receives the page origin even if a
                                // browser/page default would strip it (a missing referrer makes the
                                // embed fail with "Error 153" on some mobile browsers).
                                src={`https://www.youtube.com/embed/${ytId}?playsinline=1&rel=0`}
                                title={exercise.exerciseName || 'Ejercicio'}
                                frameBorder="0"
                                referrerPolicy="strict-origin-when-cross-origin"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
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

// Whole-session summary the athlete fills in once every exercise, serie and RPE is done.
// Stored in the session log payload as `sessionSummary` (no backend change: the log payload
// is free-form JSONB). All fields are optional strings so an untouched card saves as empty.
const EMPTY_SESSION_SUMMARY = { dateTime: '', durationMin: '', selfEvaluation: '', effortLevel: '', comment: '' };
const SELF_EVALUATION_OPTIONS = Object.entries(SELF_EVALUATION_LABELS).map(([v, label]) => [v, `${v} · ${label}`]);
const EFFORT_LEVELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

// Current local date/time formatted for <input type="datetime-local"> (YYYY-MM-DDTHH:mm).
function nowForInput() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
}

// Elapsed seconds as m:ss, or h:mm:ss after the first hour.
function clockText(total) {
    const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
    return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

const AUTOSAVE_DELAY_MS = 800;

export function AthleteMySession({ plan, week, day: fullDayRaw, sessionLog, onBack, onSave, onAutoSave, onDiscard, onTrainingLock, onShowToast }) {
    // `fullDay` is the plan day as written (rests included, for display). Everything the athlete
    // logs (series, RPE, ordering rules, saved payload) runs on `day`: the same day without rests
    // or empty blocks. Warm-ups ARE part of the session; only the pre-start overview hides them.
    const fullDay = fullDayRaw;
    const day = useMemo(() => ({
        ...fullDayRaw,
        blocks: fullDayRaw.blocks
            .map(b => ({ ...b, exercises: b.exercises.filter(e => !e.isRest) }))
            .filter(b => b.exercises.length > 0),
    }), [fullDayRaw]);
    const [exerciseData, setExerciseData] = useState({});
    const [exerciseSummary, setExerciseSummary] = useState({});
    const [completed, setCompleted] = useState(false);
    const [detailExercise, setDetailExercise] = useState(null);
    // Manual open/closed overrides for serie groups, keyed `${blockLabel}_${serieNum}`.
    // Without an override a serie is open only if it is the block's next one to do.
    const [serieOpen, setSerieOpen] = useState({});
    // Manual expand/collapse of exercise cards, keyed `${position}_s${serie}`; without an entry
    // only the next serie to do is expanded (see nextKey).
    const [cardOpen, setCardOpen] = useState({});
    // Exercise the player controls moved to (null = follow the next serie to do).
    const [activeKey, setActiveKey] = useState(null);
    // Live training timer: { kind: 'exercise' | 'rest', key, remaining, running } or null. A timed
    // exercise (Medida Tiempo) counts down its Carga; after a serie round a rest counts down the
    // block's Descanso. Pausing/resuming is the middle player button.
    const [timer, setTimer] = useState(null);
    const showOverviewRef = useRef(true);
    // Warm-ups are not rated: no RPE for them (block closing and validation skip them).
    function needsRpe(ex) { return ex.kind !== 'warmup'; }
    // Completed sessions: `baseline` is the hydrated state serialized, so `dirty` can tell
    // whether anything changed; `editing` unlocks reps/carga of already-done series;
    // `leaveAsk` shows the unsaved-changes prompt when pressing Volver.
    const [sessionSummary, setSessionSummary] = useState(EMPTY_SESSION_SUMMARY);
    const [baseline, setBaseline] = useState('');
    const [editing, setEditing] = useState(false);
    const [leaveAsk, setLeaveAsk] = useState(false);
    // Position of the exercise whose video upload modal is currently open.
    // null = closed. Kept here (not inside ExerciseVideoModal) so the modal
    // can persist its result back into exerciseSummary.
    const [videoFor, setVideoFor] = useState(null);
    // "Finalizar sesión" modal ("¿Cómo te fue?") and the pre-start overview flag.
    // Session clock (counts while the training list is showing) and its pause button. Pausing
    // also freezes the live exercise / rest countdown.
    const [paused, setPaused] = useState(false);
    // Stop button (shown while paused) asks before discarding the session; `discardedRef` stops a
    // pending auto-save from re-creating the log that was just deleted.
    const [discardAsk, setDiscardAsk] = useState(false);
    const discardedRef = useRef(false);
    const [elapsed, setElapsed] = useState(0);
    // Internal stopwatch per serie (key -> seconds): runs while that exercise is the current one, so
    // it starts when the athlete hits next on the previous exercise. Saved with the log for the summary.
    const [exerciseTimes, setExerciseTimes] = useState({});
    const [started, setStarted] = useState(false);
    // Identity of the session the local state was hydrated for. Auto-saves update the
    // `sessionLog` prop; re-hydrating from them would overwrite what the athlete is typing,
    // so hydration runs again only when a different session is opened.
    const hydratedFor = useRef('');
    // Stable id for a log that does not exist yet, so successive auto-saves share one payload id.
    const newLogId = useRef(uid());
    const autoSaveTimer = useRef(null);

    // Hydrate local state from sessionLog when opening the screen.
    // hasNewFormat distinguishes per-serie logs (current shape) from legacy
    // per-exercise logs so older sessions still load without crashing.
    useEffect(() => {
        const sessionKey = `${plan.id}_${week}_${day.dayNumber}`;
        if (hydratedFor.current === sessionKey) return;
        hydratedFor.current = sessionKey;
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
        setExerciseTimes(sessionLog?.exerciseTimes || {});
        setElapsed(sessionLog?.elapsedSeconds || 0);
        const hydratedSummary = { ...EMPTY_SESSION_SUMMARY, ...(sessionLog?.sessionSummary || {}) };
        setSessionSummary(hydratedSummary);
        setBaseline(JSON.stringify({ map, summary, sessionSummary: hydratedSummary }));
        setEditing(false);
    }, [sessionLog, day, plan.id, week]);

    function updateField(position, serieIndex, field, value) {
        const key = `${position}_s${serieIndex}`;
        setExerciseData(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
    }

    function step(position, serieIndex, field, delta) {
        const key = `${position}_s${serieIndex}`;
        const raw = String(exerciseData[key]?.[field] ?? '');
        // Time loads (m:ss) step by seconds; everything else is a plain number.
        if (raw.includes(':')) {
            const [m, s] = raw.split(':').map(n => parseInt(n, 10) || 0);
            const total = Math.max(0, m * 60 + s + delta);
            updateField(position, serieIndex, field, `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`);
            return;
        }
        const current = parseFloat(raw) || 0;
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
            id: sessionLog ? sessionLog.id : newLogId.current,
            planId: plan.id,
            week,
            dayNumber: day.dayNumber,
            completedAt: markCompleted ? new Date().toISOString() : (sessionLog?.completedAt || null),
            completed: markCompleted,
            exercises,
            exerciseSummaries,
            sessionSummary,
            elapsedSeconds: elapsed,
            exerciseTimes,
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
                if (needsRpe(ex) && (!rpe || !['1', '2', '3', '4'].includes(rpe))) {
                    onShowToast(`${ex.exerciseName || ex.position}: seleccioná un RPE antes de guardar.`, 'error');
                    return false;
                }
            }
        }
        return true;
    }

    // Execution order of every serie entry: block by block, serie by serie, exercise by
    // exercise (the order the athlete performs them in). Drives the "no skipping ahead" rules.
    const blockKeys = day.blocks.map(block => {
        const maxSeries = block.exercises.reduce((m, ex) => Math.max(m, ex.series || 1), 1);
        return Array.from({ length: maxSeries }, (_, i) => i + 1).flatMap(n =>
            block.exercises.filter(ex => n <= (ex.series || 1)).map(ex => `${ex.position}_s${n}`)
        );
    });
    const orderedKeys = blockKeys.flat();
    const isDone = key => !!exerciseData[key]?.done;
    const hasRpe = ex => !!exerciseSummary[ex.position]?.rpe;
    // Next serie to do overall (first unchecked in execution order): the only exercise that
    // starts expanded in the list.
    // A block is "finished" once all its series are checked; it is "closed" once every
    // exercise in it also has an RPE. The next block only opens when this one is closed.
    const blockFinished = bi => blockKeys[bi].every(isDone);
    const blockClosed = bi => blockFinished(bi) && day.blocks[bi].exercises.filter(needsRpe).every(hasRpe);
    const nextKey = orderedKeys.find(k => !isDone(k));
    // The next serie can be locked behind the previous block's RPE ratings (canToggleDone); then
    // nothing is expanded and the block's RPE cards are the thing to do.
    const nextLocked = nextKey != null && !canToggleDone(nextKey);
    const curKey = activeKey ?? (nextLocked ? null : nextKey);

    // Player controls at the bottom of the open exercise card: back to the previous exercise,
    // pause (save progress and leave), and forward = mark this serie done and open the next one
    // (on an already-done serie it just moves on). Moving clears manual open/close overrides.
    function goTo(key) { setCardOpen({}); setSerieOpen({}); setActiveKey(key ?? null); }
    const serieOfKey = k => Number(k.slice(k.lastIndexOf('_s') + 2));
    // Descanso is treated as an exercise: each block's rest row becomes a card per serie round
    // (key `R_<block>_<serie>`), hidden until every exercise of that round is done. Rest cards are
    // not part of `orderedKeys`, so they never block the ordered-completion rules.
    const bIdxG0 = block => day.blocks.indexOf(block);
    const restKey = (bi, n) => `R_${bi}_${n}`;
    const parseRestKey = k => { const [, bi, n] = k.split('_'); return { bi: Number(bi), n: Number(n) }; };
    function blockRestSeconds(bi) {
        const rest = fullDay.blocks.find(b => b.label === day.blocks[bi].label)?.exercises.find(e => e.isRest);
        return rest ? timeToSeconds(rest.carga || rest.duration) : null;
    }
    const [restDone, setRestDone] = useState({});
    // True when moving from block `fromBi` to `target` would land on a serie locked behind the
    // RPEs of `fromBi` (a different block whose exercises are not all rated yet).
    function lockedBehindRpe(fromBi, target) {
        if (!target) return false;
        const toBi = blockKeys.findIndex(keys => keys.includes(target));
        return toBi !== fromBi && !day.blocks[fromBi].exercises.filter(needsRpe).every(hasRpe);
    }
    function finishRest(rKey, next) {
        setRestDone(prev => ({ ...prev, [rKey]: true }));
        setTimer(null);
        goTo(lockedBehindRpe(parseRestKey(rKey).bi, next) ? null : next);
    }
    // Entry that follows round `n` of block `bi` in execution order (first not done after the round).
    function afterRound(bi, n) {
        const last = blockKeys[bi].filter(k => serieOfKey(k) === n).pop();
        const i = orderedKeys.indexOf(last);
        return i < orderedKeys.length - 1 ? orderedKeys[i + 1] : null;
    }
    function goNext(key, position, serieNum) {
        const justDone = !isDone(key);
        if (justDone) updateField(position, serieNum, 'done', true);
        const i = orderedKeys.indexOf(key);
        const upcoming = i < orderedKeys.length - 1 ? orderedKeys[i + 1] : null;
        // Closing a serie round of a block that has a Descanso: open its rest card and start it.
        const bi = blockKeys.findIndex(keys => keys.includes(key));
        const n = serieOfKey(key);
        const nextInBlock = blockKeys[bi][blockKeys[bi].indexOf(key) + 1];
        const closesRound = !nextInBlock || serieOfKey(nextInBlock) !== n;
        const secs = justDone && closesRound ? blockRestSeconds(bi) : null;
        if (secs) {
            const rk = restKey(bi, n);
            setRestDone(prev => ({ ...prev, [rk]: false }));
            setTimer({ kind: 'rest', key: rk, next: upcoming, remaining: secs, running: true });
            goTo(rk);
            return;
        }
        setTimer(null);
        // Never jump onto a serie that is still locked behind this block's RPEs: stay on the RPE cards.
        goTo(lockedBehindRpe(bi, upcoming) ? null : upcoming);
    }
    useEffect(() => {
        if (!timer || !timer.running || paused) return undefined;
        const id = setInterval(() => setTimer(t => (t && t.running ? { ...t, remaining: t.remaining - 1 } : t)), 1000);
        return () => clearInterval(id);
    }, [timer?.running, timer?.key, timer?.kind, paused]);
    // Session clock: ticks only once the training list is showing (not on the overview).
    // It runs from "Empezar sesión" until the last exercise is done, and stops while paused.
    const allSeriesDone = orderedKeys.length > 0 && orderedKeys.every(isDone);
    useEffect(() => {
        if (paused || completed || allSeriesDone) return undefined;
        const id = setInterval(() => { if (!showOverviewRef.current) setElapsed(e => e + 1); }, 1000);
        return () => clearInterval(id);
    }, [paused, completed, allSeriesDone]);
    // Stopwatch of the exercise being trained (rests and locked states do not count).
    useEffect(() => {
        if (paused || completed || allSeriesDone || !curKey || curKey.startsWith('R_')) return undefined;
        const id = setInterval(() => {
            if (!showOverviewRef.current) setExerciseTimes(t => ({ ...t, [curKey]: (t[curKey] || 0) + 1 }));
        }, 1000);
        return () => clearInterval(id);
    }, [curKey, paused, completed, allSeriesDone]);
    // A rest never advances by itself: at 0:00 the clock turns red and keeps counting (+m:ss) until
    // the athlete hits next. Its block stays on screen until then (see firstOpenBi), even when the
    // block has no RPEs to rate (warm-ups) or they were already rated during the rest.

    // Keep the open exercise (or a block's RPE card once the block is finished) centred on screen.
    const finishedSig = day.blocks.map((_, i) => (blockFinished0(i) ? '1' : '0')).join('');
    function blockFinished0(bi) { return blockKeys[bi].every(isDone); }
    // One effect: bring the current exercise / rest card to the top of the screen; when nothing is
    // current (locked behind RPEs) do the same for the block's pending RPE cards. Runs when the current card changes or a
    // block's RPE cards appear.
    useEffect(() => {
        if (showOverviewRef.current) return;
        if (curKey) { document.querySelector(`[data-card-key="${curKey}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
        document.querySelector('[data-block-footer]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [curKey, finishedSig]);
    // Every block done and rated -> the session summary card becomes available.
    const allClosed = day.blocks.length > 0 && day.blocks.every((_, i) => blockClosed(i));
    // First block still to work on: the blocks before it are closed and stay hidden while training.
    const restPendingBi = timer ? parseRestKey(timer.key).bi : -1;
    const firstOpenBi = day.blocks.findIndex((_, i) => !blockClosed(i) || i === restPendingBi);
    // Once everything is rated the ¿Cómo te fue? card appears: prefill the date and the duration
    // from the session clock.
    useEffect(() => {
        if (!allClosed || completed) return;
        setSessionSummary(prev => ({
            ...prev,
            dateTime: prev.dateTime || nowForInput(),
            durationMin: prev.durationMin || String(Math.max(1, Math.round(elapsed / 60))),
        }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allClosed]);
    // A new current block starts at the top of the screen.
    useEffect(() => {
        if (showOverviewRef.current) return;
        document.querySelector('.session-window-body')?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [firstOpenBi]);
    const updateSummary = (field, value) => setSessionSummary(prev => ({ ...prev, [field]: value }));

    // An entry can be checked only once every entry before it is checked AND every earlier
    // block is closed (RPE filled in). It can be unchecked only while nothing after it is
    // checked and its block has no RPE yet, so progress always forms a contiguous prefix.
    function canToggleDone(key) {
        const idx = orderedKeys.indexOf(key);
        const bi = blockKeys.findIndex(keys => keys.includes(key));
        if (isDone(key)) {
            return !orderedKeys.slice(idx + 1).some(isDone) && !day.blocks[bi].exercises.some(hasRpe);
        }
        return orderedKeys.slice(0, idx).every(isDone)
            && day.blocks.slice(0, bi).every((_, i) => blockClosed(i));
    }

    // Only completed sessions track changes (in-progress ones can always be saved as-is).
    const dirty = completed && baseline !== ''
        && JSON.stringify({ map: exerciseData, summary: exerciseSummary, sessionSummary }) !== baseline;

    // Auto-save for in-progress sessions: when the current state differs from the last
    // persisted snapshot (`baseline`) save it after a short pause, with no validation and
    // never marking it completed (so the trainer is not notified). Completed sessions keep
    // the explicit Guardar flow because their `dirty`/`editing` logic depends on `baseline`.
    const stateJson = JSON.stringify({ map: exerciseData, summary: exerciseSummary, sessionSummary });
    function flushAutoSave() {
        clearTimeout(autoSaveTimer.current);
        if (discardedRef.current || completed || baseline === '' || stateJson === baseline) return;
        setBaseline(stateJson);
        onAutoSave?.(buildLog(false));
    }
    useEffect(() => {
        if (discardedRef.current || completed || baseline === '' || stateJson === baseline || !onAutoSave) return undefined;
        autoSaveTimer.current = setTimeout(flushAutoSave, AUTOSAVE_DELAY_MS);
        return () => clearTimeout(autoSaveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stateJson, completed, baseline]);

    function handleBack() {
        if (dirty) { setLeaveAsk(true); return; }
        flushAutoSave();
        onBack();
    }

    // In-progress sessions save as-is (no validation: partial progress is fine); completed
    // ones still validate because they can be edited into an inconsistent state.
    function handleSave() {
        if (completed) { if (validate()) onSave(buildLog(true)); }
        else onSave(buildLog(false));
    }
    // "Finalizar sesión" (inside the inline ¿Cómo te fue? card): validate, then save as completed.
    function handleConfirmFinish() { if (validate()) onSave(buildLog(true)); }

    // Overview first only for a session nobody has touched yet; in-progress / completed ones
    // (judged from the saved log, so there is no flash before hydration) go straight to the list.
    const hasProgress = !!sessionLog && (sessionLog.completed || sessionLog.exercises?.some(e => e.done));
    const showOverview = !started && !hasProgress;
    showOverviewRef.current = showOverview;
    // Training in progress = the list is showing and the session is not completed: the only exits
    // are finishing or discarding it, so the back arrow is disabled and Dashboard blocks navigation.
    const trainingLocked = !completed && !showOverview;
    useEffect(() => {
        onTrainingLock?.(trainingLocked);
        return () => onTrainingLock?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trainingLocked]);
    function handleDiscard() {
        discardedRef.current = true;
        clearTimeout(autoSaveTimer.current);
        setDiscardAsk(false);
        onDiscard?.({ planId: plan.id, week, dayNumber: day.dayNumber });
    }
    const started_or_progress = !showOverview;

    // Warm-up blocks read "Calentamiento"; the rest are Bloque A, B… among themselves.
    const sessionBlockTitles = blockTitles(day.blocks);

    const summaryFields = (
        <>
            <div className="session-block-footer-field">
                <span className="session-exercise-input-label">Fecha y hora</span>
                <div style={{ display: 'flex', gap: 8 }}>
                    <input
                        type="datetime-local"
                        className="session-exercise-input session-exercise-input-comment"
                        value={sessionSummary.dateTime}
                        onChange={e => updateSummary('dateTime', e.target.value)}
                    />
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => updateSummary('dateTime', nowForInput())}>
                        Ahora
                    </button>
                </div>
            </div>
            <div className="session-block-footer-field">
                <span className="session-exercise-input-label">Duración de la sesión (minutos)</span>
                <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    className="session-exercise-input session-exercise-input-comment"
                    value={sessionSummary.durationMin}
                    onChange={e => updateSummary('durationMin', e.target.value)}
                    placeholder="—"
                />
            </div>
            <div className="session-block-footer-field">
                <span className="session-exercise-input-label">Autoevaluación</span>
                <select
                    className="session-rpe-select"
                    value={sessionSummary.selfEvaluation}
                    onChange={e => updateSummary('selfEvaluation', e.target.value)}
                >
                    <option value="">—</option>
                    {SELF_EVALUATION_OPTIONS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                </select>
            </div>
            <div className="session-block-footer-field">
                <span className="session-exercise-input-label">Nivel de esfuerzo de la sesión (1 suave – 10 máximo)</span>
                <select
                    className="session-rpe-select"
                    value={sessionSummary.effortLevel}
                    onChange={e => updateSummary('effortLevel', e.target.value)}
                >
                    <option value="">—</option>
                    {EFFORT_LEVELS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
            </div>
            <div className="session-block-footer-field">
                <span className="session-exercise-input-label">Comentario de la sesión</span>
                <textarea
                    className="session-exercise-input session-exercise-input-comment session-summary-comment"
                    rows={5}
                    value={sessionSummary.comment}
                    onChange={e => updateSummary('comment', e.target.value)}
                    placeholder="Cómo te sentiste, qué cambiarías, molestias, etc."
                />
            </div>
        </>
    );

    return (
        <div className="session-window">
            <div className="session-window-header">
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
                {sessionLog?.trainerComment && (
                    <div className="plan-session-block trainer-feedback-banner" style={{ marginBottom: 16 }}>
                        <div className="plan-session-block-label">Comentario de tu coach</div>
                        <p className="trainer-feedback-text">"{sessionLog.trainerComment}"</p>
                    </div>
                )}
                {showOverview && (
                    // Same look as the athlete home hero (dash-hero*): note, then each block wrapped in its
                    // own box — title with its series count, and per exercise the name with reps / carga
                    // underneath.
                    <div className="dash-hero session-overview">
                        <div className="dash-hero-label">{plan.name}</div>
                        <div className="dash-hero-title">Semana {week} · Día {day.dayNumber}</div>
                        {day.comentario?.trim() && <p className="dash-hero-note">{day.comentario.trim()}</p>}
                        <DayOverview blocks={fullDay.blocks.map(b => ({ ...b, exercises: visibleInPlan(b.exercises) }))} />
                    </div>
                )}
                {started_or_progress && day.blocks.map((block, bIdx) => {
                    // Only the block in progress is shown: finished ones and the ones still to come are hidden.
                    if (!completed && bIdx !== firstOpenBi) return null;
                    const allSameSeries = block.exercises.length > 0 &&
                        block.exercises.every(ex => ex.series === block.exercises[0].series);
                    const maxSeries = block.exercises.reduce((m, ex) => Math.max(m, ex.series || 1), 1);
                    const labelSuffix = allSameSeries ? ` (${block.exercises[0].series} Series)` : '';
                    const serieDone = n => block.exercises
                        .filter(ex => n <= (ex.series || 1))
                        .every(ex => exerciseData[`${ex.position}_s${n}`]?.done);
                    // Next serie = first one in this block with an exercise not yet checked.
                    // Only that one starts expanded, and it advances as series get completed
                    // (0 once the whole block is done, so everything collapses).
                    const nextSerie = Array.from({ length: maxSeries }, (_, i) => i + 1).find(n => !serieDone(n)) ?? 0;

                    return (
                        <div key={block.label} className="plan-session-block" style={{ marginBottom: 16 }}>
                            <div className="plan-session-block-label session-block-title">
                                {sessionBlockTitles[bIdx]}{labelSuffix}
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
                                {(fullDay.blocks.find(b => b.label === block.label)?.exercises || []).filter(e => e.isRest).map(r => (
                                    <span key={r.position}>
                                        <span className="session-block-summary-sep"> · </span>
                                        <span className="session-block-summary-meta">Descanso {restLabel(r)}</span>
                                    </span>
                                ))}
                            </div>

                            {/* Serie groups */}
                            {Array.from({ length: maxSeries }, (_, idx) => {
                                const serieNum = idx + 1;
                                const serieKey = `${block.label}_${serieNum}`;
                                const bIdxG = day.blocks.indexOf(block);
                                const curLoc = curKey == null ? null
                                    : curKey.startsWith('R_') ? parseRestKey(curKey)
                                    : { bi: blockKeys.findIndex(keys => keys.includes(curKey)), n: serieOfKey(curKey) };
                                const isOpen = serieOpen[serieKey] ?? (curLoc != null && curLoc.bi === bIdxG && curLoc.n === serieNum);
                                const isSerieDone = serieDone(serieNum);
                                // While training, series already finished (and not the one still open for its rest) are hidden.
                                if (!completed && isSerieDone && !isOpen) return null;
                                return (
                                    <div key={serieNum} className={`session-serie-group${isOpen ? ' is-open' : ''}`}>
                                        <button
                                            type="button"
                                            className="session-serie-header session-serie-header-toggle"
                                            onClick={() => setSerieOpen(prev => ({ ...prev, [serieKey]: !isOpen }))}
                                            aria-expanded={isOpen}
                                        >
                                            <span>Serie {serieNum} de {maxSeries}</span>
                                            {isSerieDone && (
                                                <span className="session-completed-check" title="Serie completada" aria-label="Serie completada">
                                                    <Icon name="check" size={14} />
                                                </span>
                                            )}
                                            <svg className="session-serie-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>
                                        {isOpen && block.exercises
                                            .filter(ex => serieNum <= (ex.series || 1))
                                            .map(ex => {
                                                const data = exerciseData[`${ex.position}_s${serieNum}`] || {};
                                                // Done series lock their reps/carga steppers; EDITAR (completed
                                                // sessions only) unlocks them again.
                                                const locked = data.done && !editing;
                                                const repsArr = ex.reps ? String(ex.reps).split(',') : [];
                                                const repForSerie = (repsArr[serieNum - 1] ?? repsArr[0] ?? ex.reps ?? '').trim();
                                                const rpeClass = RPE_CLASSES[exerciseSummary[ex.position]?.rpe] || '';
                                                const trainerComment = (ex.comentario || '').trim();
                                                // A completed session shows the athlete's own clip (from the
                                                // paperclip upload) instead of the trainer's reference video;
                                                // without one, the preview is removed entirely.
                                                const athleteVideo = exerciseSummary[ex.position]?.videoUrl || '';
                                                const shown = completed ? { ...ex, video: athleteVideo, videoUrl: athleteVideo } : ex;
                                                const showMedia = !completed || !!athleteVideo;
                                                // No prescribed carga → don't ask the athlete for one.
                                                const hasCarga = formatCarga(ex) !== '—';
                                                // Only the next exercise to do is open; the others show just their header.
                                                const cardKey = `${ex.position}_s${serieNum}`;
                                                // The exercise being trained (or whose timer runs) is always open; the rest follow manual toggles.
                                                const cardExpanded = completed || cardKey === curKey || (timer && timer.key === cardKey) || !!cardOpen[cardKey];
                                                // Exercises already done are hidden while training (the one just finished stays until the next opens).
                                                if (!completed && data.done && cardKey !== curKey) return null;

                                                return (
                                                    <div key={ex.position} data-card-key={cardKey} className={`session-serie-card ${rpeClass}${cardExpanded ? '' : ' is-collapsed'}${cardKey === curKey ? ' is-current' : ''}`}>
                                                        <div className="session-serie-card-name-row">
                                                            <div
                                                                className="session-serie-card-name-block session-serie-card-toggle"
                                                                role="button"
                                                                tabIndex={0}
                                                                aria-expanded={cardExpanded}
                                                                onClick={() => setCardOpen(prev => ({ ...prev, [cardKey]: !cardExpanded }))}
                                                                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCardOpen(prev => ({ ...prev, [cardKey]: !cardExpanded })); } }}
                                                            >
                                                                {shown.video
                                                                    ? <a href={shown.video} target="_blank" rel="noreferrer" className="session-serie-exercise-link">{ex.exerciseName || '—'}</a>
                                                                    : <span className="session-serie-exercise-name">{ex.exerciseName || '—'}</span>
                                                                }
                                                                <span className="session-serie-exercise-prescription">
                                                                    ({repForSerie} reps{formatCarga(ex) !== '—' ? ` · ${formatCarga(ex)}` : ''})
                                                                </span>
                                                            </div>
                                                            {data.done && (
                                                                <span className="session-completed-check" title="Hecho" aria-label="Hecho"><Icon name="check" size={14} /></span>
                                                            )}
                                                        </div>

                                                        {/* When the athlete marks the serie done, the reps & carga
                                                            steppers lock so the confirmed result can't be tweaked
                                                            by accident. Unchecking "done" re-enables them. The
                                                            .is-locked class on .session-stepper dims the row. */}
                                                        {cardExpanded && (<>
                                                        <div className={`session-serie-card-middle${resolveVideo(shown) ? '' : ' session-serie-card-middle--compact'}`}>
                                                            {showMedia && <ExerciseMediaThumb ex={shown} onOpen={() => setDetailExercise(shown)} />}

                                                            <div className="session-serie-card-inputs">
                                                                <div className="session-serie-card-input-row">
                                                                    <span className="session-exercise-input-label">Reps realizadas</span>
                                                                    <div className={`session-stepper ${locked ? 'is-locked' : ''}`}>
                                                                        <button className="session-stepper-btn" disabled={locked} onClick={() => step(ex.position, serieNum, 'actualReps', -1)}>−</button>
                                                                        <input
                                                                            className="session-exercise-input session-stepper-input"
                                                                            value={data.actualReps ?? ''}
                                                                            onChange={e => updateField(ex.position, serieNum, 'actualReps', e.target.value)}
                                                                            placeholder={repForSerie || '—'}
                                                                            disabled={locked}
                                                                        />
                                                                        <button className="session-stepper-btn" disabled={locked} onClick={() => step(ex.position, serieNum, 'actualReps', 1)}>+</button>
                                                                    </div>
                                                                </div>

                                                                {hasCarga && (
                                                                    <div className="session-serie-card-input-row">
                                                                        <span className="session-exercise-input-label">Carga utilizada</span>
                                                                        <div className={`session-stepper ${locked ? 'is-locked' : ''}`}>
                                                                            <button className="session-stepper-btn" disabled={locked} onClick={() => step(ex.position, serieNum, 'actualCarga', -1)}>−</button>
                                                                            <input
                                                                                className="session-exercise-input session-stepper-input"
                                                                                value={data.actualCarga ?? ''}
                                                                                onChange={e => updateField(ex.position, serieNum, 'actualCarga', e.target.value)}
                                                                                placeholder={ex.carga || '—'}
                                                                                disabled={locked}
                                                                            />
                                                                            <button className="session-stepper-btn" disabled={locked} onClick={() => step(ex.position, serieNum, 'actualCarga', 1)}>+</button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {trainerComment && (
                                                            <div className="session-serie-card-trainer-comment" title="Comentario del entrenador">
                                                                {trainerComment}
                                                            </div>
                                                        )}
                                                        {!completed && (
                                                            <div className="session-serie-controls">
                                                                {/* Pause freezes this exercise's stopwatch and the session clock (and any rest countdown). */}
                                                                <button type="button" className={`session-serie-control${paused ? ' is-paused' : ''}`}
                                                                    aria-label={paused ? 'Reanudar' : 'Pausar'} onClick={() => setPaused(p => !p)}>
                                                                    {paused ? '⏯' : '⏸'}
                                                                </button>
                                                                <button type="button" className="session-serie-control session-serie-control--next" aria-label={data.done ? 'Siguiente ejercicio' : 'Hecho y siguiente'}
                                                                    disabled={paused || (!data.done && !canToggleDone(cardKey))}
                                                                    onClick={() => goNext(cardKey, ex.position, serieNum)}>▶</button>
                                                            </div>
                                                        )}
                                                        </>)}
                                                    </div>
                                                );
                                            })}
                                        {isOpen && !completed && blockRestSeconds(bIdxG) && (() => {
                                            const rk = restKey(bIdxG, serieNum);
                                            const secs = blockRestSeconds(bIdxG);
                                            const running = timer && timer.key === rk;
                                            const expanded = curKey === rk || running || !!cardOpen[rk];
                                            const next = afterRound(bIdxG, serieNum);
                                            return (
                                                <div key={rk} data-card-key={rk} className={`session-serie-card session-rest-card${expanded ? '' : ' is-collapsed'}${curKey === rk ? ' is-current' : ''}`}>
                                                    {/* One compact row: name, clock (red + overtime once expired) and the two controls. */}
                                                    <div className={`session-rest-row${running && timer.remaining <= 0 ? ' is-expired' : ''}`}>
                                                        <div
                                                            className="session-serie-card-name-block session-serie-card-toggle"
                                                            role="button" tabIndex={0} aria-expanded={expanded}
                                                            onClick={() => setCardOpen(prev => ({ ...prev, [rk]: !expanded }))}
                                                        >
                                                            <span className="session-serie-exercise-name">Descanso</span>
                                                            {!expanded && <span className="session-serie-exercise-prescription">({secondsToClock(secs)})</span>}
                                                        </div>
                                                        {expanded && (
                                                            <>
                                                                <span className="session-rest-clock">
                                                                    {running && timer.remaining < 0 ? `+${secondsToClock(-timer.remaining)}` : secondsToClock(running ? timer.remaining : secs)}
                                                                </span>
                                                                <div className="session-rest-controls">
                                                                    <button type="button" className={`session-serie-control${paused ? ' is-paused' : ''}`}
                                                                        aria-label={paused ? 'Reanudar' : 'Pausar'}
                                                                        onClick={() => (running ? setPaused(p => !p) : setTimer({ kind: 'rest', key: rk, next, remaining: secs, running: true }))}>
                                                                        {paused ? '⏯' : '⏸'}
                                                                    </button>
                                                                    <button type="button" className="session-serie-control session-serie-control--next" aria-label="Saltar descanso"
                                                                        onClick={() => finishRest(rk, next)}>▶</button>
                                                                </div>
                                                            </>
                                                        )}
                                                        {restDone[rk] && !expanded && <span className="session-completed-check" title="Hecho" aria-label="Hecho"><Icon name="check" size={14} /></span>}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                );
                            })}

                            {/* Block footer: per-exercise summary cards (RPE + athlete
                                comment). One card per exercise, mirroring the serie-card
                                shell above. The paperclip button is a placeholder for an
                                upcoming feature (athlete uploads their own exercise video
                                for trainer review in "Historial de sesiones"). */}
                            {/* RPE cards only exist while they are pending: once the block's series are done
                                and until every RPE is set. After that they are hidden during training and show
                                again in the completed session (summary). */}
                            {/* Recap of what the athlete just did in this block (series are hidden once done), shown
                                above the RPE cards so the ratings are given knowing the real work. */}
                            {!completed && blockFinished(bIdxG0(block)) && !blockClosed(bIdxG0(block)) && (
                                <div className="session-block-recap">
                                    <div className="session-block-recap-title">Resumen del bloque</div>
                                    {block.exercises.map(ex => (
                                        <div key={ex.position} className="session-block-recap-ex">
                                            <div className="session-block-recap-name">{ex.exerciseName || '—'}</div>
                                            {Array.from({ length: ex.series || 1 }, (_, i) => i + 1).map(n => {
                                                const key = `${ex.position}_s${n}`;
                                                const d = exerciseData[key] || {};
                                                const load = formatCarga({ ...ex, carga: d.actualCarga });
                                                const secs = exerciseTimes[key];
                                                return (
                                                    <div key={n} className="session-block-recap-row">
                                                        <span>Serie {n}</span>
                                                        <span>
                                                            {d.actualReps !== '' && d.actualReps != null ? `${d.actualReps} reps` : '—'}
                                                            {load !== '—' ? ` · ${load}` : ''}
                                                            {secs ? ` · ${clockText(secs)}` : ''}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {(completed || (blockFinished(bIdxG0(block)) && !blockClosed(bIdxG0(block)))) && (
                            <div className="session-block-footer" data-block-footer={day.blocks.indexOf(block)}>
                                {block.exercises.map(ex => {
                                    // Warm-ups get no RPE, comment or video attachment: no footer card at all.
                                    if (!needsRpe(ex)) return null;
                                    const rpeClass = RPE_CLASSES[exerciseSummary[ex.position]?.rpe] || '';
                                    return (
                                        <div key={ex.position} className={`session-block-footer-card ${rpeClass}${!completed && ex === block.exercises.find(e => needsRpe(e) && !hasRpe(e)) ? ' is-current' : ''}`}>
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
                                            {needsRpe(ex) && (
                                            <div className="session-block-footer-field">
                                                <span className="session-exercise-input-label">RPE</span>
                                                <select
                                                    className={`session-rpe-select ${rpeClass}`}
                                                    // RPE can only be rated once every serie of the block is checked.
                                                    disabled={!blockFinished(day.blocks.indexOf(block))}
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
                                            )}
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
                            )}
                        </div>
                    );
                })}

                {allClosed && !showOverview && (
                    <div className="plan-session-block session-summary-card">
                        <div className="plan-session-block-label">{completed ? 'Resumen de la sesión' : '¿Cómo te fue?'}</div>
                        {/* Time per exercise (sum of its series stopwatches) and the total session time. */}
                        <div className="session-times">
                            <div className="session-times-row session-times-total"><span>Tiempo total</span><b>{clockText(elapsed)}</b></div>
                            {day.blocks.flatMap(b => b.exercises).map(ex => {
                                const secs = Object.entries(exerciseTimes)
                                    .filter(([k]) => k.startsWith(`${ex.position}_s`))
                                    .reduce((sum, [, v]) => sum + v, 0);
                                return secs > 0 ? (
                                    <div key={ex.position} className="session-times-row"><span>{ex.exerciseName || ex.position}</span><b>{clockText(secs)}</b></div>
                                ) : null;
                            })}
                        </div>
                        {summaryFields}
                        {!completed && (
                            <button className="btn btn-primary" style={{ width: '100%', marginTop: 12 }} onClick={handleConfirmFinish}>
                                Finalizar sesión
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="session-window-footer">
                {/* Disabled while training: leave by finishing or discarding (stop button). */}
                <button type="button" className="top-bar-icon-btn" onClick={handleBack} disabled={trainingLocked} aria-label="Volver" title={trainingLocked ? 'Terminá o descartá la sesión para salir' : 'Volver'}>
                    <Icon name="arrow-left" size={22} />
                </button>
                <div className="session-window-footer-actions">
                    {showOverview && (
                        <button className="btn btn-primary btn-sm" onClick={() => setStarted(true)}>
                            Empezar sesión
                        </button>
                    )}
                    {completed && (
                        <button
                            type="button"
                            className={`top-bar-icon-btn${editing ? ' active' : ''}`}
                            onClick={() => setEditing(e => !e)}
                            aria-pressed={editing}
                            aria-label="Editar" title="Editar"
                        >
                            <Icon name="pencil" size={20} />
                        </button>
                    )}
                    {/* Total session clock (bottom right) while training; the diskette only exists for completed sessions. */}
                    {!completed && !showOverview && (
                        <div className="session-clock">
                            <span className="session-clock-time">{clockText(elapsed)}</span>
                            {/* While paused: stop on the left, play (resume) on the right. */}
                            {paused && (
                                <button type="button" className="top-bar-icon-btn is-danger" onClick={() => setDiscardAsk(true)}
                                    aria-label="Detener y descartar la sesión" title="Detener y descartar la sesión">
                                    <Icon name="stop" size={20} />
                                </button>
                            )}
                            <button type="button" className="top-bar-icon-btn" onClick={() => setPaused(p => !p)}
                                aria-label={paused ? 'Reanudar' : 'Pausar'} title={paused ? 'Reanudar' : 'Pausar'}>
                                <Icon name={paused ? 'play' : 'pause'} size={20} />
                            </button>
                        </div>
                    )}
                    {completed && (
                        <button type="button" className="top-bar-icon-btn" onClick={handleSave} disabled={!dirty}
                            aria-label={completed ? 'Guardar' : 'Guardar y salir'} title={completed ? 'Guardar' : 'Guardar y salir'}>
                            <Icon name="save" size={20} />
                        </button>
                    )}
                </div>
            </div>

            {discardAsk && (
                <div className="modal-overlay open">
                    <div className="modal">
                        <div className="modal-header"><h2>¿Descartar la sesión?</h2></div>
                        <div className="modal-body">
                            <p>Si detenés la sesión se <b>elimina todo lo que registraste</b> (series, RPE, comentarios y tiempos) y no se puede deshacer. Tu coach no recibirá nada.</p>
                        </div>
                        <div className="modal-footer" style={{ flexWrap: 'wrap' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => setDiscardAsk(false)}>Seguir entrenando</button>
                            <button className="btn btn-danger btn-sm" onClick={handleDiscard}>Descartar sesión</button>
                        </div>
                    </div>
                </div>
            )}

            {leaveAsk && (
                <div className="modal-overlay open">
                    <div className="modal">
                        <div className="modal-header"><h2>Cambios sin guardar</h2></div>
                        <div className="modal-body">
                            <p>Hiciste cambios en esta sesión que todavía no guardaste. ¿Querés guardarlos antes de salir?</p>
                        </div>
                        {/* wrap: three buttons don't fit on one row on a phone */}
                        <div className="modal-footer" style={{ flexWrap: 'wrap' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => setLeaveAsk(false)}>Seguir editando</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => { setLeaveAsk(false); onBack(); }}>Salir sin guardar</button>
                            <button className="btn btn-primary btn-sm" onClick={() => { setLeaveAsk(false); handleSave(); }}>Guardar</button>
                        </div>
                    </div>
                </div>
            )}

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
