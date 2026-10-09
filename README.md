# FitCore — Training Management App

Full-stack training management app for trainers and athletes.

```
training-app/
├── frontend/      React 18 + Vite (port 5173)
├── backend/       Node.js + Express MVC (port 3000)
├── database/      PostgreSQL schema and seed
└── .claude/
    └── skills/    Claude Code workflow skills
```

## Stack

- **Frontend**: React 18 + Vite, proxied to backend on `:5173`
- **Backend**: Node.js + Express MVC on `:3000`, ES modules
- **Database**: PostgreSQL (Supabase / GCP Cloud SQL compatible)

## Backend — MVC layout

```
backend/src/
├── config/        PostgreSQL pool (pg)
├── models/        Raw SQL via query helper (findAll, findById, create, update, remove)
├── controllers/   Request/response handlers
├── routes/        URL → controller wiring + auth middleware
├── middlewares/   requireAuth, requireRole
├── services/      auth/token helpers (HS256 JWT via jsonwebtoken)
├── app.js         express() + middleware + routes
└── server.js      app.listen()
```

## Run locally

### 1. Backend

```bash
cd backend
cp .env.example .env   # set DATABASE_URL and PGSSL=true
npm install
npm run dev            # listens on :3000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev            # serves on :5173, proxies /api → :3000
```

Open <http://localhost:5173>.

### 3. Database

```bash
psql $DATABASE_URL -f database/schema.sql
psql $DATABASE_URL -f database/seed.sql   # test users only
```

Exercises are no longer seeded. The catalog is imported from a CSV/XLS file —
see `database/migrations/exercises/README.md` for the spreadsheet format and
the planned importer.

## Accounts

Only the two test accounts below are seeded by `database/seed.sql`. Real trainer/athlete users are created through the app (signup or profile edit). The Login page autofill still offers `trainer@fitcore.com` / `nacho@fitcore.com` so you can register and reuse those addresses for realistic end-to-end testing.

| Role    | Email                    | Password | Notes                |
|---------|--------------------------|----------|----------------------|
| Trainer | test_trainer@fitcore.com | 123456   | Seeded — testing only |
| Athlete | test_athlete@fitcore.com | 123456   | Seeded — testing only |

## Claude Code Skills (`.claude/skills/`)

This project uses a phased workflow enforced by Claude Code skills. Each phase must be invoked independently — Claude will never auto-advance to the next phase.

| Skill          | Purpose                                                  |
|----------------|----------------------------------------------------------|
| `start-task`   | Sync main and create a branch (`fix/`, `feat/`, `chore/`, `refactor/`) |
| `investigate`  | Trace the codebase before making any changes             |
| `plan`         | Propose a concrete code-change plan and get approval before coding |
| `testing`      | Sandbox checks + manual checklist using test accounts    |
| `commit`       | Update `README.md` (changelog/version/docs), stage files, write a structured commit message |
| `finish-task`  | Merge to main *or* open a pull request, then optionally delete the branch |

Workflow order: **start-task → investigate → plan → testing → commit → finish-task**.

---

## Changelog

### 2026-10-08 (notifications + chat)
- **Notification centre (bell) + chat centre**: Two icon buttons to the right of the avatar in the TopBar for both roles, each with an unread badge. Each screen's title + subtitle now live in the top bar (portal via `SectionTitle`) instead of an in-page header, saving vertical space. On mobile both roles get a slim bar (title + bell + chat) and the profile avatar lives in the BottomNav (trainers now get it too, as the 7th slot). Panels are a popover on desktop and a full-screen sheet on mobile. Unread counts come from one polled endpoint (`GET /api/inbox/summary`, every 25s, paused while the tab is hidden; no websockets).
- **Notifications** (`notifications` table, unread rows only — reading one deletes it; "Limpiar" clears all; a history is tracked in `TODO.html`): session completed → the trainer who created the plan; session reviewed / coach comment changed → the athlete; plan assigned or updated → the athlete (repeated edits collapse into one unread entry per plan via a `dedupe_key` partial unique index). "Completed" only fires on the not-completed → completed transition, never on re-saves. Clicking one opens the related screen.
- **Chat** (`messages` table): continuous 1-to-1 text conversation (≤ 1000 chars) per trainer/athlete pair, not per session. An athlete's trainer is the creator of their latest planification (no fallback), so each trainer only sees their own athletes; athletes with no plan see "Todavía no tenés un entrenador asignado". Trainers get a conversation list → thread; the open thread polls every 8s and marks incoming messages as read.
- **Backend**: new `/api/notifications`, `/api/chat`, `/api/inbox` routes; `notify.service.js` (never fails the main request). **Apply `database/migrations/2026-10-08_notifications_chat.sql` on existing databases before deploying.**

