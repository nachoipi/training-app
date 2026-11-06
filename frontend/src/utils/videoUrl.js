// URL recognisers for the video sources the app supports (YouTube, Google Drive, direct files).
// Shared by the athlete session screen and the trainer's video viewer.

// Extracts a YouTube video id from common URL shapes (watch?v=, youtu.be/, embed/).
// Returns null when the URL is not YouTube — caller then falls back to a
// generic play tile so unknown hosts don't break with a 404 image.
export function extractYouTubeId(url) {
    if (!url) return null;
    const patterns = [
        /[?&]v=([a-zA-Z0-9_-]{11})/,
        /youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    return null;
}

// Recognises direct video files we can render with a <video> tag. Strips query
// strings before matching (Supabase Storage URLs can carry `?token=…`).
// Anything not in the list (Vimeo, Loom share pages, etc.) falls back to the
// static icon — the detail modal still surfaces an "Abrir video" link for them.
export function isDirectVideoUrl(url) {
    if (!url) return false;
    const clean = url.split('?')[0].toLowerCase();
    return /\.(mp4|webm|mov|m4v|ogv|ogg)$/.test(clean);
}

// Extracts a Google Drive file id from common share-link shapes:
//   https://drive.google.com/file/d/<ID>/view?usp=drive_link
//   https://drive.google.com/open?id=<ID>
//   https://drive.google.com/uc?id=<ID>&export=download
// Returns null when not a Drive URL. Drive files won't play in a <video> tag
// (the URL serves an HTML viewer, not a media stream) — so the catch points
// the UI at Drive's own thumbnail + embeddable preview endpoints instead.
export function extractDriveFileId(url) {
    if (!url) return null;
    const m1 = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (m1) return m1[1];
    const m2 = url.match(/drive\.google\.com\/(?:open|uc)\?[^#]*\bid=([a-zA-Z0-9_-]+)/);
    if (m2) return m2[1];
    return null;
}
