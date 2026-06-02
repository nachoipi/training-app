---
name: plan
description: >
  Produce a concrete code-change plan after investigation and before writing any code.
  Use when the user says "plan", "propose changes", "what would you change", or
  immediately after the investigate phase. Never start coding without an approved plan.
---

# Plan

Investigation told you *what* is happening and *where*. The plan tells you *how* you're
going to change it. No code is written until the user approves the plan.

## Step 1 — Draft the code plan

Lay out the proposed modifications clearly. For each file that will change include:

- **File path** — exact location
- **Change type** — add / modify / delete
- **What changes** — the specific function, block, or behavior touched
- **Why** — how it ties back to the root cause or feature requirement

Group related changes together (backend model + controller + route; frontend service +
page; schema + seed). Call out any new files, new dependencies, or DB schema changes
explicitly.

## Step 2 — Surface risks and trade-offs

Before asking for approval, mention:
- Side effects on other features
- Migration / backward-compatibility concerns
- Anything you're unsure about and want the user to weigh in on
- Alternative approaches you considered and rejected (briefly)

## Step 3 — Plan the documentation pass

Every file that will be **added or modified** must end up with:

1. **A general comment at the top of the file** — one short paragraph (2–4 lines)
   describing the file's purpose and where it sits in the request flow
   (e.g. *"Auth service. Issues and verifies HS256 JWTs for the `/api/auth/*` routes;
   consumed by `auth.middleware.js`."*).
2. **A short comment on every important method, function, or process** — the
   non-obvious "why" (security implication, invariant, side effect, ordering
   constraint). Skip trivial getters and one-liners; do not narrate the obvious.

For each file in the plan, note explicitly what the top-of-file comment will say and
which functions/blocks need an inline comment. Treat documentation as part of the
change set, not an afterthought.

This rule **overrides** the default "no comments" preference for this project.

## Step 4 — Present and decide

Show the plan to the user and ask explicitly:

> **"Plan looks good — should I implement it, or keep investigating with the comments above?"**

Two valid outcomes:

- ✅ **User approves** → move on to writing code (including the documentation pass
  from Step 3), then to the `testing` phase.
- 🔄 **User pushes back** → return to `investigate` with their comments, refine, and
  produce an updated plan. Loop until the plan is approved.

Never start editing code while the plan is still under discussion.

---

⏸️ **Always stop here.** Ask: *"Approve this plan and start coding, or go back to investigate?"*
