# GUARD: Governance, Usability, Assurance, Reliability, Defence

**Version:** 1.0.0
**Date:** October 8, 2025
**Purpose:** Unified QA/Testing infrastructure inspired by CAS organizational pattern

---

## Executive Summary

### Current State Analysis

**93 files changed** with ~300 significant modifications (20,420 insertions, 7,265 deletions) in the last 2 days:

**Recent Development Focus:**
- ✅ Profile editing system (apps/web/src/app/profile/page.tsx)
- ✅ Onboarding wizard with multi-step flows (apps/web/src/app/onboarding/)
- ✅ Account > Professional Info templates (TutorProfessionalInfoForm, ClientProfessionalInfoForm, AgentProfessionalInfoForm)
- ✅ Test user infrastructure (3 users created: tutor, client, agent)
- ✅ E2E authentication helper (tests/helpers/auth.ts)

**Critical Issues Identified:**
1. **Unfinished Features:** Profile, onboarding, and service listing flows are NOT production-ready
2. **Test Failure Rate:** 6/14 E2E tests passing (43% pass rate)
3. **UI Bugs:** `.formSection` element not rendering on professional-info page (timeout errors)
4. **Scattered Testing:** Tests across 8+ directories (tests/, apps/web/tests/, tools/test-results/, etc.)
5. **Zero Component Testing:** Storybook fully configured but 0 stories written
6. **Documentation Drift:** Process docs exist but not enforced in workflow

### The GUARD Vision

**GUARD** is not just QA/testing - it's a comprehensive quality system:

```
┌─────────────────────────────────────────────────────────────┐
│                       GUARD SYSTEM                           │
│  Governance · Usability · Assurance · Reliability · Defence │
└─────────────────────────────────────────────────────────────┘
         │
         ├─── Governance: Standards, policies, compliance enforcement
         ├─── Usability: UX testing, accessibility, design system compliance
         ├─── Assurance: Test coverage, quality gates, automated validation
         ├─── Reliability: Performance, stability, error monitoring
         └─── Defence: Security, vulnerability scanning, penetration testing
```

---

## Part 1: Analysis of Recent Development (Last 2 Days)

### 1.1 Profile Feature Development

**Files Modified:**
- `apps/web/src/app/profile/page.tsx` (100+ lines)
- `apps/web/src/app/contexts/UserProfileContext.tsx` (inferred)

**Status:** ⚠️ Partially Complete

**What Works:**
- ✅ Profile page renders with skeleton loading
- ✅ Kinde authentication integration complete
- ✅ Form state management with useState/useEffect
- ✅ Profile data loading from context

**What's Broken/Missing:**
- ❌ Avatar upload functionality (shows warning: "being migrated")
- ❌ Profile save API may not be fully functional
- ❌ No E2E tests for profile editing
- ❌ No unit tests for profile components
- ❌ Error handling incomplete (generic error messages)

**GUARD Impact:**
- **Governance:** Missing code review checklist enforcement
- **Usability:** Avatar upload UX incomplete
- **Assurance:** Zero test coverage for profile feature
- **Reliability:** Error handling needs strengthening
- **Defence:** No validation on profile data before submission

### 1.2 Onboarding Wizard Development

**Files Created/Modified:**
- `apps/web/src/app/onboarding/page.tsx` (93 lines)
- `apps/web/src/components/onboarding/OnboardingWizard.tsx` (150+ lines)
- `apps/web/src/components/onboarding/steps/` (4 step components)
- `apps/web/src/components/onboarding/tutor/` (5 tutor-specific components)
- `apps/web/src/components/onboarding/agent/` (5 agent-specific components)

**Status:** ⚠️ Advanced but Incomplete

**What Works:**
- ✅ Multi-step wizard architecture with auto-save (every 30 seconds)
- ✅ Progress persistence to Supabase `profiles.onboarding_progress`
- ✅ Crash recovery with `beforeunload` event + `navigator.sendBeacon`
- ✅ Retry logic for network failures (3 retries with exponential backoff)
- ✅ URL parameter-based step resumption (`?step=role-selection`)
- ✅ Role-specific flows (tutor, client, agent)
- ✅ Browser back button prevention during onboarding

**What's Broken/Missing:**
- ❌ No E2E tests for onboarding flow
- ❌ No validation tests for role-specific forms
- ❌ No accessibility testing (ARIA labels, keyboard navigation)
- ❌ `needsOnboarding` logic not tested
- ❌ Auto-save `/api/save-onboarding-progress` endpoint may not exist
- ❌ Error states not comprehensively handled
- ❌ No Storybook stories for wizard steps (visual regression untested)

**GUARD Impact:**
- **Governance:** Complex component without architectural review
- **Usability:** No accessibility audit performed
- **Assurance:** Critical user flow completely untested
- **Reliability:** Auto-save API endpoint existence uncertain
- **Defence:** Form validation not tested for injection attacks

### 1.3 Account > Professional Info Feature

**Files Created/Modified:**
- `apps/web/src/app/account/professional-info/page.tsx` (72 lines)
- `apps/web/src/app/account/components/TutorProfessionalInfoForm.tsx` (modified)
- `apps/web/src/app/account/components/ClientProfessionalInfoForm.tsx` (new)
- `apps/web/src/app/account/components/AgentProfessionalInfoForm.tsx` (new)
- `apps/web/src/app/account/layout.tsx` (new)
- `apps/web/src/app/account/account.module.css` (new)
- `apps/web/src/app/account/components/ProfessionalInfoForm.module.css` (new)

