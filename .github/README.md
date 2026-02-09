# Tutorwise GitHub Configuration

**Last Updated**: 2026-02-09
**Version**: 3.0

This directory contains GitHub-specific configuration files for automated workflows, issue management, and development standards.

---

## 📁 Directory Structure

```
.github/
├── workflows/                    # GitHub Actions CI/CD workflows
│   ├── ci.yml                   # ✅ CI quality checks (build, type, lint)
│   ├── tests.yml                # ✅ Comprehensive testing (unit + E2E)
│   ├── security.yml             # ✅ Security scanning (npm audit + Snyk)
│   ├── payment-security-tests.yml  # ✅ Payment-specific security tests
│   └── deploy.yml               # ✅ Deployment automation (Vercel)
├── ISSUE_TEMPLATE/              # Issue templates
│   ├── bug_report.yml          # ✅ Bug reporting template
│   ├── feature_request.yml     # ✅ Feature request template
│   └── config.yml              # ✅ Template configuration
├── pull_request_template.md    # ✅ PR checklist
└── README.md                   # This file
```

---

## 🔄 Active Workflows

### 1. **CI Quality Checks** (`ci.yml`) ✅
**Fast Quality Gates** - Runs on every push/PR (2-3 min)

**Triggers**:
- Push to `main` or `develop`
- PRs to `main` or `develop`
- Only when web app files change

**What it does**:
- ✅ Build verification (with environment variables)
- ✅ TypeScript type checking (non-blocking)
- ✅ ESLint linting (non-blocking)
- ✅ Upload build artifacts (1-day retention)

**Purpose**: "Can it build?" - Fast feedback on code quality

**Status**: **Active & Working**

---

### 2. **Tests** (`tests.yml`) ✅
**Comprehensive Testing** - Runs on every push/PR (5-15 min)

**Triggers**:
- Push to `main` or `develop`
- PRs to `main` or `develop`
- Only when code or test files change

**What it does**:
- ✅ Unit tests with coverage
- ✅ Upload coverage to Codecov (flag: `unittests`)
- ✅ E2E tests with Playwright (main branch only)
- ✅ Upload Playwright test results (30-day retention)

**Purpose**: "Does it work?" - Verify functionality

**Status**: **Active & Working**

---

### 3. **Security Scans** (`security.yml`) ✅
**Security Vulnerability Scanning** - Runs on push/PR + weekly schedule (3-5 min)

**Triggers**:
- Push to `main` or `develop`
- PRs to `main` or `develop`
- Only when dependency files change
- **Scheduled**: Weekly on Monday at 9 AM UTC

**What it does**:
- ✅ npm audit (moderate level, non-blocking)
- ✅ Snyk security scan (high severity, non-blocking)
- ✅ Comprehensive security summary

**Purpose**: "Is it safe?" - Catch vulnerabilities

**Status**: **Active & Working**

---

### 4. **Payment Security Tests** (`payment-security-tests.yml`) ✅
**Specialized Payment Testing** - Runs only on payment file changes (15 min)

**Triggers**:
- Push to `main` or `develop`
- PRs to `main` or `develop`
- **Only when payment-related files change**:
  - `apps/web/src/app/api/bookings/**`
  - `apps/web/src/app/api/stripe/**`
  - `apps/web/src/app/api/webhooks/**`
  - Payment test files

**Infrastructure**:
- 🗄️ Postgres database (Supabase image)
- 🔴 Redis (for rate limiting tests)
- 🚀 Development server

**What it does**:
- ✅ Input validation tests (amounts, durations)
- ✅ Rate limiting tests (20-30 req/hour)
- ✅ RLS (Row Level Security) policy tests
- ✅ Unified payment flow tests (Stripe consistency)
- ✅ Webhook DLQ (Dead Letter Queue) tests
- ✅ Coverage upload to Codecov (flag: `payment-security`)

**Purpose**: "Are payments secure?" - Critical payment infrastructure testing

**Status**: **Active & Specialized**

---

### 5. **Deploy** (`deploy.yml`) ✅
**Production Deployment Workflow**

**Triggers**:
- Push to `main`
- Manual dispatch

**What it does**:
- ✅ Pre-deployment quality checks (lint, build, tests)
- ✅ Deploy frontend to Vercel
- ✅ Post-deployment smoke tests (Playwright)
- ✅ Health checks and deployment summary

**Status**: **Active & Updated**
- Using Node 18.x
- Vercel-only deployment
- Backend: Supabase (cloud-hosted)

---

## 🎯 Workflow Strategy

### **Strategic Split** (Implemented 2026-02-09)

Our workflows follow industry best practices with clear separation of concerns:

