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
├── services/      auth/token helpers (base64 JSON — replace with JWT for production)
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
psql $DATABASE_URL -f database/seed.sql
```

## Accounts

| Role    | Email                    | Password | Notes        |
|---------|--------------------------|----------|--------------|
| Trainer | trainer@fitcore.com      | 123456   | Demo trainer |
| Athlete | nacho@fitcore.com        | 123456   | Demo athlete |
| Trainer | test_trainer@fitcore.com | 123456   | Testing only |
| Athlete | test_athlete@fitcore.com | 123456   | Testing only |

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

### 2026-06-01
- **Database**: Migrated from MySQL (in-memory) to PostgreSQL (Supabase). All models now use live `db.query()` calls.
- **Users**: Removed demo user Carlos (`carlos@example.com`). Added permanent test accounts: `test_trainer@fitcore.com` (trainer) and `test_athlete@fitcore.com` (athlete) — both with password `123456`.
- **Workflow**: Added `.claude/skills/` with 5 phased Claude Code skills: `start-task`, `investigate`, `commit`, `testing`, `finish-task`.
- **Workflow**: Added new `plan` skill between `investigate` and `testing`; reordered the phased workflow to `start-task → investigate → plan → testing → commit → finish-task`.
- **Workflow**: `commit` skill now updates `README.md` (changelog, version, docs) before staging changes.
- **Workflow**: `finish-task` skill now asks whether to merge directly to main or open a pull request, and whether to delete the branch afterward.
