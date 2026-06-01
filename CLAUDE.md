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

## Architecture

### Backend MVC (`backend/src/`)

**Request flow**: `routes/` → `middlewares/` → `controllers/` → `models/` → PostgreSQL

- **`config/db.js`**: PostgreSQL pool via `pg`. `query(sql, params)` helper with numeric type parser. All queries use parameterized `$1, $2` placeholders.
- **`models/`**: Data layer — each model exports `findAll`, `findById`, `create`, `update`, `remove` (raw SQL via the `query` helper).
- **`controllers/`**: Handle request/response, validate inputs, delegate to models, call `next(err)` on failure.
- **`routes/`**: Mount auth middleware, define REST endpoints, connect to controllers.
- **`middlewares/auth.middleware.js`**: `requireAuth` (verifies Bearer token, sets `req.user`) and `requireRole(...roles)` (checks `req.user.role`).
- **`services/auth.service.js`**: Token creation/verification using base64-encoded JSON (not cryptographically signed — for dev use). TTL via `TOKEN_TTL_MS` env var (default 7 days).

### Frontend (`frontend/src/`)

**Data flow**: `pages/` → `services/` → `api/httpClient.js` (apiFetch) → backend

- **`api/httpClient.js`**: `apiFetch(path, options)` automatically attaches the `Authorization: Bearer <token>` header from localStorage and throws on non-2xx responses.
- **`api/endpoints.js`**: All API path constants. Update here when adding routes.
- **`services/`**: One service file per domain (auth, exercise, routine, session, planification, sessionLog, user). These call `apiFetch`.
- **`hooks/useAuth.js`**: React hook for auth state (user, login, logout). Syncs with `localStorage` keys `fitcore_token` and `fitcore_user`.
- **`pages/Dashboard.jsx`**: Main app shell — renders role-based sections (trainer vs athlete).
- **`components/Modals/`**: CRUD modals for routines, sessions, exercises.

### Database Schema (`database/schema.sql`)

Key tables: `users`, `exercises`, `routines`, `planifications`, `sessions`, `session_logs`.
- `routines.days` and `routines.exercises` are **JSONB** columns.
- `planifications.week_days` is **JSONB**.
- `session_logs.payload` is **JSONB** (daily plan execution state).
- `session_logs` has a DB trigger to auto-update `updated_at`.
- Cascade deletes on user removal.

## Auth & Roles

Two roles: `trainer` and `athlete`.
- Trainers can create/edit exercises, create routines for athletes, view all athletes.
- Athletes can log sessions, view assigned planifications, create own routines.

Demo credentials (from `database/seed.sql`):
- `trainer@fitcore.com` / `123456`
- `nacho@fitcore.com` / `123456`

The auth token is base64 JSON (not HMAC-signed). For production, replace `auth.service.js` with JWT + a secret key.

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
