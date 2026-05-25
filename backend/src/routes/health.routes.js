import { Router } from 'express';
import { getStatus, getHealth } from '../controllers/health.controller.js';

const router = Router();

router.get('/status', getStatus);
router.get('/health', getHealth);

export default router;