### 2026-10-08
- **Trainer dashboard ("Inicio")**: New default landing screen for trainers (`TrainerDashboard.jsx`, `trainer-dashboard` section; "Inicio" added to the sidebar and the mobile BottomNav). Stat cards (sessions awaiting review, sessions this week, active athletes) and a "Sesiones recientes" feed of the latest completed sessions across athletes, each with athlete, plan, week/day, average RPE, the athlete's comment and a "Nuevo" badge until reviewed. Feed is derived client-side from the existing `GET /api/session-logs`.
- **Session detail + review**: Clicking a feed card opens `session-detail` (`TrainerSessionDetail`) with the plan-vs-actual table, per-exercise comments and the athlete's summary, plus a coach review box ("Marcar como revisada" + comment). The table body was extracted from `AthleteProfile` into the shared `SessionLogDetail.jsx`, so the profile's history accordion shows the same detail and review box.
- **Coach comment for the athlete**: Reviewed sessions show a "Comentario de tu coach" banner at the top of the athlete's session screen.
- **Backend**: `PATCH /api/session-logs/review` (trainer only; body `{ planId, week, dayNumber, comment? }`, comment ≤ 1000 chars). New `session_logs.reviewed_at` / `trainer_comment` columns live outside `payload` so the athlete's save upsert can't erase them. **Apply `database/migrations/2026-10-08_session_log_review.sql` on existing databases before deploying.**

