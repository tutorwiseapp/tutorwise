# CAS Quick Start - Hybrid Approach

**Purpose**: Use CAS as a mental model and framework, NOT autonomous system

---

## Daily Workflow

### When Starting a Feature

1. **Think Like the Agents**:
   ```
   Planner   → What's the priority? What's the goal?
   Analyst   → What are the requirements? Edge cases?
   Developer → What patterns should I follow?
   Tester    → How do I test this?
   QA        → What could break?
   Security  → Any vulnerabilities?
   Engineer  → Infrastructure needs?
   ```

2. **Check the Patterns**:
   ```bash
   # View proven patterns
   cat cas/docs/proven-patterns.md

   # View design system
   cat cas/docs/design-system.md
   ```

3. **Update the Plan**:
   ```bash
   # During Claude Code session, use TodoWrite tool
   # At end of session:
   cd cas && npm run cas:update-plan
   ```

### Quality Checklist (Manual)

Before marking feature complete, verify:

- [ ] **Developer Agent checks**:
  - Clean, type-safe TypeScript
  - Unit tests (>80% coverage target)
  - Storybook stories for UI components
  - No console.log statements

- [ ] **Tester Agent checks**:
  - E2E tests pass
  - Edge cases covered
  - Error handling tested

- [ ] **QA Agent checks**:
  - Accessibility (WCAG AA)
  - Visual regression (manual check)
  - Cross-browser tested

- [ ] **Security Agent checks**:
  - No XSS vulnerabilities
  - Input validation
  - No exposed secrets

- [ ] **Engineer Agent checks**:
  - No performance regressions
  - Database queries optimized
  - Proper error logging

---

## Useful Commands

```bash
# View current plan
npm run cas:view-plan

# Update plan timestamp
npm run cas:update-plan

# Check plan status
npm run cas:status

# View agent responsibilities
cat agents/developer/README.md
cat agents/planner/README.md
# ... etc
```

---

## Agent Reference (Quick)

| Agent | Role | Key Question |
|-------|------|--------------|
| **Planner** | PDM | "What should we build next?" |
| **Analyst** | BA | "What are the requirements?" |
| **Developer** | SWE | "How do I implement this?" |
| **Tester** | QA Eng | "Does it work correctly?" |
| **QA** | QA Lead | "Is quality acceptable?" |
| **Security** | SecEng | "Is it secure?" |
| **Engineer** | SysEng | "Will it scale?" |
| **Marketer** | PMM | "Does it deliver value?" |

---

## When to Update Plans

**Manually update** `agents/developer/planning/cas-feature-dev-plan.md` when:

- Starting a new feature (add to Backlog section)
- Completing a feature (move to Completed section)
- Feature blocked (document in Planner Notes)
- Test results available (add to Test Results)

**Run `npm run cas:update-plan`** to auto-update timestamp.

---

## Key Documentation

- [Enhanced CAS Team](docs/enhanced-cas-ai-product-team.md) - Full architecture
- [Feature Checklist](docs/feature-development-checklist.md) - Quality gates
- [Proven Patterns](docs/proven-patterns.md) - Code standards
- [Design System](docs/design-system.md) - UI patterns

---

## What NOT to Do

❌ **Don't** try to run CAS autonomously (not implemented)
❌ **Don't** expect agents to execute automatically
❌ **Don't** wait for overnight PRs (won't happen)

✅ **Do** use agent personas as mental model
✅ **Do** follow quality checklists
✅ **Do** keep plans updated manually
✅ **Do** reference proven patterns

---

**Remember**: CAS is a **framework for thinking**, not an autonomous system.
