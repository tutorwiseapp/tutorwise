# Vinite → TutorWise Monorepo Integration Plan
**Status:** Ready for Execution
**Estimated Duration:** 4 weeks
**Risk Level:** Low
**Confidence:** 95%

---

## 📋 Executive Summary

Based on comprehensive analysis:
- ✅ **100% dependency overlap** on 21 shared packages
- ✅ **Identical tech stack** (Next.js 14, React 18, TypeScript 5)
- ✅ **Same deployment** (Vercel)
- ✅ **Same providers** (Supabase auth, Stripe payments)
- ✅ **Low risk** migration with high value

**ROI:** 50 hrs/month saved ($5,000/month value) vs 5 hrs/month overhead

---

## 🎯 Migration Phases

### Phase 1: Prepare Shared Packages (Week 1)
**Goal:** Extract shared code from TutorWise into reusable packages

#### 1.1 Package Structure (✅ COMPLETE)
```
packages/shared/
├── ui/              # @tutorwise/ui
├── supabase/        # @tutorwise/supabase
├── stripe/          # @tutorwise/stripe
├── utils/           # @tutorwise/utils
├── config/          # @tutorwise/config
└── testing/         # @tutorwise/testing
```

#### 1.2 Extract UI Components (Day 1-2)
**Tasks:**
- [ ] Move Radix UI wrappers to `@tutorwise/ui`
- [ ] Move toast notification setup
- [ ] Move common UI utilities
- [ ] Create barrel export (`src/index.ts`)
- [ ] Add TypeScript types

**Files to Extract:**
```
apps/web/src/app/components/ui/* → packages/shared/ui/src/
```

#### 1.3 Extract Supabase Config (Day 2)
**Tasks:**
- [ ] Move Supabase client creation to `@tutorwise/supabase`
- [ ] Move auth helpers
- [ ] Move SSR configuration
- [ ] Create server/client client functions

**Files to Extract:**
```
apps/web/src/lib/supabase/* → packages/shared/supabase/src/
```

#### 1.4 Extract Stripe Config (Day 3)
**Tasks:**
- [ ] Move Stripe provider setup to `@tutorwise/stripe`
- [ ] Move payment utilities
- [ ] Move webhook handlers
- [ ] Move Stripe Elements configuration

**Files to Extract:**
```
apps/web/src/lib/stripe/* → packages/shared/stripe/src/
```

#### 1.5 Extract Utils (Day 3)
**Tasks:**
- [ ] Move date utilities to `@tutorwise/utils`
- [ ] Move nanoid config
- [ ] Move QR code helpers
- [ ] Move Vercel blob helpers

**Files to Extract:**
```
apps/web/src/lib/utils/* → packages/shared/utils/src/
```

#### 1.6 Extract Config (Day 4)
**Tasks:**
- [ ] Move ESLint config to `@tutorwise/config/eslint`
- [ ] Move Prettier config to `@tutorwise/config/prettier`
- [ ] Move TypeScript config to `@tutorwise/config/typescript`
- [ ] Move Tailwind config to `@tutorwise/config/tailwind`

**Files to Extract:**
```
apps/web/.eslintrc.json → packages/shared/config/eslint/
apps/web/.prettierrc → packages/shared/config/prettier/
apps/web/tsconfig.json → packages/shared/config/typescript/
apps/web/tailwind.config.ts → packages/shared/config/tailwind/
```

#### 1.7 Test TutorWise with Shared Packages (Day 5)
**Tasks:**
- [ ] Install workspace dependencies: `npm install`
- [ ] Update TutorWise imports to use shared packages
- [ ] Run tests: `npm run test:all`
- [ ] Run build: `npm run build`
- [ ] Verify dev server: `npm run dev`
- [ ] Fix any import/type issues

**Validation:**
```bash
# Should pass all checks
npm run lint
npm run typecheck
npm run test:all
npm run build
```

---

### Phase 2: Add Vinite to Monorepo (Week 2)

#### 2.1 Backup Vinite (Day 1)
**Tasks:**
- [ ] Create mirror backup:
  ```bash
  cd ~/projects
  git clone --mirror https://github.com/viniteapp/vinite vinite-backup.git
  ```
