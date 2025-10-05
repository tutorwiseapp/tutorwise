# CAS Autonomous Agent
## AI-Powered Overnight Development System

**Purpose:** Enable AI to work autonomously on tasks while you sleep, wake up to completed PRs ready for review.

---

## 🎯 Overview

The CAS Autonomous Agent is a system that allows Claude AI to:
- Pull tasks from Jira/GitHub automatically
- Implement features autonomously overnight
- Run tests and quality checks
- Create PRs with detailed summaries
- Generate morning reports

**Result:** 3x development speed, 24/7 productivity

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  CAS Autonomous Agent                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Task Manager │  │   Executor   │  │   Reporter   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│         │                 │                  │          │
│         ▼                 ▼                  ▼          │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Integration Layer                    │  │
│  ├──────────────┬──────────────┬───────────────────┤  │
│  │     Jira     │    GitHub    │    File System    │  │
│  └──────────────┴──────────────┴───────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Directory Structure

```
tools/cas/agent/
├── README.md                     # This file
├── config/
│   ├── agent.config.json        # Agent configuration
│   ├── jira.config.json         # Jira settings
│   └── github.config.json       # GitHub settings
├── core/
│   ├── task-manager.js          # Task queue management
│   ├── executor.js              # Autonomous execution engine
│   ├── reporter.js              # Report generation
│   └── safety-checks.js         # Quality & safety controls
├── integrations/
│   ├── jira-client.js           # Jira API integration
│   ├── github-client.js         # GitHub API integration
│   └── claude-api.js            # Claude API wrapper (future)
├── templates/
│   ├── pr-template.md           # PR description template
│   ├── morning-report.md        # Daily report template
│   └── task-handoff.md          # Evening handoff template
├── logs/
│   ├── agent.log                # Agent activity log
│   ├── tasks/                   # Per-task logs
│   └── reports/                 # Daily reports
└── scripts/
    ├── start-agent.sh           # Start autonomous mode
    ├── stop-agent.sh            # Stop agent
    └── generate-report.sh       # Manual report generation
```

---

## 🚀 Quick Start

### 1. Configuration

```bash
# Set up Jira credentials
export JIRA_BASE_URL="https://your-domain.atlassian.net"
export JIRA_EMAIL="your-email@example.com"
export JIRA_API_TOKEN="your-api-token"

# Set up GitHub credentials
export GITHUB_TOKEN="ghp_your_token"
export GITHUB_REPO="username/tutorwise"

# Optional: Claude API (for future full automation)
export ANTHROPIC_API_KEY="sk-ant-your-key"
```

### 2. Start Agent

```bash
# Start autonomous mode
cas agent start

# Or manually
node tools/cas/agent/core/task-manager.js
```

### 3. Evening Handoff

```bash
# Queue tasks for overnight work
cas agent queue add TUTORWISE-123
cas agent queue add TUTORWISE-124

# Or tag in Jira with "ai-ready"
```

### 4. Morning Review

```bash
# View overnight report
cas agent report

# Review PRs
gh pr list --author "cas-bot"

# Approve and merge
gh pr review 123 --approve
gh pr merge 123
```

---

## 📋 Usage Guide

### Assigning Tasks to AI

**Method 1: Jira Labels**
```
1. Create Jira ticket
2. Add label: "ai-ready"
3. Ensure description has:
   - Clear requirements
   - Acceptance criteria
   - Files to modify
   - Priority
```

**Method 2: GitHub Projects**
```
1. Create issue in GitHub
2. Move to "AI Queue" column
3. Add label: "ai-ready"
4. Tag with complexity: "simple" | "medium" | "complex"
```

**Method 3: CAS CLI**
```bash
cas agent queue add \
  --title "Add Redis connection pooling" \
  --priority high \
  --files "apps/api/app/db.py,apps/api/app/config.py" \
  --estimate "2-3h"
```

---

### Task Format Requirements

**Minimum Requirements:**
- ✅ Clear title
- ✅ Detailed description
- ✅ Acceptance criteria (checkboxes)
- ✅ Files to modify (if known)
- ✅ Priority (P0/P1/P2)

**Example Task:**
```markdown
Title: Implement session monitoring for Supabase auth

Description:
Monitor Supabase authentication sessions and auto-refresh tokens
before they expire to prevent user logouts.

Requirements:
- Check session health every 30 seconds
- Auto-refresh tokens 5 minutes before expiry
- Alert on session failures
- Add metrics (active sessions, refresh rate)

Files to modify:
- apps/web/src/lib/supabase.ts
- apps/web/src/hooks/useAuth.ts
- apps/api/app/middleware/auth.py

Acceptance Criteria:
- [ ] Session monitoring loop implemented
- [ ] Auto-refresh logic with exponential backoff
- [ ] Health check endpoint added
- [ ] Tests passing (unit + integration)
- [ ] Documentation updated

Priority: P0 (High)
Estimate: 2-3 hours
Labels: ai-ready, auth, backend
```

---

## 🤖 How the Agent Works

### Overnight Execution Flow

