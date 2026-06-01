---
name: testing
description: >
  Verify a change works correctly before merging. Covers both automated sandbox checks
  and a manual checklist for the user. Use when the user says "test", "verify", "check this",
  or after committing a change and before finishing the task.
---

# Testing

Testing has two parts: Claude runs checks in the sandbox, and you verify manually in the app.
Both must pass before merging.

## Test users

Use these accounts — they exist in the DB permanently:

| Role    | Email                      | Password |
|---------|----------------------------|----------|
| Trainer | test_trainer@fitcore.com   | 123456   |
| Athlete | test_athlete@fitcore.com   | 123456   |

Never use real user accounts (nacho@fitcore.com, trainer@fitcore.com) for testing.

---

## Part 1 — Claude's sandbox checks

Claude will run the following automatically:

### 1. Backend syntax check
```bash
cd backend && node --check src/app.js
```

### 2. Route smoke test (if backend is running)
Test the affected endpoints with curl or by inspecting the route/controller/model chain:
```bash
# Check for obvious errors in changed files
node --check backend/src/controllers/<changed>.controller.js
node --check backend/src/models/<changed>.model.js
```

### 3. Schema consistency
If DB changes were made, verify the schema file matches:
```bash
grep -n "<new_table_or_column>" database/schema.sql
```

### 4. Frontend import check
```bash
cd frontend && node --check src/services/<changed>Service.js 2>/dev/null || true
grep -rn "import.*<changed>" frontend/src/
```

Claude will report: ✅ passed / ❌ failed for each check.

---

## Part 2 — Manual checklist (for you)

Work through these in the browser with the test accounts:

### Auth & roles
- [ ] Login works with `test_trainer@fitcore.com` (trainer view loads correctly)
- [ ] Login works with `test_athlete@fitcore.com` (athlete view loads correctly)
- [ ] Role-restricted actions are blocked for the wrong role

### Feature/fix specific
- [ ] The specific thing that was changed works as expected
- [ ] The UI reflects the change correctly (no stale data, correct labels)
- [ ] No console errors in browser DevTools

### Edge cases
- [ ] Empty states handled (no data, new account)
- [ ] Page reload doesn't break state
- [ ] Switching between trainer/athlete sessions works

### Regression
- [ ] Other unrelated features still work (quick smoke test)

---

⏸️ **Always stop here.** Ask: *"Sandbox checks done. Once you've completed the manual checklist, let me know and we'll move to the commit phase."*
