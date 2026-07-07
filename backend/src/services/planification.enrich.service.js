// Read-time enrichment: fill stale or missing media fields on planification
// exercises from the current `exercises` catalog. Coaches expect updates to a
// catalog entry (new YouTube link, new icon, etc.) to propagate to every
// planification row referencing that exercise — but planifications historically
// stored a snapshot at insertion time, leaving older rows with empty media
// fields when the catalog was filled later. This helper joins by exerciseId
// and patches the JSONB in memory before returning to the client. The DB
// snapshot still wins when set, so trainers can override per-row.
import { query } from '../config/db.js';

// Fields treated as "catalog source of truth". Listed once here so adding a
// new field (e.g. animation gif) is a one-line change.
const CATALOG_MEDIA_FIELDS = [
    'videoUrl',
    'iconUrl',
    'modelImageUrl',
    'secondName',
];

// Walk every exercise referenced by `plans` and return a Map<exerciseId, row>
// in a single SELECT — cheaper than N+1 even for big plans.
async function loadCatalogMap(plans) {
    const ids = new Set();
    for (const p of plans) {
        const wd = Array.isArray(p.weekDays) ? p.weekDays : [];
        for (const week of wd) {
            for (const day of (week || [])) {
                for (const block of (day?.blocks || [])) {
                    for (const ex of (block?.exercises || [])) {
                        if (ex?.exerciseId) ids.add(ex.exerciseId);
                    }
                }
            }
        }
    }
    if (!ids.size) return new Map();
    const rows = await query(
        `SELECT id, name, second_name AS "secondName",
                video_url AS "videoUrl", icon_url AS "iconUrl",
                model_image_url AS "modelImageUrl"
           FROM exercises
          WHERE id = ANY($1::text[])`,
        [[...ids]]
    );
    return new Map(rows.map(r => [r.id, r]));
}

// Mutates `ex` in place: each empty CATALOG_MEDIA_FIELD gets the catalog's
// current value (when available). Non-empty fields are left untouched so a
// trainer-set per-row override always wins.
function patchExercise(ex, catalog) {
    if (!ex || !ex.exerciseId) return;
    const cat = catalog.get(ex.exerciseId);
    if (!cat) return;
    for (const field of CATALOG_MEDIA_FIELDS) {
        const current = (ex[field] || '').toString().trim();
        if (!current && cat[field]) ex[field] = cat[field];
    }
}

// Public API. Enriches an array of plans in place AND returns it so callers
// can `return enrich(...)` cleanly.
export async function enrichPlanifications(plans) {
    if (!plans?.length) return plans;
    const catalog = await loadCatalogMap(plans);
    for (const p of plans) {
        const wd = Array.isArray(p.weekDays) ? p.weekDays : [];
        for (const week of wd) {
            for (const day of (week || [])) {
                for (const block of (day?.blocks || [])) {
                    for (const ex of (block?.exercises || [])) {
                        patchExercise(ex, catalog);
                    }
                }
            }
        }
    }
    return plans;
}
