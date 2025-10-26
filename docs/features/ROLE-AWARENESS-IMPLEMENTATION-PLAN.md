# TutorWise Role-Awareness Implementation Plan

**Date Created**: October 26, 2025
**Status**: In Progress
**Priority**: High

---

## Executive Summary

Based on comprehensive analysis of the TutorWise codebase, this document outlines the complete implementation plan for making the entire application role-aware across tutor/provider, client/seeker, and agent roles.

**Current State**: Core infrastructure is in place with `useUserProfile()` hook, role switching, and role-aware navigation. However, many secondary pages lack proper role guards and role-specific content.

**Goal**: Ensure every page and component that displays user-specific content properly adapts to the active user role.

---

## Role Definitions

- **Provider (Tutor)**: Creates and manages tutoring listings, earns from sessions
- **Seeker (Client)**: Browses and books tutoring services, pays for sessions
- **Agent**: Manages referrals, connects tutors with clients, earns commissions

---

## Implementation Phases

### Phase 1: Security & Role Guards (Priority: CRITICAL)

**Goal**: Prevent unauthorized access to role-specific pages

#### 1.1 Create useRoleGuard Hook

**File**: `apps/web/src/app/hooks/useRoleGuard.ts`

```typescript
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '../contexts/UserProfileContext';

export type Role = 'seeker' | 'provider' | 'agent';

export function useRoleGuard(allowedRoles: Role[], redirectTo: string = '/dashboard') {
  const { activeRole, isLoading } = useUserProfile();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && activeRole && !allowedRoles.includes(activeRole)) {
      console.warn(`Access denied: Role ${activeRole} not in allowed roles`, allowedRoles);
      router.push(redirectTo);
    }
  }, [isLoading, activeRole, allowedRoles, redirectTo, router]);

  return { isAllowed: activeRole ? allowedRoles.includes(activeRole) : false, isLoading };
}
```

**Usage Example**:
```typescript
// In /my-listings/page.tsx
const { isAllowed, isLoading } = useRoleGuard(['provider', 'agent']);

if (isLoading) return <LoadingSpinner />;
if (!isAllowed) return null; // Will redirect automatically
```

---

#### 1.2 Add Role Guards to Provider-Only Pages

**Files to Update**:
- `apps/web/src/app/my-listings/page.tsx`
- `apps/web/src/app/my-listings/create/page.tsx`
- `apps/web/src/app/my-listings/[id]/edit/page.tsx`

**Changes**:
```typescript
// Add at top of each page component
useRoleGuard(['provider', 'agent']);
```

**Reason**: Seekers should not be able to create or manage listings.

---

### Phase 2: Account & Settings Pages (Priority: HIGH)

**Goal**: Implement role-specific forms and settings

#### 2.1 Implement Role-Aware Professional Info Page

**File**: `apps/web/src/app/account/professional-info/page.tsx`

**Current State**: Placeholder that redirects to personal-info
**Target State**: Show different forms based on active role

**Implementation**:
```typescript
'use client';

import { useUserProfile } from '../../contexts/UserProfileContext';
import TutorProfessionalInfoForm from '../../components/account/TutorProfessionalInfoForm';
import ClientProfessionalInfoForm from '../../components/account/ClientProfessionalInfoForm';
import AgentProfessionalInfoForm from '../../components/account/AgentProfessionalInfoForm';

export default function ProfessionalInfoPage() {
  const { activeRole, isLoading } = useUserProfile();

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="container">
      <h1>Professional Information</h1>
      {activeRole === 'provider' && <TutorProfessionalInfoForm />}
      {activeRole === 'seeker' && <ClientProfessionalInfoForm />}
      {activeRole === 'agent' && <AgentProfessionalInfoForm />}
    </div>
  );
}
```

**Components Already Exist**:
- ✅ `TutorProfessionalInfoForm.tsx`
- ✅ `ClientProfessionalInfoForm.tsx`
- ✅ `AgentProfessionalInfoForm.tsx`

**Status**: Components exist, just need to wire them up

---

#### 2.2 Create Role-Aware Settings Page

**File**: `apps/web/src/app/settings/page.tsx`

**Current State**: Generic settings for all users
**Target State**: Show role-specific settings sections

