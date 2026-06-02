// Self-user routes. Mounted at /api/users in app.js; covers actions a logged-in
// user performs on their own record (currently just profile editing). Athlete
// listings live in athlete.routes.js, login/logout in auth.routes.js.
import { Router } from 'express';
import { updateMe } from '../controllers/user.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.patch('/me', requireAuth, updateMe);

export default router;
