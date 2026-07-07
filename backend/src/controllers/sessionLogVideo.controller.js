// Handles per-exercise video upload/delete for athlete session logs. The
// uploaded URL is NOT written to session_logs here — the frontend embeds it in
// the next saveSessionLog payload alongside comment/rpe, so this controller
// only deals with object storage.
import { isConfigured, uploadVideo, removeVideo } from '../services/storage.service.js';

// Lowercase, ASCII-folded, hyphen-separated. Strips accents (á → a) and
// collapses any other character to '-' so paths are URL- and filesystem-safe.
// Empty / undefined falls back to `fallback` so we never emit a `//` segment.
function slugify(value, fallback = 'x') {
    const s = String(value || '')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return s || fallback;
}

// Timestamp slug like 20260625-0741 — readable in storage browsers and
// unique enough to avoid CDN cache collisions when an athlete re-uploads.
function timestampSlug(d = new Date()) {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

// Path layout inside the bucket. Folders are athlete/plan so a trainer can
// drill down by athlete; filename embeds athlete + plan + week + day +
// exercise + position + timestamp so the file is self-describing if downloaded
// or shared out of context.
function buildPath({ athleteName, planName, exerciseName, week, dayNumber, position, ext }) {
    const athleteSlug  = slugify(athleteName, 'athlete');
    const planSlug     = slugify(planName, 'plan');
    const exerciseSlug = slugify(exerciseName, 'ejercicio');
    const safeWeek     = Number(week) || 0;
    const safeDay      = Number(dayNumber) || 0;
    const safePos      = slugify(position, 'x');
    const ts           = timestampSlug();
    const filename = `${athleteSlug}-${planSlug}-w${safeWeek}d${safeDay}-${exerciseSlug}-${safePos}-${ts}.${ext}`;
    return `${athleteSlug}/${planSlug}/${filename}`;
}

function extensionFor(file) {
    const fromName = (file.originalname || '').split('.').pop()?.toLowerCase();
    if (fromName && fromName.length <= 5) return fromName;
    // Fallback by mime: video/mp4 → mp4, video/quicktime → mov, etc.
    const m = (file.mimetype || '').split('/')[1];
    return (m || 'mp4').toLowerCase();
}

export const uploadExerciseVideo = async (req, res, next) => {
    try {
        if (!isConfigured()) {
            return res.status(503).json({ error: 'Almacenamiento de video no configurado' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'Falta el archivo de video' });
        }
        const { planId, planName, exerciseName, week, dayNumber, position } = req.body;
        if (!planId || week == null || dayNumber == null || !position) {
            return res.status(400).json({ error: 'Faltan datos del ejercicio (planId, week, dayNumber, position)' });
        }
        // athleteName comes from the JWT (req.user.name), not the request body,
        // so an athlete can't spoof someone else's folder.
        const path = buildPath({
            athleteName: req.user.name,
            planName,
            exerciseName,
            week, dayNumber, position,
            ext: extensionFor(req.file),
        });
        const result = await uploadVideo({
            path,
            buffer: req.file.buffer,
            contentType: req.file.mimetype || 'video/mp4',
        });
        res.json({ url: result.publicUrl, path: result.path });
    } catch (err) { next(err); }
};

export const deleteExerciseVideo = async (req, res, next) => {
    try {
        if (!isConfigured()) {
            return res.status(503).json({ error: 'Almacenamiento de video no configurado' });
        }
        const { path } = req.body || {};
        if (!path) return res.status(400).json({ error: 'Falta el path del video' });
        // Defensive: only let an athlete delete files inside their own slug
        // folder. Slugs are derived from req.user.name (JWT), not from the
        // request body, so this can't be spoofed by the client.
        const athleteSlug = slugify(req.user.name, 'athlete');
        if (!path.startsWith(`${athleteSlug}/`)) {
            return res.status(403).json({ error: 'No autorizado' });
        }
        await removeVideo(path);
        res.json({ ok: true });
    } catch (err) { next(err); }
};
