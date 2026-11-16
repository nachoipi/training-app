import { apiFetch } from '../api/httpClient.js';
import { PLANIFICATIONS } from '../api/endpoints.js';

export const planificationService = {
    list:   () => apiFetch(PLANIFICATIONS),
    create: (data) => apiFetch(PLANIFICATIONS, { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiFetch(`${PLANIFICATIONS}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    publish: (id) => apiFetch(`${PLANIFICATIONS}/${id}/publish`, { method: 'PATCH' }),
    archive: (id, archived) => apiFetch(`${PLANIFICATIONS}/${id}/archive`, { method: 'PATCH', body: JSON.stringify({ archived }) }),
    remove: (id) => apiFetch(`${PLANIFICATIONS}/${id}`, { method: 'DELETE' }),
};
