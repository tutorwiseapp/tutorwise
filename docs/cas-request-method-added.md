# CAS Request Method Added ✅

**Date**: 2025-10-31
**Purpose**: Simple method to request CAS to work on tasks

---

## What Was Added

### 1. Request Guide Document
**File**: [cas/request-cas-task.md](cas/request-cas-task.md)

Comprehensive guide with **3 methods** to request CAS tasks:

1. **Copy-Paste Template** (Fastest)
   - Pre-formatted template
   - Just fill in task details
   - Includes all agent perspectives

2. **Simple Command** (Easiest)
   ```
   CAS: [your task description]
   ```

3. **Detailed Request Format** (Most thorough)
   - Full requirements breakdown
   - All agent perspectives
   - Files to reference

### 2. NPM Command Added
**Command**: `npm run cas:request`

```bash
cd cas && npm run cas:request
```

Shows the request guide instantly.

### 3. Quick Start Updated
**File**: [cas/quick-start-guide.md](cas/quick-start-guide.md)

Added prominent section at top:
```
🚀 New to CAS? Start Here

Want CAS to work on your next task?
cd cas && npm run cas:request

Or simply: CAS: [describe your task]
```

---

## How to Use

### Method 1: View Guide
```bash
cd cas && npm run cas:request
```

### Method 2: Simple Syntax
Just type in Claude Code:
```
CAS: Create a new profile badge component
CAS: Fix the search filter persistence bug
CAS: Refactor listings to use design system
```

### Method 3: Copy Template
Run the command, copy the template, paste into Claude Code, fill in details.

---

## What CAS Will Do

When you request a task, CAS (via Claude Code) will:

1. ✅ **Plan** - Define scope and acceptance criteria
2. ✅ **Analyze** - Review requirements, check patterns
3. ✅ **Develop** - Write clean, tested code
4. ✅ **Test** - Unit tests and edge cases
5. ✅ **QA** - Accessibility, mobile, quality
6. ✅ **Security** - Input validation, no XSS
7. ✅ **Engineer** - Performance, error handling
8. ✅ **Market** - Does it deliver value?

All tracked with TodoWrite tool for visibility.

---

## Files Created/Modified

### Created
- [cas/request-cas-task.md](cas/request-cas-task.md) - Full request guide (200 lines)

### Modified
- [cas/package.json](cas/package.json) - Added `cas:request` command
- [cas/quick-start-guide.md](cas/quick-start-guide.md) - Added prominent intro section

---

## Examples

### Example 1: New Component
```
CAS: Create a notification badge component

Context: Users need to see unread message counts on nav menu
Expected: Badge shows count (max 99+), accessible, responsive
```

### Example 2: Bug Fix
```
CAS: Fix listing search filters not persisting after page refresh

Context: Users lose filter selections when navigating back
Expected: Filters persist in URL params, restore on page load
```

### Example 3: Refactor
```
CAS: Refactor ProfileCard to use design system tokens

Context: Component has inline styles, not consistent
Expected: Use design tokens for spacing/colors, follow patterns
```

---

## Benefits

### For You
- ✅ Simple, clear way to request tasks
- ✅ No need to remember complex prompts
- ✅ Consistent quality across all tasks
- ✅ All 8 agent perspectives applied

### For CAS
- ✅ Clear structure to follow
- ✅ Quality checklist enforced
- ✅ Proven patterns referenced
- ✅ Design system compliance

---

## Quick Reference

```bash
# View request guide
cd cas && npm run cas:request

# View other CAS commands
cd cas && npm run cas:help       # Quick start guide
cd cas && npm run cas:view-plan  # Current plan
cd cas && npm run cas:status     # Agent status
cd cas && npm run cas:update-plan # Update timestamp
```

---

## Next Steps

### Immediate
1. Try it out! Request your next task with: `CAS: [task]`
2. See how CAS applies all 8 agent perspectives
3. Notice the quality improvements

### Ongoing
- Use for all new features
- Use for bug fixes
- Use for refactoring
- Use for documentation

---

**Status**: ✅ Ready to use immediately
**Command**: `cd cas && npm run cas:request`
**Simple Syntax**: `CAS: [your task]`

Try it on your next task!
