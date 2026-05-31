---
name: bugfix
description: >
  End-to-end bug fix workflow for this project. Use this skill whenever the user reports a bug,
  something is broken, an error is thrown, or they say "fix this" or "something isn't working".
  Handles the full lifecycle: create a branch from main, investigate the root cause, apply the fix,
  commit with a descriptive message, and merge back to main. Always use this skill rather than
  doing ad-hoc fixes directly on main.
---

# Bugfix Workflow

This skill captures the standard bug-fix workflow for this project: branch off main, isolate and fix the issue, commit cleanly, merge back.

## Step 1 — Branch from main

Always start from a clean main branch. Never fix directly on main.

```bash
cd <project-root>
git checkout main
git pull                                   # sync with remote if one exists
git checkout -b fix/<short-description>    # e.g. fix/realizar-sesion-crash
```

Name the branch `fix/<kebab-case-description>` — short but descriptive enough to know what it addresses.

## Step 2 — Investigate the root cause

Don't guess. Trace the issue from the symptom to the actual broken line before touching anything.

Useful investigation sequence:
1. **Find the component** — grep for the error text, button label, or function name
2. **Trace the data flow** — follow the call chain (button → handler → service → API → model)
3. **Identify the mismatch** — what shape does the caller expect vs. what does the callee return?
4. **Check both ends** — bugs are often at a boundary (frontend/backend, DB/controller, component/parent)

Read the relevant files fully before editing. A misread leads to a wrong fix.

## Step 3 — Apply the fix

Make the minimal change that resolves the root cause. Prefer:
- Fixing the source of the bad data over defensive coding around it
- Adding `?.` optional chaining as a secondary guard if the data can legitimately be absent
- Clear comments explaining *why* the fix is needed (future devs will thank you)

If the fix touches a contract between two layers (e.g. backend response shape → frontend reader), fix both sides:
- The producer (e.g. backend controller that returns data)
- The consumer (e.g. frontend component that reads it)

## Step 4 — Commit

Write a commit message that explains what broke and why, not just what changed.

```
fix: <short description in imperative>

<what was wrong — the root cause, not just the symptom>

- <specific change 1>
- <specific change 2>

Fixes <symptom description>
```

Example:
```
fix: flatten payload in session log responses

The DB stores session data inside a JSONB payload column. The controller
was returning raw DB rows with a nested payload object, but the frontend
expects flat fields (sessionLog.exercises, sessionLog.completed, etc.).

- getSessionLogs: spread payload fields to top level in each row
- saveSessionLog: pack req.body into payload before upsert, flatten response

Fixes crash in AthleteMySession (TypeError on sessionLog.exercises.some)
```

Stage only the files you changed for this fix:
```bash
git add <file1> <file2>
git commit -m "<message>"
```

## Step 5 — Merge to main

```bash
git checkout main
git merge fix/<short-description>
```

If there's a remote:
```bash
git push origin main
```

Optionally delete the branch after merging:
```bash
git branch -d fix/<short-description>
```

---

## Notes

- **Stale lock file**: If `git` fails with `index.lock exists`, it's a stale lock from a crashed process. Delete it: `rm .git/index.lock`. If that fails due to permissions, the user needs to run the deletion from their terminal.
- **Backend changes**: After fixing the backend, restart the dev server for changes to take effect (`npm run dev` in `/backend`).
- **Vite HMR**: Frontend changes hot-reload automatically — no restart needed unless you change `vite.config.js`.
