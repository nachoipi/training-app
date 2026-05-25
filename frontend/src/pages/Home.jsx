import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../services/authService.js';

export default function Home() {
    return isAuthenticated()
        ? <Navigate to="/dashboard" replace />
        : <Navigate to="/login" replace />;
}
