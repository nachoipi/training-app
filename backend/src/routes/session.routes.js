import { Router } from 'express';
import { getSessions, createSession, deleteSession } from '../controllers/session.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth);
router.get('/',       getSessions);
router.post('/',      createSession);
router.delete('/:id', deleteSession);

export default router;