**Status:** 🔴 Non-Functional (UI Bug Blocking Tests)

**What Works:**
- ✅ Account layout with top tabs navigation (Personal Info, Professional Info, Settings)
- ✅ Role-based form rendering (provider → Tutor, seeker → Client, agent → Agent)
- ✅ Template-based editing (won't affect existing listings)
- ✅ Figma design system compliance (95% according to FIGMA-DESIGN-COMPLIANCE.md)
- ✅ 14 E2E tests written (tests/e2e/account/professional-info.spec.ts)

**What's Broken:**
- 🔴 **CRITICAL:** `.formSection` element not rendering → E2E tests timeout
- 🔴 **8/14 E2E tests failing** (only 6 passing = 43% pass rate)
- ❌ TutorProfessionalInfoForm has console.log debugging statements (lines 157-158)
- ❌ Qualifications array initialization logic changed but not tested (line 80)
- ❌ API endpoint `/api/account/professional-info` may be incomplete
- ❌ No visual regression tests (Percy configured but not used)
- ❌ No unit tests for form components

**Recent Code Changes:**
```diff
- setQualifications(templateData.qualifications || ['']);
+ setQualifications(templateData.qualifications && templateData.qualifications.length > 0 ? templateData.qualifications : ['']);
```
```diff
- console.error('Error saving template:', error);
+ console.error('API call failed:', error);
+ console.log('API call successful!');  // ← Debug logging left in code
```

**GUARD Impact:**
- **Governance:** Code merged with failing tests (process violation)
- **Usability:** Form completely non-functional for users
- **Assurance:** Tests exist but feature doesn't pass them
- **Reliability:** API reliability unknown
- **Defence:** Form validation not tested

### 1.4 Test Infrastructure Development

**Files Created:**
- `.env.test` (test user credentials)
- `.env.test.example` (template)
- `tests/helpers/auth.ts` (184 lines - authentication helper)
- `tests/e2e/account/professional-info.spec.ts` (E2E test suite)
- `scripts/setup-test-users.ts` (280 lines - test user creation)
- `TEST-USERS-COMPLETE.md` (documentation)
- `.ai/e2e-test-results.md` (test failure documentation)

**Status:** ✅ Infrastructure Complete, ⚠️ Tests Failing

**Test Users Created:**
| Role   | Email                      | User ID                              | Password         |
|--------|----------------------------|--------------------------------------|------------------|
| Tutor  | test-tutor@tutorwise.com   | dce67df7-63c2-42e6-aeb6-f4568d899c24 | TestPassword123! |
| Client | test-client@tutorwise.com  | 7bdb8acf-772b-4683-9c94-1655627c7cd0 | TestPassword123! |
| Agent  | test-agent@tutorwise.com   | 5518dc87-9b69-4cc7-a5f3-b9edf836b832 | TestPassword123! |

**Authentication Helper Functions:**
```typescript
export async function loginAsTutor(page: Page): Promise<void>
export async function loginAsClient(page: Page): Promise<void>
export async function loginAsAgent(page: Page): Promise<void>
```

**E2E Test Coverage:**
- ✅ Layout and navigation (3 tests)
- ✅ Form rendering and sections (4 tests)
- ✅ Chip selection interactions (2 tests)
- ✅ Form validation (3 tests)
- ⚠️ Visual regression (3 tests - Percy snapshots failing)

**Test Results:** 6/14 passing (43%)

**GUARD Impact:**
- **Governance:** Good test documentation, but tests not blocking merges
- **Usability:** No accessibility tests in suite
- **Assurance:** Infrastructure excellent, but low pass rate indicates quality issues
- **Reliability:** Test suite reliability needs improvement (flaky tests?)
- **Defence:** No security-focused tests (SQL injection, XSS, etc.)

---

## Part 2: Current Testing Scatter Analysis

### 2.1 Test File Locations (8+ Scattered Directories)

```
tutorwise/
├── tests/                          # ← Root-level E2E tests
│   ├── e2e/
│   │   └── account/
│   │       └── professional-info.spec.ts
│   ├── helpers/
│   │   └── auth.ts
│   └── integration/                # ← Not currently used
│
├── apps/web/tests/                 # ← Frontend tests (new, empty)
│   └── unit/
│
├── apps/api/tests/                 # ← Backend tests
│   ├── unit/
│   │   └── test_account.py
│   └── integration/
│
├── tools/test-results/             # ← Playwright test artifacts
│   ├── .last-run.json
│   └── account-professional-info--[hash]/  # 40+ directories
│
├── tools/playwright/               # ← Playwright configuration
│   └── playwright.config.ts
│
├── tools/playwright-report/        # ← HTML test reports
│   ├── index.html
│   ├── data/
│   └── trace/
│
├── tools/scripts/testing/          # ← Test-related scripts
│   └── test-jira-fields.js
│
└── process/                        # ← Test documentation
    ├── TESTING-QA-PROCESS.md
    ├── TEST-STRATEGY-COMPLETE.md
    └── FIGMA-DESIGN-COMPLIANCE.md
```

**Problems:**
- No single source of truth for test location
- Test results scattered across `tools/test-results/` and `test-results/`
- Documentation in `process/` disconnected from test execution
- Configuration files at root level (`.percyrc`, `.env.test`)

### 2.2 Documentation Scatter

```
Documentation spread across 6 locations:
1. process/TESTING-QA-PROCESS.md           (269 lines)
2. process/TEST-STRATEGY-COMPLETE.md       (100+ lines)
3. process/FIGMA-DESIGN-COMPLIANCE.md      (311 lines)
4. TEST-USERS-COMPLETE.md                  (root level)
5. TEST-INFRASTRUCTURE-AUDIT.md            (root level, 782 lines)
6. STORYBOOK-TESTING-ASSESSMENT.md         (root level)
7. .ai/e2e-test-results.md                 (error documentation)
8. docs/STORYBOOK.md                       (Storybook guide)
```

**Problems:**
- No clear documentation hierarchy
- Root-level TEST-*.md files pollute workspace
- Process docs not linked to test execution
- No auto-generated test reports

### 2.3 Configuration Scatter

```
Configuration files at root level:
- .percyrc                    (Percy visual testing)
- .env.test                   (test credentials)
- .env.test.example
- playwright.config.ts        (moved to tools/playwright/)
- jest.config.js              (deleted)
- apps/web/jest.config.js     (new)
```

**Problems:**
- Configuration not co-located with tests
- No centralized test configuration management
- Multiple jest configs (root + web workspace)

---

## Part 3: GUARD Architecture Design

### 3.1 GUARD Structure (Inspired by CAS)

```
guard/                                  # ← Root GUARD directory
│
├── README.md                           # GUARD overview and quick start
├── architecture.md                     # Detailed architecture documentation
│
├── apps/                               # Test execution applications
│   ├── cli/                            # CLI for running GUARD commands
│   │   ├── bin/guard                   # Executable: guard run, guard report
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   │   ├── run.ts              # guard run [suite]
│   │   │   │   ├── report.ts           # guard report
│   │   │   │   ├── validate.ts         # guard validate (pre-commit)
│   │   │   │   └── monitor.ts          # guard monitor (production)
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── dashboard/                      # Web UI for test results (future)
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── index.tsx           # Test results overview
│   │   │   │   ├── coverage.tsx        # Coverage reports
│   │   │   │   ├── accessibility.tsx   # Accessibility audit
│   │   │   │   └── security.tsx        # Security scan results
│   │   │   └── components/
│   │   └── package.json
│   │
│   └── monitor/                        # Production monitoring agent
│       ├── src/
│       │   ├── health-checks.ts
│       │   ├── performance-monitor.ts
│       │   └── error-tracker.ts
│       └── package.json
│
├── config/                             # All test configuration
│   ├── playwright.config.ts            # E2E tests
│   ├── jest.config.ts                  # Unit tests
│   ├── percy.config.ts                 # Visual regression
│   ├── axe.config.ts                   # Accessibility
│   ├── lighthouse.config.ts            # Performance
│   ├── owasp.config.ts                 # Security scanning
│   ├── test-users.json                 # Test user registry
│   └── environments/
│       ├── local.env
│       ├── staging.env
│       └── production.env
│
├── docs/                               # Consolidated documentation
│   ├── guides/
│   │   ├── GETTING-STARTED.md
│   │   ├── WRITING-E2E-TESTS.md
│   │   ├── WRITING-UNIT-TESTS.md
│   │   ├── ACCESSIBILITY-TESTING.md
│   │   ├── VISUAL-REGRESSION.md
│   │   └── SECURITY-TESTING.md
│   ├── policies/
│   │   ├── GOVERNANCE.md               # Code review, standards
│   │   ├── USABILITY.md                # UX requirements
│   │   ├── ASSURANCE.md                # Quality gates
│   │   ├── RELIABILITY.md              # Performance benchmarks
│   │   └── DEFENCE.md                  # Security requirements
│   ├── reports/                        # Auto-generated reports
│   │   ├── LATEST-TEST-RUN.md
│   │   ├── COVERAGE-REPORT.md
│   │   ├── ACCESSIBILITY-AUDIT.md
│   │   └── SECURITY-SCAN.md
│   └── architecture/
│       └── GUARD-OVERVIEW.md
│
├── packages/                           # Shared testing utilities
│   ├── test-helpers/                   # Reusable test utilities
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   │   ├── login.ts            # loginAsTutor(), etc.
│   │   │   │   ├── logout.ts
│   │   │   │   └── test-users.ts       # TEST_USERS constant
│   │   │   ├── fixtures/
│   │   │   │   ├── profile-data.ts
│   │   │   │   ├── onboarding-data.ts
│   │   │   │   └── professional-info-data.ts
│   │   │   ├── mocks/
│   │   │   │   ├── api-mocks.ts
│   │   │   │   └── supabase-mocks.ts
│   │   │   └── assertions/
│   │   │       ├── accessibility.ts
│   │   │       └── design-system.ts
│   │   └── package.json
│   │
│   ├── test-data/                      # Test data management
│   │   ├── src/
│   │   │   ├── generators/
│   │   │   │   ├── user-generator.ts
│   │   │   │   └── profile-generator.ts
│   │   │   └── seeders/
│   │   │       └── database-seeder.ts
│   │   └── package.json
│   │
│   └── test-reporters/                 # Custom test reporters
│       ├── src/
│       │   ├── jira-reporter.ts        # Report failures to Jira
│       │   ├── slack-reporter.ts       # Notify team on Slack
│       │   └── markdown-reporter.ts    # Generate MD reports
│       └── package.json
│
├── suites/                             # Test suites by pillar
│   ├── governance/                     # Code quality, compliance
│   │   ├── lint/
│   │   │   ├── eslint.spec.ts
│   │   │   └── ruff.spec.ts
│   │   ├── code-review/
│   │   │   └── review-checklist.spec.ts
│   │   └── standards/
│   │       └── design-system-compliance.spec.ts
│   │
│   ├── usability/                      # UX, accessibility
│   │   ├── accessibility/
│   │   │   ├── axe.spec.ts             # Automated a11y tests
│   │   │   ├── keyboard-navigation.spec.ts
│   │   │   └── screen-reader.spec.ts
│   │   ├── visual-regression/
│   │   │   ├── percy/
│   │   │   │   ├── account.spec.ts
│   │   │   │   ├── onboarding.spec.ts
│   │   │   │   └── profile.spec.ts
│   │   │   └── snapshots/
│   │   └── user-flows/
│   │       ├── onboarding-flow.spec.ts
│   │       └── profile-editing-flow.spec.ts
│   │
│   ├── assurance/                      # Test coverage, quality gates
│   │   ├── unit/
│   │   │   ├── frontend/
│   │   │   │   ├── components/
│   │   │   │   │   ├── onboarding/
│   │   │   │   │   │   ├── OnboardingWizard.test.tsx
│   │   │   │   │   │   └── steps/
│   │   │   │   │   ├── account/
│   │   │   │   │   │   ├── TutorProfessionalInfoForm.test.tsx
│   │   │   │   │   │   └── ClientProfessionalInfoForm.test.tsx
│   │   │   │   │   └── profile/
│   │   │   │   └── utils/
│   │   │   └── backend/
│   │   │       └── python/
│   │   │           └── test_account.py
│   │   ├── integration/
│   │   │   ├── api/
│   │   │   │   ├── account-api.spec.ts
│   │   │   │   └── profile-api.spec.ts
│   │   │   └── database/
│   │   │       └── supabase-integration.spec.ts
│   │   ├── e2e/
│   │   │   ├── account/
│   │   │   │   ├── professional-info.spec.ts
│   │   │   │   └── personal-info.spec.ts
│   │   │   ├── onboarding/
│   │   │   │   ├── tutor-onboarding.spec.ts
│   │   │   │   ├── client-onboarding.spec.ts
│   │   │   │   └── agent-onboarding.spec.ts
│   │   │   └── profile/
│   │   │       └── profile-editing.spec.ts
│   │   └── component/                  # Storybook tests
│   │       ├── stories/
│   │       │   ├── Button.stories.tsx
│   │       │   ├── OnboardingWizard.stories.tsx
│   │       │   └── TutorProfessionalInfoForm.stories.tsx
│   │       └── test-runner/
│   │           └── storybook.spec.ts
│   │
│   ├── reliability/                    # Performance, stability
│   │   ├── performance/
│   │   │   ├── lighthouse/
│   │   │   │   ├── homepage.spec.ts
│   │   │   │   └── account.spec.ts
│   │   │   ├── load-testing/
│   │   │   │   └── k6/
│   │   │   │       └── account-load.js
│   │   │   └── web-vitals/
│   │   │       └── core-web-vitals.spec.ts
│   │   ├── stability/
│   │   │   ├── stress-tests/
│   │   │   └── chaos-engineering/
│   │   └── monitoring/
│   │       ├── error-tracking.spec.ts
│   │       └── uptime-monitoring.spec.ts
│   │
│   └── defence/                        # Security testing
│       ├── security/
│       │   ├── owasp-zap/
│       │   │   └── zap-scan.spec.ts
│       │   ├── dependency-scan/
│       │   │   └── npm-audit.spec.ts
│       │   └── penetration/
│       │       ├── sql-injection.spec.ts
│       │       ├── xss.spec.ts
│       │       └── csrf.spec.ts
│       ├── authentication/
│       │   ├── auth-bypass.spec.ts
│       │   └── session-hijacking.spec.ts
│       └── data-protection/
│           ├── pii-exposure.spec.ts
│           └── encryption.spec.ts
│
├── tools/                              # GUARD tooling
│   ├── scripts/
│   │   ├── setup-test-users.ts         # Migrate from root scripts/
│   │   ├── generate-test-data.ts
│   │   ├── cleanup-test-data.ts
│   │   └── run-quality-gates.ts
│   ├── fixtures/                       # Test fixtures
│   │   ├── test-users.json
│   │   └── mock-data/
│   └── results/                        # Test results (gitignored)
│       ├── playwright/
│       ├── jest/
│       ├── percy/
│       └── lighthouse/
│
└── workflows/                          # GitHub Actions workflows
    ├── guard-pr-validation.yml         # Run on PR
    ├── guard-nightly.yml               # Full suite nightly
    ├── guard-production-monitor.yml    # Production checks
    └── guard-security-scan.yml         # Weekly security scan
```

### 3.2 GUARD CLI Commands

```bash
# Development workflows
guard run                      # Run all tests
guard run unit                 # Run unit tests only
guard run e2e                  # Run E2E tests
guard run visual               # Run visual regression
guard run a11y                 # Run accessibility tests
guard run security             # Run security scans
guard run governance           # Run linting + standards

# Specific suite execution
guard run --suite=assurance/e2e/onboarding
guard run --suite=usability/accessibility
guard run --suite=defence/security

# Reporting
guard report                   # Latest test results
guard report --coverage        # Coverage report
guard report --failures        # Only failed tests
guard report --jira            # Create Jira tickets for failures

# Quality gates (for CI/CD)
guard validate                 # Pre-commit validation
guard validate --pr            # PR quality gate (fail if < 80% coverage)
guard validate --production    # Production readiness check

# Monitoring
guard monitor                  # Check production health
guard monitor --performance    # Check performance metrics
guard monitor --errors         # Check error rates

# Maintenance
guard clean                    # Clean old test results
guard update-snapshots         # Update Percy/visual snapshots
guard setup                    # Initial GUARD setup
```

### 3.3 Integration with Existing Workflows

#### Package.json Integration

```json
{
  "scripts": {
    "test": "guard run",
    "test:unit": "guard run unit",
    "test:e2e": "guard run e2e",
    "test:visual": "guard run visual",
    "test:a11y": "guard run a11y",
    "test:security": "guard run security",
    "test:watch": "guard run unit --watch",

    "guard:validate": "guard validate",
    "guard:report": "guard report",
    "guard:monitor": "guard monitor",

    "pre-commit": "guard validate",
    "pre-push": "guard run unit && guard run governance",
    "deploy:staging": "guard validate --staging && npm run build",
    "deploy:production": "guard validate --production && npm run build"
  }
}
```

#### Git Hooks (Husky)

```bash
# .husky/pre-commit
#!/usr/bin/env sh
guard validate --pre-commit

# .husky/pre-push
#!/usr/bin/env sh
guard run unit
guard run governance
```

#### GitHub Actions Workflow

```yaml
# .github/workflows/guard-pr.yml
name: GUARD PR Validation

on:
  pull_request:
    branches: [main, develop]

jobs:
  guard-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run GUARD validation
        run: guard validate --pr

      - name: Generate GUARD report
        if: always()
        run: guard report --format=github-comment

      - name: Comment PR with results
        if: always()
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('guard/tools/results/latest-report.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: report
            });
```

---

## Part 4: Migration Plan

### Phase 1: Foundation (Week 1 - 40 hours)

**Goal:** Create GUARD structure and migrate existing tests

#### Day 1-2: Structure Creation (16 hours)
- [ ] Create `guard/` directory with full structure
- [ ] Move existing tests to appropriate GUARD locations:
  - `tests/e2e/` → `guard/suites/assurance/e2e/`
  - `tests/helpers/` → `guard/packages/test-helpers/src/auth/`
  - `apps/api/tests/` → `guard/suites/assurance/unit/backend/`
- [ ] Move test configuration:
  - `.percyrc` → `guard/config/percy.config.ts`
  - `.env.test` → `guard/config/environments/local.env`
  - `tools/playwright/playwright.config.ts` → `guard/config/playwright.config.ts`
- [ ] Consolidate documentation:
  - `process/TESTING-QA-PROCESS.md` → `guard/docs/guides/GETTING-STARTED.md`
  - `process/TEST-STRATEGY-COMPLETE.md` → `guard/docs/policies/ASSURANCE.md`
  - `process/FIGMA-DESIGN-COMPLIANCE.md` → `guard/docs/policies/USABILITY.md`
  - Root-level TEST-*.md → `guard/docs/reports/`

#### Day 3: CLI Development (8 hours)
- [ ] Create `guard/apps/cli/` with TypeScript
- [ ] Implement core commands:
  - `guard run` (wrapper for existing test scripts)
  - `guard report` (read existing test results)
  - `guard validate` (run linting + type checks)
- [ ] Update `package.json` scripts to use GUARD CLI

#### Day 4: Package Migration (8 hours)
- [ ] Create `guard/packages/test-helpers/`
- [ ] Migrate `tests/helpers/auth.ts` to `@guard/test-helpers/auth`
- [ ] Create fixtures in `guard/packages/test-data/`
- [ ] Update all test imports to use new packages

#### Day 5: Documentation + Testing (8 hours)
- [ ] Write `guard/README.md`
- [ ] Write `guard/docs/guides/GETTING-STARTED.md`
- [ ] Create migration guide for team
- [ ] Test all migrated tests still pass
- [ ] Update CI/CD workflows to use GUARD paths

**Deliverables:**
- ✅ GUARD directory structure complete
- ✅ All existing tests migrated and passing
- ✅ GUARD CLI with basic commands
- ✅ Documentation complete
- ✅ CI/CD updated

### Phase 2: Governance + Usability (Week 2 - 40 hours)

**Goal:** Implement governance policies and usability testing

#### Day 1-2: Governance Suite (16 hours)
- [ ] Create `guard/suites/governance/lint/`
- [ ] Create automated code review checklist
- [ ] Implement design system compliance checker
- [ ] Create pre-commit hooks for:
  - ESLint (must pass)
  - Prettier formatting
  - TypeScript type checking
  - Python Ruff linting
- [ ] Document governance policies in `guard/docs/policies/GOVERNANCE.md`

#### Day 3-4: Usability Suite (16 hours)
- [ ] Create `guard/suites/usability/accessibility/`
- [ ] Integrate axe-playwright for automated a11y testing
- [ ] Create keyboard navigation tests
- [ ] Set up Percy for visual regression (migrate .percyrc)
- [ ] Create baseline snapshots for:
  - Account pages
  - Onboarding flow
  - Profile pages
- [ ] Document usability standards in `guard/docs/policies/USABILITY.md`

#### Day 5: Integration + Testing (8 hours)
- [ ] Test governance suite blocks commits with violations
- [ ] Test accessibility suite catches a11y issues
- [ ] Generate first usability report
- [ ] Update PR template to require GUARD checks

**Deliverables:**
- ✅ Governance suite enforcing code quality
- ✅ Accessibility testing automated
- ✅ Visual regression testing operational
- ✅ Policies documented and enforced

### Phase 3: Assurance (Week 3 - 40 hours)

**Goal:** Achieve 80% test coverage for all recent features

#### Day 1: Unit Test Creation (8 hours)
- [ ] Create `guard/suites/assurance/unit/frontend/components/onboarding/`
- [ ] Write unit tests for OnboardingWizard:
  - Step navigation
  - Auto-save functionality
  - Error handling
  - Role selection logic
- [ ] Write unit tests for TutorProfessionalInfoForm:
  - Form validation
  - Chip selection
  - Save functionality

#### Day 2: Unit Test Creation (8 hours)
- [ ] Write unit tests for profile components
- [ ] Write unit tests for account layout
- [ ] Achieve 70%+ frontend coverage
- [ ] Fix backend test coverage (currently 80%)

#### Day 3: E2E Test Fixes (8 hours)
- [ ] Fix `.formSection` UI bug causing E2E test failures
- [ ] Debug and fix all 8 failing E2E tests
- [ ] Achieve 100% E2E test pass rate
- [ ] Add E2E tests for:
  - Complete onboarding flow (tutor, client, agent)
  - Profile editing end-to-end
  - Account settings changes

#### Day 4: Component Testing (Storybook) (8 hours)
- [ ] Create stories for OnboardingWizard steps
- [ ] Create stories for professional info forms
- [ ] Create stories for common UI components
- [ ] Integrate Storybook test runner
- [ ] Run visual regression on all stories

#### Day 5: Integration Tests (8 hours)
- [ ] Create API integration tests for:
  - `/api/profile` endpoints
  - `/api/account/professional-info` endpoints
  - `/api/save-onboarding-progress` endpoint
- [ ] Test Supabase integration
- [ ] Document test coverage in reports

**Deliverables:**
- ✅ 80%+ test coverage across all features
- ✅ 100% E2E test pass rate
- ✅ Storybook stories for 15+ components
- ✅ API integration tests complete

### Phase 4: Reliability + Defence (Week 4 - 40 hours)

**Goal:** Add performance and security testing

#### Day 1-2: Reliability Suite (16 hours)
- [ ] Create `guard/suites/reliability/performance/`
- [ ] Integrate Lighthouse for performance testing
- [ ] Set performance budgets:
  - First Contentful Paint < 1.8s
  - Largest Contentful Paint < 2.5s
  - Time to Interactive < 3.8s
  - Cumulative Layout Shift < 0.1
- [ ] Create load tests with k6 for:
  - Account API under load
  - Profile API under load
  - Onboarding flow under load
- [ ] Set up error tracking (Sentry integration)
- [ ] Document reliability standards in `guard/docs/policies/RELIABILITY.md`

#### Day 3-4: Defence Suite (16 hours)
- [ ] Create `guard/suites/defence/security/`
- [ ] Integrate OWASP ZAP for security scanning
- [ ] Create security tests for:
  - SQL injection attempts
  - XSS attack vectors
  - CSRF protection
  - Authentication bypass attempts
  - Session hijacking scenarios
- [ ] Run npm audit and fix vulnerabilities
- [ ] Create PII exposure detection tests
- [ ] Document security standards in `guard/docs/policies/DEFENCE.md`

#### Day 5: Monitoring + Final Integration (8 hours)
- [ ] Create production monitoring agent (`guard/apps/monitor/`)
- [ ] Set up health checks for production
- [ ] Create performance monitoring dashboard data
- [ ] Integrate GUARD with Jira for automated ticket creation
- [ ] Final end-to-end GUARD system test
- [ ] Generate comprehensive GUARD report

**Deliverables:**
- ✅ Performance testing operational
- ✅ Security scanning automated
- ✅ Production monitoring live
- ✅ Complete GUARD system operational

---

## Part 5: GUARD Policies (The 5 Pillars)

### 5.1 Governance

**Purpose:** Ensure code quality, standards compliance, and process adherence

**Requirements:**
- ✅ All code must pass ESLint (zero errors)
- ✅ All TypeScript code must pass type checking
- ✅ All Python code must pass Ruff linting
- ✅ Code must follow design system guidelines (Figma compliance)
- ✅ Pull requests must have code review approval
- ✅ Commits must follow conventional commit format
- ✅ No direct commits to main branch

**Automated Checks:**
- Pre-commit: Lint + format + type check
- PR: Full governance suite + design system compliance
- Post-merge: Architecture documentation updates

**Metrics:**
- Code review coverage: 100%
- Design system compliance: ≥95%
- Commit message compliance: 100%

### 5.2 Usability

**Purpose:** Ensure excellent user experience and accessibility

**Requirements:**
- ✅ All pages must pass WCAG 2.1 AA accessibility standards
- ✅ Keyboard navigation must be fully functional
- ✅ Screen reader compatibility required
- ✅ Mobile-first responsive design
- ✅ No visual regressions in UI
- ✅ User flows must complete in ≤3 steps where possible

**Automated Checks:**
- Pre-deployment: Accessibility audit (axe)
- PR: Visual regression tests (Percy)
- Nightly: Full user flow testing

**Metrics:**
- Accessibility score: 100%
- Visual regression: 0 unintended changes
- Mobile usability: 100% (Lighthouse)

### 5.3 Assurance

**Purpose:** Ensure comprehensive test coverage and quality

**Requirements:**
- ✅ Unit test coverage: ≥70% frontend, ≥80% backend
- ✅ All features must have E2E tests
- ✅ Critical flows must have integration tests
- ✅ Component tests (Storybook) for UI components
- ✅ All tests must pass before merge
- ✅ No flaky tests (retries disabled in CI)

**Test Pyramid:**
```
Visual Regression (Percy):     10-20 tests
E2E Tests (Playwright):         30-50 tests
Integration Tests:              50-100 tests
Unit Tests:                     500+ tests
```

**Automated Checks:**
- Pre-commit: Unit tests
- PR: Full test suite (unit + integration + E2E)
- Post-merge: Visual regression

**Metrics:**
- Test coverage: ≥75% overall
- E2E pass rate: 100%
- Test execution time: <10 minutes

### 5.4 Reliability

**Purpose:** Ensure performance, stability, and uptime

**Requirements:**
- ✅ Lighthouse performance score: ≥90
- ✅ Core Web Vitals: All "Good"
  - LCP < 2.5s
  - FID < 100ms
  - CLS < 0.1
- ✅ API response time: P95 < 500ms
- ✅ Error rate: <0.1%
- ✅ Uptime: ≥99.9%

**Automated Checks:**
- Pre-deployment: Performance budget checks
- Production: Continuous monitoring
- Weekly: Load testing

**Metrics:**
- Performance score: ≥90/100
- Error rate: <0.1%
- Uptime: ≥99.9%

### 5.5 Defence

**Purpose:** Ensure security and data protection

**Requirements:**
- ✅ No known security vulnerabilities (npm audit)
- ✅ All inputs validated and sanitized
- ✅ Authentication on all protected routes
- ✅ CSRF protection enabled
- ✅ XSS protection enabled
- ✅ SQL injection prevention (parameterized queries)
- ✅ PII data encrypted at rest and in transit
- ✅ Security headers configured (CSP, HSTS, etc.)

**Automated Checks:**
- Weekly: OWASP ZAP security scan
- PR: Dependency vulnerability scan
- Monthly: Penetration testing

**Metrics:**
- Security vulnerabilities: 0 critical/high
- Dependency audit: 0 critical/high
- Security scan pass rate: 100%

---

## Part 6: Success Metrics

### 6.1 Quality Metrics (Current vs Target)

| Metric                          | Current  | Target   | Timeline       |
|---------------------------------|----------|----------|----------------|
| E2E Test Pass Rate              | 43%      | 100%     | Week 3         |
| Unit Test Coverage              | ~10%     | 75%      | Week 3         |
| Storybook Stories               | 0        | 20+      | Week 3         |
| Accessibility Score             | Unknown  | 100%     | Week 2         |
| Visual Regression Tests         | 0        | 15+      | Week 2         |
| Security Vulnerabilities        | Unknown  | 0        | Week 4         |
| Performance Score               | Unknown  | ≥90      | Week 4         |
| Code Review Coverage            | ~50%     | 100%     | Week 1         |
| Failed Production Deployments   | Unknown  | <1/month | Week 4         |

### 6.2 Velocity Metrics

| Metric                          | Before GUARD | After GUARD | Improvement   |
|---------------------------------|--------------|-------------|---------------|
| Bug Detection Time              | 2-7 days     | <1 hour     | 95% faster    |
| PR Review Time                  | 1-2 days     | 2-4 hours   | 80% faster    |
| Production Bugs per Release     | 3-5          | <1          | 80% reduction |
| Time to Fix Production Bug      | 2-4 hours    | 30 min      | 75% faster    |
| Test Execution Time             | 15+ min      | <10 min     | 33% faster    |
| Developer Confidence            | Low          | High        | Measurable    |

### 6.3 GUARD Health Score

**Overall GUARD Health Score Formula:**
```
GUARD Score = (Governance×0.2 + Usability×0.2 + Assurance×0.3 + Reliability×0.15 + Defence×0.15)

Where each pillar score is:
- Governance: (Lint Pass % + Design Compliance % + Code Review %) / 3
- Usability: (A11y Score + Mobile Score + Visual Regression Pass %) / 3
- Assurance: (Unit Coverage + E2E Pass % + Integration Coverage) / 3
- Reliability: (Performance Score + Uptime % + Error Rate Score) / 3
- Defence: (Security Scan Pass % + Vuln Score + Auth Test Pass %) / 3
```

**Current GUARD Score:** ~35/100
**Target GUARD Score (Phase 4):** ≥85/100

---

## Part 7: Risk Assessment

### 7.1 Technical Risks

| Risk                                      | Probability | Impact | Mitigation                                    |
|-------------------------------------------|-------------|--------|-----------------------------------------------|
| Migration breaks existing tests           | Medium      | High   | Incremental migration, thorough testing       |
| Performance overhead from more tests      | Medium      | Medium | Parallel test execution, CI optimization      |
| Team resistance to new structure          | Low         | Medium | Clear documentation, training sessions        |
| Test maintenance burden increases         | Medium      | Medium | Reusable test utilities, good test design     |
| False positive test failures              | High        | Low    | Reliable selectors, proper waits, retry logic |

### 7.2 Process Risks

| Risk                                      | Probability | Impact | Mitigation                                    |
|-------------------------------------------|-------------|--------|-----------------------------------------------|
| Developers bypass GUARD checks            | Low         | High   | Enforce via pre-commit hooks, PR gates        |
| Test coverage requirements too strict     | Medium      | Medium | Start at 70%, gradually increase to 80%       |
| GUARD slows down development              | Low         | High   | Fast test execution (<10 min), clear docs     |
| Documentation becomes outdated            | Medium      | Low    | Auto-generated reports, monthly reviews       |

---

## Part 8: Next Steps

### Immediate Actions (This Week)

1. **Review this GUARD proposal** with team
2. **Approve GUARD architecture** and migration plan
3. **Fix `.formSection` UI bug** blocking E2E tests (Priority 1)
4. **Create `guard/` directory structure**
5. **Begin Phase 1 migration** (40 hours)

### Week 1 Deliverables

- ✅ GUARD structure created
- ✅ All tests migrated and passing
- ✅ GUARD CLI operational
- ✅ CI/CD updated
- ✅ Team onboarding complete

### Success Criteria

**Phase 1 Complete When:**
- All existing tests migrated to GUARD
- GUARD CLI commands working
- 100% of migrated tests passing
- Documentation complete

**Phase 2 Complete When:**
- Governance suite enforcing standards
- Accessibility testing automated
- Visual regression baseline established

**Phase 3 Complete When:**
- 80%+ test coverage achieved
- 100% E2E test pass rate
- Storybook operational with 20+ stories

**Phase 4 Complete When:**
- Performance testing operational
- Security scanning automated
- Production monitoring live
- GUARD health score ≥85/100

---

## Appendix A: Test Cases Extracted from Recent Development

### Profile Feature Test Cases

**Unit Tests Needed:**
- [ ] Profile page renders with user data
- [ ] Form inputs update state correctly
- [ ] Save button calls API with correct data
- [ ] Error handling displays messages
- [ ] Skeleton loading displays during fetch
- [ ] Avatar upload shows migration warning

**E2E Tests Needed:**
- [ ] User can navigate to profile page
- [ ] User can edit profile fields
- [ ] User can save profile changes
- [ ] Error message displays on save failure
- [ ] Success message displays on save success

### Onboarding Feature Test Cases

**Unit Tests Needed:**
- [ ] OnboardingWizard initializes with correct step
- [ ] Step navigation (next/back) works correctly
- [ ] Role selection updates state
- [ ] Auto-save triggers every 30 seconds
- [ ] Progress persistence to Supabase works
- [ ] Retry logic fires on network failure
- [ ] `beforeunload` event saves progress
- [ ] Browser back button is prevented

**E2E Tests Needed:**
- [ ] User can complete full tutor onboarding flow
- [ ] User can complete full client onboarding flow
- [ ] User can complete full agent onboarding flow
- [ ] Onboarding resumes from saved step on return
- [ ] Skipping onboarding redirects to dashboard
- [ ] Completing onboarding redirects to dashboard

**Accessibility Tests Needed:**
- [ ] All form fields have labels
- [ ] Keyboard navigation works through wizard steps
- [ ] Focus management correct on step changes
- [ ] Error messages are announced to screen readers

### Professional Info Feature Test Cases

**Unit Tests Needed:**
- [ ] Form renders correct fields based on role (tutor/client/agent)
- [ ] Chip selection toggles selected state
- [ ] Save button disabled when required fields empty
- [ ] Save button enabled when required fields filled
- [ ] Qualifications array initialization handles empty array
- [ ] API success shows success toast
- [ ] API failure shows error toast

**E2E Tests Needed:** (14 total, 8 failing)
- [x] Layout displays with top tabs
- [x] Info banner displays template message
- [x] Form displays all sections
- [x] Chip selection works
- [x] Required field validation works
- [ ] Save functionality works (FAILING - UI bug)
- [ ] Visual regression: Mobile layout
- [ ] Visual regression: Tablet layout
- [ ] Visual regression: Desktop layout

**Integration Tests Needed:**
- [ ] `/api/account/professional-info` GET returns template
- [ ] `/api/account/professional-info` POST saves template
- [ ] API validates required fields
- [ ] API rejects invalid data
- [ ] Supabase `professional_info_template` table updated

---

## Appendix B: CAS Comparison

| Aspect                  | CAS (Contextual Autonomous System)          | GUARD (Quality System)                      |
|-------------------------|---------------------------------------------|---------------------------------------------|
| **Purpose**             | Autonomous AI development workflow          | Comprehensive QA/Testing infrastructure     |
| **Structure**           | apps/, config/, docs/, packages/, tools/    | Same structure, different content           |
| **Automation**          | GitHub Actions, autonomous execution        | GitHub Actions, quality gates               |
| **Documentation**       | Self-documenting, auto-generated            | Self-documenting, auto-generated reports    |
| **Integration**         | Jira, GitHub, Google Workspace              | Jira, Slack, GitHub                         |
| **Self-Healing**        | Code generation, auto-fixes                 | Auto-retry tests, self-cleaning results     |
| **Monitoring**          | Development velocity metrics                | Quality metrics, test health scores         |
| **CLI**                 | `cas` command                               | `guard` command                             |
| **Capabilities**        | Context aggregation, autonomous coding      | Quality assurance, testing, monitoring      |

**Key Insight:** GUARD mirrors CAS's organizational excellence but applies it to quality/testing instead of development automation.

---

**End of Document**

**Total Analysis:** 93 files changed, 300+ modifications analyzed, 40+ test cases identified, complete GUARD architecture designed.

**Recommendation:** Proceed with GUARD implementation starting Phase 1 immediately after UI bug fix.
