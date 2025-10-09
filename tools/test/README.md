# GUARD: Governance, Usability, Assurance, Reliability, Defence

**Version:** 1.0.0
**Status:** Active Development
**Last Updated:** October 8, 2025

---

## 🛡️ What is GUARD?

GUARD is TutorWise's unified quality assurance system that ensures excellence across all aspects of software delivery. It's not just testing - it's a comprehensive quality framework.

```
┌─────────────────────────────────────────────────────────────┐
│                       GUARD SYSTEM                           │
│  Governance · Usability · Assurance · Reliability · Defence │
└─────────────────────────────────────────────────────────────┘
```

### The 5 Pillars

| Pillar | Purpose | Key Metrics |
|--------|---------|-------------|
| **Governance** | Code quality, standards compliance | Lint pass rate: 100%, Design compliance: ≥95% |
| **Usability** | UX excellence, accessibility | WCAG 2.1 AA: 100%, Mobile usability: 100% |
| **Assurance** | Comprehensive test coverage | Coverage: ≥75%, E2E pass rate: 100% |
| **Reliability** | Performance, stability, uptime | Performance: ≥90/100, Uptime: ≥99.9% |
| **Defence** | Security, data protection | Security vulns: 0 critical/high |

---

## 🚀 Quick Start

### Run Tests

```bash
# Run all GUARD tests
npm run test

# Run specific test suites
npm run test:unit          # Unit tests
npm run test:e2e           # End-to-end tests
npm run test:visual        # Visual regression
npm run test:a11y          # Accessibility tests
npm run test:security      # Security scans

# Run by pillar
guard run governance       # Lint, code review, standards
guard run usability        # Accessibility, visual regression
guard run assurance        # All test types
guard run reliability      # Performance, load tests
guard run defence          # Security scans
```

### Quality Gates

```bash
# Pre-commit validation
guard validate

# PR validation
guard validate --pr

# Production readiness
guard validate --production
```

### Generate Reports

```bash
# Latest test results
guard report

# Specific reports
guard report --coverage
guard report --failures
guard report --security
```

---

## 📁 Directory Structure

```
guard/
├── apps/                   # Test execution applications
│   ├── cli/                # GUARD CLI (guard command)
│   ├── dashboard/          # Web UI for test results
│   └── monitor/            # Production monitoring agent
│
├── config/                 # All test configuration
│   ├── playwright.config.ts
│   ├── jest.config.ts
│   ├── percy.config.ts
│   ├── axe.config.ts
│   └── environments/
│
├── docs/                   # Consolidated documentation
│   ├── guides/             # How-to guides
│   ├── policies/           # Quality policies
│   ├── reports/            # Auto-generated reports
│   └── architecture/       # GUARD architecture docs
│
├── packages/               # Shared testing utilities
│   ├── test-helpers/       # Reusable test utilities
│   ├── test-data/          # Test data management
│   └── test-reporters/     # Custom reporters
│
├── suites/                 # Test suites by pillar
│   ├── governance/         # Code quality, compliance
│   ├── usability/          # UX, accessibility
│   ├── assurance/          # Test coverage
│   ├── reliability/        # Performance, stability
│   └── defence/            # Security testing
│
├── tools/                  # GUARD tooling
│   ├── scripts/            # Helper scripts
│   ├── fixtures/           # Test fixtures
│   └── results/            # Test results (gitignored)
│
└── workflows/              # GitHub Actions workflows
```

---

## 🎯 GUARD Health Score

**Current Score:** 35/100
**Target Score:** 85/100

### Score Breakdown

| Pillar | Weight | Current | Target |
|--------|--------|---------|--------|
| Governance | 20% | 50/100 | 95/100 |
| Usability | 20% | 20/100 | 90/100 |
| Assurance | 30% | 30/100 | 85/100 |
| Reliability | 15% | 25/100 | 85/100 |
| Defence | 15% | 20/100 | 90/100 |

---

## 📊 Key Metrics

### Test Coverage

