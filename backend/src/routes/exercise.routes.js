import { Router } from 'express';
import { getExercises, createExercise, updateExercise, deleteExercise } from '../controllers/exercise.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/',       getExercises);
router.post('/',      requireAuth, requireRole('trainer'), createExercise);
router.put('/:id',    requireAuth, requireRole('trainer'), updateExercise);
router.delete('/:id', requireAuth, requireRole('trainer'), deleteExercise);

export default router;
