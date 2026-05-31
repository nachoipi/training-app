import { apiFetch } from '../api/httpClient.js';
import { EXERCISES } from '../api/endpoints.js';

export const exerciseService = {
    list:   ()     => apiFetch(EXERCISES),
    create: (data) => apiFetch(EXERCISES, { method: 'POST', body: JSON.stringify(data) }),
    remove: (id)   => apiFetch(`${EXERCISES}/${id}`, { method: 'DELETE' }),
};
