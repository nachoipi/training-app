// GET /api/inbox/summary: the single endpoint the frontend polls (~25s) for
// the top-bar badges. Two indexed COUNTs, nothing else, to keep polling cheap.
import { NotificationModel } from '../models/notification.model.js';
import { MessageModel } from '../models/message.model.js';

export const getInboxSummary = async (req, res, next) => {
    try {
        const [notifications, messages] = await Promise.all([
            NotificationModel.count(req.user.userId),
            MessageModel.unreadTotal(req.user.userId),
        ]);
        res.json({ notifications, messages });
    } catch (err) { next(err); }
};
