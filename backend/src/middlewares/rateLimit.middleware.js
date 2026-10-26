// Minimal in-memory, per-IP fixed-window rate limiter for the PUBLIC invite
// routes (token lookup + athlete signup). State lives in the process, so it
// resets on restart and is per instance - enough for the single Render service.
// Usage: router.post('/x', rateLimit({ windowMs, max }), handler).
export function rateLimit({ windowMs = 15 * 60 * 1000, max = 20 } = {}) {
    const hits = new Map(); // ip -> { count, resetAt }
    // Drop expired entries so the map can't grow without bound.
    setInterval(() => {
        const now = Date.now();
        for (const [ip, h] of hits) if (h.resetAt <= now) hits.delete(ip);
    }, windowMs).unref();

    return (req, res, next) => {
        const now = Date.now();
        let h = hits.get(req.ip);
        if (!h || h.resetAt <= now) { h = { count: 0, resetAt: now + windowMs }; hits.set(req.ip, h); }
        h.count += 1;
        if (h.count > max) {
            res.set('Retry-After', String(Math.ceil((h.resetAt - now) / 1000)));
            return res.status(429).json({ error: 'Demasiados intentos. Probá de nuevo en unos minutos.' });
        }
        next();
    };
}
