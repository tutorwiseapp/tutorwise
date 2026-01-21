# Role Awareness Audit - TutorWise Application

**Date:** 2025-10-27
**Purpose:** Comprehensive analysis of all pages and components that need role-based customization

---

## Executive Summary

The TutorWise application supports three primary roles:
- **Provider (Tutor)**: Offers tutoring services
- **Seeker (Client)**: Seeks tutoring services
- **Agent**: Manages referrals and networks

Currently, many pages and components are hardcoded for tutors/providers. This document identifies what needs role-awareness.

---

## ✅ Already Role-Aware (Completed)

### 1. **Dashboard** (`/dashboard/page.tsx`)
- ✅ Role-specific titles (My Learning Hub, My Teaching Studio, My Tutoring Agency)
- ✅ Role-specific welcome messages
- ✅ Role-specific dashboard cards/links
- ✅ Changed "Student" to "Client" in welcome message

### 2. **Profile Page** (`/profile/page.tsx`)
- ✅ Extracts and passes `activeRole` to child components
- ✅ ProfessionalInfoForm shows role-specific fields
- ✅ ProfileTabs shows role-specific tabs
- ✅ HybridHeader shows role-specific content

### 3. **Profile Components**
- ✅ **ProfileTabs**: Different tabs per role
  - Client: Personal Info, Professional Info, Reviews, Matching Requests
  - Tutor: Personal Info, Professional Info, Reviews, Matching Jobs
  - Agent: Personal Info, Professional Info, Reviews, Matching Requests, Matching Jobs, Matching Agents

- ✅ **ProfessionalInfoForm**: Role-specific fields and placeholders
  - Client: Learning goals focused
  - Agent: Agency focused
  - Tutor: Full professional tutor fields

- ✅ **HybridHeader**: Role-specific stats and action buttons
  - Client: Active Requests, Completed Sessions, Total Spent
  - Agent: Active Referrals, Commission Earned, Network Size
  - Tutor: Credibility Score, Session Rates

---

## ⚠️ Needs Role-Awareness (Priority)

### HIGH PRIORITY

#### 1. **Settings Page** (`/settings/page.tsx`)
**Current State:** Generic settings for all roles
**What Needs Changing:**
- Email notification preferences should be role-specific:
  - **Client**: Booking confirmations, tutor messages, session reminders
  - **Tutor**: New student requests, payment notifications, review alerts
  - **Agent**: Referral conversions, commission payments, network updates
- Add role-specific settings sections:
  - **Tutor**: Availability management, pricing settings, auto-accept requests
  - **Agent**: Referral link management, commission preferences
  - **Client**: Learning preferences, subject interests

**Files to Update:**
- `/apps/web/src/app/settings/page.tsx`

---

#### 2. **Marketplace/Home Page** (`/page.tsx`)
**Current State:** Shows tutors seeking students
**What Needs Changing:**
- Hero section messaging should adapt by role:
  - **Client**: "Find Your Perfect Tutor" (current default)
  - **Tutor**: "Showcase Your Expertise - Create a Listing"
  - **Agent**: "Connect Clients with Tutors - Grow Your Network"
- Search functionality context:
  - **Client**: Search for tutors
  - **Tutor**: Search competitors/market research
  - **Agent**: Search tutors to refer
- CTA buttons should be role-specific

**Files to Update:**
- `/apps/web/src/app/page.tsx`
- `/apps/web/src/app/components/marketplace/HeroSection.tsx`

---

#### 3. **My Listings Page** (`/my-listings/page.tsx`)
**Current State:** Hardcoded for tutors only
**What Needs Changing:**
- **Client** (seeker): Should NOT have access OR show "Bookings" instead
- **Agent**: Should show "Managed Listings" (listings they refer/manage)
- **Tutor**: Current functionality is correct
- Page title and messaging:
  - Tutor: "My Listings - Manage your tutoring services"
  - Agent: "Managed Listings - Services you represent"
  - Client: Redirect to bookings or hide entirely

**Files to Update:**
- `/apps/web/src/app/my-listings/page.tsx`
- `/apps/web/src/app/my-listings/create/page.tsx`
- `/apps/web/src/app/my-listings/ListingCard.tsx`

