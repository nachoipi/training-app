import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../services/authService.js';

// Entry point for the "/" route — redirects users immediately based on auth state.
// `replace` swaps the history entry so the back button skips "/" entirely.
export default function Home() {
    return isAuthenticated()
        ? <Navigate to="/dashboard" replace />
        : <Navigate to="/login" replace />;
}
