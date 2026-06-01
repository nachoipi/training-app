---
name: finish-task
description: >
  Wrap up the current branch — either merge it into main or open a pull request — push,
  and optionally delete the branch. Use when the user says "finish", "done", "merge",
  "ship this", or after testing passes. Always the last phase of any task.
---

# Finish Task

Testing passed. Time to land the branch — either by merging directly to main or by
opening a pull request — and then clean up.

## Step 1 — Make sure everything is committed

```bash
git status
```

If there are uncommitted changes, go back to the commit phase first.

## Step 2 — Choose: merge to main OR open a pull request

Ask the user explicitly:

> **"Do you want to merge this branch directly into main, or open a pull request?"**

Then follow the matching path below — do not pick one silently.

### Option A — Merge directly to main

```bash
git checkout main
git pull                              # sync in case main moved
git merge <branch-name>
git push origin main
```

If there are merge conflicts, resolve them before continuing.

### Option B — Open a pull request

Push the branch and create the PR with the GitHub CLI:

```bash
git push -u origin <branch-name>
gh pr create --base main --head <branch-name> --fill
```

Use `--fill` to seed the title and body from the commit messages, or pass
`--title` / `--body` explicitly if the user wants a custom description.

Share the PR URL with the user and **stop here for this option** — the branch should
not be deleted until the PR is merged on GitHub.

## Step 3 — (Merge path only) Confirm main is up to date

```bash
git log main --oneline -3
```

## Step 4 — Ask whether to delete the branch

Ask the user explicitly:

> **"Want me to delete the `<branch-name>` branch, or keep it around?"**

If they want to delete it:

```bash
git branch -d <branch-name>
# If the branch was pushed (PR path or pushed merge branch), also delete the remote:
git push origin --delete <branch-name>
```

Confirm:
```bash
git branch
```

If they want to keep it, skip the deletion and just note that the branch still exists.

## Step 5 — Confirm

Tell the user:
- Whether the branch was merged to main or a PR was opened (with the URL)
- The commit(s) that landed on main, if any
- Whether the branch was deleted or kept

---

⏸️ **Always stop here.** Ask: *"All done — anything else to tackle?"*
