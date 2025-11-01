# CAS USER GUIDE

**Contextual Autonomous System - Hybrid Mode**

**Version**: 2.0 (Hybrid Framework Mode)
**Last Updated**: 2025-11-01
**Status**: Active ✅

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Requesting CAS Tasks](#requesting-cas-tasks)
3. [Daily Workflow](#daily-workflow)
4. [Session Template](#session-template)
5. [Setup & Configuration](#setup--configuration)
6. [Agent Reference](#agent-reference)
7. [Commands Reference](#commands-reference)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

### 🚀 New to CAS? Start Here

**Want CAS to work on your next task?**

```bash
cd cas && npm run cas:request
```

Or simply type in Claude Code:
```
CAS: [describe your task]

Example: CAS: Create a notification badge component
```

### What is CAS Hybrid Mode?

CAS is a **mental model and framework**, NOT an autonomous system.

**What CAS Does** ✅:
- Provides 8 agent perspectives to guide thinking
- Quality checklists to ensure completeness
- Proven patterns and design system library
- Plan tracking with automated timestamps
- Structured session templates

**What CAS Does NOT Do** ❌:
- No autonomous execution (won't run overnight)
- No auto-PR creation (manual git commits required)
- No Jira/GitHub integration
- No Claude API calls or AI-to-AI communication

---

## Requesting CAS Tasks

### Method 1: Copy-Paste Template (Fastest)

Copy this into your Claude Code session:

```
I want CAS to help with this task:

**Task**: [Describe what you want to build/fix]

**Context**: [Any relevant background]

**Expected Outcome**: [What success looks like]

Please use the CAS hybrid mode approach:
1. Think through all 8 agent perspectives (Planner → Analyst → Developer → Tester → QA → Security → Engineer → Marketer)
2. Follow proven patterns from cas/docs/proven-patterns.md
3. Use design system from cas/docs/design-system.md
4. Check quality with cas/docs/feature-development-checklist.md
5. Use TodoWrite to track progress
```

### Method 2: Simple Command (Easiest)

Just type in Claude Code:

```
CAS: [your task description]

Examples:
CAS: Create a new badge component for profile completeness
CAS: Fix the listing search filter bug
CAS: Add mobile responsive layout to dashboard
CAS: Refactor ProfileCard to use design system tokens
```

### Method 3: Detailed Request Format

```
CAS Task Request:

# Task
[What needs to be done]

# Requirements
- [ ] Requirement 1
- [ ] Requirement 2
- [ ] Requirement 3

# Constraints
- Must follow design system
- Must include tests
- Must be accessible

# Agent Perspectives Needed
- [ ] Planner: Scope and acceptance criteria
- [ ] Analyst: Requirements validation
- [ ] Developer: Implementation approach
- [ ] Tester: Test strategy
- [ ] QA: Quality checks
- [ ] Security: Security review
- [ ] Engineer: Performance review
- [ ] Marketer: Value delivery

# Files to Reference
- cas/docs/proven-patterns.md
- cas/docs/design-system.md
- [Add any other relevant files]
```

### What Happens When You Request a Task

When you type `CAS: [task]`, Claude will:

1. **Plan** (2-5 mins)
   - Define scope and acceptance criteria
   - Identify files that need changes
   - List dependencies

2. **Analyze** (3-5 mins)
   - Review requirements
   - Check against proven patterns
   - Validate approach

3. **Develop** (Main work)
   - Follow design system
   - Write clean, tested code
   - Use TodoWrite to track progress

4. **Test** (Throughout)
   - Write unit tests
   - Consider edge cases
   - Run type checks

5. **QA** (Before completion)
   - Check accessibility
   - Verify mobile responsive
   - Test across browsers

6. **Security** (Throughout)
   - Input validation
   - No XSS vulnerabilities
   - No exposed secrets

7. **Engineer** (Review)
   - Performance optimization
   - Proper error handling
   - Clean logging

8. **Market** (Validate)
   - Does it solve the problem?
   - Is it user-friendly?
   - Does it deliver value?

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
   Marketer  → Does this deliver value?
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

### When to Update Plans

**Manually update** `agents/developer/planning/cas-feature-dev-plan.md` when:

- Starting a new feature (add to Backlog section)
- Completing a feature (move to Completed section)
- Feature blocked (document in Planner Notes)
- Test results available (add to Test Results)

**Run `npm run cas:update-plan`** to auto-update timestamp.

---

## Session Template

### Copy this into each new session for structured development

```markdown
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
- [ ] Task 1
- [ ] Task 2
...

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

**Engineer Notes**:
- ...

### 8. Marketer Phase (5 mins)
- [ ] Feature solves user problem
- [ ] UX is intuitive
- [ ] Delivers promised value
- [ ] Ready for announcement

**Marketing Notes**:
- ...

---

## Post-Session Checklist

```bash
# 1. Update plan
cd cas && npm run cas:update-plan

# 2. Commit changes
git add .
git commit -m "feat: [description]"
git push

# 3. Update feature status
vim cas/agents/developer/planning/cas-feature-dev-plan.md
# Move feature to "Completed" section
```

---

## Session Summary Template

**Completed**:
- [x] Task 1
- [x] Task 2

**Files Changed**:
- file1.ts
- file2.tsx

**Test Coverage**: X%

**Next Session**:
- [ ] Follow-up task 1
- [ ] Follow-up task 2

**Lessons Learned**:
- ...
```

---

## Setup & Configuration

### Installation

CAS is already set up in your Tutorwise project. No installation needed.

### Configuration Files

| File | Purpose |
|------|---------|
| [index.ts](index.ts) | CAS entry point (ES modules with .js extensions) |
| [package.json](package.json) | NPM scripts for CAS commands |
| [scripts/update-dev-plan.sh](scripts/update-dev-plan.sh) | Auto-update plan timestamps |

### File Structure

```
cas/
├── CAS-USER-GUIDE.md                    (This file)
├── README.md                            Main overview
├── package.json                         NPM commands
├── index.ts                             Entry point
│
├── agents/                              8 Agent directories
│   ├── developer/
│   │   ├── README.md                    Agent responsibilities
│   │   └── planning/
│   │       └── cas-feature-dev-plan.md  Feature backlog
│   ├── planner/
│   ├── analyst/
│   ├── tester/
│   ├── qa/
│   ├── security/
│   ├── engineer/
│   └── marketer/
│
├── docs/                                Reference documentation
│   ├── proven-patterns.md               Code standards
│   ├── design-system.md                 UI patterns
│   ├── feature-development-checklist.md Quality gates
│   └── enhanced-cas-ai-product-team.md  Full architecture
│
└── scripts/
    └── update-dev-plan.sh               Plan timestamp updater
```

### Maintenance

**Weekly Tasks**:

1. **Update Developer Plan**:
   ```bash
   # Review and update feature status
   vim cas/agents/developer/planning/cas-feature-dev-plan.md

   # Update timestamp
   npm run cas:update-plan
   ```

2. **Review Quality Metrics**:
   - Test coverage trends
   - Features completed vs planned
   - Lessons learned section

**Monthly Tasks**:

1. **Review Agent Documentation**:
   - Update agent READMEs if roles change
   - Refresh proven patterns based on learnings
   - Archive old features in plan

---

## Agent Reference

### The 8 CAS Agents

| Agent | Role | Key Question |
|-------|------|--------------|
| **Planner** | Product Manager | "What should we build next?" |
| **Analyst** | Business Analyst | "What are the requirements?" |
| **Developer** | Software Engineer | "How do I implement this?" |
| **Tester** | QA Engineer | "Does it work correctly?" |
| **QA** | QA Lead | "Is quality acceptable?" |
| **Security** | Security Engineer | "Is it secure?" |
| **Engineer** | Systems Engineer | "Will it scale?" |
| **Marketer** | Product Marketing | "Does it deliver value?" |

### Agent Details

#### 1. Planner Agent
**Responsibilities**:
- Define feature scope and priorities
- Create acceptance criteria
- Identify dependencies
- Estimate effort

**Key Deliverables**:
- Feature roadmap
- Sprint planning
- Risk assessment

#### 2. Analyst Agent
**Responsibilities**:
- Gather and document requirements
- Define edge cases
- Specify API contracts
- Validation rules

**Key Deliverables**:
- Requirements document
- User stories
- API specifications

#### 3. Developer Agent
**Responsibilities**:
- Implement features
- Write clean, tested code
- Follow proven patterns
- Create Storybook stories

**Key Deliverables**:
- Production code
- Unit tests
- Component documentation

#### 4. Tester Agent
**Responsibilities**:
- Write and run tests
- Test edge cases
- Verify error handling
- Run regression tests

**Key Deliverables**:
- Test suites
- Coverage reports
- Bug reports

#### 5. QA Agent
**Responsibilities**:
- Accessibility checks
- Visual regression testing
- Cross-browser testing
- Mobile responsiveness

**Key Deliverables**:
- QA sign-off
- Accessibility audit
- Test reports

#### 6. Security Agent
**Responsibilities**:
- Security vulnerability checks
- Input validation review
- Secrets scanning
- SQL injection prevention

**Key Deliverables**:
- Security audit
- Vulnerability report
- Security recommendations

#### 7. Engineer Agent
**Responsibilities**:
- Performance optimization
- Database query optimization
- Error logging
- Infrastructure review

**Key Deliverables**:
- Performance report
- Infrastructure recommendations
- Monitoring setup

#### 8. Marketer Agent
**Responsibilities**:
- Validate user value
- UX review
- Feature announcement
- Success metrics

**Key Deliverables**:
- Value proposition
- Feature documentation
- Success metrics

---

## Commands Reference

### NPM Commands

```bash
# View request guide
npm run cas:request

# View quick start guide
npm run cas:help

# View current plan
npm run cas:view-plan

# Update plan timestamp
npm run cas:update-plan

# Check plan status
npm run cas:status
```

### Useful Commands

```bash
# View agent responsibilities
cat agents/developer/README.md
cat agents/planner/README.md
# ... etc

# View proven patterns
cat docs/proven-patterns.md

# View design system
cat docs/design-system.md

# View feature checklist
cat docs/feature-development-checklist.md
```

### Git Workflow

```bash
# Check status
git status

# Review changes
git diff

# Stage changes
git add .

# Commit with CAS message
git commit -m "feat(component): add notification badge

Implemented notification badge component following CAS workflow:
- Planner: Defined scope and acceptance criteria
- Developer: Built component with proven patterns
- Tester: Unit tests with 95% coverage
- QA: Accessibility WCAG AA compliant
- Security: No vulnerabilities
- Engineer: Optimized rendering
- Marketer: Delivers value for user notifications

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

# Push changes
git push
```

---

## Troubleshooting

### Common Issues

#### Module Errors

**Problem**: `npm run start` crashes with module not found

**Solution**: Check [index.ts](index.ts) has `.js` extensions for ES module imports

```typescript
// Correct
import { startAllServices } from './packages/core/src/service/service-manager.js';

// Incorrect
import { startAllServices } from './packages/core/src/service/service-manager';
```

#### Plan Outdated

**Problem**: Plan hasn't been updated in weeks

**Solution**:
```bash
# Update timestamp
npm run cas:update-plan

# Manually update content
vim cas/agents/developer/planning/cas-feature-dev-plan.md
```

#### Pattern Unclear

**Problem**: Don't know which pattern to follow

**Solution**: Check proven patterns documentation
```bash
cat cas/docs/proven-patterns.md
```

#### Test Failures

**Problem**: Tests failing after implementing feature

**Solution**:
1. Run tests with verbose output: `npm test -- --verbose`
2. Check test coverage: `npm run test:coverage`
3. Review Tester agent checklist in session template
4. Check proven patterns for test examples

#### Performance Issues

**Problem**: Feature is slow

**Solution**:
1. Review Engineer agent checklist
2. Check for N+1 queries
3. Profile with React DevTools
4. Check database indexes
5. Review [docs/proven-patterns.md](docs/proven-patterns.md) for performance patterns

---

## Key Documentation

- [Enhanced CAS Team](docs/enhanced-cas-ai-product-team.md) - Full architecture
- [Feature Checklist](docs/feature-development-checklist.md) - Quality gates
- [Proven Patterns](docs/proven-patterns.md) - Code standards
- [Design System](docs/design-system.md) - UI patterns

---

## Success Metrics

Track these to validate CAS value:

**Quality**:
- [ ] Features consistently well-tested (>80% coverage)?
- [ ] Fewer bugs reaching production?
- [ ] Consistent code patterns across features?

**Velocity**:
- [ ] Faster feature completion?
- [ ] Less time debugging?
- [ ] Clear next steps at session end?

**Documentation**:
- [ ] Plans reflect reality?
- [ ] Easy to onboard new devs?
- [ ] Patterns documented and reused?

---

## Migration Path (Future)

If you decide to implement full autonomous CAS in the future:

**Phase 1** (Current): ✅ Framework mode
- Mental model
- Manual workflows
- Documentation
- **Cost**: $0/month

**Phase 2** (Future): Plan Automation
- Auto-update plans from git commits
- Auto-generate morning reports
- **Cost**: ~$100/month

**Phase 3** (Future): Partial Automation
- Auto-draft PRs (human approval required)
- Auto-run test suites
- **Cost**: ~$500/month

**Phase 4** (Future): Full Autonomy
- Overnight development
- 8 agents fully operational
- Claude API integration
- **Cost**: ~$3,000/month

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

## Support

**Questions?**
1. Check this guide first
2. Review agent READMEs in `agents/*/README.md`
3. Reference [docs/enhanced-cas-ai-product-team.md](docs/enhanced-cas-ai-product-team.md)

**Found a bug or have suggestions?**
- Update this guide
- Submit PR with improvements
- Document in lessons learned

---

**Remember**: CAS is a **framework for thinking**, not an autonomous system.

**Status**: CAS Hybrid Mode is operational and ready to use. 🚀

**Version**: 2.0 (Hybrid Framework Mode)
**Last Updated**: 2025-11-01
