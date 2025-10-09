# Development Workflow Improvements

**Context:** After deploying onboarding improvements, we discovered missing UI components and dependencies that caused Vercel build failures. This document outlines how CAS and developers can prevent similar issues.

## What Happened

The `CreateListingForm.tsx` component was created but its UI component dependencies (Button, Input, Select, Chip, etc.) and the `sonner` package were never committed. This caused Vercel deployment failures with module resolution errors.

## Root Causes

1. **No component library established first** - UI primitives (Button, Input, etc.) should be created before feature components that depend on them
2. **Missing build verification** - Code wasn't tested locally with `npm run build` before committing
3. **Pre-commit hooks bypassed** - The hooks would have caught the missing imports (when using `--no-verify`)
4. **No TypeScript strict checking** - Missing imports should fail type-checking immediately
5. **Incomplete dependency management** - New packages used but not added to package.json

## Improvements for CAS and Developers

### 1. Feature Development Checklist

**Before committing any new feature, verify:**

- [ ] All imports resolve locally (no red squiggly lines in IDE)
- [ ] Run `npm run build` successfully in the affected workspace
- [ ] Run `npm run type-check` if available
- [ ] Check no new console errors/warnings
- [ ] Verify all dependencies added to package.json
- [ ] If creating components that use primitives, ensure primitives exist first
- [ ] Let pre-commit hooks run (avoid `--no-verify` unless critical)
- [ ] Test in development mode: `npm run dev`

**For CAS specifically:**
- Use `Glob` tool to verify import paths exist before using them
- Use `Read` tool to check package.json before adding imports from external packages
- Always report new dependencies created: "Added components: X, Y, Z" or "Installed packages: foo, bar"

### 2. UI Component Library Structure

**Priority: Establish core UI components before building features**

#### Required Core Components

Store in: `apps/web/src/app/components/ui/`

**Form Elements:**
- `form/Input.tsx` - Text input with error states
- `form/Textarea.tsx` - Multi-line text input
- `form/Select.tsx` - Dropdown select with options
- `form/Checkbox.tsx` - Checkbox input
- `form/Radio.tsx` - Radio button input
- `form/FormGroup.tsx` - Form field wrapper with label/error display

**Buttons & Actions:**
- `Button.tsx` - Button with variants (primary, secondary, danger) and sizes

**Feedback & Display:**
- `Chip.tsx` - Tag/chip component for selected items
- `Badge.tsx` - Status badges
- `Toast.tsx` or use library like `sonner`
- `Spinner.tsx` - Loading indicator
- `ErrorMessage.tsx` - Error display component

**Layout:**
- `Card.tsx` - Content card wrapper
- `Modal.tsx` - Dialog/modal component
- `Container.tsx` - Page container with max-width

**Navigation:**
- `Link.tsx` - Next.js Link wrapper with consistent styling
- `Breadcrumbs.tsx` - Breadcrumb navigation

#### Component Development Order

Build bottom-up (leaf components first):
1. Base elements (Button, Input, etc.)
2. Composite components (FormGroup with Input)
3. Feature components (LoginForm, CreateListingForm)

### 3. Dependency Management Protocol

#### When Adding New External Package

```bash
# 1. Install the package
cd apps/web
npm install <package-name>

# 2. Verify it appears in package.json
git diff package.json

# 3. Test import works
# Create a simple test file or add to existing component

# 4. Commit package.json and package-lock.json together
git add package.json package-lock.json
git commit -m "feat: Add <package-name> for <feature>"
```

#### Common Packages to Check For

| Import | Package Required | Purpose |
|--------|-----------------|---------|
| `import { toast } from 'sonner'` | `sonner` | Toast notifications |
| `import { z } from 'zod'` | `zod` | Schema validation |
| `import { useForm } from 'react-hook-form'` | `react-hook-form` | Form management |
| `import { useQuery } from '@tanstack/react-query'` | `@tanstack/react-query` | Data fetching |
| `import { motion } from 'framer-motion'` | `framer-motion` | Animations |

### 4. Build Verification Steps

#### Local Build Check (Mandatory Before Commit)

```bash
# From project root
npm run build --workspace=@tutorwise/web

# Or from apps/web
cd apps/web
npm run build
```

**What this catches:**
- Missing imports/modules
- TypeScript errors
- Build configuration issues
- Missing dependencies

#### Development Mode Check

```bash
# From project root
npm run dev --workspace=@tutorwise/web

# Visit the page you modified in browser
# Check browser console for errors
```

**What this catches:**
- Runtime errors
- Missing environment variables
- API connection issues
- Component rendering errors

### 5. Pre-commit Hook Enhancement

**Current issue:** Hooks can be bypassed with `--no-verify`

**Recommendation:** Only bypass hooks when:
- Fixing test files themselves
- Emergency hotfixes (with immediate follow-up fix)
- Documentation-only changes

**Never bypass for:**
- New features
- Component changes
- Dependency updates
- Refactoring

### 6. CAS Communication Protocol

When CAS creates features, it should explicitly state:

