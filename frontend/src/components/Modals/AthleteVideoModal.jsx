// Plays an athlete's form-check clip for the coach. The clip is either an uploaded file
// (Supabase public URL → native <video>) or a Google Drive share link (→ Drive's /preview
// iframe, plus an "Abrir en Drive" fallback because embeds can refuse to stream).
import React from 'react';
import { Icon } from '../Icon/index.jsx';
import { extractDriveFileId, extractYouTubeId } from '../../utils/videoUrl.js';

// The player alone (no modal chrome), reused by the athlete's upload modal for link previews.
export function AthleteVideoPlayer({ url, title }) {
    const driveId = extractDriveFileId(url);
    const ytId = !driveId ? extractYouTubeId(url) : null;
    if (driveId) {
        return (
            <>
                <div className="exercise-detail-video exercise-detail-video--short">
                    <iframe
                        src={`https://drive.google.com/file/d/${driveId}/preview`}
                        title={title}
                        frameBorder="0"
                        allow="autoplay; encrypted-media"
                        allowFullScreen
                    />
                </div>
                <div className="exercise-detail-link-row">
                    <a className="btn btn-secondary btn-sm" href={`https://drive.google.com/file/d/${driveId}/view`} target="_blank" rel="noreferrer">
                        Abrir en Drive
                    </a>
                </div>
            </>
        );
    }
    if (ytId) {
        return (
            <div className="exercise-detail-video">
                <iframe
                    src={`https://www.youtube.com/embed/${ytId}?playsinline=1&rel=0`}
                    title={title}
                    frameBorder="0"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                />
            </div>
        );
    }
    return (
        <div className="exercise-video-stage">
            <video key={url} src={url} controls playsInline className="exercise-video-player" />
        </div>
    );
}

export function AthleteVideoModal({ open, url, exerciseName, onClose }) {
    if (!open || !url) return null;
    return (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal exercise-detail-modal exercise-detail-modal--short">
                <div className="modal-header">
                    <h2>Video del atleta — {exerciseName || 'Ejercicio'}</h2>
                    <button className="modal-close" onClick={onClose} aria-label="Cerrar"><Icon name="close" size={18} /></button>
                </div>
                <div className="modal-body">
                    <AthleteVideoPlayer url={url} title={exerciseName || 'Ejercicio'} />
                </div>
            </div>
        </div>
    );
}
