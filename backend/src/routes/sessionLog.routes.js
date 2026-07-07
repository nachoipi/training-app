import { Router } from 'express';
import multer from 'multer';
import { getSessionLogs, saveSessionLog } from '../controllers/sessionLog.controller.js';
import { uploadExerciseVideo, deleteExerciseVideo } from '../controllers/sessionLogVideo.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

// Memory storage + 50MB cap — athletes record short form-check clips. 50MB
// covers ~60s of 1080p H.264 or a moderate 4K clip while keeping uploads fast
// on 4G. Buffer hand-off keeps multer out of the disk so deploys remain
// stateless. The frontend pre-checks the same limit (sessionLogService.
// MAX_VIDEO_BYTES) so the user gets immediate feedback instead of waiting
// for a 413.
const videoUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if ((file.mimetype || '').startsWith('video/')) cb(null, true);
        else cb(new Error('Solo se permiten archivos de video'));
    },
});

const router = Router();

router.use(requireAuth);
router.get('/',  getSessionLogs);
router.post('/', requireRole('athlete'), saveSessionLog);

// Wraps the multer middleware so MulterError (e.g. LIMIT_FILE_SIZE,
// unsupported mime type) surfaces as a clean 400/413 with a Spanish message
// instead of falling through to the generic 500 handler.
function handleVideoUpload(req, res, next) {
    videoUpload.single('file')(req, res, err => {
        if (!err) return next();
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: 'El video supera el límite de 50 MB.' });
        }
        return res.status(400).json({ error: err.message || 'Archivo de video inválido' });
    });
}

router.post('/video',   requireRole('athlete'), handleVideoUpload, uploadExerciseVideo);
router.delete('/video', requireRole('athlete'), deleteExerciseVideo);

export default router;
