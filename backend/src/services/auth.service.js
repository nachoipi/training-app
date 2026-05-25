import { TOKEN_TTL_MS } from '../config/env.js';

export function createToken(user) {
    const payload = {
        userId: user.id,
        role:   user.role,
        name:   user.name,
        email:  user.email,
        avatar: user.avatar,
        iat:    Date.now(),
        exp:    Date.now() + TOKEN_TTL_MS,
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export function verifyToken(token) {
    try {
        const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
        if (!payload.exp || payload.exp < Date.now()) return null;
        return payload;
    } catch {
        return null;
    }
}

export function uid() {
    return '_' + Math.random().toString(36).slice(2, 10);
}
