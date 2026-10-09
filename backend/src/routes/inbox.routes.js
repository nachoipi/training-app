// Route for /api/inbox/summary: the polled unread-count endpoint. Mounted in app.js.
import { Router } from 'express';
import { getInboxSummary } from '../controllers/inbox.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/summary', requireAuth, getInboxSummary);

export default router;
