// Chat service. Wraps /api/chat: conversation list, a thread (optionally only
// messages after `afterId`, for cheap polling), send, and mark-as-read.
// The backend decides who can talk to whom; trainers pass the athlete's id,
// athletes are always routed to their own trainer.
import { apiFetch } from '../api/httpClient.js';
import { CHAT } from '../api/endpoints.js';

export const chatService = {
    conversations: () => apiFetch(`${CHAT}/conversations`),
    messages: (withUserId, afterId = 0) => {
        const qs = new URLSearchParams({ afterId: String(afterId) });
        if (withUserId) qs.set('withUserId', withUserId);
        return apiFetch(`${CHAT}/messages?${qs}`);
    },
    send: (recipientId, body) => apiFetch(`${CHAT}/messages`, {
        method: 'POST',
        body: JSON.stringify({ recipientId, body }),
    }),
    markRead: (withUserId) => apiFetch(`${CHAT}/read`, {
        method: 'PATCH',
        body: JSON.stringify({ withUserId }),
    }),
};
