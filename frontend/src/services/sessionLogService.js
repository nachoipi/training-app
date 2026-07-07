import { apiFetch } from '../api/httpClient.js';
import { SESSION_LOGS } from '../api/endpoints.js';

// Keep in sync with multer's fileSize limit in
// backend/src/routes/sessionLog.routes.js. Re-checking on the client lets us
// fail fast (and politely) instead of letting the user wait for a 413.
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_VIDEO_MB    = 50;

// Per-exercise video upload uses multipart/form-data, so we bypass apiFetch
// (which forces application/json). We use XMLHttpRequest instead of fetch so
// the caller can observe upload progress via `onProgress(percent, loaded,
// total)` — fetch's body-stream progress isn't supported on every browser the
// app targets, and XHR's upload.onprogress is universal. Same JWT auth.
function uploadVideo({ file, planId, planName, exerciseName, week, dayNumber, position, onProgress }) {
    return new Promise((resolve, reject) => {
        const form = new FormData();
        form.append('file', file);
        form.append('planId', planId);
        if (planName)     form.append('planName', planName);
        if (exerciseName) form.append('exerciseName', exerciseName);
        form.append('week', String(week));
        form.append('dayNumber', String(dayNumber));
        form.append('position', position);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${SESSION_LOGS}/video`, true);
        const token = localStorage.getItem('fitcore_token');
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.upload.onprogress = (e) => {
            if (!e.lengthComputable) return;
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress?.(percent, e.loaded, e.total);
        };

        xhr.onload = () => {
            // Parse JSON regardless of status — backend always returns JSON.
            let body = {};
            try { body = JSON.parse(xhr.responseText || '{}'); } catch { /* keep {} */ }
            if (xhr.status >= 200 && xhr.status < 300) resolve(body);
            else reject(new Error(body.error || `HTTP ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error('Error de red al subir el video'));
        xhr.onabort = () => reject(new Error('Subida cancelada'));

        xhr.send(form);
    });
}

export const sessionLogService = {
    list: () => apiFetch(SESSION_LOGS),
    save: (log) => apiFetch(SESSION_LOGS, { method: 'POST', body: JSON.stringify(log) }),
    uploadVideo,
    deleteVideo: (path) => apiFetch(`${SESSION_LOGS}/video`, {
        method: 'DELETE',
        body: JSON.stringify({ path }),
    }),
};