### 2026-10-05 → 2026-10-07
- **Athlete dashboard ("Inicio")**: New default landing screen for athletes (`AthleteDashboard.jsx`, `my-dashboard` section). Shows the next pending session with a "Realizar sesión" shortcut, plan progress %, sessions completed this week, completed/total sessions, average RPE, per-week progress bars and the last 5 completed sessions. Derived entirely client-side from `planifications` + `sessionLogs` (no backend changes). The "Ver Mi Plan" / "Mis Sesiones" shortcut buttons at the bottom of the dashboard are mobile-only (desktop has them in the sidebar). Mobile BottomNav gains an "Inicio" tab; Mis Sesiones stays reachable from the dashboard link and the desktop sidebar.
- **Athlete mobile chrome**: On ≤768px the athlete TopBar is hidden (no empty top gap), the "Ejercicios" tab is removed from the BottomNav (and "Sesiones" is swapped for "Mi Plan"), and the Ejercicios slot is now the round profile avatar (opens Mi Perfil, accent ring when active). Trainers and desktop are unchanged.
- **Athlete session — session summary card**: When every serie is checked and every exercise has an RPE, a "Resumen de la sesión" card appears at the bottom of the session with: Fecha y hora (with an "Ahora" shortcut), Duración (minutos), Autoevaluación (1–5) and Nivel de esfuerzo de la sesión (1–10) and a multi-line Comentario de la sesión (a taller box than the per-exercise comments). All optional, editable at any time (including after completing — it counts as a change for GUARDAR). Stored as `sessionSummary` inside the `session_logs.payload` JSONB (no schema/backend change). The coach sees it in the athlete's "Historial de sesiones": expanding a session shows a "Resumen de la sesión" block with the filled-in fields (sessions without a summary show nothing extra).
- **Refresh keeps your place**: `Dashboard` now saves the current screen per user (`localStorage` key `fitcore_nav_<userId>`: section plus the selected athlete, plan and open session) and restores it on load, so a page refresh no longer jumps back to the default screen. Plan/session selections are resolved once the plans have loaded; a deleted plan falls back to Mi Plan / Alumnos.
- **Trainer — copy a planification**: Each plan in an athlete's profile has a new "Copiar" button. A dialog asks for the copy's name (default "<name> (copia)") and the target athlete (this one or any other), then creates a deep copy of the weeks/days/blocks/exercises through the existing `POST /api/planifications` — no backend changes. Session progress is not copied.
- **EDITAR button**: an outline button (`.btn-light` — no fill, white text and border) that fills solid white (dark text) while editing is on, so the athlete can see the mode is active; GUARDAR becomes available as soon as something changes.
- **Athlete session — editing a completed session**: Once a session is marked completed, GUARDAR is only enabled when something changed (comments, RPE, reps/carga, attached clip) — the hydrated state is serialized as a baseline and compared on every render, so reverting a change disables it again. Pressing VOLVER with unsaved changes opens a prompt (Seguir editando / Salir sin guardar / Guardar). A new EDITAR button next to GUARDAR unlocks REPS and CARGA of the already-done series (the "hecho" checkboxes stay locked on completed sessions).
- **Athlete session — serie accordions**: In "Realizar sesión" each serie group ("Serie 1 de 4"…) is now collapsible. Only the next serie to do in each block is expanded; the rest are collapsed header rows. Completing every exercise of a serie collapses it (with a green check) and expands the next one; any serie can still be opened or closed manually. Checkboxes follow the execution order (block → serie → exercise): an exercise can only be checked once everything before it is checked, and unchecked only while nothing after it is checked and its block has no RPE yet. The same rule extends to RPE: a block's RPE selects unlock only once every serie of that block is checked, and the next block's checkboxes stay locked until every exercise of the previous block has an RPE. The whole RPE card and its selector are tinted with the same colors as the exercise cards (green / amber / red / dark for RPE 1–4).
- **Athlete session (mobile) — footer width**: the per-exercise RPE / Comentario / attach cards now span the full width of the serie group on ≤768px (the 13px inset that lined them up with the inner serie cards is dropped).
- **Athlete session — completed sessions & carga**: In a session marked completed, each exercise's media tile now shows the athlete's own uploaded clip (from `exerciseSummaries[].videoUrl`) instead of the trainer's reference video; with no clip attached the preview is removed. The "Carga utilizada" stepper is hidden for exercises with no prescribed carga. The YouTube embed in the detail modal now sends `playsinline=1&rel=0` and an explicit `referrerPolicy="strict-origin-when-cross-origin"` (mobile hardening; a missing referrer makes YouTube embeds fail with Error 153).
- **Athlete Mi Plan (mobile + desktop)**: Simplified to match Mis Sesiones. Each week is a full-width row card wrapping its days (stacked on mobile, one column per day on desktop) (weeks whose days are all completed get a green background and the same green check badge used on a completed session, plus a chevron toggle; fully completed weeks start collapsed on desktop only, every other week and all weeks on mobile start open), and every day is a compact accordion row ("Día N" + down chevron, reusing `.session-history-card`); a completed day inside a not-yet-complete week gets a green header (same green as a completed week) and the same check badge, while its body stays dark so the RPE colors read clearly (inside a fully completed week the day stays dark, since the week card is already green). Tapping a row expands it and wraps the day's exercises inside the card. Only the upcoming session (the day right after the last completed one) starts expanded and shows a centered "Realizar sesión" button that opens it, and completed days show a centered "Ver Sesión" button (Back from a session opened this way returns to Mi Plan, tracked via `selectedSession.from` in `Dashboard.jsx`); every other day starts collapsed. Small scoped rules in `planification.css` handle the week card, keeping day bodies dark and a 12px top margin on the first block; exercises with no carga hide the Carga stat on the day cards (Series/Reps stay centered); on desktop each week is a full-width row with its days as columns, days are always shown expanded (no day arrow; the week arrow is the only toggle) with each block in its own labelled "Bloque A/B…" box (on mobile too; on days still to do a dotted line sits exactly centered between a block's exercise cards, and completed days have no line since the RPE tints already separate the cards), and fully completed weeks start collapsed there (on mobile they start open and days stay accordions).

