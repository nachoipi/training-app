import { apiFetch } from '../api/httpClient.js';
import { AUTH_LOGIN, AUTH_LOGOUT, AUTH_ME } from '../api/endpoints.js';

const TOKEN_KEY = 'fitcore_token';
const USER_KEY  = 'fitcore_user';

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

export function getCurrentUser() {
    try {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

export function isAuthenticated() {
    const token = getToken();
    if (!token) return false;
    try {
        const payload = JSON.parse(atob(token));
        if (!payload.exp || payload.exp < Date.now()) {
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