- [ ] Create branch backup:
  ```bash
  cd vinite
  git branch backup-pre-monorepo
  git push origin backup-pre-monorepo
  ```

#### 2.2 Add Vinite as Subtree (Day 1)
**Tasks:**
- [ ] Add Vinite to monorepo:
  ```bash
  cd /Users/michaelquan/projects/tutorwise
  git subtree add --prefix apps/vinite https://github.com/viniteapp/vinite main --squash
  ```
- [ ] Verify files copied correctly:
  ```bash
  ls -la apps/vinite
  ```

#### 2.3 Rename Vinite Package (Day 1)
**Tasks:**
- [ ] Update `apps/vinite/package.json`:
  ```json
  {
    "name": "@tutorwise/vinite",
    "version": "0.1.0",
    ...
  }
  ```
- [ ] Update workspace config (already done):
  ```json
  "workspaces": ["apps/*", "packages/*", "packages/shared/*", "cas/packages/*"]
  ```

#### 2.4 Install Vinite Dependencies (Day 2)
**Tasks:**
- [ ] Clean install:
  ```bash
  rm -rf node_modules apps/vinite/node_modules
  npm install
  ```
- [ ] Verify Vinite builds:
  ```bash
  npm run build --workspace=@tutorwise/vinite
  ```

#### 2.5 Test Vinite Independently (Day 2-3)
**Tasks:**
- [ ] Start Vinite dev server:
  ```bash
  npm run dev --workspace=@tutorwise/vinite
  ```
