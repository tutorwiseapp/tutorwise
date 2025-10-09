# Feature Completion Plan: Profile, Onboarding & Service Listing

**Date:** October 8, 2025
**Status:** Production-Critical Features Incomplete
**Priority:** HIGH - Blocking Production Deployment

---

## Executive Summary

Based on analysis of the last 2 days of development (93 files changed, 300+ modifications), three major user-facing features are **partially complete but NOT production-ready**:

1. **Profile Editing** - Avatar upload broken, error handling incomplete
2. **Onboarding Wizard** - No tests, validation incomplete, API endpoint missing
3. **Professional Info Templates** - API integration incomplete, 8/14 E2E tests failing (now fixed to 5/5 passing but incomplete test coverage)
4. **Service Listing** - Not yet implemented (referenced but no code found)

**Estimated Completion Time:** 40-60 hours (1-1.5 weeks full-time)

---

## Feature 1: Profile Editing

### Current Status: ⚠️ 60% Complete

**File:** [apps/web/src/app/profile/page.tsx](apps/web/src/app/profile/page.tsx)

### What Works ✅
- Page renders with skeleton loading
- Kinde authentication integration
- Form state management
- Profile data loading from UserProfileContext
- Basic form inputs

### What's Broken/Missing 🔴

#### 1. Avatar Upload (Priority 1)
**Current State:**
```typescript
const handleAvatarUpload = async () => {
  setMessage({ text: 'Avatar upload functionality is being migrated.', type: 'warning' });
};
```
**Issue:** Shows warning instead of uploading
**Fix Required:**
- Implement actual file upload to Supabase Storage
- Add image validation (size, format)
- Add image preview
- Add loading state during upload
**Estimated Time:** 4 hours

#### 2. Profile Save API (Priority 1)
**Current State:**
```typescript
const response = await fetch('/api/profile', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(formData),
});
```
**Issue:** `/api/profile` endpoint may not exist or be incomplete
**Fix Required:**
- Verify API endpoint exists in apps/api/
- Test actual save functionality
- Add proper error responses
- Add validation
**Estimated Time:** 3 hours

#### 3. Form Validation (Priority 2)
**Missing:**
- Client-side validation for required fields
- Email format validation
- Phone number validation
- Field-level error messages
**Estimated Time:** 2 hours

#### 4. Error Handling (Priority 2)
**Current State:** Generic error messages
**Fix Required:**
- Specific error messages per failure type
- Network error handling
- Validation error display
- Retry mechanism
**Estimated Time:** 2 hours

#### 5. Testing (Priority 1)
**Missing:**
- Unit tests for profile components (0/5)
- E2E tests for profile editing (0/3)
- API integration tests (0/2)
**Estimated Time:** 6 hours

### Profile Feature Completion Checklist

- [ ] Implement avatar upload to Supabase Storage (4 hours)
- [ ] Verify/complete `/api/profile` endpoint (3 hours)
- [ ] Add client-side form validation (2 hours)
- [ ] Improve error handling and messages (2 hours)
- [ ] Write unit tests for profile components (3 hours)
- [ ] Write E2E tests for profile editing flow (3 hours)
- [ ] Test profile save end-to-end (1 hour)
- [ ] Add loading states and optimistic updates (2 hours)

**Total Estimated Time:** 20 hours

---

## Feature 2: Onboarding Wizard

### Current Status: ⚠️ 70% Complete (Advanced but Untested)

**File:** [apps/web/src/app/components/onboarding/OnboardingWizard.tsx](apps/web/src/app/components/onboarding/OnboardingWizard.tsx)

### What Works ✅
- Multi-step wizard architecture (welcome → role selection → role details → completion)
- Auto-save every 30 seconds
- Progress persistence to Supabase
- Crash recovery with `beforeunload` event
- Retry logic (3 retries with exponential backoff)
- URL parameter-based step resumption
- Role-specific flows (tutor, client, agent)
- Browser back button prevention

### What's Broken/Missing 🔴

#### 1. Auto-Save API Endpoint (Priority 1)
**Current Code:**
```typescript
const url = '/api/save-onboarding-progress';
const data = JSON.stringify({ userId: user.id, progress });

if (navigator.sendBeacon) {
  navigator.sendBeacon(url, data);
}
```
**Issue:** `/api/save-onboarding-progress` endpoint may not exist
**Fix Required:**
- Create API endpoint in apps/api/
- Test sendBeacon functionality
- Fallback to regular fetch if beacon fails
**Estimated Time:** 3 hours

