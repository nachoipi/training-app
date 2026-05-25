import { Router } from 'express';
import { getAthletes } from '../controllers/athlete.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', requireAuth, requireRole('trainer'), getAthletes);

export default router;
