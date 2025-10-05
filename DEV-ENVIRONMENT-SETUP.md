# 🚀 Tutorwise Development Quick Start

> **Get productive in 5 minutes with our automated development workflow**

## ⚡ One-Click Setup (New Developers)

```bash
# Clone the repository
git clone https://github.com/tutorwiseapp/tutorwise.git
cd tutorwise

# Run one-click setup
./scripts/setup-dev-env.sh

# Start developing
npm run dev
```

## 🔄 Daily Development Workflow

### **Before You Start Coding**
```bash
npm run workflow:check
```
✅ Checks dependencies, linting, and types

### **After Implementing Features**
```bash
npm run workflow:test
```
✅ Runs comprehensive testing suite

### **Before Committing**
```bash
npm run workflow:full
```
✅ Complete validation (check → test → build → deploy-ready)

### **If Tests Are Broken**
```bash
npm run workflow:fix-tests
```
✅ Auto-fixes common test issues

## 🛠️ Available Workflow Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `npm run workflow:check` | Quick health check | Before starting work |
| `npm run workflow:test` | Full testing | After features |
| `npm run workflow:build` | Build verification | Before committing |
| `npm run workflow:deploy` | Deployment check | Before pushing |
| `npm run workflow:full` | **Complete workflow** | **Regular development** |
| `npm run workflow:fix-tests` | Fix test issues | When tests fail |
| `npm run workflow:clean` | Clean & reinstall | Dependency problems |

## 🎯 Feature Development Process

### 1. **Start Feature**
```bash
git checkout -b feature/your-feature
npm run workflow:check
```

### 2. **Develop & Test**
```bash
# Make your changes
npm run workflow:test
```

### 3. **Pre-Commit**
```bash
npm run workflow:full
git add .
git commit -m "feat: your feature"
```

### 4. **Deploy**
```bash
git push origin feature/your-feature
# Create PR or merge to main
```

## 🔧 Common Issues & Quick Fixes

### ❌ **Linting Errors**
```bash
npm run lint:fix
```

### ❌ **Type Errors**
```bash
npm run typecheck
# Fix the reported type issues
```

### ❌ **Test Failures**
```bash
npm run workflow:fix-tests
```

### ❌ **Build Issues**
```bash
npm run workflow:clean
```

### ❌ **Can't Access Dashboard**
Your onboarding enforcement is working! Complete the onboarding flow first.

## 📊 Quality Gates

Our workflow enforces these checks:

- ✅ **ESLint** (with auto-fix)
- ✅ **TypeScript** type checking
- ✅ **Unit Tests** with coverage
- ✅ **Security Audit**
- ✅ **Build Verification**
- ✅ **Deployment Readiness**

## 🚀 Development Server

```bash
npm run dev
```
- Frontend: http://localhost:3000
- Onboarding: http://localhost:3000/onboarding

## 📚 More Information

- 📖 **Full Documentation**: [docs/DEVELOPMENT_WORKFLOW.md](docs/DEVELOPMENT_WORKFLOW.md)
- 🔧 **Troubleshooting**: Run `./scripts/dev-workflow.sh --help`
- 🤖 **CI/CD**: Automated via GitHub Actions

## 💡 Pro Tips

1. **Use aliases** (after setup):
   ```bash
   source .dev-aliases.sh
   tw-full  # Instead of npm run workflow:full
   ```

2. **Run checks frequently**:
   ```bash
   tw-check  # Quick validation
   ```

3. **Fix issues immediately**:
   ```bash
   tw-fix   # Auto-fix common problems
   ```

---

**Remember**: `npm run workflow:full` is your best friend for comprehensive validation! 🎯