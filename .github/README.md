# Tutorwise GitHub Configuration

This directory contains GitHub-specific configuration files for the Tutorwise project, enabling automated workflows, standardized issue reporting, and streamlined development processes.

## 📁 **Files Overview**

### **🔄 Workflows (`workflows/`)**
- **`ci.yml`** - Continuous Integration pipeline
- **`deploy.yml`** - Production deployment automation

### **📋 Issue Templates (`ISSUE_TEMPLATE/`)**
- **`bug_report.yml`** - Standardized bug reporting
- **`feature_request.yml`** - Feature suggestion template
- **`config.yml`** - Issue template configuration

### **📝 Pull Request Template**
- **`pull_request_template.md`** - PR checklist and guidelines

---

## 🧪 **CI/CD Pipeline Features**

### **Continuous Integration (`ci.yml`)**
- ✅ **Frontend Testing**: Jest unit tests, React Testing Library
- ✅ **Backend Testing**: pytest with coverage reporting
- ✅ **Integration Testing**: API endpoint validation
- ✅ **E2E Testing**: Playwright cross-browser testing
- ✅ **Code Quality**: ESLint, Ruff linting
- ✅ **Build Verification**: Production build testing
- ✅ **Security Scanning**: npm audit, CodeQL analysis
- ✅ **Quality Gate**: Comprehensive validation before merge

### **Deployment Pipeline (`deploy.yml`)**
- 🚀 **Automated Deployment**: Vercel (frontend) + Railway (backend)
- 🔍 **Pre-deployment Checks**: Quality validation
- ✅ **Post-deployment Verification**: Smoke tests
- 📢 **Notifications**: Slack integration for deployment status
- ⏪ **Rollback Capability**: Emergency rollback procedures

---

## 📊 **Project Standards**

### **Testing Requirements**
- **Frontend**: 70% minimum coverage
- **Backend**: 80% minimum coverage
- **E2E**: Critical user journey coverage
- **Quality Gate**: All tests must pass before merge

### **Code Quality Standards**
- **TypeScript**: Strict mode, proper typing
- **Linting**: ESLint (frontend), Ruff (backend)
- **Security**: Automated vulnerability scanning
- **Performance**: Build optimization validation

### **Review Process**
- **Required Checks**: All CI tests must pass
- **Manual Review**: Code quality and architecture review
- **Testing**: Functional testing by reviewers
- **Documentation**: Updates must include relevant docs

---

## 🎯 **Issue Management**

### **Bug Reports** (`bug_report.yml`)
- Comprehensive bug categorization (Authentication, Dashboard, Payments, etc.)
- Severity levels (Critical, High, Medium, Low)
- Browser/device information collection
- Console error capture
- TestAssured integration references

### **Feature Requests** (`feature_request.yml`)
- User story formatting
- Business value assessment
- Technical complexity estimation
- Roadmap alignment verification
- Implementation acceptance criteria

---

## 🚀 **Workflow Triggers**

### **CI Pipeline Triggers**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Manual workflow dispatch

### **Deployment Triggers**
- Push to `main` branch (production)
- Manual deployment trigger
- Emergency rollback capability

---

## 📈 **Monitoring & Notifications**

### **CI Results**
- Automated PR comments with test results
- Coverage reports uploaded to Codecov
- Security scan results
- Build artifact preservation

### **Deployment Status**
- Slack notifications for deployment events
- Health check validation
- Rollback notifications
- Deployment URL sharing

---

## 🛠 **Local Development Integration**

### **Pre-commit Hooks** (Recommended)
```bash
npm run quality:check    # Run before committing
npm run test:all        # Full test suite
npm run test:e2e        # E2E validation
```

### **GitHub CLI Integration**
```bash
gh pr create --template  # Use PR template
gh issue create --web   # Use issue templates
```

---

## 🔧 **Configuration Secrets**

### **Required Repository Secrets**
- `VERCEL_TOKEN` - Vercel deployment token
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_PROJECT_ID` - Vercel project ID
- `RAILWAY_TOKEN` - Railway deployment token
- `SLACK_WEBHOOK_URL` - Slack notifications (optional)

### **Environment Variables**
- Supabase configuration (handled by Vercel)
- Stripe API keys (handled by Vercel)
- Neo4j credentials (handled by Railway)

---

## 📚 **Related Documentation**

- **Project Context**: `.ai/PROMPT.md`
- **E2E Testing**: `.ai/E2E_TEST_RESULTS.md`
- **Testing Guide**: `tests/README.md`
- **TestAssured Platform**: Live monitoring at `/monitoring/test-assured`

---

**🔄 This configuration ensures high-quality, tested, and reliable deployments for Tutorwise.**