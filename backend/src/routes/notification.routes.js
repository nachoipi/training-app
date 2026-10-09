// Routes for /api/notifications (any authenticated user; handlers scope to
// the caller). Mounted in app.js.
import { Router } from 'express';
import { listNotifications, removeNotification, clearNotifications } from '../controllers/notification.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth);
router.get('/', listNotifications);
router.delete('/', clearNotifications);
router.delete('/:id', removeNotification);

export default router;