```
20:00 - Agent starts
   ↓
20:05 - Pull tasks from Jira/GitHub
   ↓
20:10 - Select highest priority task
   ↓
20:15 - Analyze requirements
   ↓
20:30 - Read related code
   ↓
21:00 - Implement feature
   ↓
23:00 - Write tests
   ↓
00:00 - Run quality checks
   ↓
00:30 - Create PR
   ↓
00:35 - Update task status
   ↓
00:40 - Move to next task
   ↓
...
06:00 - Generate morning report
   ↓
06:05 - Send notification
   ↓
06:10 - Agent stops
```

### Quality Checks (Before Creating PR)

```bash
# Code quality
npm run lint
npm run type-check

# Tests
npm run test
npm run test:e2e

# Build
npm run build

# Health
cas health

# Git
git diff --check
```

---

## 📊 Morning Report Format

```markdown
# CAS Autonomous Agent - Daily Report
Date: 2025-10-05
Duration: 20:00 → 06:00 (10 hours)

## ✅ COMPLETED TASKS (3)

### [TUTORWISE-123] Session monitoring
- **PR:** #456
- **Status:** Ready for review
- **Tests:** ✅ 18/18 passing
- **Coverage:** 94%
- **Files:** 6 modified, 3 added
- **Time:** 2.5 hours

**Changes:**
- Added SessionMonitor class
- Integrated with Supabase auth
- Auto-refresh with exponential backoff
- Health check endpoint
- Unit + integration tests

**Review Required:**
- Check token refresh timing
- Validate error handling

---

### [TUTORWISE-124] Redis connection pooling
- **PR:** #457
- **Status:** Ready for review
- **Tests:** ✅ 12/12 passing
- **Coverage:** 91%
- **Files:** 4 modified, 2 added
- **Time:** 3 hours

**Changes:**
- Connection pool (10-50 connections)
- Auto-reconnect on failure
- Health metrics endpoint
- Load testing included

**Review Required:**
- Verify pool size configuration
- Test under load

---

### [TUTORWISE-125] Webhook logging
- **PR:** #458
- **Status:** Ready for review
- **Tests:** ✅ 5/5 passing
- **Coverage:** 88%
- **Files:** 2 modified
- **Time:** 1.5 hours

**Changes:**
- Added structured logging
- Webhook delivery tracking
- Retry logic for failures

**Review Required:**
- Check log format

---

## 🔄 IN PROGRESS (0)
None

## ❌ BLOCKED (0)
None

## 📈 STATISTICS

**Development Time:** 7 hours
**Idle Time:** 3 hours (waiting for tests)
**Total Tasks:** 3 completed, 0 blocked
**Code Changes:**
- Lines added: 456
- Lines removed: 89
- Files modified: 12
- Tests added: 35

**Quality Metrics:**
- All tests passing: ✅
- Coverage avg: 91%
- Lint errors: 0
- Type errors: 0

## 🎯 ACTION REQUIRED

1. **Review PRs:** #456, #457, #458
2. **Merge when ready**
3. **Deploy to staging** for integration testing
4. **Add 5 new tasks** for tonight

## 💬 NOTES

- Task TUTORWISE-124 took longer than estimated (3h vs 2h)
  due to complex connection pooling logic
- All PRs include comprehensive tests
- Documentation updated for each feature

## 📋 QUEUE STATUS

**Remaining:** 2 tasks
- [P1] TUTORWISE-126: Add caching to API
- [P2] TUTORWISE-127: Refactor auth middleware

**Suggested for tonight:**
Add 3-5 more tasks by 8 PM for optimal overnight work.

---

Generated by CAS Autonomous Agent v1.0.0
```

---

## 🔐 Safety & Controls

### What Agent CANNOT Do:
- ❌ Merge PRs (requires human approval)
- ❌ Deploy to production
- ❌ Delete code without backup
- ❌ Change architecture without approval
- ❌ Access production databases
- ❌ Modify pricing/billing logic
- ❌ Make strategic decisions

### What Agent CAN Do:
- ✅ Implement features with clear specs
- ✅ Write comprehensive tests
- ✅ Fix bugs with reproduction steps
- ✅ Refactor code (PR review required)
- ✅ Update documentation
- ✅ Create database migrations (review required)
- ✅ Generate reports

### Safety Checks:
```javascript
// Before executing any task
const safetyChecks = {
  hasTests: true,              // Must include tests
  breakingChanges: false,      // No breaking changes
  productionData: false,       // No prod access
  humanApproval: true,         // Requires review
  rollbackPlan: true,          // Can be reverted
  documentationUpdated: true   // Docs included
};
```

---

## 🔧 Configuration

### agent.config.json
```json
{
  "enabled": true,
  "schedule": {
    "start": "20:00",
    "end": "06:00",
    "timezone": "UTC"
  },
  "limits": {
    "maxTasksPerNight": 5,
    "maxTimePerTask": "4h",
    "maxRetries": 3
  },
  "notifications": {
    "morning_report": true,
    "task_completion": false,
    "errors_only": false,
    "slack_webhook": null,
    "email": "your-email@example.com"
  },
  "quality": {
    "require_tests": true,
    "min_coverage": 80,
    "run_lint": true,
    "run_type_check": true
  }
}
```

