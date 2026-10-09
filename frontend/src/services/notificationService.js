// Notification service. Wraps /api/notifications: list the caller's unread
// notifications and purge them (reading == deleting, see the Historial item in TODO.html).
import { apiFetch } from '../api/httpClient.js';
import { NOTIFICATIONS } from '../api/endpoints.js';

export const notificationService = {
    list:   () => apiFetch(NOTIFICATIONS),
    remove: (id) => apiFetch(`${NOTIFICATIONS}/${id}`, { method: 'DELETE' }),
    clear:  () => apiFetch(NOTIFICATIONS, { method: 'DELETE' }),
};
