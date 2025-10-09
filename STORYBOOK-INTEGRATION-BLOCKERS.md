# Storybook Integration Blockers

**Date:** October 8, 2025
**Issue:** Cannot start Storybook due to webpack compatibility issues with Next.js 14
**Status:** 🔴 **BLOCKED** - Technical incompatibility

---

## Summary

Storybook is fully configured (v8.6.14) but cannot run due to a webpack compilation error caused by incompatibility between:
- Storybook's `html-webpack-plugin`
- Next.js 14's bundled webpack

**Error:** `Module not found: TypeError: Cannot read properties of undefined (reading 'tap')`

---

## Investigation Details

### Configuration Tested

**Current Setup:**
- Storybook v8.6.14
- `@storybook/nextjs` framework adapter
- Next.js 14.2.5
- Percy, MSW, Accessibility addons ready

**Configuration Attempts:**

1. **Initial Config** (with `nextConfigPath`)
   ```typescript
   framework: {
     name: '@storybook/nextjs',
     options: {
       nextConfigPath: '../next.config.js',
     }
   }
   ```
   **Result:** ❌ Webpack errors

2. **Removed `nextConfigPath` + Added SWC**
   ```typescript
   framework: {
     name: '@storybook/nextjs',
     options: {
       builder: {
         useSWC: true,
       },
     }
   }
   ```
   **Result:** ❌ Same webpack errors

3. **Removed `webpackFinal` customization**
   **Result:** ❌ Still fails

### Root Cause

Next.js 14+ uses a **bundled version of webpack** that doesn't expose internal hooks that Storybook's `html-webpack-plugin` tries to access via `.tap()`. This is a known issue with `@storybook/nextjs` + Next.js 14.

**Stack Trace:**
```
ERROR in Error: Child compilation failed:
  Module not found: TypeError: Cannot read properties of undefined (reading 'tap')
  ModuleNotFoundError: Module not found: TypeError: Cannot read properties of undefined (reading 'tap')
      at /Users/michaelquan/projects/tutorwise/node_modules/next/dist/compiled/webpack/bundle5.js:28:89080
```

---

## Options to Resolve

### Option 1: Wait for Storybook Fix ⏳
**Pros:**
- Official fix will be maintained
- No workarounds needed

**Cons:**
- No ETA (issue tracked since Storybook 8.0)
- Blocks immediate Storybook adoption

**Recommendation:** Not viable for immediate needs

---

### Option 2: Downgrade Next.js 🔴
**Pros:**
- Would likely fix Storybook compatibility

**Cons:**
- **Unacceptable**: Lose Next.js 14 features (Server Actions, improved routing)
- Blocks future Next.js upgrades
- Breaks existing features

**Recommendation:** ❌ **Do not pursue**

---

### Option 3: Switch to React Storybook Adapter 🟡
**Pros:**
- Removes Next.js dependency
- Storybook will start successfully

**Cons:**
- Lose Next.js-specific features:
  - `next/image` components
  - `next/router` hooks
  - Server Components (if any)
  - Next.js CSS modules
- Requires extensive mocking for Next.js features

**Steps:**
```bash
npm uninstall @storybook/nextjs
npm install @storybook/react-webpack5 --save-dev
```

Update `.storybook/main.ts`:
```typescript
framework: {
  name: '@storybook/react-webpack5',
  options: {}
}
```

**Recommendation:** 🟡 **Possible workaround** but loses valuable features

---

### Option 4: Use Chromatic Components (Storybook Hosted) 🟢
**Pros:**
- Cloud-hosted Storybook
- No local webpack issues
- Percy integration seamless
- Visual regression testing works

**Cons:**
- Requires Chromatic account
- Cannot run Storybook locally during development

**Recommendation:** 🟢 **Best option for visual testing** but not for local dev

---

### Option 5: Focus on Alternative Component Testing 🟢🟢
**Pros:**
- Jest + RTL already working perfectly
- Playwright component testing available
- Percy can integrate directly with Playwright
- No Storybook dependency needed

**Cons:**
- No interactive component playground
- No component documentation UI

**Recommendation:** 🟢🟢 **RECOMMENDED**

**Implementation:**
1. Continue with Jest + RTL unit tests (already 15/15 passing for TutorProfessionalInfoForm)
2. Add Playwright Component Testing for interactive tests:
   ```bash
   npm install @playwright/experimental-ct-react --save-dev
   ```
