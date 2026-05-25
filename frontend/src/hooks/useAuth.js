import { useEffect, useState } from 'react';
import { getCurrentUser, isAuthenticated, logout as doLogout, login as doLogin } from '../services/authService.js';

export function useAuth() {
    const [user, setUser] = useState(() => (isAuthenticated() ? getCurrentUser() : null));

    useEffect(() => {
        const onStorage = () => setUser(isAuthenticated() ? getCurrentUser() : null);
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    async function login(email, password) {
        const data = await doLogin(email, password);
        setUser(data.user);
        return data;
    }

    async function logout() {
        await doLogout();
        setUser(null);
    }

    return { user, login, logout, isAuthenticated: !!user };
}
