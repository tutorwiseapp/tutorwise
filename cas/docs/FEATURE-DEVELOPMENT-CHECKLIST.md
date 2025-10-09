# CAS Feature Development Checklist

This checklist ensures that CAS creates production-ready features without missing dependencies or causing build failures.

---

## 📋 Pre-Development Phase

Before writing any code, verify:

- [ ] **Read related documentation**
  - Check `/DEVELOPMENT-WORKFLOW-IMPROVEMENTS.md`
  - Check `/apps/web/src/app/components/ui/README.md` for UI components
  - Check feature-specific docs in `/cas/docs/`

- [ ] **Understand the task requirements**
  - What is the feature/fix?
  - What files need to be modified/created?
  - What dependencies are needed?

- [ ] **Check existing implementations**
  ```bash
  # Search for similar features
  Grep: pattern="<similar-feature-name>" output_mode="files_with_matches"
  
  # Check what components exist
  Glob: apps/web/src/app/components/**/*.tsx
  ```

---

## 🏗️ Development Phase

### For New Components

- [ ] **Check if UI primitives exist first**
  ```bash
  # Before importing Button, Input, etc., verify they exist:
  Read: apps/web/src/app/components/ui/Button.tsx
  Read: apps/web/src/app/components/ui/form/Input.tsx
  ```

- [ ] **If primitives missing, create them first**
  - Follow template in `/apps/web/src/app/components/ui/README.md`
  - Build bottom-up: primitives → composite → feature components

- [ ] **Use consistent import paths**
  ```typescript
  // ✅ Correct
  import Button from '@/app/components/ui/Button';
  import Input from '@/app/components/ui/form/Input';
  
  // ❌ Wrong
  import Button from '../../../ui/Button';  // Relative paths
  import Button from '@/components/Button'; // Incorrect alias
  ```

### For External Dependencies

- [ ] **Check if package already installed**
  ```bash
  Read: apps/web/package.json
  # Search for the package name in "dependencies" or "devDependencies"
  ```

- [ ] **If not installed, install it**
  ```bash
  Bash: cd apps/web && npm install <package-name>
  ```

- [ ] **Verify installation**
  ```bash
  Bash: git diff apps/web/package.json
  # Should show the new dependency added
  ```

- [ ] **Stage package files together**
  ```bash
  Bash: git add apps/web/package.json apps/web/package-lock.json
  ```

### Common Dependencies Reference

| Import Statement | Package Required | Install Command |
|-----------------|------------------|-----------------|
| `import { toast } from 'sonner'` | `sonner` | `npm install sonner` |
| `import { z } from 'zod'` | `zod` | `npm install zod` |
| `import { useForm } from 'react-hook-form'` | `react-hook-form` | `npm install react-hook-form` |
| `import { useQuery } from '@tanstack/react-query'` | `@tanstack/react-query` | `npm install @tanstack/react-query` |
| `import { motion } from 'framer-motion'` | `framer-motion` | `npm install framer-motion` |

---

## ✅ Pre-Commit Phase

Before committing, verify ALL of these:

### 1. Import Resolution Check

- [ ] **Verify all imports resolve**
  ```bash
  # Check the file compiles without errors
  Bash: cd apps/web && npx tsc --noEmit <path-to-file>
  ```

- [ ] **No red squiggly lines in IDE** (if using VS Code integration)

### 2. Build Verification (MANDATORY)

- [ ] **Run production build**
  ```bash
  Bash: cd apps/web && npm run build
  ```
  
  **Expected output:** "Compiled successfully" or "Build completed"
  
  **If build fails:**
  - Read the error messages carefully
  - Fix missing imports/dependencies
  - Re-run build until it succeeds

### 3. Development Mode Check

- [ ] **Test in dev mode**
  ```bash
  Bash: cd apps/web && npm run dev
  # Visit the page in browser
  # Check console for errors
  ```

### 4. Type Check

- [ ] **Run TypeScript check** (if type-check script exists)
  ```bash
  Bash: cd apps/web && npm run type-check
  ```

### 5. Pre-commit Hooks

