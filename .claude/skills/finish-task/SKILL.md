---
name: finish-task
description: >
  Merge the current branch back to main, push, and clean up. Use when the user says
  "finish", "done", "merge", "ship this", or after testing passes. Always the last
  phase of any task.
---

# Finish Task

Testing passed. Time to merge to main, push, and clean up the branch.

## Step 1 — Make sure everything is committed

```bash
git status
```

If there are uncommitted changes, go back to the commit phase first.

## Step 2 — Merge to main

```bash
git checkout main
git pull                              # sync in case main moved
git merge <branch-name>
```

If there are merge conflicts, resolve them before continuing.

## Step 3 — Push

```bash
git push origin main
```

## Step 4 — Delete the branch

```bash
git branch -d <branch-name>
```

Confirm it's gone:
```bash
git branch
```

## Step 5 — Confirm

Tell the user:
- The branch that was merged
- The commit(s) that landed on main
- That the branch was deleted

```bash
git log main --oneline -3
```

---

⏸️ **Always stop here.** Ask: *"All done — `<branch>` merged and pushed to main. Anything else to tackle?"*
