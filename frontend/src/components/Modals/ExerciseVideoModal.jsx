// Per-exercise athlete video modal. Opened from the AthleteMySession block
// footer paperclip. Picks a video file, uploads to backend, and reports the
// resulting { url, path } back via onUploaded so the parent can persist it
// inside session_logs.payload.exerciseSummary[position]. Also supports
// replacing or removing an existing clip.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../Icon/index.jsx';
import { sessionLogService, MAX_VIDEO_BYTES, MAX_VIDEO_MB } from '../../services/sessionLogService.js';

export function ExerciseVideoModal({
    open,
    exerciseName,
    existing,        // { url, path } | null
    planId,
    planName,
    week,
    dayNumber,
    position,
    onClose,
    onUploaded,      // ({ url, path }) => void
    onRemoved,       // () => void
    onError,         // (msg) => void  (toast hook)
}) {
    const [file, setFile]         = useState(null);
    const [busy, setBusy]         = useState(false);
    // null when not uploading; 0..100 once xhr.upload.onprogress fires.
    const [progress, setProgress] = useState(null);
    const fileInputRef            = useRef(null);
    const cameraInputRef          = useRef(null);

    // Reset local state when the modal closes AND there's no upload in flight.
    // If we reset on `open` instead, reopening mid-upload would clear `file`
    // and the user would lose the in-progress preview. Keeping state while
    // busy lets a closed-then-reopened modal seamlessly resume.
    useEffect(() => {
        if (!open && !busy) {
            setFile(null);
            setProgress(null);
        }
    }, [open, busy]);

    // Memoise the blob URL per file identity. Without this, every progress
    // update triggers a re-render, which previously produced a NEW
    // URL.createObjectURL() on each tick — the <video> element's `src` and
    // its remount `key` changed, causing the playback to flash/reset while
    // uploading. Tied to the File instance, not the render.
    const localBlobUrl = useMemo(
        () => (file ? URL.createObjectURL(file) : null),
        [file]
    );
    useEffect(() => {
        // Revoke the blob URL when the file changes or the modal unmounts so
        // the browser can release the underlying buffer.
        return () => { if (localBlobUrl) URL.revokeObjectURL(localBlobUrl); };
    }, [localBlobUrl]);

    if (!open) return null;

    // Validates the picked file before storing it in state. Rejecting early
    // lets us emit a Spanish toast instead of waiting for the server's 413.
    function pickFile(picked) {
        if (!picked) { setFile(null); return; }
        if (picked.size > MAX_VIDEO_BYTES) {
            const mb = (picked.size / (1024 * 1024)).toFixed(1);
            onError?.(`El video pesa ${mb} MB y supera el límite de ${MAX_VIDEO_MB} MB. Recortalo o bajá la calidad.`);
            return;
        }
        setFile(picked);
    }

    async function handleUpload() {
        if (!file) return;
        // Double-check in case the file reference was mutated between pick
        // and upload (rare, but cheaper than the round-trip).
        if (file.size > MAX_VIDEO_BYTES) {
            onError?.(`El video supera el límite de ${MAX_VIDEO_MB} MB.`);
            return;
        }
        setBusy(true);
        setProgress(0);
        try {
            const res = await sessionLogService.uploadVideo({
                file, planId, planName, exerciseName, week, dayNumber, position,
                onProgress: (percent) => setProgress(percent),
            });
            onUploaded?.({ url: res.url, path: res.path });
            // Intentionally keep the modal open so the athlete can watch the
            // just-uploaded clip back. Clear `file` so the preview switches
            // from the local blob to the public Supabase URL (proves the
            // round-trip worked) — the parent re-feeds it via `existing`.
            setFile(null);
        } catch (err) {
            onError?.(err.message || 'No se pudo subir el video');
        } finally {
            setBusy(false);
            setProgress(null);
        }
    }

    async function handleRemove() {
        if (!existing?.path) return;
        setBusy(true);
        try {
            await sessionLogService.deleteVideo(existing.path);
            onRemoved?.();
            onClose?.();
        } catch (err) {
            onError?.(err.message || 'No se pudo eliminar el video');
        } finally {
            setBusy(false);
        }
    }

    const previewUrl = localBlobUrl || existing?.url || null;
    // "Uploaded" state: there's a video on the server and the athlete hasn't
    // picked a new local file. In this mode we collapse the picker UI down
    // to "Eliminar (rojo)" + "Subido (verde, desactivado)" so it's obvious
    // the upload finished — no leftover "Subir" button to confuse the user.
    const isUploaded = Boolean(existing?.url) && !file && !busy;

    return (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <h2>Video — {exerciseName || 'Ejercicio'}</h2>
                    <button className="modal-close" onClick={onClose} aria-label="Cerrar"><Icon name="close" size={18} /></button>
                </div>
                <div className="modal-body">
                    {previewUrl ? (
                        // 9:16 stage. Athletes record on phones (portrait), so the
                        // default frame respects that aspect. object-fit: contain
                        // keeps any landscape clips fully visible (letterboxed)
                        // without breaking the layout.
                        <div className="exercise-video-stage">
                            <video
                                key={previewUrl}
                                src={previewUrl}
                                controls
                                playsInline
                                className="exercise-video-player"
                            />
                        </div>
                    ) : (
                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', margin: '24px 0' }}>
                            Subí un video corto del ejercicio para que tu entrenador pueda revisarlo.
                            <br />
                            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                                Máximo {MAX_VIDEO_MB} MB · formatos: MP4, MOV, WebM
                            </span>
                        </p>
                    )}

                    {/* Two inputs: one defaults to the gallery/files picker (no
                        `capture` attribute), the other forces the rear camera. On
                        iOS/Android the first lets the user pick "Photo Library" or
                        "Choose File"; the second jumps straight into Camera. On
                        desktop the camera input behaves like the gallery one. */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*"
                        style={{ display: 'none' }}
                        onChange={e => pickFile(e.target.files?.[0] || null)}
                    />
                    <input
                        ref={cameraInputRef}
                        type="file"
                        accept="video/*"
                        capture="environment"
                        style={{ display: 'none' }}
                        onChange={e => pickFile(e.target.files?.[0] || null)}
                    />
                    {/* Picker row — hidden in the uploaded state so the athlete
                        sees a clean "video on file" view. To replace a clip
                        they delete first, then upload anew. */}
                    {!isUploaded && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={busy}
                            >
                                {file ? 'Elegir otro archivo' : 'Elegir archivo'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => cameraInputRef.current?.click()}
                                disabled={busy}
                            >
                                Grabar con cámara
                            </button>
                            {file && (
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', alignSelf: 'center' }}>
                                    {file.name} · {(file.size / (1024 * 1024)).toFixed(1)} MB
                                </span>
                            )}
                        </div>
                    )}

                    {/* Two-phase progress strip:
                         - Phase 1 ("uploading"): XHR is streaming bytes. Bar
                           fills proportionally to upload progress. Label says
                           "Subiendo…".
                         - Phase 2 ("processing"): XHR finished — bytes have left
                           the browser, but the backend is still pushing the file
                           to Supabase Storage. Bar stays full with an animated
                           stripe pattern; label says "Procesando…".
                        This avoids the misleading "Subiendo 100%" state while
                        the server hadn't yet acknowledged. */}
                    {busy && (
                        <div
                            className={`exercise-video-progress ${progress >= 100 ? 'is-processing' : 'is-uploading'}`}
                            aria-label={progress >= 100 ? 'Procesando video' : 'Subiendo video'}
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={progress >= 100 ? undefined : progress}
                        >
                            <div
                                className="exercise-video-progress-fill"
                                style={{ width: progress >= 100 ? '100%' : `${progress}%` }}
                            />
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    {/* Eliminar — visible whenever there's a server-side video
                        the athlete could remove. Red so the destructive intent
                        is unmistakable. */}
                    {existing?.url && !file && (
                        <button
                            type="button"
                            className="exercise-video-badge-btn is-danger"
                            onClick={handleRemove}
                            disabled={busy}
                            aria-label="Eliminar video"
                            title="Eliminar video"
                        >
                            <Icon name="trash" size={16} />
                        </button>
                    )}
                    {isUploaded ? (
                        // Status pill: the upload succeeded and there's no new
                        // file pending. Disabled so it reads as a state, not
                        // an action. Visual matches the "sesión completada"
                        // badge used elsewhere in the app (.session-completed-check).
                        <span
                            className="exercise-video-badge-btn is-success"
                            role="img"
                            aria-label="Video subido"
                            title="Video subido"
                        >
                            <Icon name="check" size={16} />
                        </span>
                    ) : (
                        <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={handleUpload}
                            disabled={!file || busy}
                        >
                            {busy
                                ? (progress >= 100 ? 'Procesando…' : 'Subiendo…')
                                : 'Subir'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
