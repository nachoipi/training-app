import { Router } from 'express';
import { getRoutines, createRoutine, updateRoutine, deleteRoutine } from '../controllers/routine.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth);
router.get('/',       getRoutines);
router.post('/',      createRoutine);
router.put('/:id',    updateRoutine);
router.delete('/:id', deleteRoutine);

export default router;
