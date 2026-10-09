// Routes for /api/chat (trainer + athlete). Pairing is enforced inside the
// controller, so requireAuth is all that's needed here. Mounted in app.js.
import { Router } from 'express';
import { getConversations, getMessages, sendMessage, markRead } from '../controllers/chat.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth);
router.get('/conversations', getConversations);
router.get('/messages', getMessages);
router.post('/messages', sendMessage);
router.patch('/read', markRead);

export default router;