**Implementation**:
```typescript
'use client';

import { useUserProfile } from '../contexts/UserProfileContext';

export default function SettingsPage() {
  const { activeRole, profile } = useUserProfile();

  const getRoleSpecificSettings = () => {
    switch (activeRole) {
      case 'provider':
        return (
          <>
            <SettingsSection title="Teaching Preferences">
              <TeachingPreferencesForm />
            </SettingsSection>
            <SettingsSection title="Availability Settings">
              <AvailabilitySettingsForm />
            </SettingsSection>
          </>
        );
      case 'seeker':
        return (
          <SettingsSection title="Learning Preferences">
            <LearningPreferencesForm />
          </SettingsSection>
        );
      case 'agent':
        return (
          <>
            <SettingsSection title="Commission Settings">
              <CommissionSettingsForm />
            </SettingsSection>
            <SettingsSection title="Network Settings">
              <NetworkSettingsForm />
            </SettingsSection>
          </>
        );
    }
  };

  return (
    <div className="settings-container">
      <h1>Settings</h1>

      {/* Shared Settings */}
      <SettingsSection title="Account">
        <AccountSettingsForm />
      </SettingsSection>

      <SettingsSection title="Notifications">
        <NotificationSettingsForm activeRole={activeRole} />
      </SettingsSection>

      {/* Role-Specific Settings */}
      {getRoleSpecificSettings()}

      {/* Shared Settings */}
      <SettingsSection title="Privacy & Security">
        <PrivacySettingsForm />
      </SettingsSection>
    </div>
  );
}
```

**New Components to Create**:
- `TeachingPreferencesForm.tsx`
- `LearningPreferencesForm.tsx`
- `CommissionSettingsForm.tsx`
- `NetworkSettingsForm.tsx`

---

### Phase 3: Financial Pages (Priority: MEDIUM)

**Goal**: Show role-specific financial information

#### 3.1 Update Payments Page

**File**: `apps/web/src/app/payments/page.tsx`

**Changes**:
```typescript
const { activeRole } = useUserProfile();

const canReceivePayments = activeRole === 'provider' || activeRole === 'agent';
const canSendPayments = true; // All roles can pay

return (
  <>
    {/* Payment Methods (all roles) */}
    <Section title="Payment Methods">
      <PaymentMethodsList />
    </Section>

    {/* Payout Methods (provider & agent only) */}
    {canReceivePayments && (
      <Section title="Receiving Payment Methods">
        <PayoutMethodsList />
      </Section>
    )}

    {/* Role-specific copy */}
    {activeRole === 'seeker' && (
      <InfoBox>
        Add payment methods to book sessions with tutors
      </InfoBox>
    )}

    {activeRole === 'provider' && (
      <InfoBox>
        Set up payout methods to receive earnings from your sessions
      </InfoBox>
    )}

    {activeRole === 'agent' && (
      <InfoBox>
        Set up payout methods to receive commission earnings
      </InfoBox>
    )}
  </>
);
```

---

#### 3.2 Update Transaction History Page

**File**: `apps/web/src/app/transaction-history/page.tsx`

**Current**: Mock data with hardcoded agent ID
**Target**: Real data filtered by role

**Implementation**:
```typescript
const { activeRole, profile } = useUserProfile();

const getTransactionQuery = () => {
  switch (activeRole) {
    case 'provider':
      return {
        filter: 'earnings',
        types: ['session_payment', 'referral_commission']
      };
    case 'seeker':
      return {
        filter: 'payments',
        types: ['session_payment', 'booking_fee']
      };
    case 'agent':
      return {
        filter: 'commissions',
        types: ['referral_commission', 'network_bonus']
      };
  }
};

const { data: transactions } = useQuery({
  queryKey: ['transactions', activeRole, profile?.id],
  queryFn: () => fetchTransactions(getTransactionQuery())
});
```

---

#### 3.3 Update Referral Activities Page

**File**: `apps/web/src/app/referral-activities/page.tsx`

**Changes**:
```typescript
const { activeRole, profile } = useUserProfile();

// Only agents should see full referral dashboard
const showFullDashboard = activeRole === 'agent';

// Providers and seekers see simplified referral tracking
const showSimplifiedView = activeRole === 'provider' || activeRole === 'seeker';

return (
  <>
    {showFullDashboard && (
      <ReferralDashboard
        agentId={profile?.id}
        tabs={['Generates', 'Shares', 'Converts', 'Rewards']}
      />
    )}

    {showSimplifiedView && (
      <SimpleReferralView
        userId={profile?.id}
        role={activeRole}
      />
    )}
  </>
);
```

---

### Phase 4: Future Features (Priority: LOWER)

#### 4.1 Messages Page Structure

**File**: `apps/web/src/app/messages/page.tsx`

