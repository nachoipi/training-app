import { apiFetch } from '../api/httpClient.js';
import { ROUTINES } from '../api/endpoints.js';

export const routineService = {
    list:    ()         => apiFetch(ROUTINES),
    create:  (data)     => apiFetch(ROUTINES, { method: 'POST',   body: JSON.stringify(data) }),
    update:  (id, data) => apiFetch(`${ROUTINES}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove:  (id)       => apiFetch(`${ROUTINES}/${id}`, { method: 'DELETE' }),
};
