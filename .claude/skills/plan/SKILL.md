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

## Step 3 — Present and decide

Show the plan to the user and ask explicitly:

> **"Plan looks good — should I implement it, or keep investigating with the comments above?"**

Two valid outcomes:

- ✅ **User approves** → move on to writing code, then to the `testing` phase.
- 🔄 **User pushes back** → return to `investigate` with their comments, refine, and
  produce an updated plan. Loop until the plan is approved.

Never start editing code while the plan is still under discussion.

---

⏸️ **Always stop here.** Ask: *"Approve this plan and start coding, or go back to investigate?"*
