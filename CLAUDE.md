# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FitCore is a full-stack training management app for trainers and athletes. It uses:
- **Frontend**: React 18 + Vite (port 5173), proxied to backend
- **Backend**: Node.js + Express MVC (port 3000), ES modules
- **Database**: PostgreSQL (compatible with Supabase and GCP Cloud SQL)

## Development Commands

### Backend
```bash
cd backend
npm run dev    # node --watch (hot reload)
npm start      # production
```

### Frontend
```bash
cd frontend
npm run dev    # Vite dev server on :5173
npm run build  # output to dist/
```

### Database
```bash
# Apply schema (run once or after schema changes)
psql $DATABASE_URL -f database/schema.sql
# Seed demo data
psql $DATABASE_URL -f database/seed.sql
```

## Environment Setup

Copy `backend/.env.example` to `backend/.env` and set:
- `DATABASE_URL` — PostgreSQL connection string
- `PGSSL=true` — required for managed databases (Supabase, GCP Cloud SQL)
- `PORT=3000` — defaults to 3000
- `JWT_SECRET` — **required**; the backend refuses to boot without it
- `JWT_EXPIRES_IN` — token lifetime (default `7d`)
- `SUPABASE_URL` — Supabase project URL (optional; needed for athlete video uploads)
- `SUPABASE_SERVICE_ROLE_KEY` — service-role JWT for Storage (never expose to the frontend)
- `SUPABASE_VIDEO_BUCKET` — Storage bucket for athlete-recorded exercise clips (defaults to `exercise-videos`). When any of the three are missing, `POST /api/session-logs/video` responds 503 instead of crashing at boot.

## Architecture

### Backend MVC (`backend/src/`)

**Request flow**: `routes/` → `middlewares/` → `controllers/` → `models/` → PostgreSQL

- **`config/db.js`**: PostgreSQL pool via `pg`. `query(sql, params)` helper with numeric type parser. All queries use parameterized `$1, $2` placeholders.
- **`models/`**: Data layer — each model exports `findAll`, `findById`, `create`, `update`, `remove` (raw SQL via the `query` helper).
- **`controllers/`**: Handle request/response, validate inputs, delegate to models, call `next(err)` on failure.
- **`routes/`**: Mount auth middleware, define REST endpoints, connect to controllers.
- **`middlewares/auth.middleware.js`**: `requireAuth` (verifies Bearer token, sets `req.user`) and `requireRole(...roles)` (checks `req.user.role`).
- **`services/auth.service.js`**: HS256 JSON Web Tokens via `jsonwebtoken`. Signed with `JWT_SECRET`; lifetime from `JWT_EXPIRES_IN` (default `7d`). Forged/tampered tokens are rejected with 401.
- **`services/storage.service.js`**: Supabase Storage client (service-role key). Exposes `uploadVideo({path, buffer, contentType})` + `removeVideo(path)` and an `isConfigured()` guard so callers can degrade cleanly to 503 when env vars are missing.
- **`services/planification.enrich.service.js`**: Read-time join between planification exercises and the current `exercises` catalog. Fills any empty `videoUrl` / `iconUrl` / `modelImageUrl` / `secondName` per exercise (matched by `exerciseId`); non-empty per-row values are preserved so trainer overrides win. Called from `getPlanifications` so catalog updates propagate to every planification row referencing the exercise, even if the row was created before the catalog had the field set.
- **`PATCH /api/users/me`**: Authenticated profile update (name, email, avatar). Pre-checks email uniqueness (returns 409 instead of raw PG `23505`) and re-issues the JWT so embedded `req.user` claims stay in sync with the DB row.
- **`POST /api/session-logs/video`** (athlete only): multipart upload of a per-exercise form-check clip. `multer` memory-storage, `video/*` filter, 50 MB cap → 413 with a Spanish error message. Uploads to Supabase Storage at `<athlete-slug>/<plan-slug>/<athlete>-<plan>-w<week>d<day>-<exercise>-<position>-<YYYYMMDD-HHmm>.<ext>`. Returns `{ url, path }` which the frontend embeds inside `session_logs.payload.exerciseSummaries[]` alongside `comment` / `rpe`. `DELETE /api/session-logs/video?path=…` removes a clip; the path prefix is scoped to the athlete's own slug (derived from `req.user.name`) so athletes can't touch other users' files.
- **`GET /api/media/drive-thumb?id=<file_id>&sz=<w200..w1000>`** (public): backend proxy for Google Drive thumbnails. Drive's CDN sets `cross-origin-resource-policy: same-site` which blocks browser embedding across origins; fetching server-to-server sidesteps CORP. Validates ID shape (`[A-Za-z0-9_-]+`) and size, refuses non-image content-types with 403 (so restricted Drive files can't smuggle sign-in HTML through), caches for 1 day.

### Frontend (`frontend/src/`)

**Data flow**: `pages/` → `services/` → `api/httpClient.js` (apiFetch) → backend

