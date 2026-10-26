// /api/athletes - trainer-only athlete management (list, link by email,
// invitation links). Mounted in app.js.
import { Router } from 'express';
import {
    getAthletes, linkAthlete, createInvite, listInvites, revokeInvite,
} from '../controllers/athlete.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth, requireRole('trainer'));
router.get('/',                getAthletes);
router.post('/link',           linkAthlete);
router.get('/invites',         listInvites);
router.post('/invites',        createInvite);
router.delete('/invites/:id',  revokeInvite);

export default router;
