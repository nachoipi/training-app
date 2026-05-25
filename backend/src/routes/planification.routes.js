import { Router } from 'express';
import {
    getPlanifications, createPlanification, updatePlanification, deletePlanification,
} from '../controllers/planification.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth);
router.get('/',       getPlanifications);
router.post('/',      requireRole('trainer'), createPlanification);
router.put('/:id',    requireRole('trainer'), updatePlanification);
router.delete('/:id', requireRole('trainer'), deletePlanification);

export default router;
