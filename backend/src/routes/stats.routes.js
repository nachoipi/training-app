import { Router } from 'express';
import { getStats } from '../controllers/stats.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', requireAuth, getStats);

export default router;
