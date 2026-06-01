---
name: investigate
description: >
  Investigate the codebase before making any changes — for bugs and new features alike.
  Use when the user says "investigate", "understand", "trace", "look into", "where is X",
  or before starting to code anything. Never skip this phase.
---

# Investigate

Don't touch code until you understand what's happening. This applies to bugs (what's broken and why)
and features (where to add it, what it affects).

## For bugs — trace the symptom to the root cause

1. **Find the entry point** — grep for the error text, component name, or button label
2. **Trace the data flow** — follow the call chain: `page → service → httpClient → backend route → controller → model → DB`
3. **Identify the mismatch** — what does the caller expect vs. what does the callee return?
4. **Check both ends** — bugs often live at a boundary (frontend/backend, controller/model, component/parent)

## For features — understand the insertion point

1. **Find where the feature belongs** — which page, component, route, model?
2. **Map related code** — what existing code will this touch or depend on?
3. **Check the DB schema** — does `database/schema.sql` need a new table or column?
4. **Review auth requirements** — does this need `requireAuth` or `requireRole`? Which roles can access it?

## Useful patterns for this codebase

```bash
# Find a component or keyword
grep -r "keyword" frontend/src/
grep -r "keyword" backend/src/

# Trace a route
cat backend/src/routes/<domain>.routes.js
cat backend/src/controllers/<domain>.controller.js
cat backend/src/models/<domain>.model.js

# Check DB schema
cat database/schema.sql
```

## Output

Summarize findings to the user:
- What you found and where
- The root cause (for bugs) or the insertion point (for features)
- Files that will need to change
- Any risks or side effects to watch for

---

⏸️ **Always stop here.** Ask: *"Investigation complete. Ready to move to the plan phase?"*
