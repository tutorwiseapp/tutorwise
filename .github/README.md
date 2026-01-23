# Tutorwise GitHub Configuration

**Last Updated**: 2026-01-23
**Version**: 2.0

This directory contains GitHub-specific configuration files for automated workflows, issue management, and development standards.

---

## 📁 Directory Structure

```
.github/
├── workflows/              # GitHub Actions CI/CD workflows
│   ├── ci.yml             # [DEPRECATED] Old CI pipeline
│   ├── build-check.yml    # ✅ Build verification (main workflow)
│   ├── continuous-improvement.yml  # ✅ Quality checks & improvements
│   ├── daily-audit.yml    # ✅ Automated daily project audit
│   ├── protection-report.yml  # ✅ Critical files protection monitoring
│   └── deploy.yml         # [NEEDS UPDATE] Deployment automation
├── ISSUE_TEMPLATE/         # Issue templates
│   ├── bug_report.yml     # ✅ Bug reporting template
│   ├── feature_request.yml  # ✅ Feature request template
│   └── config.yml         # ✅ Template configuration
├── pull_request_template.md  # ✅ PR checklist
└── README.md              # This file
```

---

## 🔄 Active Workflows

### 1. **Build Check** (`build-check.yml`) ✅
**Primary CI Workflow** - Runs on every push/PR

**Triggers**:
- Push to `main` or `develop`
- PRs to `main` or `develop`
- Only when web app files change

**What it does**:
- ✅ Install dependencies
- ✅ Lint code (ESLint, TypeScript)
- ✅ Build web application
- ✅ Verify production build

**Status**: **Active & Working**

---

### 2. **Continuous Improvement** (`continuous-improvement.yml`) ✅
**Quality & Performance Monitoring**

**Triggers**:
- Push to `main` or `develop`
- PRs to `main`

**What it does**:
- 🔍 Quality checks (linting, type checking)
- 📊 Bundle size analysis
- 🎯 Performance metrics
- 🧪 Test coverage reporting

**Status**: **Active** (Node 18 - consider updating to 22)

---

### 3. **Daily Audit** (`daily-audit.yml`) ✅
**Automated Project Health Monitoring**

**Triggers**:
- Schedule: 6:00 AM & 6:00 PM UTC daily
- Manual dispatch

**What it does**:
- 📋 Generates project audit report
- 📧 Emails report to team
- 📊 Tracks metrics over time
- ⚠️ Identifies issues early

**Status**: **Active & Working**

---

### 4. **Protection Report** (`protection-report.yml`) ✅
**Critical Files Monitoring**

**Triggers**:
- Schedule: 6:02 AM & 6:02 PM UTC daily
- Manual dispatch

**What it does**:
- 🛡️ Monitors critical file protection
- 🔒 Verifies file integrity
- 📧 Emails protection status
- ⚠️ Alerts on protection violations

**Status**: **Active & Working**

---

### 5. **CI Pipeline** (`ci.yml`) ⚠️ DEPRECATED
**Old CI workflow** - Replaced by `build-check.yml`

**Status**: **Deprecated** - Safe to delete
**Reason**: References non-existent Python backend, outdated structure

---

### 6. **Deploy** (`deploy.yml`) ⚠️ NEEDS UPDATE
**Production Deployment**

**Status**: **Needs Review** - Has encoding issues, may be outdated
**Issues**:
- Character encoding problems in name
- May reference outdated deployment setup
- Should verify Vercel/Railway config

---

## 📋 Issue Templates

### Bug Report (`bug_report.yml`) ✅
**Comprehensive bug tracking**

**Features**:
- Categorization (Auth, Dashboard, Payments, Bookings, etc.)
- Severity levels (Critical, High, Medium, Low)
- Browser/device information
- Console error capture
- Steps to reproduce

**Status**: **Active & Well-Structured**

---

### Feature Request (`feature_request.yml`) ✅
**Structured feature proposals**

**Features**:
- User story format
- Business value assessment
- Technical complexity estimation
- Roadmap alignment
- Acceptance criteria

**Status**: **Active & Well-Structured**

---

### Config (`config.yml`) ✅
**Template configuration**

Provides links to:
- Documentation
- Help Centre
- Community discussions

**Status**: **Active**

---

## 🎯 Development Standards