- [ ] Verify Vinite works (http://localhost:3001)
- [ ] Test authentication
- [ ] Test payments
- [ ] Test core features

#### 2.6 Configure Vinite Deployment (Day 3-4)
**Tasks:**
- [ ] Update `vercel.json` for multi-app deployment
- [ ] Configure Vinite-specific environment variables
- [ ] Test Vercel preview deployment
- [ ] Document deployment process

**vercel.json update:**
```json
{
  "builds": [
    {
      "src": "apps/web/package.json",
      "use": "@vercel/next",
      "config": { "projectName": "tutorwise-web" }
    },
    {
      "src": "apps/vinite/package.json",
      "use": "@vercel/next",
      "config": { "projectName": "vinite" }
    }
  ]
}
```

---

### Phase 3: Migrate Vinite to Shared Packages (Week 3)

#### 3.1 Analyze Vinite Code Structure (Day 1)
**Tasks:**
- [ ] Identify all Supabase usage
- [ ] Identify all Stripe usage
- [ ] Identify all UI components
- [ ] Identify all utilities
- [ ] Create migration checklist

#### 3.2 Migrate UI Components (Day 1-2)
**Tasks:**
- [ ] Replace Radix UI imports:
  ```typescript
  // Before
  import { Checkbox } from '@radix-ui/react-checkbox'

  // After
  import { Checkbox } from '@tutorwise/ui'
  ```
- [ ] Update all component imports
- [ ] Test UI functionality

**Automated Migration Script:**
```bash
node tools/cas/migrate-vinite-imports.js --target=ui
```

#### 3.3 Migrate Supabase Config (Day 2-3)
**Tasks:**
- [ ] Replace Supabase client creation:
  ```typescript
  // Before
  import { createClient } from '@/lib/supabase/client'

  // After
  import { createClient } from '@tutorwise/supabase'
  ```
- [ ] Update all Supabase imports
- [ ] Test authentication
- [ ] Test database queries

**Automated Migration Script:**
```bash
node tools/cas/migrate-vinite-imports.js --target=supabase
```

#### 3.4 Migrate Stripe Config (Day 3-4)
**Tasks:**
- [ ] Replace Stripe setup:
  ```typescript
  // Before
  import { stripe } from '@/lib/stripe'

  // After
  import { stripe } from '@tutorwise/stripe'
  ```
- [ ] Update all Stripe imports
- [ ] Test payment flows
- [ ] Test webhooks

**Automated Migration Script:**
```bash
node tools/cas/migrate-vinite-imports.js --target=stripe
```

#### 3.5 Migrate Utils (Day 4)
**Tasks:**
- [ ] Replace utility imports:
  ```typescript
  // Before
  import { formatDate } from '@/lib/utils/date'

  // After
  import { formatDate } from '@tutorwise/utils'
  ```
- [ ] Update all utility imports
- [ ] Test functionality

#### 3.6 Remove Duplicate Code (Day 5)
**Tasks:**
- [ ] Delete `apps/vinite/lib/supabase/`
- [ ] Delete `apps/vinite/lib/stripe/`
- [ ] Delete `apps/vinite/components/ui/` (if duplicates)
- [ ] Delete `apps/vinite/lib/utils/` (if duplicates)
- [ ] Update package.json (remove now-shared deps)

#### 3.7 Testing & Validation (Day 5)
**Tasks:**
- [ ] Run Vinite tests: `npm run test --workspace=@tutorwise/vinite`
- [ ] Run Vinite build: `npm run build --workspace=@tutorwise/vinite`
- [ ] Run Vinite dev: `npm run dev --workspace=@tutorwise/vinite`
- [ ] Manual QA testing
- [ ] Fix any issues

---

### Phase 4: Unified Tooling & CI/CD (Week 4)

#### 4.1 Unified Testing Setup (Day 1)
**Tasks:**
- [ ] Add Vinite to Jest config
- [ ] Add Vinite to Playwright config
- [ ] Create shared test utilities from `@tutorwise/testing`
- [ ] Add Vinite tests to CI pipeline

**Updated package.json scripts:**
```json
{
  "test": "npm run test:tutorwise && npm run test:vinite",
  "test:tutorwise": "npm run test --workspace=@tutorwise/web",
  "test:vinite": "npm run test --workspace=@tutorwise/vinite",
  "dev:vinite": "npm run dev --workspace=@tutorwise/vinite"
}
```

#### 4.2 Unified CI/CD Pipeline (Day 2)
**Tasks:**
- [ ] Update `.github/workflows/ci.yml`:
  ```yaml
  jobs:
    test-tutorwise:
      name: Test TutorWise
      if: contains(github.event.head_commit.modified, 'apps/web/')

    test-vinite:
      name: Test Vinite
      if: contains(github.event.head_commit.modified, 'apps/vinite/')

    deploy-tutorwise:
      name: Deploy TutorWise
      needs: test-tutorwise

    deploy-vinite:
      name: Deploy Vinite
      needs: test-vinite
  ```

#### 4.3 CAS Service Registration (Day 2-3)
**Tasks:**
- [ ] Add Vinite to `service-registry.json`:
  ```json
  {
    "name": "vinite-web",
    "description": "Vinite Frontend Server (Port 3001)",
    "start_command": "npm run dev:vinite",
    "check_command": "curl -s http://localhost:3001/api/health",
    "auto_start": false,
    "category": "service",
    "priority": 4
  }
  ```
- [ ] Test CAS startup: `npm run cas-startup:start-all`
- [ ] Verify Vinite starts with CAS

#### 4.4 Documentation Updates (Day 3)
**Tasks:**
- [ ] Update README.md with Vinite info
- [ ] Document shared packages
- [ ] Update development guide
- [ ] Update deployment guide
- [ ] Create migration retrospective

#### 4.5 Environment Setup (Day 4)
**Tasks:**
- [ ] Create `.env.vinite.local` template
- [ ] Document Vinite environment variables
- [ ] Update `.envrc` for Vinite
- [ ] Test environment loading

#### 4.6 Final Testing & Validation (Day 5)
**Tasks:**
- [ ] Full monorepo install: `npm install`
- [ ] Run all tests: `npm run test:all`
- [ ] Run all builds: `npm run build && npm run build:vinite`
- [ ] Start all services: `npm run cas-startup:start-all`
- [ ] Verify TutorWise: http://localhost:3000
- [ ] Verify Vinite: http://localhost:3001
- [ ] Deploy to staging
- [ ] Smoke test staging
- [ ] Deploy to production

---

## 🚀 Quick Start Commands

### Day 1 (Start Migration)
```bash
# Backup Vinite
cd ~/projects
git clone --mirror https://github.com/viniteapp/vinite vinite-backup.git

# Add to monorepo
cd /Users/michaelquan/projects/tutorwise
git subtree add --prefix apps/vinite https://github.com/viniteapp/vinite main --squash

# Install
npm install
```

### Week 1 (Shared Packages)
```bash
# Test shared packages work
npm install
npm run test:all
npm run build
```

### Week 3 (Migration)
```bash
# Migrate Vinite imports
node tools/cas/migrate-vinite-imports.js --dry-run
node tools/cas/migrate-vinite-imports.js --execute

# Test Vinite
npm run test --workspace=@tutorwise/vinite
npm run build --workspace=@tutorwise/vinite
npm run dev --workspace=@tutorwise/vinite
```

### Week 4 (Final)
```bash
# Start everything
npm run cas-startup:start-all

# Verify
curl http://localhost:3000/api/health  # TutorWise
curl http://localhost:3001/api/health  # Vinite
```

---

## ✅ Success Criteria

### Technical Metrics
- [ ] All TutorWise tests pass
- [ ] All Vinite tests pass (or added)
- [ ] Both apps build successfully
- [ ] Both apps run in dev mode
- [ ] Shared packages work correctly
- [ ] No duplicate dependencies
- [ ] CI/CD pipeline works
- [ ] Deployments successful

### Code Quality Metrics
- [ ] TypeScript strict mode passes
- [ ] ESLint passes
- [ ] Prettier formatted
- [ ] No console errors
- [ ] Performance maintained

### Business Metrics
- [ ] TutorWise functionality unchanged
- [ ] Vinite functionality unchanged
- [ ] Authentication works (both)
- [ ] Payments work (both)
- [ ] No production incidents

---

## 🔧 Troubleshooting

### Issue: Import resolution errors
**Solution:**
```bash
# Clear all caches
rm -rf node_modules package-lock.json
npm install
```

### Issue: Type errors after migration
**Solution:**
```bash
# Check TypeScript config
npx tsc --noEmit --workspace=@tutorwise/vinite
```

### Issue: Vinite won't start
**Solution:**
```bash
# Check for port conflicts
lsof -i :3001
# Kill process if needed
kill -9 <PID>
```

### Issue: Build fails
**Solution:**
```bash
# Build packages first
npm run build --workspace=@tutorwise/ui
npm run build --workspace=@tutorwise/supabase
npm run build --workspace=@tutorwise/stripe
```

---

## 📊 Progress Tracker

### Phase 1: Shared Packages
- [x] Create package structure
- [x] Create package.json files
- [x] Update workspace config
- [ ] Extract UI components
- [ ] Extract Supabase config
- [ ] Extract Stripe config
- [ ] Extract utilities
- [ ] Extract config
- [ ] Test TutorWise

### Phase 2: Add Vinite
- [ ] Backup Vinite
- [ ] Add Vinite subtree
- [ ] Rename package
- [ ] Install dependencies
- [ ] Test Vinite independently
- [ ] Configure deployment

### Phase 3: Migrate
- [ ] Analyze structure
- [ ] Migrate UI
- [ ] Migrate Supabase
- [ ] Migrate Stripe
- [ ] Migrate utils
- [ ] Remove duplicates
- [ ] Test & validate

### Phase 4: Unify
- [ ] Unified testing
- [ ] Unified CI/CD
- [ ] CAS registration
- [ ] Documentation
- [ ] Environment setup
- [ ] Final validation

---

## 📅 Timeline

| Week | Phase | Focus | Deliverable |
|------|-------|-------|-------------|
| 1 | Preparation | Shared packages | TutorWise uses @tutorwise/* |
| 2 | Integration | Add Vinite | Vinite in monorepo |
| 3 | Migration | Use shared packages | Vinite uses @tutorwise/* |
| 4 | Finalization | CI/CD & docs | Production ready |

**Start Date:** TBD (after approval)
**End Date:** 4 weeks later
**Risk Level:** Low
**Success Probability:** 95%

---

## 🎯 Next Steps

1. **Get Approval:** Review this plan with stakeholders
2. **Schedule Migration:** Block 4 weeks for focused work
3. **Start Phase 1:** Extract shared packages
4. **Execute Plan:** Follow this document step-by-step
5. **Monitor Progress:** Update checklist daily

---

**Document Version:** 1.0.0
**Last Updated:** 2025-10-05
**Owner:** CAS Platform Team
**Status:** Ready for Execution