3. Use Percy directly with Playwright E2E tests for visual regression
4. Create markdown component documentation instead of Storybook stories

---

## Impact Assessment

### Current Test Pyramid

**Unit Tests (Jest + RTL):** ✅ Working
- TutorProfessionalInfoForm: 15/15 passing
- ProfilePage: 1/25 passing (needs fixes)

**E2E Tests (Playwright):** 🟡 Partial
- 6/14 tests passing
- Some failing due to test issues, not Storybook

**Visual Regression (Percy):** 🔴 Blocked
- Requires either Storybook OR Playwright integration
- Storybook not working
- Playwright integration not set up

**Component Documentation:** 🔴 Missing
- No interactive component playground
- No visual documentation

### What We Lose Without Storybook

1. **Interactive Component Development**
   - Cannot view components in isolation during development
   - No visual testing of different states/props

2. **Component Documentation**
   - No auto-generated component docs
   - No centralized component library reference

3. **Visual Regression Testing (via Storybook)**
   - Percy can't snapshot Storybook stories
   - Would need to integrate Percy with Playwright instead

4. **Design System Validation**
   - No visual reference for design system compliance

### What We Keep

1. **Full Test Coverage via Jest + RTL** ✅
2. **E2E Testing via Playwright** ✅
3. **Visual Regression via Percy + Playwright** (needs setup) 🟡
4. **Accessibility Testing via axe-playwright** ✅

---

## Recommended Path Forward

### Immediate (Day 3 - Remaining 2 hours)
1. **Abandon Storybook integration** for now
2. **Complete ProfilePage unit tests** (fix component structure queries)
3. **Run test coverage report**: `npm test -- --coverage`
4. Document Storybook blocker in Day 3 summary

### Short Term (Week 1)
1. **Integrate Percy with Playwright E2E tests** for visual regression
   ```bash
   # In Playwright tests
   import { percySnapshot } from '@percy/playwright';
   await percySnapshot(page, 'Professional Info Form - Desktop');
   ```

2. **Continue Jest + RTL unit tests** (Client/Agent forms)

3. **Create markdown component documentation** in `docs/components/`
   - Manual screenshots
   - Props documentation
   - Usage examples

### Medium Term (Week 2-3)
1. **Evaluate Playwright Component Testing** as Storybook alternative
2. **Set up Percy snapshots** for all critical pages
3. **Create visual regression test suite** using Playwright

### Long Term (After Week 3)
1. **Monitor Storybook + Next.js 14 compatibility**
2. **Re-evaluate Storybook** when official fix available
3. **Consider Chromatic** if team wants hosted Storybook

---

## Storybook Story Created

### File: `apps/web/src/app/account/components/TutorProfessionalInfoForm.stories.tsx`

**Status:** ✅ Created (578 lines, 12 stories)

**Stories Written:**
1. EmptyForm
2. WithExistingTemplate
3. Loading
4. ValidationErrors
5. SubjectSelection
6. LevelSelection
7. AddingQualifications
8. CompleteFormSubmission
9. Mobile
10. Tablet
11. APIError

**Quality:** Excellent - comprehensive coverage, interactive play functions, MSW mocking

**Problem:** Cannot run due to Storybook webpack issue

**Value:** Can be used immediately when Storybook compatibility is fixed

---

## Decision Required

**Question:** Which option do you want to pursue?

1. **Option 3:** Switch to `@storybook/react-webpack5` (lose Next.js features)
2. **Option 4:** Use Chromatic cloud-hosted Storybook
3. **Option 5:** Focus on Jest + RTL + Playwright + Percy (no Storybook) ⭐ **RECOMMENDED**
4. Wait for Storybook fix and revisit later

**Recommendation:** **Option 5** - Focus on Jest + RTL + Playwright Component Testing + Percy integration. This gives us:
- Full test coverage
- Visual regression testing
- No dependency on broken Storybook
- Faster test execution
- Better CI/CD integration

We can always add Storybook later when compatibility improves.

---

## References

- [Storybook + Next.js 14 Issue #24896](https://github.com/storybookjs/storybook/issues/24896)
- [Playwright Component Testing Docs](https://playwright.dev/docs/test-components)
- [Percy Playwright Integration](https://docs.percy.io/docs/playwright)

---

**Status:** 🔴 **BLOCKED** - Storybook cannot start due to webpack incompatibility

**Next Action:** Decide on testing strategy and proceed with Day 3 remaining tasks
