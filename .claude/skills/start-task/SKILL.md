---
name: start-task
description: >
  Start any new task (bug, feature, chore, etc.) by syncing main and creating a fresh branch.
  Use this skill whenever the user says "start", "begin", "new task", "new feature", "new fix",
  or anything that implies starting work. Always branch from main — never work directly on it.
---

# Start Task

Every piece of work — bug fix, feature, chore, refactor — begins here. Never modify main directly.

## Step 1 — Identify the branch prefix

Ask the user what kind of task this is, then pick the prefix:

| Type     | Prefix     | Example                        |
|----------|------------|--------------------------------|
| Bug fix  | `fix/`     | `fix/session-log-crash`        |
| Feature  | `feat/`    | `feat/athlete-progress-chart`  |
| Chore    | `chore/`   | `chore/update-dependencies`    |
| Refactor | `refactor/`| `refactor/auth-middleware`     |

Branch name format: `<prefix><kebab-case-description>` — short but descriptive.

## Step 2 — Sync and branch from main

```bash
cd <project-root>
git checkout main
git pull
git checkout -b <prefix>/<short-description>
```

Confirm the branch was created:
```bash
git branch --show-current
```

## Step 3 — Confirm with the user

Tell the user:
- Which branch was created
- What the next recommended phase is (`investigate`)

---

⏸️ **Always stop here.** Ask: *"Branch `<name>` is ready. Want to move to the investigate phase?"*
