// Image proxy for Google Drive thumbnails. Drive's /thumbnail endpoint
// 302-redirects to lh3.googleusercontent.com with `cross-origin-resource-
// policy: same-site`, which the browser blocks when an <img src> on another
// origin (e.g. localhost:5173) tries to load it. By fetching server-side
// we sidestep the browser's CORP check, then stream the image bytes back
// to our own origin where the browser is happy to render them.
//
// Public (no auth) — the underlying Drive file is already link-shared, so
// proxying it doesn't leak anything not already public.

// Drive file IDs are alphanumeric + dash + underscore. Anything else is
// rejected to prevent the proxy from being used as a general open redirect.
const DRIVE_ID_RE = /^[A-Za-z0-9_-]+$/;
const ALLOWED_SIZES = new Set(['w200', 'w400', 'w600', 'w800', 'w1000']);

export const driveThumbnail = async (req, res, next) => {
    try {
        const id   = String(req.query.id   || '').trim();
        const size = String(req.query.sz   || 'w400').trim();
        if (!DRIVE_ID_RE.test(id))    return res.status(400).json({ error: 'id inválido' });
        if (!ALLOWED_SIZES.has(size)) return res.status(400).json({ error: 'sz inválido' });

        const upstream = await fetch(
            `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=${size}`,
            { redirect: 'follow' }
        );
        if (!upstream.ok) {
            return res.status(upstream.status).json({ error: `Drive respondió ${upstream.status}` });
        }
        const contentType = upstream.headers.get('content-type') || '';
        // When the file isn't shared "anyone with the link", Drive bounces
        // through accounts.google.com/signin and returns its sign-in HTML.
        // Reject that explicitly with a clear 403 so the browser's <img>
        // shows broken-image state and the team knows to fix sharing, instead
        // of silently serving HTML as if it were a thumbnail.
        if (!contentType.startsWith('image/')) {
            return res.status(403).json({
                error: 'El archivo de Drive no es público. Compartilo como "Cualquiera con el enlace puede ver" para que se previsualice.',
            });
        }
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
        const buf = Buffer.from(await upstream.arrayBuffer());
        res.send(buf);
    } catch (err) { next(err); }
};