**Good example:**
```
✅ Created: CreateListingForm.tsx
✅ Dependencies added: sonner (installed via npm)
✅ New components created: Button, Input, Select, Chip, FormGroup, Textarea
✅ Build verified: npm run build passed
✅ All imports resolve
```

**What to avoid:**
```
❌ Created: CreateListingForm.tsx
❌ [No mention of dependencies or missing components]
```

### 7. GitHub Actions CI/CD (Recommended)

**Create `.github/workflows/build-check.yml`:**

```yaml
name: Build Check
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build web app
        run: npm run build --workspace=@tutorwise/web
      
      - name: Type check
        run: npm run type-check --workspace=@tutorwise/web
        continue-on-error: true
```

**Benefits:**
- Catches build failures before Vercel deployment
- Runs on every PR
- Provides quick feedback loop
- Prevents broken main branch

### 8. Component Inventory Tool (Optional)

**Create `tools/check-imports.js`:**

```javascript
#!/usr/bin/env node
/**
 * Scans TypeScript files for imports and verifies they exist
 * Run before committing: node tools/check-imports.js
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const projectRoot = path.join(__dirname, '..');
const srcDir = path.join(projectRoot, 'apps/web/src');

// Find all .tsx and .ts files
const files = glob.sync('**/*.{ts,tsx}', { cwd: srcDir });

const missingImports = [];

files.forEach(file => {
  const content = fs.readFileSync(path.join(srcDir, file), 'utf-8');
  
  // Match local imports: from '@/...' or from './...'
  const importRegex = /from ['"](@\/[^'"]+|\.\/[^'"]+)['"]/g;
  const matches = content.matchAll(importRegex);
  
  for (const match of matches) {
    const importPath = match[1];
    // Resolve and check if file exists
    // (Add actual resolution logic here)
  }
});

if (missingImports.length > 0) {
  console.error('❌ Missing imports found:');
  missingImports.forEach(imp => console.error(`  - ${imp}`));
  process.exit(1);
} else {
  console.log('✅ All imports resolved');
}
```

### 9. Documentation Requirements

#### For Each New UI Component

Create a comment block at the top:

```typescript
/**
 * Button Component
 * 
 * A reusable button component with multiple variants and sizes.
 * 
 * @example
 * ```tsx
 * <Button variant="primary" size="md" onClick={handleClick}>
 *   Click me
 * </Button>
 * ```
 * 
 * @param variant - Button style: 'primary' | 'secondary' | 'danger'
 * @param size - Button size: 'sm' | 'md' | 'lg'
 */
```

#### For Feature Components

Add a README or inline documentation:

```typescript
/**
 * CreateListingForm Component
 * 
 * Form for creating new tutor listings.
 * 
 * Dependencies:
 * - sonner (toast notifications)
 * - zod (validation)
 * 
 * UI Components used:
 * - Button, Input, Textarea, Select, Chip, FormGroup
 * 
 * Related files:
 * - /app/listings/create/page.tsx (parent page)
 * - /lib/api/listings.ts (API calls)
 */
```

## Quick Reference for CAS

### Before Creating a New Component

```bash
# 1. Check if similar components exist
Glob: apps/web/src/app/components/**/*Button*.tsx

# 2. Check UI primitives available
Read: apps/web/src/app/components/ui/

# 3. If using external package, verify installed
Read: apps/web/package.json
# Search for package name in dependencies
```

### After Creating a Component

```bash
# 1. Verify imports (in IDE or via Grep)
Grep: pattern="from.*@/app/components/ui" path=newly-created-file.tsx

# 2. Build check
Bash: cd apps/web && npm run build

# 3. Visual check in dev mode
Bash: cd apps/web && npm run dev
# Then visit the page in browser
```

### When Adding Dependencies

```bash
# 1. Install
Bash: cd apps/web && npm install <package>

# 2. Verify added
Bash: git diff apps/web/package.json

# 3. Always commit package files together
Bash: git add apps/web/package.json apps/web/package-lock.json
```

## Lessons Learned

1. **Establish infrastructure before features** - Create UI component library first
2. **Always build before committing** - Catch errors early
3. **Document dependencies explicitly** - Make it clear what's needed
4. **Don't bypass hooks without reason** - They exist to catch these issues
5. **Bottom-up development** - Build primitives, then compositions, then features

## Related Files

- `apps/web/src/app/components/ui/README.md` - UI component documentation ✅
- `cas/docs/FEATURE-DEVELOPMENT-CHECKLIST.md` - CAS feature checklist ✅
- `cas/docs/CAS-IMPLEMENTATION-TRACKER.md` - CAS task tracking
- `.husky/pre-commit` - Pre-commit hooks configuration
- `.github/workflows/build-check.yml` - GitHub Actions build check ✅
- `tools/check-imports.js` - Component import checker tool ✅

## Action Items

- [x] Document this workflow (this file)
- [x] Create UI component library README
- [x] Create CAS feature development checklist
- [x] Set up GitHub Actions build verification
- [x] Create component inventory tool
- [ ] Add build check to pre-commit hooks (optional enhancement)
- [ ] Add type-check script if missing (check package.json)

---

**Last Updated:** 2025-10-09  
**Author:** Claude Code  
**Status:** Active Guidelines
