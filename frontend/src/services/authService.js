// Frontend auth service. Owns the login/logout flow and the local token cache
// (localStorage). The token itself is now a real HS256 JWT issued by the
// backend — never trusted for authorisation here, only inspected so the UI can
// decide whether to show the login screen or the dashboard.
import { apiFetch } from '../api/httpClient.js';
import { AUTH_LOGIN, AUTH_LOGOUT, AUTH_ME } from '../api/endpoints.js';

const TOKEN_KEY = 'fitcore_token';
const USER_KEY  = 'fitcore_user';

// Authenticate against the backend, then persist the JWT and the user blob so
// the rest of the SPA can render immediately on reload without re-fetching.
export async function login(email, password) {
    const data = await apiFetch(AUTH_LOGIN, {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
    });
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY,  JSON.stringify(data.user));
    return data;
}

export async function logout() {
    try { await apiFetch(AUTH_LOGOUT, { method: 'POST' }); } catch {}
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

// Persist a freshly issued token. Used after profile updates, where the
// backend re-signs the JWT so its embedded name/email/avatar claims match the
// DB. Without this the sidebar and req.user would show stale data.
export function setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
}

// Persist a freshly returned user blob. Paired with setToken on profile
// updates so reloading the SPA reads the new values straight from cache.
export function setCurrentUser(user) {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getCurrentUser() {
    try {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

// Client-side "is the token still plausibly valid?" check used by route
// guards. We decode the JWT payload (header.payload.signature) without
// verifying the signature — that's the server's job. Two JWT-specific
// gotchas drive the implementation:
//   1. base64url ≠ base64: convert '-'/'_' before calling atob().
//   2. `exp` is in seconds, not ms — multiply by 1000 before comparing.
// On any failure we evict the cached token so the user gets a clean login.
export function isAuthenticated() {
    const token = getToken();
    if (!token) return false;
    try {
        const [, payloadB64] = token.split('.');
        if (!payloadB64) return false;
        const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(json);
        if (!payload.exp || payload.exp * 1000 < Date.now()) {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            return false;
        }
        return true;
    } catch {
        return false;
    }
}

export async function fetchMe() {
    return apiFetch(AUTH_ME);
}
