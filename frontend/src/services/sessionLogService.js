import { apiFetch } from '../api/httpClient.js';
import { SESSION_LOGS } from '../api/endpoints.js';

export const sessionLogService = {
    list: () => apiFetch(SESSION_LOGS),
    save: (log) => apiFetch(SESSION_LOGS, { method: 'POST', body: JSON.stringify(log) }),
};
