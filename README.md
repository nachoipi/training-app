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
