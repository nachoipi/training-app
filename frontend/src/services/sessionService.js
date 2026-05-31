import { apiFetch } from '../api/httpClient.js';
import { SESSIONS } from '../api/endpoints.js';

export const sessionService = {
    list:   ()     => apiFetch(SESSIONS),
    create: (data) => apiFetch(SESSIONS, { method: 'POST', body: JSON.stringify(data) }),
    remove: (id)   => apiFetch(`${SESSIONS}/${id}`, { method: 'DELETE' }),
};
