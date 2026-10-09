// Inbox service. Wraps GET /api/inbox/summary, the cheap unread-count endpoint
// polled by hooks/useInbox.js to drive the top-bar badges.
import { apiFetch } from '../api/httpClient.js';
import { INBOX } from '../api/endpoints.js';

export const inboxService = {
    summary: () => apiFetch(`${INBOX}/summary`),
};