| Type | Current | Target | Status |
|------|---------|--------|--------|
| Unit Tests | ~10% | 75% | 🔴 |
| E2E Tests | 43% pass | 100% pass | 🟡 |
| Component Tests | 0 stories | 20+ stories | 🔴 |
| Visual Regression | 0 tests | 15+ tests | 🔴 |
| Accessibility | Unknown | 100% | 🔴 |
| Security | Unknown | 0 vulns | 🔴 |

### Quality Gates

✅ **Passing:**
- Backend unit tests (80% coverage)
- Test user infrastructure
- Authentication helpers

⚠️ **Needs Improvement:**
- Frontend test coverage (10%)
- E2E test pass rate (43%)
- Storybook stories (0)

🔴 **Critical:**
- Professional info E2E tests (8/14 failing)
- Visual regression not configured
- Security scanning not implemented

---

## 🏗️ Implementation Status

### Phase 1: Foundation ✅ (Current)
- [x] GUARD directory structure created
- [x] Test infrastructure migrated
- [ ] GUARD CLI operational
- [ ] Documentation consolidated
- [ ] CI/CD updated

### Phase 2: Governance + Usability (Week 2)
- [ ] Governance suite enforcing standards
- [ ] Accessibility testing automated
- [ ] Visual regression baseline established

### Phase 3: Assurance (Week 3)
- [ ] 80%+ test coverage achieved
- [ ] 100% E2E test pass rate
- [ ] Storybook operational with 20+ stories

### Phase 4: Reliability + Defence (Week 4)
- [ ] Performance testing operational
- [ ] Security scanning automated
- [ ] Production monitoring live
- [ ] GUARD health score ≥85/100

---

## 📚 Documentation

- **[Getting Started](docs/guides/GETTING-STARTED.md)** - How to use GUARD
- **[Writing E2E Tests](docs/guides/WRITING-E2E-TESTS.md)** - E2E test guide
- **[Accessibility Testing](docs/guides/ACCESSIBILITY-TESTING.md)** - A11y testing
- **[GUARD Architecture](docs/architecture/GUARD-OVERVIEW.md)** - System design
- **[Governance Policy](docs/policies/GOVERNANCE.md)** - Code quality standards
- **[Usability Policy](docs/policies/USABILITY.md)** - UX requirements
- **[Assurance Policy](docs/policies/ASSURANCE.md)** - Test requirements
- **[Reliability Policy](docs/policies/RELIABILITY.md)** - Performance standards
- **[Defence Policy](docs/policies/DEFENCE.md)** - Security requirements

---

## 🔗 Integration

### Package.json Scripts

All GUARD functionality is accessible via npm scripts:

```json
{
  "scripts": {
    "test": "guard run",
    "test:unit": "guard run unit",
    "test:e2e": "guard run e2e",
    "test:visual": "guard run visual",
    "test:a11y": "guard run a11y",
    "test:security": "guard run security",
    "guard:validate": "guard validate",
    "guard:report": "guard report"
  }
}
```

### Git Hooks

GUARD enforces quality via git hooks:

```bash
# Pre-commit: Lint + type check
# Pre-push: Unit tests + governance checks
# Pre-PR: Full test suite
```

### GitHub Actions

Automated quality gates run on:
- Pull requests (full validation)
- Main branch pushes (regression tests)
- Nightly (full test suite + performance)
- Weekly (security scans)

---

## 🤝 Contributing

### Before You Commit

1. Run `guard validate` to check your changes
2. Ensure all tests pass: `npm test`
3. Fix any linting errors: `npm run lint:fix`
4. Update tests for new features

### Quality Standards

- **Unit Tests:** ≥70% coverage for new code
- **E2E Tests:** Required for all user-facing features
- **Accessibility:** WCAG 2.1 AA compliance
- **Performance:** Lighthouse score ≥90
- **Security:** No critical/high vulnerabilities

---

## 📞 Support

- **Documentation:** [docs/](docs/)
- **Issues:** Create a Jira ticket with label `GUARD`
- **Questions:** Ask in #engineering Slack channel

---

**Last Test Run:** October 8, 2025
**Next Scheduled Run:** Nightly at 2:00 AM UTC
**GUARD Health Score:** 35/100 → Target: 85/100
