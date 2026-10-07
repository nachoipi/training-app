# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working Conventions

- **Never `git commit` or `git push` without the user explicitly asking for it in that moment.** A prior approval of the change itself (e.g. "yes, go ahead" on content) is not approval to commit or push — ask separately, every time, regardless of how the session was started (phone, cloud, CLI). The user wants to check every step on the running app before anything is committed.
- **Follow the task skills in order** for every task, no skipping steps: `start-task` → `investigate` → `plan` → (implement) → `testing` → `commit` → `finish-task`.

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
- **`pages/Dashboard.jsx`**: Main app shell — renders role-based sections (trainer vs athlete). Persists navigation per user in `localStorage` (`fitcore_nav_<userId>` = section + selected athlete / plan id / session ref, via `loadNav` and a save effect) and restores it on refresh; plan/session selections are resolved after the plans load (`restoring` ref blocks saving until then). Also owns `handleCopyPlanification` (deep-copies a plan through `planificationService.create`).
- **`components/TopBar`**: Fixed 66.5px top bar (name + role + avatar, right-aligned) — entry point to the "Mi Perfil" screen. Hidden on mobile for athletes (their profile entry is the BottomNav avatar; `Main` gets `.main--athlete` to drop the top padding).
- **`components/BottomNav`**: Mobile (≤768px) bottom nav. Athletes get Inicio / Mi Plan / Rutinas / Progreso plus a round profile-avatar button as the last slot (Mis Sesiones is reached from the Inicio dashboard; Ejercicios is no longer in the mobile nav). Trainers get Alumnos / Rutinas / Ejercicios / Registro / Progreso. The desktop sidebar is hidden on mobile for both roles.
- **`components/Main/AthleteMyPlan.jsx`**: Single render for all viewports (`PlanWeek` → `PlanDay` accordions). Weeks are stacked rows (`.plan-stack-weeks`); `.plan-stack-week-days` stacks days on mobile and lays them out as one column per day on desktop. A fully completed week gets a green background plus the `.session-completed-check` badge and, on desktop only, starts collapsed. On desktop days are always expanded with no toggle (`useIsDesktop`); on mobile each day is an accordion row (built from `.session-history-card`) that starts collapsed except the upcoming session — the day right after the last completed one. Blocks render as labelled `.plan-session-block` boxes on every viewport, with a dotted line centered between a block's exercise cards on days still to do (none on completed days). A completed day in a not-yet-complete week gets a green header + check badge with a dark body (inside a fully done week it stays plain). The upcoming session shows a "Realizar sesión" button and completed days "Ver Sesión", both wired to `onOpenSession`; `Dashboard` stores the origin screen in `selectedSession.from`, so Back from `my-session` returns to Mi Plan when it was opened there, else Mis Sesiones. `ExerciseRow` hides the Carga stat when the exercise has none. Mi Plan-specific CSS lives in `planification.css` (week card, dark day body, green day header, first-block margin, centered dotted line).
- **`components/Main/AthleteDashboard.jsx`**: Athlete landing page (`my-dashboard` section, default after login). Client-side only: next pending session, plan progress, weekly counters, average RPE and recent activity derived from `planifications` + `sessionLogs`. The Mi Plan / Mis Sesiones shortcut buttons are hidden on desktop.
- **`pages/Profile` ("Mi Perfil")**: View/edit name, email and avatar (curated 24-emoji grid). Includes a `Preferencias` card with the theme toggle and logout button (previously in the sidebar footer).
- **`components/Modals/`**: CRUD modals for routines, sessions, exercises. Also hosts `ExerciseVideoModal` — the athlete's per-exercise upload UI (file picker + camera capture, two-phase XHR upload with progress bar, red trash / green check icon badges styled like `.session-completed-check`, 9:16 preview stage tuned for phone-shot vertical clips).
- **`components/Main/AthleteMySession.jsx`**: In-progress session screen. Beyond serie cards + steppers, this file also hosts:
  - `resolveVideo(ex)` — returns the trainer's per-instance override (`ex.video`) with fallback to the catalog snapshot (`ex.videoUrl`).
  - `extractYouTubeId` / `extractDriveFileId` / `isDirectVideoUrl` — URL recognisers for the four supported video sources.
  - `ExerciseMediaThumb` — serie-card media tile. YouTube → JPG thumbnail; Drive → `/api/media/drive-thumb` proxy (with `<img onError>` fallback to the exercise icon when the file isn't link-shared); direct video files (`.mp4/.webm/.mov/.m4v/.ogv/.ogg`) → muted `<video preload="metadata">` first-frame poster; otherwise → `iconUrl` / generic SVG.
  - `ExerciseDetailModal` — playback modal. Chooses between YouTube iframe, native `<video>` (direct files), Drive `/preview` iframe (portrait-forced 9:16 frame with 78vh max-height + "Abrir en Drive" fallback link — cross-origin controls are not restylable), or an "Abrir video" fallback link. Modal narrows to `--short` (max-width 420px) for portrait/Drive content so the aspect isn't dwarfed by side gutters.
  - Block footer — one `.session-block-footer-card` per exercise (RPE selector + Comentario input stacked vertically) with a paperclip button that opens `ExerciseVideoModal`. Footer cards inset to align with serie cards inside `.session-serie-group` above on desktop; on mobile (≤768px) the inset is dropped so they span the same width as the serie group.
  - Completed sessions — when `completed`, the media tile and `ExerciseDetailModal` use the athlete's clip (`exerciseSummaries[].videoUrl`) in place of the trainer video, and the tile is omitted if there is none. The "Carga utilizada" row is hidden when the exercise has no prescribed carga (`formatCarga(ex) === '—'`).
  - Serie accordions — each `.session-serie-group` is collapsible (header button + chevron). Only the block's next serie to do (first one with an unchecked exercise) starts open and the open one advances as series are completed; a finished serie collapses with a check badge. Manual toggles are kept in `serieOpen` and override the default.
  - Completed-session editing — `dirty` (completed only) compares the current `{exerciseData, exerciseSummary}` with the serialized `baseline` taken at hydration; GUARDAR is disabled until `dirty`, and VOLVER opens a save/discard/keep-editing prompt (`leaveAsk`) when `dirty`. `editing` (EDITAR button) unlocks the reps/carga steppers of done series; on completed sessions the "hecho" checkboxes are always disabled. `.btn:disabled` and the outline `.btn-light` (EDITAR; solid-fill while `aria-pressed="true"`) are styled in `buttons.css`.
  - Session summary — once `allClosed` (every block finished + every exercise rated) a `.session-summary-card` appears at the end of the body. Its state (`sessionSummary`: `dateTime`, `durationMin`, `selfEvaluation`, `effortLevel`, `comment` — all strings; the comment is a `<textarea>`) is hydrated from `sessionLog.sessionSummary`, included in `buildLog` and in the `dirty` comparison, and persisted in the `session_logs.payload` JSONB. The coach's `AthleteProfile` history renders it (`summaryRows`) inside the expanded session card; `SELF_EVALUATION_LABELS` in `utils/constants.js` is shared by both screens.
  - Ordered completion — `canToggleDone(key)` locks each "hecho" checkbox until every entry before it (block → serie → exercise order, `orderedKeys`/`blockKeys`) is checked and every earlier block is *closed* (`blockClosed`: all series checked + an RPE on every exercise). An entry can be unchecked only while nothing after it is checked and its block has no RPE. A block's RPE selects are disabled until `blockFinished` (all its series checked). The footer card and its RPE `<select>` both carry the matching `.session-rpe-1..4` class (tint via `.session-block-footer-card.session-rpe-N` and `.session-rpe-select.session-rpe-N`; the card needs the higher-specificity rule because its base background is declared after `.session-rpe-N`). The `validate()` toasts remain as the final safety net on save.
  - Done-serie lock — checking the per-serie "hecho" checkbox disables that serie's reps + carga steppers and dims the row via `.session-stepper.is-locked`. Independent per serie.

### Database Schema (`database/schema.sql`)

Key tables: `users`, `exercises`, `routines`, `planifications`, `sessions`, `session_logs`.
- `routines.days` and `routines.exercises` are **JSONB** columns.
- `planifications.week_days` is **JSONB**.
- `session_logs.payload` is **JSONB** (daily plan execution state; also holds the athlete's `sessionSummary` {dateTime, durationMin, selfEvaluation, effortLevel, comment}). `payload.exerciseSummaries[]` per-exercise entries carry `{ position, comment, rpe, videoUrl, videoPath }` — `videoUrl` is the public Supabase URL for the athlete-uploaded form-check clip, `videoPath` is the in-bucket object key used for deletes.
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

## Deployment (Render)

FitCore deploys as a single Render Web Service via the `render.yaml` Blueprint at the repo root — Express serves both the API and the built frontend from one origin, so no CORS setup or frontend-side API base URL is needed.

- **`render.yaml`**: build command installs both `backend/` and `frontend/`, builds the frontend, then starts the backend (`npm --prefix backend start`). Declares `PGSSL`, `JWT_EXPIRES_IN`, `SUPABASE_VIDEO_BUCKET` as fixed values, and `DATABASE_URL` / `JWT_SECRET` / `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` as secrets (`sync: false`) set manually in the Render dashboard. `healthCheckPath: /api/health` points at the DB-independent health route so Render can verify a deploy before migrations run.
- **`backend/src/app.js`**: after all `/api/*` routes, serves `frontend/dist` as static files and falls back to `index.html` for non-API paths (SPA routing) — but only when `frontend/dist` exists on disk. Local dev (`npm run dev` on both sides, separate Vite server) never builds `dist/`, so this block is a no-op locally and doesn't interfere with the Vite proxy.
- **`backend/package.json`**: pins `"engines": { "node": ">=22" }` so Render provisions a matching Node runtime instead of its own default.
- Render reads `process.env.PORT` dynamically via `backend/src/config/env.js` — never hardcode a `PORT` env var in `render.yaml`, it would override Render's own port assignment and break routing.
- Database is Supabase Postgres (not Render Postgres) — same `DATABASE_URL` / `PGSSL=true` setup as any other managed Postgres.

### Branching for deploys

- Develop on `main` as usual.
- Once a change is tested locally, merge it into the `deploy-test` branch — Render's Blueprint is configured to deploy from `deploy-test`, so merging there pushes it live automatically.
- `deploy-test` exists specifically for field-testing on a phone (e.g. taking it to the gym to run a real session) without needing `main` itself to be deploy-ready at every commit.