- [ ] **Let hooks run naturally** (don't use `--no-verify` unless critical)
  
  **Only use `--no-verify` when:**
  - Fixing test files themselves
  - Emergency hotfix (with immediate follow-up)
  - Documentation-only changes
  
  **Never bypass for:**
  - New features
  - Component changes
  - Dependency updates

---

## 📝 Commit Phase

### Commit Message Template

```
<type>: <short description>

<detailed description>

**Changes:**
- Created: <list of new files>
- Modified: <list of modified files>
- Dependencies added: <list of packages>
- New UI components: <list of components>

**Build verification:**
- [x] npm run build passed
- [x] npm run dev tested
- [x] All imports resolve
- [x] Pre-commit hooks passed

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Commit Types

- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code refactoring
- `docs:` - Documentation changes
- `test:` - Test changes
- `chore:` - Build/tooling changes

### Example Commit Messages

**Good:**
```
feat: Add user profile edit form with validation

Created a comprehensive profile edit form with real-time validation using react-hook-form and zod.

**Changes:**
- Created: ProfileEditForm.tsx, ProfileEditForm.module.css
- Modified: app/profile/page.tsx
- Dependencies added: react-hook-form, zod
- New UI components: None (used existing Button, Input, FormGroup)

**Build verification:**
- [x] npm run build passed
- [x] npm run dev tested
- [x] All imports resolve
- [x] Pre-commit hooks passed
```

**Bad:**
```
feat: Add profile form

Added new form.
```

---

## 🚀 Post-Commit Phase

### After Committing

- [ ] **Report what was created**
  ```
  ✅ Committed: <commit-hash>
  ✅ Created files: <list>
  ✅ Dependencies: <list>
  ✅ Build status: Passed
  ```

- [ ] **Push to remote**
  ```bash
  Bash: git push
  ```

- [ ] **Monitor Vercel deployment** (if applicable)
  - Wait for deployment to complete
  - Check for any deployment errors
  - If errors occur, investigate immediately

### If Build Fails on Vercel

1. **Read the error logs carefully**
2. **Common issues:**
   - Missing dependency in package.json
   - Import path incorrect
   - Environment variable missing
   - TypeScript error
3. **Fix locally, verify build succeeds, then push again**

---

## 🎯 Quick Reference Commands

### Check Before Creating

```bash
# Find similar components
Glob: apps/web/src/app/components/**/*<keyword>*.tsx

# Check if UI component exists
Read: apps/web/src/app/components/ui/<ComponentName>.tsx

# Check if package installed
Read: apps/web/package.json
# Search for package name
```

### Build & Verify

```bash
# Full build check (MANDATORY)
Bash: cd apps/web && npm run build

# Development mode test
Bash: cd apps/web && npm run dev

# Type check (if available)
Bash: cd apps/web && npm run type-check
```

### Install Dependencies

```bash
# Install package
Bash: cd apps/web && npm install <package-name>

# Verify added
Bash: git diff apps/web/package.json

# Stage package files
Bash: git add apps/web/package.json apps/web/package-lock.json
```

---

## ⚠️ Common Mistakes to Avoid

### ❌ DON'T:
- Skip the build check before committing
- Use `--no-verify` for feature commits
- Import non-existent components
- Forget to install npm packages
- Create feature components before primitives
- Use relative import paths (../../../)
- Commit without testing in dev mode

### ✅ DO:
- Always run `npm run build` before committing
- Verify all imports exist
- Install and commit dependencies together
- Create UI primitives first
- Use absolute imports (@/...)
- Test in browser during development
- Let pre-commit hooks run
- Document what you created

---

## 📚 Related Documentation

- `/DEVELOPMENT-WORKFLOW-IMPROVEMENTS.md` - Full workflow guide
- `/apps/web/src/app/components/ui/README.md` - UI component library
- `/cas/docs/CAS-IMPLEMENTATION-TRACKER.md` - Task tracking
- `/cas/README.md` - CAS architecture

---

## 🆘 When in Doubt

1. **Read this checklist again**
2. **Check existing similar implementations**
3. **Verify builds locally before committing**
4. **Ask the user if unclear about requirements**

Remember: It's better to ask than to create a broken build! 🚨

---

**Last Updated:** 2025-10-09  
**Status:** Active Checklist  
**For:** CAS (Continuous AI Software) Agent
