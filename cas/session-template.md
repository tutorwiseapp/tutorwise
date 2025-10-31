# Claude Code Session Template

**Copy this into each new session for structured development**

---

## Session Goal

**Feature**: [What are we building?]

**Priority**: P0 / P1 / P2

**Estimated Time**: [hours]

---

## Pre-Session Checklist

```bash
# 1. Check current plan
cd cas && npm run cas:view-plan

# 2. Review recent commits
git log --oneline --since="7 days ago" | head -10

# 3. Check proven patterns
cat cas/docs/proven-patterns.md | grep -A 5 "Component Structure"
```

---

## Agent Workflow (Manual)

### 1. Planner Phase (5 mins)
- [ ] Define feature scope and acceptance criteria
- [ ] Identify dependencies
- [ ] Estimate effort
- [ ] Create TodoWrite list

**Todos**:
```
- [ ] Task 1
- [ ] Task 2
...
```

### 2. Analyst Phase (10 mins)
- [ ] Define requirements
- [ ] Identify edge cases
- [ ] Document API contracts
- [ ] Specify validation rules

**Requirements**:
- ...

### 3. Developer Phase (60-90 mins)
- [ ] Implement feature following proven patterns
- [ ] Write unit tests (target >80% coverage)
- [ ] Create Storybook stories (if UI)
- [ ] Remove debug statements
- [ ] Run type check: `npx tsc --noEmit`

**Files Changed**:
- ...

### 4. Tester Phase (30 mins)
- [ ] Run unit tests: `npm test`
- [ ] Write/update E2E tests
- [ ] Test edge cases
- [ ] Verify error handling

**Test Results**:
- Unit: X/Y passing
- E2E: X/Y passing
- Coverage: X%

### 5. QA Phase (15 mins)
- [ ] Accessibility check (WCAG AA)
- [ ] Visual regression (manual)
- [ ] Cross-browser check (if critical)
- [ ] Mobile responsive (if UI)

**QA Notes**:
- ...

### 6. Security Phase (10 mins)
- [ ] No XSS vulnerabilities
- [ ] Input validation present
- [ ] No exposed secrets (.env check)
- [ ] SQL injection prevention (if DB)

**Security Notes**:
- ...

### 7. Engineer Phase (10 mins)
- [ ] Performance acceptable (no N+1 queries)
- [ ] Error logging in place
- [ ] Database indexes if needed
- [ ] No breaking changes to API

**Engineering Notes**:
- ...

---

## Post-Session Checklist

```bash
# 1. Update plan timestamp
cd cas && npm run cas:update-plan

# 2. Manually update cas-feature-dev-plan.md with:
#    - Feature status (completed/blocked/in-progress)
#    - Test results
#    - Files changed
#    - Lessons learned

# 3. Commit work
git add .
git commit -m "feat: [description]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# 4. Optional: Create PR if ready
```

---

## Session Summary Template

**Completed**:
- ✅ Task 1
- ✅ Task 2

**Blocked**:
- ⚠️ Issue X (reason)

**Metrics**:
- Lines added: X
- Tests written: Y
- Coverage: Z%
- Time spent: Xh

**Next Steps**:
- [ ] Follow-up task 1
- [ ] Follow-up task 2

---

**Agent Mindset**: Think like 8 specialized engineers, not one generalist.
