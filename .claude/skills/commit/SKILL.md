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

## Step 2 — Stage the relevant files

```bash
git add <file1> <file2> ...
```

Never use `git add .` blindly — review each file.

## Step 3 — Write the commit message

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

## Step 4 — Commit

```bash
git commit -m "<message>"
```

For multi-line messages:
```bash
git commit
# (opens editor — write full message there)
```

---

⏸️ **Always stop here.** Ask: *"Committed. Ready to move to the testing phase?"*
