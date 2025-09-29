# 🚀 Tutorwise Development Workflow

> **Efficient & Effective Feature Development Process**

This document outlines our comprehensive development workflow for building features efficiently while maintaining high code quality and catching issues before production.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Development Workflow Script](#development-workflow-script)
- [Daily Development Process](#daily-development-process)
- [Continuous Improvement Process](#continuous-improvement-process)
- [Production Deployment](#production-deployment)
- [Quality Gates](#quality-gates)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

---

## 🚀 Quick Start

### 1. **Basic Health Check**
```bash
npm run workflow:check
```
Runs: Dependencies, linting, type checking

### 2. **Full Development Workflow**
```bash
npm run workflow:full
```
Runs: Check → Test → Build → Deploy validation

### 3. **Fix Common Issues**
```bash
npm run workflow:fix-tests
```
Updates test snapshots and fixes common test issues

---

## 🛠️ Development Workflow Script

Our `scripts/dev-workflow.sh` provides comprehensive automation for the development process:

### Available Commands

| Command | Description | When to Use |
|---------|-------------|-------------|
| `check` | Quick health check (lint, types, deps) | Before starting work |
| `test` | Comprehensive testing suite | After implementing features |
| `build` | Build verification with all checks | Before committing |
| `deploy` | Validate readiness for deployment | Before pushing to main |
| `fix-tests` | Fix failing tests and update snapshots | When tests are broken |
| `clean` | Clean project and reinstall dependencies | When having dependency issues |
| `full` | Complete workflow (recommended) | Regular development cycle |

### Usage Examples

```bash
# Quick check before starting work
./scripts/dev-workflow.sh check

# Full workflow before committing
npm run workflow:full

# Fix test issues
npm run workflow:fix-tests

# Clean start after dependency changes
npm run workflow:clean
```

---

## 🔄 Daily Development Process

### **Phase 1: Pre-Development Setup**
```bash
# 1. Check project health
npm run workflow:check

# 2. Pull latest changes
git pull origin main

# 3. Create feature branch
git checkout -b feature/your-feature-name
```

### **Phase 2: Feature Development**
```bash
# 1. Make your changes
# 2. Run quick checks frequently
npm run workflow:check

# 3. Test your changes
npm run workflow:test
```

### **Phase 3: Pre-Commit Validation**
```bash
# 1. Run full workflow
npm run workflow:full

# 2. If successful, commit
git add .
git commit -m "feat: your descriptive commit message"
```

### **Phase 4: Pre-Deployment**
```bash
# 1. Validate deployment readiness
npm run workflow:deploy

# 2. Push to repository
git push origin feature/your-feature-name

# 3. Create pull request or merge to main
```

---

## 🔄 Continuous Improvement Process

> **"As part of continuous improvement process you must have a script that you would run so that we can be effective and efficient building each feature and page."**

Our continuous improvement process ensures consistent, high-quality feature development through automated workflows and comprehensive validation.

### **The Complete Development Lifecycle**

```bash
# 1. Pre-Development Setup
npm run workflow:check              # Health check before starting
git checkout -b feature/your-name   # Create feature branch

# 2. Active Development
npm run workflow:test               # Run after implementing features
npm run workflow:check              # Quick validation during development

# 3. Pre-Commit Validation
npm run workflow:full               # Complete workflow before committing
git add . && git commit -m "feat: description"

# 4. Deployment Readiness
npm run workflow:deploy             # Final validation before pushing
git push origin feature/your-name   # Deploy to production
```

### **Why This Process Works**

1. **Early Detection**: Catches issues before they reach production
2. **Consistent Quality**: Every feature follows the same high standards
3. **Automated Validation**: Reduces human error and oversight
4. **Rapid Iteration**: Quick feedback loops for faster development
5. **Production Confidence**: Multiple quality gates ensure reliability

### **Workflow Script Architecture**

Our `scripts/dev-workflow.sh` implements a comprehensive automation system:

```bash
# Core workflow stages
dev_check()    # Dependencies, linting, type checking
dev_test()     # Unit tests, coverage, integration tests
dev_build()    # Production build verification
dev_deploy()   # Deployment readiness validation
dev_full()     # Complete pipeline (check → test → build → deploy)
```

### **Integration with CI/CD**

- **Local Development**: Fast feedback with auto-fix capabilities
- **GitHub Actions**: Comprehensive validation on push/PR
- **Production**: Automated deployment pipeline
- **Quality Metrics**: Coverage tracking, security audits, performance monitoring

---

## 🚀 Production Deployment

### **Deployment Architecture**

Our application is deployed on **Vercel** with the following architecture:

- **Frontend**: Next.js 14.2.32 with Server-Side Rendering
- **Database**: Supabase PostgreSQL with Row Level Security
- **Authentication**: Supabase Auth with middleware protection
- **Edge Runtime**: Vercel Edge Functions for global performance

### **Critical Production Configurations**

#### **1. Onboarding Enforcement System**

Our onboarding system uses **strict enforcement** to ensure all users complete the required flow:

```typescript
// middleware.ts - Server-side protection
export async function middleware(request: NextRequest) {
  // Check authentication for protected routes
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL(`/login?redirect=${pathname}`, request.url))
    }

    // Check onboarding completion
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_progress')
        .eq('id', user.id)
        .single()

      const needsOnboarding = !profile?.onboarding_progress?.onboarding_completed

      if (needsOnboarding) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
    } catch (error) {
      // CRITICAL: On database error, redirect to onboarding to be safe
      // This ensures onboarding enforcement even if middleware DB calls fail
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
  }
}
```

#### **2. Protected Routes Configuration**

```typescript
const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/settings',
  '/payments',
  '/referral-activities',
  '/transaction-history',
  '/become-provider',
  '/agents',
  '/claim-rewards'
]
```

#### **3. Onboarding Flow Architecture**

- **Client-Focused Design**: "Believe. Learn. Succeed." framework
- **Benefits-Driven**: Sells the dream and outcomes, not just features
- **Personalized Experience**: Asks about learning needs and aspirations
- **Progress Persistence**: Saves state across sessions
- **Error Recovery**: Robust handling of edge cases

### **Production Monitoring**

#### **Health Checks**
```bash
# Monitor production health
curl https://www.tutorwise.io/api/health
curl https://www.tutorwise.io/dashboard  # Should redirect if not authenticated
```

#### **Common Production Issues & Fixes**

| Issue | Symptom | Fix |
|-------|---------|-----|
| Dashboard accessible without onboarding | Users can access `/dashboard` directly | Deploy middleware fix (automatic redirect) |
| Onboarding not enforcing | Old design shows up | Clear cache, verify deployment |
| Database connection errors | Users get error pages | Check Supabase connection, verify environment variables |
| Authentication failures | Users can't log in | Verify Supabase auth configuration |

### **Deployment Process**

```bash
# 1. Pre-deployment validation
npm run workflow:full

# 2. Commit changes
git add .
git commit -m "feat: description"

# 3. Deploy to production
git push origin main

# 4. Verify deployment
# Check GitHub Actions pipeline
# Monitor Vercel deployment logs
# Test critical user flows
```

### **Emergency Rollback**

```bash
# If production issues occur
git revert HEAD           # Revert last commit
git push origin main      # Deploy rollback
```

---

## 🔒 Quality Gates

Our workflow enforces multiple quality gates to catch issues early:

### **Gate 1: Code Quality**
- ✅ ESLint analysis with auto-fix
- ✅ TypeScript type checking
- ✅ Dependency vulnerability scan

### **Gate 2: Testing**
- ✅ Unit tests with coverage
- ✅ Integration tests
- ✅ Component tests

### **Gate 3: Build Verification**
- ✅ Production build success
- ✅ Bundle size optimization
- ✅ Asset generation

### **Gate 4: Deployment Readiness**
- ✅ Git status clean
- ✅ All previous gates passed
- ✅ No security vulnerabilities

---

## 🔧 Troubleshooting

### **Common Issues & Solutions**

#### ❌ **Linting Errors**
```bash
# Auto-fix most linting issues
npm run lint:fix

# Or run the full check with auto-fix
npm run workflow:check
```

#### ❌ **Type Errors**
```bash
# Check types manually
npm run typecheck

# Common fixes:
# 1. Add missing type imports
# 2. Fix type annotations
# 3. Update interface definitions
```

#### ❌ **Test Failures**
```bash
# Fix test snapshots and common issues
npm run workflow:fix-tests

# Run tests with verbose output
npm run test:unit -- --verbose
```

#### ❌ **Build Failures**
```bash
# Clean and rebuild
npm run workflow:clean

# Check build output for specific errors
npm run build
```

#### ❌ **Dependency Issues**
```bash
# Clean reinstall
npm run workflow:clean

# Update dependencies
npm update

# Audit and fix security issues
npm audit fix
```

---

## 🏆 Best Practices

### **Development Workflow**

1. **Start Each Day with Health Check**
   ```bash
   npm run workflow:check
   ```

2. **Run Tests After Each Feature**
   ```bash
   npm run workflow:test
   ```

3. **Full Validation Before Committing**
   ```bash
   npm run workflow:full
   ```

4. **Fix Issues Immediately**
   - Don't accumulate technical debt
   - Use auto-fix tools when available
   - Address warnings before they become errors

### **Code Quality Standards**

1. **TypeScript First**
   - Always type your interfaces
   - Use strict type checking
   - Avoid `any` types

2. **Testing Strategy**
   - Write tests for new features
   - Update tests when changing functionality
   - Maintain good test coverage

3. **Git Workflow**
   - Use descriptive commit messages
   - Keep commits atomic and focused
   - Run full workflow before pushing

### **Design System Standards**

#### **Client-Focused UX Principles**

When building user interfaces, especially onboarding flows, follow these principles:

1. **Sell the Dream, Not Features**
   - Focus on outcomes and benefits
   - Use aspirational language ("Believe. Learn. Succeed.")
   - Show social proof and success stories
   - Ask about aspirations, not just technical details

2. **Educational Psychology Integration**
   - **Believe**: Build confidence and self-efficacy
   - **Learn**: Personalized, relevant content
   - **Succeed**: Clear outcomes and achievement paths

3. **Modern UX Patterns**
   - Progress indicators for multi-step flows
   - Benefits-focused messaging over feature lists
   - Emotional engagement through personalized content
   - Clear calls-to-action with outcome language

#### **Technical Implementation Standards**

1. **CSS Modules Design System**
   - Use Tutorwise design tokens (colors, spacing, typography)
   - 1200px default viewport (Container component standard)
   - Responsive design with mobile-first approach
   - Consistent component patterns across the application

2. **Component Architecture**
   ```tsx
   // Example: Benefits-focused onboarding step
   <div className={styles.stepHeader}>
     <h1 className={styles.stepTitle}>
       Believe. Learn. Succeed.
     </h1>
     <p className={styles.stepSubtitle}>
       {userName}, join thousands who've discovered their potential
     </p>
   </div>
   ```

3. **State Management Best Practices**
   - Progress persistence across sessions
   - Error recovery and graceful degradation
   - Auto-retry logic for failed operations
   - Comprehensive error handling

### **Performance Optimization**

1. **Bundle Size Monitoring**
   - Check build output for size warnings
   - Optimize imports and dependencies
   - Use code splitting for large features

2. **Build Time Optimization**
   - Clean project when dependencies change
   - Use incremental builds during development
   - Monitor CI/CD pipeline performance

---

## 🤖 Automation & CI/CD

### **GitHub Actions Integration**

Our workflow is integrated with GitHub Actions for continuous integration:

- **On Push to Main**: Full workflow validation
- **On Pull Request**: Quality checks and testing
- **On Release**: Complete deployment pipeline

### **Local vs CI Environment**

| Check | Local Script | GitHub Actions |
|-------|--------------|----------------|
| Linting | ✅ Auto-fix enabled | ✅ Strict checking |
| Type Checking | ✅ Fast incremental | ✅ Full check |
| Unit Tests | ✅ Quick mode | ✅ Full coverage |
| Build | ✅ Development mode | ✅ Production mode |
| E2E Tests | ⚡ On demand | ✅ Automated |

---

## 📊 Workflow Metrics

Track your development efficiency:

- **Time to First Check**: `workflow:check` completion time
- **Test Coverage**: Maintained above 80%
- **Build Success Rate**: Target 100% on main branch
- **Deployment Frequency**: Measure time from commit to production

---

## 🆘 Need Help?

### **Quick Commands Reference**
```bash
# Health check
npm run workflow:check

# Fix tests
npm run workflow:fix-tests

# Full workflow
npm run workflow:full

# Clean start
npm run workflow:clean
```

### **Getting Support**
1. Check this documentation first
2. Run the troubleshooting commands above
3. Review error logs in `logs/` directory
4. Contact the development team

---

**Remember**: Consistent use of this workflow ensures high code quality, catches issues early, and maintains our development velocity. Make it a habit! 🎯