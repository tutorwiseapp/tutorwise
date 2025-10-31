# Request CAS Task - Quick Start

## How to Request CAS to Work on Your Next Task

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

### Method 2: Simple Command

Just type this in your Claude Code session:

```
CAS: [your task description]

Example:
CAS: Create a new badge component for profile completeness
CAS: Fix the listing search filter bug
CAS: Add mobile responsive layout to dashboard
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

---

## What Happens Next

When you request a CAS task, I will:

1. **Plan** (2 mins)
   - Define scope and acceptance criteria
   - Identify files that need changes
   - List dependencies

2. **Analyze** (3 mins)
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

## Quick Examples

### Example 1: New Feature
```
CAS: Create a notification badge component

Context: Users need to see unread message counts
Expected: Badge shows count, max 99+, accessible, responsive
```

### Example 2: Bug Fix
```
CAS: Fix listing search filter not persisting after page refresh

Context: Users lose filter selections when navigating back
Expected: Filters persist in URL params, restore on load
```

### Example 3: Refactor
```
CAS: Refactor ProfileCard component to use design system

Context: Component has inline styles, not consistent with design
Expected: Use design tokens, follow spacing/color standards
```

---

## Files CAS Will Reference Automatically

- **Patterns**: [cas/docs/proven-patterns.md](cas/docs/proven-patterns.md)
- **Design System**: [cas/docs/design-system.md](cas/docs/design-system.md)
- **Checklist**: [cas/docs/feature-development-checklist.md](cas/docs/feature-development-checklist.md)
- **Session Template**: [cas/session-template.md](cas/session-template.md)

---

## Tips for Better Results

### ✅ Good Requests
- Clear task description
- Specific requirements
- Context about why it's needed
- Expected outcome defined

### ❌ Avoid
- Vague descriptions ("make it better")
- No context provided
- Unclear success criteria
- Missing constraints

---

## After Task Completion

CAS will provide:
- ✅ Summary of changes
- ✅ Files modified
- ✅ Tests added
- ✅ Quality checklist completion
- ✅ Next steps (if any)

You can then:
1. Review the changes
2. Test manually
3. Commit with CAS-generated summary
4. Update CAS plan: `cd cas && npm run cas:update-plan`

---

## Quick Commands

```bash
# Start CAS task
# (Just paste template above in Claude Code)

# View CAS helpers
cd cas && npm run cas:help

# Check current plan
cd cas && npm run cas:view-plan

# View patterns
cat cas/docs/proven-patterns.md

# View design system
cat cas/docs/design-system.md
```

---

**Ready to use!** Just copy Method 1, Method 2, or Method 3 into your next Claude Code session.