### 2026-10-03
- **Trainer — Historial de sesiones**: Replaced the flat 3-column table (Date / Plan / Week-Day) in the trainer's athlete profile with an accordion-style session history. Each completed session is a collapsible card showing a prescribed vs actual exercise table, per-exercise RPE badges (color-coded), and an athlete comments block. No backend changes — the trainer already receives the full payload; day data is joined client-side from `planifications`.
- **Login — full width**: Fixed the login page not filling the full viewport on wide screens. `body` and `#root` are `display: flex`; `.login-page` now uses `flex: 1 1 0%` + `min-width: 0` to properly fill the flex container. Added `width: 100%` to the `.layout` grid as well.
- **Login — form pinned right**: On mid-size viewports (≤860px) where the hero panel is hidden, the login form now stays right-aligned at 480px instead of stretching full-width to the left. Below 520px it goes full-width for phones.

### 2026-07-06
- **Athlete session — block footer**: Rebuilt the per-exercise footer that holds the athlete's RPE + comentario. Each exercise now sits in its own card (visually matches `.session-serie-card` above) with a name row, RPE selector, and Comentario input stacked vertically. All footer cards share a uniform 720px block width so `Bloque A/B/C…` line up edge-to-edge on desktop; cards inside a block are inset to match the serie-card gutter. RPE tint (`session-rpe-1..4`) is applied to the whole footer card when the athlete picks an intensity, so the palette matches the serie cards.
- **Per-exercise video (athlete)**: Paperclip button in the footer opens a new `ExerciseVideoModal` that lets the athlete upload a short form-check clip per exercise. Upload is multipart to `POST /api/session-logs/video` (multer, 50 MB cap, `video/*` mimetype filter, 413 on overflow). Backend pushes the buffer to Supabase Storage (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_VIDEO_BUCKET=exercise-videos`) at a human-readable path — `<athlete-slug>/<plan-slug>/<athlete>-<plan>-w<week>d<day>-<exercise>-<position>-<YYYYMMDD-HHmm>.<ext>`. Public URL + path are stored inside `session_logs.payload.exerciseSummaries[]` alongside `comment` / `rpe`. Modal ships with an in-flight two-phase progress bar (upload → server-side processing), a 9:16 preview stage sized for phone-shot vertical clips, camera + gallery pickers, red trash / green check icon badges styled like the existing `.session-completed-check`, and pre-upload size validation so a >50 MB pick fails fast with a Spanish toast instead of waiting for the 413.
- **Athlete session — done-serie lock**: Checking the "hecho" checkbox on a serie now disables the reps + carga steppers for that serie (buttons + input) and dims the row via `.session-stepper.is-locked`. Unchecking re-enables the controls. Per-serie independent — locking one doesn't affect the others.
- **Exercise media (athlete view)**: `ExerciseMediaThumb` + `ExerciseDetailModal` now render four categories of video URL — YouTube (thumbnail JPG + `/embed`), direct video files (`.mp4/.webm/.mov/.m4v/.ogv/.ogg` served as native `<video preload="metadata">`), Google Drive (`/thumbnail` via our backend proxy for the tile, `/file/d/<id>/preview` iframe for playback + an "Abrir en Drive" fallback button), and arbitrary URLs (fall back to the exercise icon + "Abrir video" link). Drive iframes force a portrait 9:16 frame (`max-height: 78vh`) so Drive's own UI (cookie banner, controls) fits — Drive's cross-origin iframe is not restylable, so the fallback button is the escape hatch when the embed misbehaves.
- **Drive thumbnail proxy**: New public route `GET /api/media/drive-thumb?id=<file_id>&sz=<w200|w400|w600|w800|w1000>` bounces through our backend so `<img src>` on our origin can render Drive thumbnails (Drive's CDN sets `cross-origin-resource-policy: same-site` and blocks direct browser embedding). Rejects non-image content-types with 403 + Spanish message so files that aren't publicly shared don't silently serve HTML sign-in pages. Backed by `mediaProxy.controller.js` — validates ID shape (`[A-Za-z0-9_-]+`) and size, caches for 1 day.
- **Planification catalog enrichment**: New `services/planification.enrich.service.js` joins each planification exercise with the catalog on `exerciseId` and fills any empty `videoUrl` / `iconUrl` / `modelImageUrl` / `secondName` from the catalog at read time. Trainer per-row overrides still win when set. Fixes the case where a coach adds a video URL to an exercise *after* it's already been used in earlier planification weeks — those weeks previously stayed empty because the snapshot was frozen at insertion time; now they auto-reflect the current catalog. Wired into `getPlanifications`. A one-off backfill also patched existing DB rows so the snapshots themselves are clean.
- **Backend deps**: Added `multer` (multipart parsing) and `@supabase/supabase-js` (Storage client). New env vars documented in `backend/.env.example`.

### 2026-06-10
- **Database (security)**: Enabled Row-Level Security on every public table (`users`, `exercises`, `routines`, `planifications`, `sessions`, `session_logs`) to close a Supabase security advisory. The backend connects as the `postgres` superuser and bypasses RLS, so app behaviour is unchanged; the change blocks Supabase's auto-exposed PostgREST endpoint (anon/authenticated roles) from reading or writing these tables. Migration in `database/migrations/2026-06-10_enable_rls.sql`; `schema.sql` updated so fresh deploys start locked down.
- **Workflow**: `commit` skill now requires updating both `README.md` *and* `CLAUDE.md` to reflect the change, with explicit guidance on which sections of `CLAUDE.md` (architecture, env, schema, auth, conventions) each kind of change should refresh.

### 2026-06-04
- **Athlete session view**: Rebuilt the in-progress session screen — each serie now renders as a card with a media tile (left), reps/carga steppers (right), a full-width prescription header with the done checkbox, and a trainer-comment band below. Header title shows `{plan.name} — Semana N — Día N`; a green checkmark icon replaces the textual "Completada" badge once the session is finished.
- **Exercise detail modal**: New modal opens when the athlete taps an exercise tile — embeds a YouTube/Shorts player (Shorts auto-flip to a 9:16 portrait layout), falls back to "Abrir video" for arbitrary URLs, then to a static model image, then to a 3D-coming-soon placeholder. Renders second name, equipment, primary/secondary muscle chips, and the trainer's prescription comment.
- **Exercise catalog (Phase 2)**: Replaced the single `muscle` column with `primary_muscles` / `secondary_muscles` TEXT[] arrays (GIN-indexed) and added `second_name`, `equipment`, `icon_url`, `video_url`, `model_image_url`. Migration in `database/migrations/2026-06-04_extend_exercises.sql` is idempotent and backfills the legacy column. New `PUT /api/exercises/:id` lets trainers edit existing catalog entries; modal gains a chip multi-selector for muscles and an editing mode. `iconUrl` / `modelImageUrl` are now admin/CSV-importer only — the trainer modal no longer surfaces them.
- **Planification snapshot**: When the trainer picks an exercise in the planification editor, the per-block snapshot now copies the full catalog metadata (`secondName`, `equipment`, `primaryMuscles`, `secondaryMuscles`, `iconUrl`, `videoUrl`, `modelImageUrl`) so the athlete view renders offline-style without re-reading the catalog.
- **Unified icon system**: New `components/Icon` registry of 21 inline 24×24 SVGs (calendar, dumbbell, barbell, users, run, stretch, flame, bolt, search, wrench, close, check, cube-3d, trash, menu, …) using `stroke="currentColor"` so nav active-state and themes propagate automatically. Replaced emojis across Header, BottomNav, TopBar, Profile, ExerciseCard, SessionCard, EmptyState, modal close buttons, and the session view's completed-check / 3D placeholder / play indicator. `INTENSITY_LABELS` and `TYPE_ICONS` flipped from emoji-prefixed strings to `{ icon, label }` objects. Toasts auto-prepend the status icon by type — callers no longer embed `✓` / `✕` in messages. Avatar grid in Profile stays emoji-based (user identity, not chrome).

### 2026-06-03
- **Athlete Mi Plan (mobile)**: Replaced the horizontal weeks-grid (which collapsed into 4 cramped columns on phones) with a vertical Plan → Semana N → Día N → Exercise stack. Block headers dropped on mobile; a dashed separator now marks block boundaries (intra-block exercises sit flush). Completed days are colorized by RPE using the same palette as the trainer view. Desktop layout is unchanged — gated via new `.mobile-only` / `.desktop-only` helpers in `responsive.css`.
- **Database**: `seed.sql` now seeds **test users only** (`test_trainer@`, `test_athlete@`). Removed the two demo users (`trainer@fitcore.com`, `nacho@fitcore.com`) and all 18 hardcoded exercises — local DBs start empty so we can build up real data through the app and an importer.
- **Exercises importer (scaffold)**: New `database/migrations/exercises/` folder with `README.md` locking the CSV/XLS column spec (`id, name, muscle, type, description, built_in`), planned importer behavior (validate → upsert idempotent), and `exercises.sample.csv` as a starter file. Script itself lands in a follow-up task.
- **Login**: `DEMO_HINTS` now exposes both a Demo row (realistic, not seeded — register through the app) and a Test row (seeded) per role, each with its own Autocompletar link.
- **Docs**: `README.md` + `CLAUDE.md` credentials tables trimmed to the seeded test users; both files now point at the exercises importer folder.

### 2026-06-02
- **Profile (frontend)**: New "Mi Perfil" section — view + edit name, email, and avatar (curated 24-emoji grid). Includes a `Preferencias` card for theme toggle and logout (previously in the sidebar footer).
- **Profile (backend)**: New `PATCH /api/users/me` endpoint behind `requireAuth`. Validates name/email/avatar, pre-checks email uniqueness (clean 409 instead of raw PG 23505), and re-issues the JWT so embedded `req.user` claims stay in sync with the DB.
- **Roadmap**: Added two new improvement blocks to `TODO.html` — `Mejoras a Coach` (trainer-side polish, includes slim-JWT cleanup) and `Mejoras a Atleta` (athlete-side polish).
- **Layout**: Added a 66.5px fixed `TopBar` (name + role + avatar, right-aligned) as the entry point to the profile screen. Sidebar footer removed; theme toggle and logout live in Profile. On mobile (≤768px) the sidebar is hidden for both roles and the trainer now gets a `BottomNav` (Alumnos / Rutinas / Ejercicios / Registro / Progreso).
- **Auth (backend)**: Replaced the unsigned base64-JSON token scheme in `auth.service.js` with real HS256 JSON Web Tokens via `jsonwebtoken`. Tokens are now signed with `JWT_SECRET` and forged/tampered tokens are rejected with 401. New env vars: `JWT_SECRET` (required — boot fails without it) and `JWT_EXPIRES_IN` (defaults to `7d`). `.env.example` updated.
- **Auth (frontend)**: Fixed `isAuthenticated()` in `authService.js` to parse the JWT payload (base64url, middle segment) and compare `exp * 1000` against `Date.now()` — the previous `atob(token)` path broke login under the new token format.
- **Workflow**: `plan` skill now requires a documentation pass — every added/modified file gets a top-of-file purpose comment and inline comments on important methods.

### 2026-06-01
- **Frontend (athlete)**: Mobile-responsive athlete experience — replaced the desktop sidebar with a fixed `BottomNav` (Mi Plan / Sesiones / Rutinas / Progreso / Ejercicios) on viewports ≤768px. Trainer sidebar is unchanged.
- **Database**: Migrated from MySQL (in-memory) to PostgreSQL (Supabase). All models now use live `db.query()` calls.
- **Users**: Removed demo user Carlos (`carlos@example.com`). Added permanent test accounts: `test_trainer@fitcore.com` (trainer) and `test_athlete@fitcore.com` (athlete) — both with password `123456`.
- **Workflow**: Added `.claude/skills/` with 5 phased Claude Code skills: `start-task`, `investigate`, `commit`, `testing`, `finish-task`.
- **Workflow**: Added new `plan` skill between `investigate` and `testing`; reordered the phased workflow to `start-task → investigate → plan → testing → commit → finish-task`.
- **Workflow**: `commit` skill now updates `README.md` (changelog, version, docs) before staging changes.
- **Workflow**: `finish-task` skill now asks whether to merge directly to main or open a pull request, and whether to delete the branch afterward.
