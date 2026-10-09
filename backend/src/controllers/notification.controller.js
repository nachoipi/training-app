// Request handlers for /api/notifications: list the caller's unread
// notifications and purge them (one or all). Reading == deleting by design;
// a "Historial" is tracked in TODO.html. Always scoped to req.user.userId.
import { NotificationModel } from '../models/notification.model.js';

export const listNotifications = async (req, res, next) => {
    try {
        const data = await NotificationModel.listForUser(req.user.userId);
        res.json({ data, total: data.length });
    } catch (err) { next(err); }
};

export const removeNotification = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.status(400).json({ error: 'id inválido' });
        // Idempotent: a double click (or another device) may have deleted it already.
        await NotificationModel.remove(id, req.user.userId);
        res.json({ message: 'Eliminada' });
    } catch (err) { next(err); }
};

export const clearNotifications = async (req, res, next) => {
    try {
        await NotificationModel.removeAll(req.user.userId);
        res.json({ message: 'Notificaciones eliminadas' });
    } catch (err) { next(err); }
};
