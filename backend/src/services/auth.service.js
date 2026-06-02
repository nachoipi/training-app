// Auth service. Issues and verifies HS256 JSON Web Tokens for the /api/auth/*
// routes. Tokens are signed with JWT_SECRET (HMAC) so they cannot be forged on
// the client — replaces the previous unsigned base64 scheme. Consumed by
// auth.controller.js (login) and auth.middleware.js (every protected route).
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/env.js';

// Build a signed JWT for an authenticated user. Only fields needed by
// requireAuth / requireRole go into the payload — never the password hash.
// HS256 is forced explicitly to block "alg: none" downgrade attacks.
export function createToken(user) {
    const payload = {
        userId: user.id,
        role:   user.role,
        name:   user.name,
        email:  user.email,
        avatar: user.avatar,
    };
    return jwt.sign(payload, JWT_SECRET, {
        algorithm: 'HS256',
        expiresIn: JWT_EXPIRES_IN,
    });
}

// Verify a bearer token. Returns the decoded payload on success or null on any
// failure (bad signature, wrong algorithm, expired, malformed). The middleware
// turns null into a 401, so swallowing the specific error here is intentional.
export function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    } catch {
        return null;
    }
}

// Lightweight non-cryptographic id generator used by the in-memory-style
// helpers in the models. NOT suitable for security purposes — auth tokens go
// through jwt.sign above.
export function uid() {
    return '_' + Math.random().toString(36).slice(2, 10);
}