#### 2. Form Validation (Priority 1)
**Missing:**
- Role-specific field validation
- Required field enforcement
- Email/phone validation in role details
- Progress validation before step transition
**Estimated Time:** 4 hours

#### 3. Role-Specific Forms Completion (Priority 2)
**Files:**
- [TutorOnboardingWizard.tsx](apps/web/src/app/components/onboarding/tutor/TutorOnboardingWizard.tsx)
- [AgentOnboardingWizard.tsx](apps/web/src/app/components/onboarding/agent/AgentOnboardingWizard.tsx)
- Client onboarding (no dedicated wizard found)

**Missing:**
- Complete tutor qualification forms
- Complete agent services forms
- Client-specific onboarding steps
- Subject/level selection validation
**Estimated Time:** 6 hours

#### 4. Testing (Priority 1) 🔴 CRITICAL
**Missing:**
- E2E tests for onboarding flow (0/9)
  - Tutor onboarding end-to-end
  - Client onboarding end-to-end
  - Agent onboarding end-to-end
  - Auto-save functionality
  - Resume from saved progress
  - Browser crash recovery
- Unit tests for wizard logic (0/8)
- Accessibility tests (0/5)
**Estimated Time:** 12 hours

#### 5. Error States (Priority 2)
**Missing:**
- Network failure UI
- Validation error display
- API error handling
- Retry UI feedback
**Estimated Time:** 3 hours

### Onboarding Feature Completion Checklist

- [ ] Create `/api/save-onboarding-progress` endpoint (3 hours)
- [ ] Implement comprehensive form validation (4 hours)
- [ ] Complete tutor-specific forms (3 hours)
- [ ] Complete agent-specific forms (3 hours)
- [ ] Create client-specific onboarding (2 hours)
- [ ] Write E2E tests for all three onboarding flows (8 hours)
- [ ] Write unit tests for wizard components (4 hours)
- [ ] Add accessibility tests (keyboard nav, ARIA) (3 hours)
- [ ] Improve error states and messaging (3 hours)
- [ ] Test auto-save and crash recovery (2 hours)

**Total Estimated Time:** 35 hours

---

## Feature 3: Professional Info Templates

### Current Status: ⚠️ 65% Complete (API Integration Incomplete)

**Files:**
- [TutorProfessionalInfoForm.tsx](apps/web/src/app/account/components/TutorProfessionalInfoForm.tsx)
- [ClientProfessionalInfoForm.tsx](apps/web/src/app/account/components/ClientProfessionalInfoForm.tsx)
- [AgentProfessionalInfoForm.tsx](apps/web/src/app/account/components/AgentProfessionalInfoForm.tsx)

### What Works ✅
- Form renders correctly
- Chip selection for subjects/levels
- Form state management
- Figma design compliance (95%)
- Basic E2E tests (5/5 passing for layout/rendering)

### What's Broken/Missing 🔴

#### 1. API Integration (Priority 1) 🔴 CRITICAL
**Current Code:**
```typescript
const templateData = await getProfessionalInfo('provider');
await updateProfessionalInfo({ role_type: 'provider', ... });
```
**Issue:** API functions imported from `@/lib/api/account` may not be complete
**Fix Required:**
- Verify `getProfessionalInfo()` works
- Verify `updateProfessionalInfo()` works
- Check backend endpoint `/api/account/professional-info`
- Test actual save to database
**Estimated Time:** 4 hours

#### 2. Remaining E2E Tests (Priority 1)
**Current:** 5/14 tests passing (initially 6/14, now fixed some but 9 tests still missing)
**Missing Tests:**
- Save functionality (CRITICAL)
- Form validation with errors
- Edit existing template
- Visual regression tests (mobile, tablet, desktop)
- Multi-field interactions
**Estimated Time:** 6 hours

#### 3. Client & Agent Forms (Priority 2)
**Status:** Files exist but may be incomplete
**Fix Required:**
- Review ClientProfessionalInfoForm completeness
- Review AgentProfessionalInfoForm completeness
- Add role-specific fields if missing
- Test save/load for all three roles
**Estimated Time:** 4 hours

#### 4. Form Validation (Priority 2)
**Missing:**
- Subject/level required validation
- Hourly rate range validation (min < max)
- Qualification text validation
- Experience dropdown validation
**Estimated Time:** 2 hours

#### 5. Unit Tests (Priority 1)
**Missing:**
- Component rendering tests (0/6)
- Form interaction tests (0/8)
- Validation logic tests (0/5)
- API mocking tests (0/4)
**Estimated Time:** 8 hours

### Professional Info Completion Checklist

