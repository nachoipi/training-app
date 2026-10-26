import { Router } from 'express';
import { login, me, logout, getInvite, registerAthlete } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { rateLimit } from '../middlewares/rateLimit.middleware.js';

const router = Router();

router.post('/login',  login);
router.get('/me',      requireAuth, me);
router.post('/logout', logout);

// Public invite flow, rate-limited per IP (token lookup is cheap to brute-force
// otherwise; the signup route also runs bcrypt).
const inviteLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });
router.get('/invite/:token',     inviteLimiter, getInvite);
router.post('/register-athlete', inviteLimiter, registerAthlete);

export default router;