---

#### 4. **Navigation Components**
**Current State:** NavMenu partially role-aware but inconsistent
**What Needs Changing:**
- **NavMenu** links should vary by role:
  - Client: Dashboard, Find Tutors, My Bookings, Messages, Profile, Settings
  - Tutor: Dashboard, My Listings, Create Listing, Messages, Profile, Settings
  - Agent: Dashboard, My Network, Referrals, Earnings, Messages, Profile, Settings
- Active role indicator in navigation
- Role switcher should be more prominent for multi-role users

**Files to Update:**
- `/apps/web/src/app/components/layout/NavMenu.tsx`
- Consider creating role-specific navigation configs

---

### MEDIUM PRIORITY

#### 5. **Account Pages** (`/account/*`)
**Current State:** Generic account management
**What Needs Changing:**
- `/account/page.tsx` should show role-specific account overview
- `/account/settings/page.tsx` may need role-specific settings
- `/account/personal-info/page.tsx` is likely universal (OK as-is)
- `/account/professional-info/page.tsx` should mirror profile's role-awareness

**Files to Update:**
- `/apps/web/src/app/account/page.tsx`
- `/apps/web/src/app/account/professional-info/page.tsx`

---

#### 6. **Referral Pages**
**Current State:** Universal referral system
**What Needs Changing:**
- `/refer/page.tsx`: Should emphasize different benefits per role
  - **Agent**: Primary feature, detailed commission breakdown
  - **Tutor/Client**: Secondary feature, simplified UI
- `/referral-activities/page.tsx`: Show role-specific metrics
- `/transaction-history/page.tsx`: Role-specific transaction types

**Files to Update:**
- `/apps/web/src/app/refer/page.tsx`
- `/apps/web/src/app/referral-activities/page.tsx`
- `/apps/web/src/app/transaction-history/page.tsx`

---

#### 7. **Payments Page** (`/payments/page.tsx`)
**Current State:** Generic payment management
**What Needs Changing:**
- **Tutor**: Receiving payments for sessions
- **Agent**: Receiving commission payouts
- **Client**: Payment methods for booking sessions
- Different Stripe Connect flows per role

**Files to Update:**
- `/apps/web/src/app/payments/page.tsx`

---

#### 8. **Onboarding Pages** (`/onboarding/*`)
**Current State:** Has role-specific paths but may need review
**What Needs Verification:**
- `/onboarding/tutor/page.tsx` - Tutor-specific onboarding ✓
- `/onboarding/client/page.tsx` - Client-specific onboarding ✓
- `/onboarding/agent/page.tsx` - Agent-specific onboarding ✓
- Main `/onboarding/page.tsx` - Role selection/routing ✓

**Status:** Likely already correct, but verify consistency

---

### LOW PRIORITY

#### 9. **Public Profile Pages**
**Current State:** Shows public-facing profiles
**What Needs Changing:**
- `/tutor/[id]/[slug]/page.tsx`: Currently tutor-focused (correct)
- `/profile/[id]/page.tsx`: Should adapt based on viewed user's role
- `/public-profile/[id]/page.tsx`: Should show role-appropriate information

**Files to Update:**
- `/apps/web/src/app/public-profile/[id]/page.tsx`
- `/apps/web/src/app/profile/[id]/page.tsx`

---

#### 10. **Agent-Specific Pages**
**Current State:** Exists but may need enhancement
**What Needs Verification:**
- `/agents/[agentId]/page.tsx`: Agent profile/directory page
- Ensure consistent with other role-specific pages

**Files to Update:**
- `/apps/web/src/app/agents/[agentId]/page.tsx`

---

#### 11. **Other Pages to Review**

| Page | Current State | Action Needed |
|------|---------------|---------------|
| `/become-provider/page.tsx` | Role conversion page | Verify messaging for existing users |
| `/contact/page.tsx` | Universal contact form | Role context in form submission |
| `/resources/page.tsx` | General resources | Consider role-specific resources |
| `/messages/page.tsx` | Placeholder | Role-specific message templates |
| `/my-network/page.tsx` | Placeholder | Agent-focused, but accessible to all |
| `/help-centre/page.tsx` | Placeholder | Role-specific FAQs |