---

## 📚 Examples

### Example 1: Simple Bug Fix

**Input (Jira Ticket):**
```
Title: Fix typo in user profile page
Priority: P2
Label: ai-ready, bug, frontend

Description:
User's name is displayed as "Nmae" instead of "Name"
on the profile page.

File: apps/web/src/app/profile/page.tsx
Line: 42

Expected: "Name"
Actual: "Nmae"
```

**Output (PR):**
```
PR #459: Fix typo in user profile page

Fixed typo where "Nmae" was displayed instead of "Name".

Changes:
- Fixed label text in ProfilePage component
- Added test to verify correct label

Tests: ✅ 1/1 passing
Time: 15 minutes
```

---

### Example 2: Medium Feature

**Input (GitHub Issue):**
```
Title: Add pagination to tutors list
Priority: High
Labels: ai-ready, feature, frontend

Description:
The tutors listing page should show 20 tutors per page
with next/prev buttons.

Requirements:
- 20 tutors per page
- Next/Previous navigation
- Page number display
- URL params (?page=2)
- Loading states

Files:
- apps/web/src/app/tutors/page.tsx
- apps/web/src/components/ui/Pagination.tsx

Acceptance:
- [ ] Shows 20 items per page
- [ ] Navigation works
- [ ] URL updates
- [ ] Loading indicator
- [ ] Tests pass
```

**Output (PR):**
```
PR #460: Add pagination to tutors list

Implemented pagination for tutors listing page with URL
param support and loading states.

Changes:
- Added Pagination component
- Updated TutorsPage to use pagination
- URL params for page navigation
- Loading skeleton
- Unit tests for pagination logic
- E2E test for navigation

Tests: ✅ 12/12 passing
Coverage: 94%
Time: 2.5 hours
```

---

## 🚨 Troubleshooting

### Agent Not Starting

```bash
# Check logs
cat tools/cas/agent/logs/agent.log

# Verify credentials
cas agent config validate

# Test connections
cas agent test jira
cas agent test github
```

### Tasks Not Being Pulled

```bash
# Check Jira query
cas agent debug jira

# Verify labels
jira issue list --jql 'labels = "ai-ready"'

# Check GitHub
gh issue list --label "ai-ready"
```

### PRs Not Created

```bash
# Check permissions
gh auth status

# Verify branch protection
gh repo view --json branchProtectionRules

# Review error logs
cat tools/cas/agent/logs/tasks/TASK-ID.log
```

---

## 📖 Best Practices

### Writing Good Task Descriptions

**❌ Bad:**
```
Title: Fix auth
Description: Auth is broken, fix it.
```

**✅ Good:**
```
Title: Fix session timeout after 1 hour
Description:
Users are being logged out after 1 hour instead of
the expected 24 hours. The issue is in the token
refresh logic.

Steps to reproduce:
1. Log in
2. Wait 1 hour
3. Make API request
4. Session is expired

Expected: Session lasts 24 hours
Actual: Session expires after 1 hour

File: apps/web/src/lib/supabase.ts
Suspected issue: Token refresh timer
```

### Task Sizing

**Small (< 1 hour):**
- Bug fixes
- Typos
- Documentation updates
- Config changes

**Medium (1-3 hours):**
- New components
- API endpoints
- Database migrations
- Integration features

**Large (3-6 hours):**
- Complex features
- Refactoring
- Performance optimization
- Multi-file changes

**Too Large (> 6 hours):**
- Break into smaller tasks
- Create epic with subtasks
- Requires human planning

---

## 🎯 Metrics & Success

### Track These Metrics:

```json
{
  "weekly": {
    "tasks_completed": 15,
    "prs_created": 15,
    "prs_merged": 14,
    "avg_review_time": "2 hours",
    "time_saved": "30 hours",
    "bugs_introduced": 1,
    "tests_added": 89
  },
  "quality": {
    "test_coverage": "92%",
    "pr_approval_rate": "93%",
    "first_pass_rate": "80%",
    "revision_requests": "20%"
  }
}
```

### Success Criteria:

- ✅ 80%+ tasks completed successfully
- ✅ 90%+ test coverage on new code
- ✅ <3 revision requests per PR
- ✅ <2 hours average review time
- ✅ 0 critical bugs introduced

---

## 🔮 Future Enhancements

### Phase 1 (Current)
- [x] Jira integration
- [x] GitHub integration
- [x] Task queue management
- [x] PR automation
- [x] Morning reports

### Phase 2 (Q2 2025)
- [ ] Full Claude API integration (no human in loop)
- [ ] Intelligent task prioritization
- [ ] Auto-merge for simple changes
- [ ] Learning from PR feedback
- [ ] Multi-repo support

### Phase 3 (Q3 2025)
- [ ] Natural language task assignment
- [ ] Self-improving from mistakes
- [ ] Architecture decision suggestions
- [ ] Auto-generated tests from specs
- [ ] Code review automation

---

**Version:** 1.0.0
**Last Updated:** 2025-10-04
**Status:** In Development
**Owner:** CAS Team
