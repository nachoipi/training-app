import { verifyToken } from '../services/auth.service.js';

export function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No autorizado. Iniciá sesión.' });
    }
    const payload = verifyToken(header.slice(7));
    if (!payload) {
        return res.status(401).json({ error: 'Token inválido o expirado.' });
    }
    req.user = payload;
    next();
}

export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Acceso denegado para tu rol.' });
        }
        next();
    };
}