### Testing Requirements
- **Unit Tests**: Run via `npm run test:unit:coverage`
- **Integration Tests**: Run via `npm run test:integration`
- **E2E Tests**: Run via `npm run test:e2e` (Playwright)
- **Visual Tests**: Run via `npm run test:visual` (Percy)

### Code Quality
- **Linting**: ESLint + TypeScript strict mode
- **Pre-commit**: Husky hooks enforce quality checks
- **Build**: Next.js production build must succeed

### CI Pipeline
- ✅ All linting must pass
- ✅ Production build must succeed
- ✅ No critical file changes without review
- ✅ PR template checklist must be completed

---

## 🚀 Workflow Triggers Summary

| Workflow | Push Main | Push Develop | PR Main | PR Develop | Schedule | Manual |
|----------|-----------|--------------|---------|------------|----------|--------|
| build-check | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| continuous-improvement | ✅ | ✅ | ✅ (main only) | ❌ | ❌ | ❌ |
| daily-audit | ❌ | ❌ | ❌ | ❌ | ✅ (2x daily) | ✅ |
| protection-report | ❌ | ❌ | ❌ | ❌ | ✅ (2x daily) | ✅ |
| ci (deprecated) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| deploy | ✅ (main only) | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 🛠️ Repository Secrets Required

### Deployment
- `VERCEL_TOKEN` - Vercel deployment (if using deploy.yml)
- `VERCEL_ORG_ID` - Vercel organization
- `VERCEL_PROJECT_ID` - Vercel project

### Monitoring
- `SLACK_WEBHOOK_URL` - (Optional) Slack notifications

### Environment Variables
Managed via Vercel dashboard:
- Supabase credentials
- Stripe API keys
- Google OAuth keys
- Other service credentials

---

## 📝 Pull Request Template

**Location**: `pull_request_template.md`

**Sections**:
- 🎯 Change summary
- 🔗 Related issues
- ✅ Testing checklist
- 📚 Documentation updates
- 🚀 Deployment notes

**Status**: **Active & Current**

---

## 🧹 Cleanup Recommendations

### Files to Remove:
1. **.github/workflows/ci.yml** - Deprecated, replaced by build-check.yml
2. **.github/workflows/.!67209!deploy.yml** - Backup/temp file
3. **.github/.!82359!pull_request_template.md** - Backup/temp file

### Files to Update:
1. **workflows/deploy.yml** - Fix encoding, verify current deployment setup
2. **workflows/continuous-improvement.yml** - Update Node version 18 → 22

### Files to Keep As-Is:
- ✅ build-check.yml (primary CI)
- ✅ daily-audit.yml (monitoring)
- ✅ protection-report.yml (security)
- ✅ ISSUE_TEMPLATE/* (all templates)
- ✅ pull_request_template.md

---

## 📚 Related Documentation

- **Platform Specification**: `.ai/2-PLATFORM-SPECIFICATION.md`
- **System Navigation**: `.ai/3-SYSTEM-NAVIGATION.md`
- **Testing Guide**: `tests/README.md` (if exists)
- **Deployment**: Check Vercel dashboard for current config

---

## 🔧 Local Development

### Pre-commit Testing
```bash
npm run lint              # Lint check
npm run build            # Build verification
npm run test:unit:quick  # Quick unit tests
```

### Full Test Suite
```bash
npm run test:all         # All tests (unit + integration + e2e)
npm run test:unit:coverage  # Unit tests with coverage
npm run test:e2e         # Playwright E2E tests
npm run test:visual      # Percy visual regression
```

### GitHub CLI Integration
```bash
gh pr create             # Create PR (uses template)
gh issue create --web    # Create issue (uses templates)
gh workflow run daily-audit  # Manual workflow trigger
```

---

## 📊 Current Project Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Payments**: Stripe Connect
- **Hosting**: Vercel (web app)
- **Testing**: Jest, Playwright, Percy
- **CI/CD**: GitHub Actions

**Note**: No Python backend currently exists despite references in old workflows.

---

**Version 2.0 Changes** (2026-01-23):
- ✅ Removed references to non-existent backend
- ✅ Updated workflow status and descriptions
- ✅ Added cleanup recommendations
- ✅ Updated Node version references (18 → 22)
- ✅ Clarified active vs deprecated workflows
- ✅ Added workflow trigger matrix
