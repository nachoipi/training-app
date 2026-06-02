// User service. Thin wrapper around /api/users/* and /api/athletes. Profile
// edits go through updateMe — the backend returns a fresh JWT so the caller
// must persist both the new user blob and the new token (see authService).
import { apiFetch } from '../api/httpClient.js';
import { ATHLETES, USERS_ME } from '../api/endpoints.js';

export const userService = {
    listAthletes: () => apiFetch(ATHLETES),

    // PATCH the current user's profile. Returns { user, token }. The token is
    // re-issued because the JWT payload embeds name/email/avatar — without
    // refreshing it, req.user on subsequent requests would be stale.
    updateMe: (payload) =>
        apiFetch(USERS_ME, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        }),
};
