import { apiFetch } from '../api/httpClient.js';
import { ATHLETES } from '../api/endpoints.js';

export const userService = {
    listAthletes: () => apiFetch(ATHLETES),
};
