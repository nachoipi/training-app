---
name: commit
description: >
  Stage and commit changes with a well-structured commit message.
  Use when the user says "commit", "save changes", "commit this", or after finishing
  a fix or feature implementation. Always explain what changed and why.
---

# Commit

Stage only the files relevant to this change and write a commit message that explains
the *why*, not just the *what*.

## Step 1 — Review what changed

```bash
git diff --stat
git status
```

Make sure no unrelated files are staged.

## Step 2 — Update `README.md` to reflect the change

Before staging anything, open the project `README.md` and update it so it stays in sync
with the code that just changed. Depending on what was modified, this may mean:

- **Changelog** — add an entry under the current/next version describing the change
  (one bullet per user-visible behavior). Group by `Added` / `Changed` / `Fixed` /
  `Removed` if those sections already exist.
- **Version** — bump the version string if the project uses one in the README
  (and in `package.json` if applicable). Follow semver:
  - `fix:` → patch bump
  - `feat:` → minor bump
  - breaking change → major bump
- **Usage / setup / commands** — update any examples, flags, env vars, or commands
  that have changed.
- **Architecture / endpoints / schema** — refresh any sections that documented the
  area you just touched (new route, new table, new component, etc.).

If the README has nothing relevant to update for this change, say so explicitly to the
user and move on — don't invent edits.

After updating the README, re-run `git status` so the README change is picked up in the
next step.

## Step 3 — Stage the relevant files

```bash
git add <file1> <file2> ...
```

Never use `git add .` blindly — review each file.

## Step 4 — Write the commit message

Follow this structure:

```
<type>: <short description in imperative mood>

<what was wrong or what the feature does — the root cause or motivation>

- <specific change 1>
- <specific change 2>

<optional: "Fixes <symptom>" or "Closes <issue>">
```

Types: `fix`, `feat`, `chore`, `refactor`, `docs`, `test`

### Good example
```
fix: flatten payload in session log responses

The DB stores session data inside a JSONB payload column. The controller
was returning raw DB rows with a nested payload object, but the frontend
expects flat fields (sessionLog.exercises, sessionLog.completed, etc.).

- getSessionLogs: spread payload fields to top level in each row
- saveSessionLog: pack req.body into payload before upsert, flatten response

Fixes crash in AthleteMySession (TypeError on sessionLog.exercises.some)
```

## Step 5 — Commit

```bash
git commit -m "<message>"
```

For multi-line messages:
```bash
git commit
# (opens editor — write full message there)
```

---

⏸️ **Always stop here.** Ask: *"Committed (README updated where relevant). Ready to move to the finish-task phase?"*
