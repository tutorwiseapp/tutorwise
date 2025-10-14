# Feature Development Priorities - Week 4+

**Created:** 2025-10-09
**Status:** Active Planning
**Objective:** Prioritize feature development (profile, onboarding, listings, marketplace) while enhancing testing/QA

---

## 📊 Current Feature Status

### ✅ COMPLETED (Weeks 1-3)

#### Profile & Account Management
- ✅ Profile page (`/profile`) - Edit user info, avatar upload
- ✅ TutorProfessionalInfoForm - 100% complete with tests
- ✅ ClientProfessionalInfoForm - 100% complete with tests
- ✅ AgentProfessionalInfoForm - 100% complete with tests
- ✅ Account API (`account.ts`) - Get/update professional info
- ✅ 48 unit tests (100% passing, 89.71% avg coverage)
- ✅ 29 Storybook stories
- ✅ E2E tests for professional info forms

#### Onboarding
- ✅ OnboardingWizard component - Multi-step wizard
- ✅ Onboarding pages (`/onboarding`, `/onboarding/tutor`, `/onboarding/client`, `/onboarding/agent`)
- ✅ Auto-save progress functionality
- ✅ Resume from saved step
- ✅ Unit tests for onboarding components

#### Infrastructure
- ✅ API: Onboarding progress save/restore
- ✅ Database: `role_details` table for professional info
- ✅ Auth: User profile context
- ✅ Testing: Jest + Playwright + Percy setup

### 🔴 NOT STARTED

#### Listings (Tutor Services)
- ❌ Listing creation page - Create/edit tutor service listings
- ❌ Listing management - View/edit/delete own listings
- ❌ Listing components - Forms, cards, filters
- ❌ Listing API - CRUD operations
- ❌ Database: `listings` table

#### Marketplace (Discovery)
- ❌ Browse/search page - Find tutors/agents
- ❌ Listing details page - View full listing
- ❌ Search/filter components
- ❌ Search API - Query with filters
- ❌ Recommendation engine (Neo4j)

#### Requests (Reverse Marketplace)
- ❌ Request creation - Clients post lesson requests
- ❌ Request management - View/edit requests
- ❌ Request browsing - Tutors find requests
- ❌ Request API - CRUD + matching

#### Booking & Payments
- ❌ Booking flow - Schedule sessions
- ❌ Payment integration - Stripe Connect
- ❌ Calendar integration
- ❌ Session management

---

## 🎯 Feature Prioritization (Week 4+)

### Priority 1: Listings (Tutor Service Creation) 🥇
**Why First:** Foundation for marketplace - tutors need listings before clients can discover

**Scope:**
1. **Listing Creation Form**
   - Title, description, subjects, levels
   - Pricing (hourly rate, packages)
   - Availability calendar
   - Location (online/in-person/hybrid)
   - Photos/media

2. **Listing Management**
   - View my listings page
   - Edit/delete listings
   - Publish/unpublish toggle
   - Analytics (views, inquiries)

3. **Database & API**
   - `listings` table schema
   - CRUD API endpoints
   - Validation & authorization

**Testing Requirements:**
- Unit tests for listing forms (80%+ coverage)
- E2E tests for create/edit/delete flows
- Storybook stories for listing components
- Visual regression tests (Percy)

**Estimated Delivery:** 2-3 days (CAS continuous flow)

---

### Priority 2: Marketplace (Discovery & Search) 🥈
**Why Second:** Enables clients to find tutors, completes supply-demand loop

**Scope:**
1. **Browse/Search Page**
   - Grid/list view of listings
   - Search bar (text, subjects, location)
   - Filters (price, rating, availability, level)
   - Sort options (relevance, price, rating, recent)

2. **Listing Details Page**
   - Full listing view with all details
   - Tutor profile preview
   - Contact/booking CTA
   - Reviews/ratings display

3. **Search API**
   - Full-text search
   - Multi-field filtering
   - Sorting and pagination
   - Result relevance scoring

**Testing Requirements:**
- Unit tests for search/filter logic
- E2E tests for search flows
- Performance tests (search speed)
- Storybook stories for listing cards

**Estimated Delivery:** 2-3 days

---

### Priority 3: Enhanced Profile & Onboarding Polish 🥉
**Why Third:** Improve UX on existing features while marketplace develops

**Scope:**
1. **Profile Enhancements**
   - Avatar upload implementation (currently placeholder)
   - Profile completeness indicator
   - Public profile preview
   - Social links integration

2. **Onboarding Improvements**
   - Progress indicators
   - Better validation messages
   - Skip logic optimization
   - Welcome email triggers

