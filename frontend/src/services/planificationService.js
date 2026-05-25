import { apiFetch } from '../api/httpClient.js';
import { PLANIFICATIONS } from '../api/endpoints.js';

export const planificationService = {
    list:   () => apiFetch(PLANIFICATIONS),
    create: (data) => apiFetch(PLANIFICATIONS, { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiFetch(`${PLANIFICATIONS}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id) => apiFetch(`${PLANIFICATIONS}/${id}`, { method: 'DELETE' }),
};
