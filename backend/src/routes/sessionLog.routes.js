import { Router } from 'express';
import { getSessionLogs, saveSessionLog } from '../controllers/sessionLog.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth);
router.get('/',  getSessionLogs);
router.post('/', requireRole('athlete'), saveSessionLog);

export default router;