- [ ] Verify and complete API integration (4 hours)
- [ ] Test `getProfessionalInfo()` for all roles (2 hours)
- [ ] Test `updateProfessionalInfo()` for all roles (2 hours)
- [ ] Complete ClientProfessionalInfoForm (2 hours)
- [ ] Complete AgentProfessionalInfoForm (2 hours)
- [ ] Add comprehensive form validation (2 hours)
- [ ] Write remaining 9 E2E tests (6 hours)
- [ ] Write unit tests for all three forms (8 hours)
- [ ] Add visual regression tests (Percy) (3 hours)
- [ ] Test end-to-end save/load cycle (2 hours)

**Total Estimated Time:** 33 hours

---

## Feature 4: Service Listing

### Current Status: 🔴 0% Complete (Not Found)

**Expected Location:** `apps/web/src/app/listings/` or `apps/web/src/app/services/`

### What Should Exist (Based on User Requirements)
1. Service listing creation page
2. Service listing edit page
3. Service listing browse/search page
4. Service listing details page
5. Integration with professional info templates

### Investigation Required

Let me check if service listing files exist:

**Search Results:** (to be filled after investigation)
- No service listing pages found in apps/web/src/app/
- No listing-related components found
- AgentServicesStep.tsx exists but only for onboarding

### Service Listing Feature Requirements

#### 1. Listing Creation (Priority 1)
- [ ] Create listing page (apps/web/src/app/listings/create/page.tsx)
- [ ] Use professional info template as starting point
- [ ] Add listing-specific fields (title, description, availability)
- [ ] Image upload for listing
- [ ] Price setting
- [ ] Publication status (draft/published)
**Estimated Time:** 12 hours

#### 2. Listing Management (Priority 1)
- [ ] My Listings page (apps/web/src/app/listings/page.tsx)
- [ ] Edit listing page (apps/web/src/app/listings/[id]/edit/page.tsx)
- [ ] Delete listing functionality
- [ ] Duplicate listing functionality
**Estimated Time:** 10 hours

#### 3. Listing Browse/Search (Priority 2)
- [ ] Browse listings page (apps/web/src/app/search/page.tsx)
- [ ] Search functionality
- [ ] Filter by subject, level, location, price
- [ ] Sort options
**Estimated Time:** 15 hours

#### 4. Listing Details (Priority 2)
- [ ] Public listing view page (apps/web/src/app/listings/[id]/page.tsx)
- [ ] Book/contact functionality
- [ ] Reviews/ratings display
**Estimated Time:** 8 hours

#### 5. Backend API (Priority 1)
- [ ] Create listing endpoint
- [ ] Update listing endpoint
- [ ] Delete listing endpoint
- [ ] Get listing(s) endpoint
- [ ] Search/filter endpoint
**Estimated Time:** 12 hours

#### 6. Testing (Priority 1)
- [ ] E2E tests for listing creation
- [ ] E2E tests for listing management
- [ ] E2E tests for search/browse
- [ ] Unit tests for listing components
**Estimated Time:** 10 hours

### Service Listing Completion Checklist

- [ ] Investigate existing service listing code (1 hour)
- [ ] Design listing data model and API (2 hours)
- [ ] Create backend API endpoints (12 hours)
- [ ] Create listing creation page (12 hours)
- [ ] Create listing management page (10 hours)
- [ ] Create listing browse/search page (15 hours)
- [ ] Create listing details page (8 hours)
- [ ] Write comprehensive tests (10 hours)
- [ ] Integrate with professional info templates (3 hours)

**Total Estimated Time:** 73 hours (IF STARTING FROM SCRATCH)

---

## Combined Completion Estimate

### Summary by Feature

| Feature | Current % | Remaining Hours | Priority |
|---------|-----------|-----------------|----------|
| Profile Editing | 60% | 20 hours | HIGH |
| Onboarding Wizard | 70% | 35 hours | HIGH |
| Professional Info | 65% | 33 hours | CRITICAL |
| Service Listing | 0% | 73 hours | MEDIUM |
| **TOTAL** | **48%** | **161 hours** | - |

### Prioritized Completion Plan

#### Phase A: Critical Fixes (Week 1 - 40 hours)
**Goal:** Make existing features production-ready

**Day 1-2 (16 hours):**
- [ ] Fix Professional Info API integration (4 hours)
- [ ] Complete Professional Info E2E tests (6 hours)
- [ ] Verify avatar upload or disable feature (4 hours)
- [ ] Complete onboarding auto-save API (2 hours)

**Day 3-4 (16 hours):**
- [ ] Complete profile feature (avatar, validation, tests) (12 hours)
- [ ] Add onboarding form validation (4 hours)

