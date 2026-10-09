// Request handlers for /api/chat: conversation list, thread, send and
// mark-read for the 1-to-1 trainer/athlete chat. Authorisation is the pairing
// rule in MessageModel.arePaired (athlete's trainer = creator of their latest
// plan); anything outside a valid pair is a 403.
import { MessageModel } from '../models/message.model.js';
import { query } from '../config/db.js';

const MAX_BODY = 1000;

// Resolves the other side of a thread for the caller, or null if not allowed.
// Trainers pass the athlete id; athletes always talk to their own trainer.
async function resolvePeer(user, withUserId) {
    if (user.role === 'trainer') {
        if (!withUserId) return null;
        return (await MessageModel.arePaired(user.userId, withUserId)) ? withUserId : null;
    }
    return MessageModel.trainerOfAthlete(user.userId);
}

export const getConversations = async (req, res, next) => {
    try {
        if (req.user.role === 'trainer') {
            return res.json({ data: await MessageModel.conversationsForTrainer(req.user.userId) });
        }
        const trainerId = await MessageModel.trainerOfAthlete(req.user.userId);
        if (!trainerId) return res.json({ data: [] });
        const [trainer] = await query(`SELECT id, name, avatar FROM users WHERE id = $1`, [trainerId]);
        const unread = await query(
            `SELECT COUNT(*)::int AS n FROM messages WHERE sender_id = $1 AND recipient_id = $2 AND read_at IS NULL`,
            [trainerId, req.user.userId]);
        res.json({ data: trainer ? [{ ...trainer, unread: unread[0].n }] : [] });
    } catch (err) { next(err); }
};

export const getMessages = async (req, res, next) => {
    try {
        const peer = await resolvePeer(req.user, req.query.withUserId);
        if (!peer) return res.status(403).json({ error: 'No tenés una conversación con este usuario' });
        const afterId = Number(req.query.afterId) || 0;
        res.json({ data: await MessageModel.thread(req.user.userId, peer, afterId), peerId: peer });
    } catch (err) { next(err); }
};

export const sendMessage = async (req, res, next) => {
    try {
        const body = typeof req.body.body === 'string' ? req.body.body.trim() : '';
        if (!body) return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
        if (body.length > MAX_BODY) {
            return res.status(400).json({ error: `El mensaje no puede superar ${MAX_BODY} caracteres` });
        }
        // The recipient is validated against the pairing rule, never trusted from the client.
        const peer = await resolvePeer(req.user, req.body.recipientId);
        if (!peer) return res.status(403).json({ error: 'No tenés una conversación con este usuario' });
        const msg = await MessageModel.insert({ senderId: req.user.userId, recipientId: peer, body });
        res.status(201).json(msg);
    } catch (err) { next(err); }
};

export const markRead = async (req, res, next) => {
    try {
        const peer = await resolvePeer(req.user, req.body.withUserId);
        if (!peer) return res.status(403).json({ error: 'No tenés una conversación con este usuario' });
        await MessageModel.markRead(req.user.userId, peer);
        res.json({ message: 'Leídos' });
    } catch (err) { next(err); }
};
