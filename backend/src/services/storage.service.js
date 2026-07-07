// Supabase Storage wrapper. Provides upload / remove helpers used by the
// /api/session-logs/video* routes. We use the service-role key so the backend
// can write to private buckets on behalf of any athlete without leaking the
// key to the browser. Falls back to `isConfigured() === false` when env vars
// are missing so the API can return a clean 503 instead of crashing.
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_VIDEO_BUCKET } from '../config/env.js';

let client = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

export function isConfigured() {
    return Boolean(client);
}

// Uploads a file buffer to the configured bucket. `path` is the in-bucket
// object key (e.g. `nacho1/_iepxy7gr/w1d1/A1-1718000000000.mp4`). Returns
// `{ path, publicUrl }`. Throws on failure so the controller can map to 500.
export async function uploadVideo({ path, buffer, contentType }) {
    if (!client) throw new Error('Supabase Storage no está configurado');
    const { error } = await client.storage
        .from(SUPABASE_VIDEO_BUCKET)
        .upload(path, buffer, { contentType, upsert: true });
    if (error) throw error;
    const { data } = client.storage.from(SUPABASE_VIDEO_BUCKET).getPublicUrl(path);
    return { path, publicUrl: data.publicUrl };
}

export async function removeVideo(path) {
    if (!client) throw new Error('Supabase Storage no está configurado');
    const { error } = await client.storage.from(SUPABASE_VIDEO_BUCKET).remove([path]);
    if (error) throw error;
}