---

## 🔧 Implementation Strategy

### Phase 1: Critical Role-Awareness (Week 1)
1. ✅ Dashboard (COMPLETED)
2. ✅ Profile page and components (COMPLETED)
3. ⚠️ Settings page
4. ⚠️ Marketplace/Home page
5. ⚠️ My Listings page

### Phase 2: Navigation & Core UX (Week 2)
1. NavMenu role-specific links
2. Account pages
3. Onboarding verification

### Phase 3: Feature Pages (Week 3)
1. Referral pages
2. Payments page
3. Messages and communication

### Phase 4: Polish & Optimization (Week 4)
1. Public profile pages
2. Help center & resources
3. Testing and QA

---

## 🔐 Role Guard vs Role-Aware UI

**IMPORTANT DISTINCTION:**

### useRoleGuard (Already Implemented ✅)
- **Purpose**: Access control - determines WHO can access a page
- **Current Usage**: `/my-listings`, `/settings`, `/account/professional-info`
- **Files using it**: 6 pages already protected
- **Example**:
  ```typescript
  const { isAllowed, isLoading } = useRoleGuard(['provider', 'agent']);
  // Redirects clients away from /my-listings
  ```

### Role-Aware UI (What We're Adding 🚧)
- **Purpose**: Customization - determines WHAT content users see on allowed pages
- **Target Pages**: Dashboard, Profile, Settings, Marketplace, Navigation
- **Example**:
  ```typescript
  const { activeRole } = useUserProfile();
  // Shows different dashboard cards based on role
  {activeRole === 'seeker' && <ClientDashboard />}
  {activeRole === 'provider' && <TutorDashboard />}
  ```

**Key Point**: A page can be accessible to all roles (no useRoleGuard) but still show role-specific content (role-aware UI). For example:
- **Dashboard**: All roles can access, but see different content
- **My Listings**: Only tutors/agents can access (useRoleGuard), content is same for both
- **Settings**: All roles can access, but see different notification options (needs both)

---

## 📋 Role-Based Access Control Patterns

### Access Matrix

| Page/Feature | Client | Tutor | Agent | Notes |
|--------------|--------|-------|-------|-------|
| Dashboard | ✓ | ✓ | ✓ | Different content per role |
| Profile | ✓ | ✓ | ✓ | Different tabs/fields per role |
| My Listings | ✗ | ✓ | ✓ | Client redirects to bookings |
| Create Listing | ✗ | ✓ | ✓ | Agent creates on behalf of tutors |
| Marketplace | ✓ | ✓ | ✓ | Different intent per role |
| Bookings | ✓ | ✓ | ✓ | Different views per role |
| Referrals | ✓ | ✓ | ✓ | Agent has enhanced features |
| My Network | ✓ | ✓ | ✓ | Agent-focused but all can connect |
| Settings | ✓ | ✓ | ✓ | Different options per role |

---

## 🎯 Key Principles

1. **Progressive Enhancement**: Start with universal features, add role-specific enhancements
2. **Graceful Degradation**: Multi-role users should see appropriate content for active role
3. **Consistent Patterns**: Use same role-detection logic across all pages
4. **Clear Communication**: Users should always know which role they're acting as
5. **Flexible Architecture**: New roles should be easy to add

---

## 📝 Code Patterns to Follow

### Extract activeRole from Context
```typescript
const { profile, activeRole, isLoading } = useUserProfile();
```

### Conditional Rendering by Role
```typescript
{activeRole === 'seeker' && <ClientSpecificContent />}
{activeRole === 'provider' && <TutorSpecificContent />}
{activeRole === 'agent' && <AgentSpecificContent />}
```

### Role-Specific Configuration
```typescript
const getPageConfig = (role: string | null) => {
  switch (role) {
    case 'seeker': return clientConfig;
    case 'provider': return tutorConfig;
    case 'agent': return agentConfig;
    default: return defaultConfig;
  }
};
```

---

## 🚀 Next Steps

1. Review and approve this audit
2. Prioritize pages based on user impact
3. Create tickets for each page/component
4. Implement in phases
5. Test role switching thoroughly
6. Document role-specific features for users