**Plan**:
```typescript
const getMessageFilters = (role: Role) => {
  switch (role) {
    case 'provider':
      return {
        inboxTypes: ['booking_inquiry', 'session_question', 'agent_referral'],
        showCustomerSupport: true
      };
    case 'seeker':
      return {
        inboxTypes: ['tutor_response', 'booking_confirmation', 'session_reminder'],
        showCustomerSupport: true
      };
    case 'agent':
      return {
        inboxTypes: ['tutor_inquiry', 'seeker_inquiry', 'commission_update'],
        showAdminTools: true
      };
  }
};
```

---

#### 4.2 My Network Page Structure

**File**: `apps/web/src/app/my-network/page.tsx`

**Plan**:
```typescript
const getNetworkView = (role: Role) => {
  switch (role) {
    case 'agent':
      return <AgentNetworkView tutors={...} seekers={...} />;
    case 'provider':
      return <TutorNetworkView clients={...} agents={...} />;
    case 'seeker':
      return <SeekerNetworkView tutors={...} />;
  }
};
```

---

### Phase 5: Enhancements (Priority: OPTIONAL)

#### 5.1 Home Page Personalization

**File**: `apps/web/src/app/page.tsx`

**Enhancement**:
- Authenticated users see personalized hero message
- Different CTA buttons based on role
- Recent activity based on role

---

#### 5.2 Help Centre Role-Aware FAQs

**File**: `apps/web/src/app/help-centre/page.tsx`

**Enhancement**:
- Show role-specific FAQs first
- Role-specific tutorial links
- Contextual help based on active role

---

## Testing Plan

### Unit Testing
- [ ] Test `useRoleGuard` hook with all role combinations
- [ ] Test role-specific form components render correctly
- [ ] Test role switcher updates all components

### Integration Testing
- [ ] Test role switching updates dashboard content
- [ ] Test role guards redirect unauthorized users
- [ ] Test role-specific settings save correctly

### E2E Testing
- [ ] Test complete user flow for each role
- [ ] Test switching between roles maintains data
- [ ] Test unauthorized access attempts

---

## Migration Checklist

### Phase 1: Security (Week 1)
- [ ] Create `useRoleGuard` hook
- [ ] Add role guards to `/my-listings` pages
- [ ] Add role guards to `/my-listings/create`
- [ ] Test seeker cannot access provider pages

### Phase 2: Account Pages (Week 2)
- [ ] Implement role-aware `/account/professional-info`
- [ ] Wire up existing professional info forms
- [ ] Create role-aware `/settings` page
- [ ] Create role-specific settings components

### Phase 3: Financial Pages (Week 3)
- [ ] Update `/payments` page with role awareness
- [ ] Implement real data for `/transaction-history`
- [ ] Update `/referral-activities` for role-specific views

### Phase 4: Testing & Polish (Week 4)
- [ ] Write unit tests for role guards
- [ ] Write E2E tests for role switching
- [ ] Test all role combinations
- [ ] Update documentation

---

## Dependencies

### Required Context
- ✅ `useUserProfile()` hook (exists)
- ✅ `activeRole` state (exists)
- ✅ `switchRole()` function (exists)

### Required Components
- ✅ `TutorProfessionalInfoForm` (exists)
- ✅ `ClientProfessionalInfoForm` (exists)
- ✅ `AgentProfessionalInfoForm` (exists)
- ⏳ Role-specific settings forms (to create)
- ⏳ `useRoleGuard` hook (to create)

### API Requirements
- Transaction history endpoint with role filtering
- Referral activities endpoint with role filtering
- Settings save endpoints for role-specific data

---

## Success Criteria

1. ✅ All provider-only pages have role guards
2. ✅ Account pages show role-specific forms
3. ✅ Settings page has role-specific sections
4. ✅ Financial pages show role-appropriate data
5. ✅ Role switching updates all pages correctly
6. ✅ Zero console errors or warnings
7. ✅ All E2E tests pass for each role

---

## Notes

- Existing infrastructure is solid - most work is wiring up components
- Many components already exist and just need to be connected
- Priority should be security (role guards) then user experience (role-specific content)
- Consider creating shared components for role-based rendering to reduce duplication

---

## References

- User Profile Context: `apps/web/src/app/contexts/UserProfileContext.tsx`
- Navigation: `apps/web/src/app/components/layout/NavMenu.tsx`
- Dashboard: `apps/web/src/app/dashboard/page.tsx`
- Profile: `apps/web/src/app/profile/page.tsx`