- **`api/httpClient.js`**: `apiFetch(path, options)` automatically attaches the `Authorization: Bearer <token>` header from localStorage and throws on non-2xx responses.
- **`api/endpoints.js`**: All API path constants. Update here when adding routes.
- **`services/`**: One service file per domain (auth, exercise, routine, session, planification, sessionLog, user). These call `apiFetch`.
- **`hooks/useAuth.js`**: React hook for auth state (user, login, logout). Syncs with `localStorage` keys `fitcore_token` and `fitcore_user`. `isAuthenticated()` parses the JWT payload (base64url middle segment) and compares `exp * 1000` against `Date.now()`.
- **`pages/Dashboard.jsx`**: Main app shell — renders role-based sections (trainer vs athlete).
- **`components/TopBar`**: Fixed 66.5px top bar (name + role + avatar, right-aligned) — entry point to the "Mi Perfil" screen.
- **`components/BottomNav`**: Mobile (≤768px) bottom nav. Athletes get Mi Plan / Sesiones / Rutinas / Progreso / Ejercicios. Trainers get Alumnos / Rutinas / Ejercicios / Registro / Progreso. The desktop sidebar is hidden on mobile for both roles.
- **`pages/Profile` ("Mi Perfil")**: View/edit name, email and avatar (curated 24-emoji grid). Includes a `Preferencias` card with the theme toggle and logout button (previously in the sidebar footer).
- **`components/Modals/`**: CRUD modals for routines, sessions, exercises. Also hosts `ExerciseVideoModal` — the athlete's per-exercise upload UI (file picker + camera capture, two-phase XHR upload with progress bar, red trash / green check icon badges styled like `.session-completed-check`, 9:16 preview stage tuned for phone-shot vertical clips).
- **`components/Main/AthleteMySession.jsx`**: In-progress session screen. Beyond serie cards + steppers, this file also hosts:
  - `resolveVideo(ex)` — returns the trainer's per-instance override (`ex.video`) with fallback to the catalog snapshot (`ex.videoUrl`).
  - `extractYouTubeId` / `extractDriveFileId` / `isDirectVideoUrl` — URL recognisers for the four supported video sources.
  - `ExerciseMediaThumb` — serie-card media tile. YouTube → JPG thumbnail; Drive → `/api/media/drive-thumb` proxy (with `<img onError>` fallback to the exercise icon when the file isn't link-shared); direct video files (`.mp4/.webm/.mov/.m4v/.ogv/.ogg`) → muted `<video preload="metadata">` first-frame poster; otherwise → `iconUrl` / generic SVG.
  - `ExerciseDetailModal` — playback modal. Chooses between YouTube iframe, native `<video>` (direct files), Drive `/preview` iframe (portrait-forced 9:16 frame with 78vh max-height + "Abrir en Drive" fallback link — cross-origin controls are not restylable), or an "Abrir video" fallback link. Modal narrows to `--short` (max-width 420px) for portrait/Drive content so the aspect isn't dwarfed by side gutters.
  - Block footer — one `.session-block-footer-card` per exercise (RPE selector + Comentario input stacked vertically) with a paperclip button that opens `ExerciseVideoModal`. Footer cards inset to align with serie cards inside `.session-serie-group` above.
  - Done-serie lock — checking the per-serie "hecho" checkbox disables that serie's reps + carga steppers and dims the row via `.session-stepper.is-locked`. Independent per serie.

### Database Schema (`database/schema.sql`)

Key tables: `users`, `exercises`, `routines`, `planifications`, `sessions`, `session_logs`.
- `routines.days` and `routines.exercises` are **JSONB** columns.
- `planifications.week_days` is **JSONB**.
- `session_logs.payload` is **JSONB** (daily plan execution state). `payload.exerciseSummaries[]` per-exercise entries carry `{ position, comment, rpe, videoUrl, videoPath }` — `videoUrl` is the public Supabase URL for the athlete-uploaded form-check clip, `videoPath` is the in-bucket object key used for deletes.
- `session_logs` has a DB trigger to auto-update `updated_at`.
- Cascade deletes on user removal.
- **Row-Level Security is enabled on every public table** (no policies attached). The backend connects as the `postgres` superuser and bypasses RLS, so app code is unaffected; the goal is to block Supabase's auto-exposed PostgREST endpoint (anon/authenticated roles) from reading or writing these tables. Any new public table must `ENABLE ROW LEVEL SECURITY` in `schema.sql`.

## Auth & Roles

Two roles: `trainer` and `athlete`.
- Trainers can create/edit exercises, create routines for athletes, view all athletes.
- Athletes can log sessions, view assigned planifications, create own routines.

Seeded credentials (from `database/seed.sql` — test users only):

| Role    | Email                      | Password | Notes                 |
|---------|----------------------------|----------|-----------------------|
| Trainer | `test_trainer@fitcore.com` | `123456` | Seeded — testing only |
| Athlete | `test_athlete@fitcore.com` | `123456` | Seeded — testing only |

Real trainer/athlete accounts (`trainer@fitcore.com`, `nacho@fitcore.com`, etc.) are no longer seeded — create them through the app for realistic end-to-end testing. The Login page's autofill (`DEMO_HINTS` in `frontend/src/pages/Login.jsx`) still offers those addresses so devs can register and reuse them.

Exercises are no longer seeded either. The catalog is imported from a CSV/XLS file — see `database/migrations/exercises/README.md` for the spreadsheet format and the planned importer.

Auth tokens are HS256 JWTs signed with `JWT_SECRET`. The token currently embeds the full user row; trimming it to `{ id, role }` is tracked in `TODO.html` under `Mejoras a Coach` (slim-JWT cleanup).

## Adding New Features

**New API endpoint**:
1. Add model method in `backend/src/models/<domain>.model.js`
2. Add controller handler in `backend/src/controllers/<domain>.controller.js`
3. Register route in `backend/src/routes/<domain>.routes.js` with appropriate middleware
4. Add path constant to `frontend/src/api/endpoints.js`
5. Add service function in `frontend/src/services/<domain>Service.js`

**New database table**: Add `CREATE TABLE` to `database/schema.sql`, create corresponding model file.

## Vite Proxy

`frontend/vite.config.js` proxies `/api/*` → `http://localhost:3000`. All frontend API calls must use `/api/` prefix.
