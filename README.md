# Training App (FitCore)

Three-tier app: React frontend, Express + MVC backend, MySQL database.

```
training-app/
├── frontend/   React + Vite (port 5173)
├── backend/    Node.js + Express + MVC (port 3000)
└── database/   MySQL schema and seed
```

## Backend — MVC layout

```
backend/src/
├── config/        env, mysql2 pool
├── models/        in-memory now, MySQL-shaped API
├── controllers/   request/response handlers
├── routes/        URL → controller wiring
├── middlewares/   auth, error
├── services/      auth/token helpers
├── app.js         express() + middleware + routes
└── server.js      app.listen()
```

The models currently keep the legacy in-memory arrays so the app runs without a live database. Each model's public API (`findAll`, `findById`, `create`, `update`, `remove`) matches the MySQL example — swapping in real `db.query(...)` calls later is a body-only change.

## Run locally

### 1. Backend

```bash
cd backend
cp .env.example .env   # edit DB_* if connecting MySQL later
npm install
npm run dev            # listens on :3000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev            # serves on :5173, proxies /api → :3000
```

Open <http://localhost:5173>. Demo accounts:

| Role     | Email                  | Password |
|----------|------------------------|----------|
| Trainer  | trainer@fitcore.com    | 123456   |
| Athlete  | nacho@fitcore.com      | 123456   |

### 3. (Optional) MySQL

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

Models still use the in-memory arrays — wiring them to `db.query(...)` is the next step.