| Workflow | Purpose | Speed | When to Use |
|----------|---------|-------|-------------|
| **ci.yml** | Quality gates | ⚡ 2-3 min | Every code change |
| **tests.yml** | Functionality | 🧪 5-15 min | Every code change |
| **security.yml** | Vulnerabilities | 🔒 3-5 min | Dependencies + weekly |
| **payment-tests.yml** | Payment security | 💳 15 min | Payment code only |
| **deploy.yml** | Production | 🚀 Varies | Main branch |

### **Benefits**:
- ✅ **Parallel execution** - Workflows run simultaneously
- ✅ **Clear failures** - Know immediately what failed
- ✅ **Cost efficient** - Path triggers save GitHub Actions minutes
- ✅ **Easy maintenance** - Single responsibility per workflow

---

## 🚀 Workflow Triggers Summary

| Workflow | Push Main | Push Develop | PR Main | PR Develop | Schedule | Manual |
|----------|-----------|--------------|---------|------------|----------|--------|
| **ci.yml** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **tests.yml** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **security.yml** | ✅ | ✅ | ✅ | ✅ | ✅ (Weekly) | ❌ |
| **payment-tests.yml** | ✅* | ✅* | ✅* | ✅* | ❌ | ❌ |
| **deploy.yml** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |

\* *Only when payment-related files change*

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
- **Coverage**: Tracked via Codecov with multiple flags

### CI Pipeline Requirements
- ✅ Build must succeed (blocking)
- ✅ Unit tests must pass (blocking)
- ⚠️ Type checking (non-blocking, informational)
- ⚠️ Linting (non-blocking, informational)
- ⚠️ Security scans (non-blocking, informational)

---

## 🛠️ Repository Secrets Required

### Deployment
- `VERCEL_TOKEN` - Vercel deployment token
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_PROJECT_ID` - Vercel project ID

### Build Environment
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `UPSTASH_REDIS_REST_URL` - Upstash Redis URL
- `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis token

### Security Scanning
- `SNYK_TOKEN` - Snyk security scanning token (optional)

### Testing
- `SUPABASE_TEST_URL` - Test database URL (optional)
- `SUPABASE_TEST_ANON_KEY` - Test database anon key (optional)
- `SUPABASE_TEST_SERVICE_KEY` - Test database service key (optional)
- `STRIPE_TEST_SECRET_KEY` - Stripe test mode key (optional)

### Monitoring
- `SENTRY_DSN` - Error tracking (optional)

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

## 🧹 Cleanup History

### ✅ Version 3.0 Changes (2026-02-09):
**Strategic Workflow Reorganization**
1. **Removed obsolete workflows**:
   - ❌ `continuous-improvement.yml` (redundant, missing scripts)
   - ❌ `daily-audit.yml` (no longer required)
   - ❌ `protection-report.yml` (no longer required)
   - ❌ `build-check.yml` (replaced by ci.yml)

2. **Created focused workflows**:
   - ✅ `ci.yml` - Fast quality gates
   - ✅ `tests.yml` - Comprehensive testing
   - ✅ `security.yml` - Security scanning with weekly schedule

3. **Updated existing workflows**:
   - ✅ `payment-security-tests.yml` - Removed duplicate security scans
   - ✅ `deploy.yml` - Removed Slack notifications

4. **Removed unused integrations**:
   - ❌ Slack webhook references (not integrated)

### ✅ Version 2.0 Changes (2026-01-23):
- Updated Node version references (18 → 22)
- Removed TestAssured references
- Updated bug report categories
- Clarified active vs deprecated workflows

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
npm run test:all              # All tests (unit + integration + e2e)
npm run test:unit:coverage    # Unit tests with coverage
npm run test:e2e              # Playwright E2E tests
npm run test:visual           # Percy visual regression
```

### GitHub CLI Integration
```bash
gh pr create              # Create PR (uses template)
gh issue create --web     # Create issue (uses templates)
gh workflow run deploy    # Manual deployment trigger
```

---

## 📊 Current Project Stack

- **Frontend**: Next.js 16, React 19, TypeScript 5
- **Backend API**: Python 3.x (FastAPI/Uvicorn)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Payments**: Stripe Connect
- **Realtime**: Ably
- **Hosting**: Vercel (web app)
- **Node**: 18.x (workflows), 20.x (payment tests)
- **Testing**: Jest 30, Playwright 1.55, Percy
- **CI/CD**: GitHub Actions (5 workflows)
- **Coverage**: Codecov (multiple flags)
- **Security**: npm audit + Snyk
- **AI Integration**: Google Gemini, OpenAI, Anthropic Claude

---

## 📚 Related Documentation

- **Platform Specification**: `.ai/2-PLATFORM-SPECIFICATION.md`
- **System Navigation**: `.ai/3-SYSTEM-NAVIGATION.md`
- **Testing Guide**: `tests/README.md`
- **Deployment**: Check Vercel dashboard for current config

---

**Version 3.0** - Strategic workflow split for clarity, efficiency, and industry best practices.