**Testing Requirements:**
- Update existing tests
- Add avatar upload E2E tests
- Visual regression tests

**Estimated Delivery:** 1-2 days

---

### Priority 4: Requests (Reverse Marketplace)
**Why Fourth:** Alternative discovery flow, higher engagement

**Scope:**
1. **Request Creation** (Clients)
   - Request form (subject, level, budget, schedule)
   - Post to marketplace

2. **Request Browsing** (Tutors)
   - Browse client requests
   - Filter by subject/level/budget
   - Express interest CTA

3. **Request Management**
   - View my requests
   - Edit/close requests
   - View interested tutors

**Estimated Delivery:** 2-3 days

---

## 🧪 Testing & QA Enhancement Opportunities

### 1. Visual Regression Testing (Percy)
**Current:** Percy configured but minimal coverage
**Enhancement:**
- Capture baseline screenshots for all components
- Add visual tests to CI/CD pipeline
- Test responsive breakpoints (mobile, tablet, desktop)
- Test dark mode variations

**Benefit:** Catch UI regressions automatically

---

### 2. E2E Test Coverage Expansion
**Current:** 8 E2E test files, focused on account features
**Enhancement:**
- Add E2E tests for each new feature (listings, marketplace)
- Test complete user journeys (signup → onboard → create listing → publish)
- Cross-browser testing (Chromium, Firefox, WebKit, Mobile)
- Add authentication flow tests

**Benefit:** Ensure features work end-to-end across browsers

---

### 3. Unit Test Quality Improvements
**Current:** 89.71% avg coverage, but some gaps
**Enhancement:**
- Increase coverage target to 95%+
- Add edge case testing
- Test error handling paths
- Add integration tests for API calls

**Benefit:** Higher confidence in code changes

---

### 4. Performance Testing
**Current:** No performance tests
**Enhancement:**
- Add Lighthouse CI for performance budgets
- Test search query performance (<200ms)
- Test page load times
- Monitor bundle size

**Benefit:** Prevent performance regressions

---

### 5. Accessibility Testing
**Current:** Minimal a11y testing
**Enhancement:**
- Add axe-core to E2E tests
- Test keyboard navigation
- Test screen reader compatibility
- WCAG 2.1 AA compliance

**Benefit:** Inclusive product

---

### 6. Storybook Component Documentation
**Current:** 29 stories created but server won't start (Webpack issue)
**Enhancement:**
- Fix Storybook Webpack 5 + Next.js 14 compatibility
- Add interaction tests to stories
- Document all component variants
- Add accessibility checks to stories

**Benefit:** Better component reusability and documentation

---

### 7. Test Data Management
**Current:** Manual test user setup
**Enhancement:**
- Create test data factory functions
- Seed database with realistic test data
- Implement test user API
- Add data cleanup utilities

**Benefit:** Faster, more reliable tests

---

### 8. CI/CD Test Automation
**Current:** Tests run locally
**Enhancement:**
- Add GitHub Actions for automated testing
- Run tests on every PR
- Add test result reporting
- Block merges if tests fail

**Benefit:** Prevent bugs from reaching production

---

## 📈 Success Metrics

### Feature Development
- **Velocity:** Maintain 400% faster than traditional (CAS advantage)
- **Quality:** 95%+ test coverage, <1% bug escape rate
- **User Adoption:** 80%+ of tutors create listings within 7 days

### Testing & QA
- **Coverage:** 95%+ unit test coverage
- **E2E:** 100% critical user flows covered
- **Performance:** All pages <2s load time
- **Accessibility:** WCAG 2.1 AA compliance
- **Visual:** Zero unintended UI regressions

---

## 🗓️ Proposed Timeline (Continuous Flow)

### Week 4 (Current)
- ✅ Complete test infrastructure cleanup
- ✅ Enhance CAS with strategic feedback loop
- 🔄 Begin Priority 1: Listings

### Week 5
- Listings feature complete + tested
- Begin Marketplace discovery

### Week 6
- Marketplace complete + tested
- Profile/onboarding enhancements
- Visual regression testing setup

### Week 7
- Requests feature
- Performance testing
- Accessibility audit

---

## 🎬 Next Steps

1. **Start Priority 1: Listings**
   - Design database schema for `listings` table
   - Create listing form components
   - Implement listing API endpoints
   - Write tests (unit + E2E + Storybook)

2. **Parallel: Fix Storybook**
   - Resolve Webpack 5 compatibility issue
   - Get Storybook server running
   - Add interaction tests

3. **Parallel: Enhance Testing**
   - Set up Percy visual testing baseline
   - Add Lighthouse CI
   - Expand E2E coverage

**Ready to begin when you are.**