**Day 5 (8 hours):**
- [ ] Write unit tests for professional info (8 hours)

**Phase A Deliverables:**
- ✅ Profile editing fully functional
- ✅ Professional info templates production-ready
- ✅ Onboarding validation complete

#### Phase B: Onboarding Completion (Week 2 - 35 hours)
**Goal:** Onboarding wizard fully tested and production-ready

**Day 1-2 (16 hours):**
- [ ] Complete tutor/agent/client specific forms (8 hours)
- [ ] Write E2E tests for all onboarding flows (8 hours)

**Day 3-4 (16 hours):**
- [ ] Write unit tests for onboarding wizard (8 hours)
- [ ] Add accessibility tests (3 hours)
- [ ] Improve error states (3 hours)
- [ ] Test crash recovery (2 hours)

**Phase B Deliverables:**
- ✅ Complete onboarding wizard for all roles
- ✅ 100% E2E test coverage
- ✅ Accessibility compliant

#### Phase C: Service Listing MVP (Week 3-4 - 50 hours minimum)
**Goal:** Basic service listing functionality

**Option 1: Full Implementation (73 hours)**
- Complete all service listing features as outlined

**Option 2: MVP (50 hours)**
- [ ] Backend API for CRUD operations (12 hours)
- [ ] Create listing page only (12 hours)
- [ ] My Listings management page (10 hours)
- [ ] Public listing view (8 hours)
- [ ] Basic E2E tests (8 hours)
- **DEFER:** Search/browse page, advanced features

**Recommendation:** Implement MVP (Option 2) to get to production faster

---

## Risks & Dependencies

### High-Risk Areas

1. **API Endpoints May Not Exist**
   - Risk: Frontend code references APIs that aren't built
   - Impact: Features completely non-functional
   - Mitigation: API verification must be first task

2. **No Tests = Unknown Bugs**
   - Risk: Features may have silent failures
   - Impact: Production incidents, user frustration
   - Mitigation: Write tests before marking features complete

3. **Service Listing Scope Unknown**
   - Risk: Could be 50-100+ hours if complex
   - Impact: Delays production launch
   - Mitigation: Implement MVP only

### Dependencies

- **Onboarding → Professional Info Templates**
  - Onboarding may populate professional info
  - Must ensure data flow works

- **Professional Info → Service Listings**
  - Listings use templates as starting point
  - Template changes may affect listings

- **Profile → All Features**
  - User profile data used throughout
  - Profile bugs affect everything

---

## Recommendation

### Option 1: Complete Everything (12 weeks, 161 hours)
**Timeline:** 3-4 weeks full-time
**Pros:** All features complete
**Cons:** Delays production, high risk

### Option 2: Complete Critical Features + Service Listing MVP (7 weeks, 105 hours) ✅ RECOMMENDED
**Timeline:** 2-3 weeks full-time
**Phase A:** Profile + Professional Info (1 week, 40 hours)
**Phase B:** Onboarding (1 week, 35 hours)
**Phase C:** Service Listing MVP (1 week, 30 hours)
**Pros:** Faster to production, lower risk
**Cons:** Service listing limited initially

### Option 3: Critical Features Only, Defer Service Listing (5 weeks, 55 hours)
**Timeline:** 1-1.5 weeks full-time
**Focus:** Profile + Professional Info + Onboarding
**Pros:** Fastest to production
**Cons:** No service listing (major missing feature)

---

## GUARD Integration

All feature completion work should follow GUARD principles:

### Governance
- [ ] Code review required for all changes
- [ ] Design system compliance (Figma)
- [ ] Conventional commits

### Usability
- [ ] Accessibility testing (WCAG 2.1 AA)
- [ ] Mobile-first responsive design
- [ ] User flow testing

### Assurance
- [ ] Unit test coverage ≥70%
- [ ] E2E test coverage 100% of user flows
- [ ] Integration tests for APIs

### Reliability
- [ ] Error handling comprehensive
- [ ] Loading states present
- [ ] Performance optimized

### Defence
- [ ] Input validation client + server
- [ ] XSS prevention
- [ ] CSRF protection

---

## Next Steps

1. **Approve Completion Plan** - Choose Option 1, 2, or 3
2. **Verify API Endpoints** - Check what exists vs what's needed (4 hours)
3. **Start Phase A** - Begin critical fixes
4. **Daily Progress Reviews** - Track completion
5. **GUARD Tests** - Write tests as features complete

---

**Decision Required:** Which option should we proceed with?

**Recommendation:** Option 2 (Complete Critical + MVP Service Listing) for balanced speed and functionality.
