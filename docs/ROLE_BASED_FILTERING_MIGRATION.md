# Role-Based Data Filtering Migration Plan
**Version**: 2.0
**Created**: 2026-01-22
**Updated**: 2026-01-23
**Status**: Implementation Complete
**Priority**: High - Security & User Experience Critical

---

## Executive Summary

This document outlines the comprehensive migration plan to implement consistent role-based data filtering across all features in the Tutorwise platform. Currently, the system has **inconsistent role-based filtering**, which can lead to:

- ❌ **Security risks**: Users seeing data they shouldn't access
- ❌ **Poor UX**: Confusing experience when switching roles
- ❌ **Data leakage**: Client requests appearing in tutor views (and vice versa)

**Goal**: Ensure every feature respects the user's `activeRole` and displays only contextually relevant data.

---

## Current State Analysis

### ✅ Already Implemented Correctly

| Feature | Method | Status | Location |
|---------|--------|--------|----------|
| **Bookings** | API-level filtering | ✅ Complete | `apps/web/src/lib/api/bookings.ts:147-154` |
| **Listings** | Client-side filtering | ✅ Complete | `apps/web/src/app/(authenticated)/listings/page.tsx:132-146` |

### ✅ Implemented in v2.0 (2026-01-23)

| Feature | Method | Status | Implementation |
|---------|--------|--------|----------------|
| **Financials** | API-level filtering | ✅ Complete | `apps/web/src/app/api/financials/route.ts:37-53` |
| **Referrals** | Bidirectional (no role filter) | ✅ Complete | `apps/web/src/app/api/referrals/route.ts:36-44` |
| **Dashboard KPIs** | Role-specific response | ✅ Complete | `apps/web/src/app/api/dashboard/kpis/route.ts:119-175` |
| **Dashboard Summary** | Role-specific response | ✅ Complete | `apps/web/src/app/api/dashboard/summary/route.ts:96-117` |

### ✅ Already Correct (No Changes Needed)

| Feature | Method | Status | Reason |
|---------|--------|--------|--------|
| **Reviews** | Separate endpoints | ✅ Correct | `/api/reviews/received` and `/api/reviews/given` already handle bidirectional reviews |
| **Messages** | Role-agnostic | ✅ Correct | Social connections, not role-specific |
| **Network** | Bidirectional | ✅ Correct | Connection graph, same for all roles |
| **Wiselists** | Personal collections | ✅ Correct | Not role-specific, user's personal saved items |

---

## Architectural Strategy

### CRITICAL UNDERSTANDING: Bidirectional Multi-Role System

**Key Principle**: The Tutorwise platform is **multi-role** and **bidirectional**. Any user can:
- ✅ Act as BOTH sender AND receiver in any feature
- ✅ Hold multiple roles simultaneously (tutor + client + agent)
- ✅ Perform the same action in different role contexts

**Agent = Tutor + Recruiter**: Agent role inherits all tutor capabilities plus agent-specific features (referrals, commissions).

**Mental Model**:
| Role | Purpose | What They See |
|------|---------|---------------|
| **Client** | "I'm looking for help" | Tutoring requests I created, payments I made, sessions I booked |
| **Tutor** | "I'm providing help" | Service listings I offer, earnings from teaching, clients I teach |
| **Agent** | "I'm providing help AND recruiting" | Everything Tutor sees + referrals I made, commissions I earned |

**Examples**:
- An **Agent** can teach sessions (like tutor) AND make referrals (agent-specific)
- A **Tutor** can create listings (services) AND make client requests (when they need help)
- A **Client** can book sessions AND refer other clients

### Three-Layer Defense Model

```
┌────────────────────────────────────────────────────┐
│  Layer 1: Page Access Control (Role Guard)         │
│  useRoleGuard(['tutor', 'client', 'agent'])        │
│  → Prevents unauthorized role from accessing page  │
└──────────────────┬─────────────────────────────────┘
                   │
┌──────────────────▼─────────────────────────────────┐
│  Layer 2: Database Security (RLS Policies)          │
│  WHERE profile_id = auth.uid()                      │
│  → Ensures users only query their own records       │
└──────────────────┬─────────────────────────────────┘
                   │
┌──────────────────▼─────────────────────────────────┐
│  Layer 3: Role-Context Filtering (This Doc)        │
│  NOT "hide data" but "show relevant context"        │
│  → Displays role-appropriate VIEW of user's data    │
└────────────────────────────────────────────────────┘
```

### Filtering Method Decision Matrix

| Use Case | Recommended Method | Rationale |
|----------|-------------------|-----------|
| **Transactional** (bookings, payments) | API-level | Security critical, involves money |
| **Catalog/Browse** (listings, network) | Client-side | Fast role switching, user owns all data |
| **Messaging** (messages, reviews) | API-level | Role-specific inbox/outbox logic |
| **Aggregates** (dashboard, stats) | Computed queries | Dynamic calculations per role |

---

## Implementation Summary (v2.0)

### Changes Made on 2026-01-23

#### 1. ✅ Financials API - API-Level Filtering
**File**: [apps/web/src/app/api/financials/route.ts](../apps/web/src/app/api/financials/route.ts)
**Changes**: Lines 37-53

- Added role detection by fetching `active_role` from profiles table
- Client role: Shows only `['Booking Payment', 'Referral Commission']` transactions
- Tutor role: Shows only `['Tutoring Payout', 'Referral Commission']` transactions
- Agent role: Shows ALL transaction types (no filtering)

**Method**: API-level filtering using `.in('type', [...])` on transactions query

#### 2. ✅ Referrals API - Bidirectional Filtering
**File**: [apps/web/src/app/api/referrals/route.ts](../apps/web/src/app/api/referrals/route.ts)
**Changes**: Lines 36-44

- Changed from `.eq('agent_id', user.id)` to `.or('agent_id.eq.${user.id},referred_profile_id.eq.${user.id}')`
- Now shows referrals where user is EITHER the agent (who made referral) OR the referred user
- Added `agent:profiles!agent_id(...)` join to show both sides of referral relationship
- NO role filtering - same data for all roles (referrals are permanent and role-agnostic)

**Method**: Bidirectional API filtering (no role context)

#### 3. ✅ Dashboard KPIs - Role-Specific Response
**File**: [apps/web/src/app/api/dashboard/kpis/route.ts](../apps/web/src/app/api/dashboard/kpis/route.ts)
**Changes**: Lines 119-175

- Client role: Returns `totalSpent`, `spentChangePercent`, `totalHoursLearned`, session metrics
- Tutor/Agent role: Returns `totalEarnings`, `earningsChangePercent`, `totalHoursTaught`, student metrics
- Different KPI structure per role instead of returning all KPIs

**Method**: Role-specific response shaping from `user_statistics_daily` table

#### 4. ✅ Dashboard Summary - Role-Specific Response
**File**: [apps/web/src/app/api/dashboard/summary/route.ts](../apps/web/src/app/api/dashboard/summary/route.ts)
**Changes**: Lines 96-117

- Client role: Returns `total_spent` in financials object
- Tutor/Agent role: Returns `total_earnings` and `pending_earnings` in financials object
- Shared data: urgent reviews, upcoming bookings, reputation (same for all roles)

**Method**: Role-specific response shaping

---

## Feature-by-Feature Implementation Plan

### 1. ✅ COMPLETE: Financials (Payouts, Disputes, Transactions)

**Implementation**: 2026-01-23
**Status**: ✅ Complete
**Method**: API-level filtering

#### Required Logic

```typescript
// apps/web/src/lib/api/financials.ts

export async function getMyTransactions() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get active role
  const { data: profile } = await supabase
    .from('profiles')
    .select('active_role')
    .eq('id', user.id)
    .single();

  const activeRole = profile.active_role;

  let query = supabase.from('transactions').select('*');

  if (activeRole === 'client') {
    // Clients see: payments made to tutors (negative amounts) + referral bonuses received (positive amounts)
    // Filter: profile_id = user AND (type = 'Booking Payment' OR type = 'Referral Commission')
    query = query
      .eq('profile_id', user.id)
      .in('type', ['Booking Payment', 'Referral Commission']);
  } else if (activeRole === 'tutor') {
    // Tutors see: earnings from teaching (positive amounts) + payments to agents (negative amounts)
    // Filter: profile_id = user AND (type = 'Tutoring Payout' OR type = 'Referral Commission')
    query = query
      .eq('profile_id', user.id)
      .in('type', ['Tutoring Payout', 'Referral Commission']);
  } else if (activeRole === 'agent') {
    // Agents = Tutors + Recruiters
    // See: teaching earnings + commission earnings + referral payments
    // Filter: profile_id = user (show all transaction types)
    query = query.eq('profile_id', user.id);
  }

  return query.order('created_at', { ascending: false });
}
```

#### Files to Modify

- [ ] `apps/web/src/lib/api/financials.ts` (if exists)
- [ ] `apps/web/src/app/(authenticated)/financials/page.tsx`
- [ ] `apps/web/src/app/(authenticated)/financials/payouts/page.tsx`
- [ ] `apps/web/src/app/(authenticated)/financials/disputes/page.tsx`

#### Test Cases

- [ ] Client sees 'Booking Payment' (negative) + 'Referral Commission' (positive if they referred someone)
- [ ] Tutor sees 'Tutoring Payout' (positive) + 'Referral Commission' (can be positive or negative)
- [ ] Agent sees all transaction types (teaching payouts + commissions + all payments)
- [ ] Role switching updates financial data immediately
- [ ] Dashboard stats reflect role-filtered totals
- [ ] Transaction amounts correctly show debits (negative) vs credits (positive)

---

### 2. 🟡 HIGH: Referrals

**Current State**: Uses `/api/referrals` route - needs audit
**Priority**: 🟡 High
**Estimated Effort**: 1 day

#### Required Logic

```typescript
// apps/web/src/app/api/referrals/route.ts

export async function GET(request: Request) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('active_role')
    .eq('id', user.id)
    .single();

  const activeRole = profile.active_role;

  let query = supabase
    .from('referrals')
    .select(`
      *,
      referrer:profiles!referrer_profile_id(id, full_name, avatar_url),
      referred:profiles!referred_profile_id(id, full_name, avatar_url)
    `);

  if (activeRole === 'client') {
    // Clients see: referrals they made OR received (both directions)
    query = query.or(`referrer_profile_id.eq.${user.id},referred_profile_id.eq.${user.id}`);
  } else if (activeRole === 'tutor') {
    // Tutors see: referrals they made OR received (both directions)
    query = query.or(`referrer_profile_id.eq.${user.id},referred_profile_id.eq.${user.id}`);
  } else if (activeRole === 'agent') {
    // Agents = Tutors + Recruiters
    // See: all referrals they made OR received (both directions)
    query = query.or(`referrer_profile_id.eq.${user.id},referred_profile_id.eq.${user.id}`);
  }

  const { data: referrals } = await query.order('created_at', { ascending: false });
  return NextResponse.json({ referrals: referrals || [] });
}
```

**Note**: All roles see the same referral data (bidirectional), but the filtering logic is kept consistent for future enhancements (e.g., agent-specific referral types).

#### Files to Modify

- [ ] `apps/web/src/app/api/referrals/route.ts`
- [ ] `apps/web/src/app/(authenticated)/referrals/page.tsx`
- [ ] `apps/web/src/lib/api/referrals.ts`

#### Test Cases

- [ ] All roles see referrals they made AND received
- [ ] Agent role sees all referral activity
- [ ] Dashboard counts accurately reflect referrals for each role

---

### 3. 🟡 HIGH: Reviews

**Current State**: Unknown - requires audit
**Priority**: 🟡 High
**Estimated Effort**: 1 day

#### Required Logic

```typescript
// apps/web/src/lib/api/reviews.ts

export async function getMyReviews() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('active_role')
    .eq('id', user.id)
    .single();

  const activeRole = profile.active_role;

  let query = supabase
    .from('profile_reviews')
    .select(`
      *,
      reviewer:profiles!reviewer_id(id, full_name, avatar_url),
      reviewee:profiles!reviewee_id(id, full_name, avatar_url)
    `);

  if (activeRole === 'client') {
    // Clients see: reviews they wrote about tutors (they are reviewer)
    query = query.eq('reviewer_id', user.id);
  } else if (activeRole === 'tutor') {
    // Tutors see: reviews about their teaching (they are reviewee)
    query = query.eq('reviewee_id', user.id);
  } else if (activeRole === 'agent') {
    // Agents = Tutors + Recruiters
    // See: reviews about their teaching (same as tutor)
    query = query.eq('reviewee_id', user.id);
  }

  return query.order('created_at', { ascending: false });
}
```

#### Files to Modify

- [ ] `apps/web/src/lib/api/reviews.ts` (create if doesn't exist)
- [ ] `apps/web/src/app/(authenticated)/reviews/page.tsx`

#### Test Cases

- [ ] Client sees reviews they wrote about tutors
- [ ] Tutor sees reviews about their teaching
- [ ] Agent sees reviews about their teaching (same as tutor)
- [ ] Average rating reflects role-filtered reviews

---

### 4. 🟡 HIGH: Messages

**Current State**: Unknown - requires audit
**Priority**: 🟡 High
**Estimated Effort**: 2 days

#### Required Logic

```typescript
// apps/web/src/lib/api/messages.ts

export async function getMyConversations() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('active_role')
    .eq('id', user.id)
    .single();

  const activeRole = profile.active_role;

  // Get conversations where user is participant
  let query = supabase
    .from('conversations')
    .select(`
      *,
      messages(id, content, created_at, sender_id),
      participants!inner(profile_id, role_context)
    `)
    .eq('participants.profile_id', user.id);

  // Filter by role context
  if (activeRole === 'client') {
    // Clients see: conversations about their tutoring requests
    query = query.eq('participants.role_context', 'client');
  } else if (activeRole === 'tutor') {
    // Tutors see: conversations about their service offerings
    query = query.eq('participants.role_context', 'tutor');
  } else if (activeRole === 'agent') {
    // Agents = Tutors + Recruiters
    // See: conversations about service offerings (same as tutor) + agent-specific
    query = query.in('participants.role_context', ['tutor', 'agent']);
  }

  return query.order('updated_at', { ascending: false });
}
```

#### Files to Modify

- [ ] `apps/web/src/lib/api/messages.ts` (if exists)
- [ ] `apps/web/src/app/(authenticated)/messages/page.tsx`
- [ ] Database: Add `role_context` column to `conversation_participants` table (Migration 213)

#### Test Cases

- [ ] Client sees only messages related to their tutoring requests
- [ ] Tutor sees only messages from potential/current clients
- [ ] Agent sees tutor messages + agent-specific messages
- [ ] Unread count reflects role-filtered messages

---

### 5. 🟢 MEDIUM: Network (Connections)

**Current State**: Unknown - requires audit
**Priority**: 🟢 Medium
**Estimated Effort**: 1 day

#### Required Logic

```typescript
// apps/web/src/lib/api/network.ts

export async function getMyConnections() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('active_role')
    .eq('id', user.id)
    .single();

  const activeRole = profile.active_role;

  // Get all connections
  let query = supabase
    .from('profile_graph')
    .select(`
      *,
      profile:profiles!profile_id(*),
      connected_profile:profiles!connected_profile_id(*)
    `)
    .or(`profile_id.eq.${user.id},connected_profile_id.eq.${user.id}`);

  // All roles see all their connections
  // Agent sees same connections as tutor (Agent = Tutor + Recruiter)
  const { data: connections } = await query;

  return connections;
}
```

**Note**: Network connections are bidirectional and shown to all roles. No role-based filtering needed.

#### Files to Modify

- [ ] `apps/web/src/lib/api/network.ts` (if exists)
- [ ] `apps/web/src/app/(authenticated)/network/page.tsx`

#### Test Cases

- [ ] All roles see all their connections
- [ ] Agent sees same connections as they would in tutor role
- [ ] Connection counts are consistent across roles

---

### 6. 🟢 MEDIUM: My Students

**Current State**: Likely tutor-only page
**Priority**: 🟢 Medium
**Estimated Effort**: 1 day

#### Required Logic

```typescript
// apps/web/src/lib/api/students.ts

export async function getMyStudents() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Accessible in tutor and agent roles
  // Get students from completed/ongoing bookings
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      client_id,
      client:profiles!client_id(id, full_name, avatar_url)
    `)
    .eq('tutor_id', user.id)
    .in('status', ['Confirmed', 'Completed']);

  // Deduplicate students
  const uniqueStudents = Array.from(
    new Map(bookings.map(b => [b.client_id, b.client])).values()
  );

  return uniqueStudents;
}
```

#### Files to Modify

- [ ] `apps/web/src/lib/api/students.ts` (create if doesn't exist)
- [ ] `apps/web/src/app/(authenticated)/my-students/page.tsx`
- [ ] Update role guard to allow both tutor and agent roles

#### Test Cases

- [ ] Tutor sees students they have taught
- [ ] Agent sees same students as they would in tutor role
- [ ] Page is role-guarded (tutors and agents only, not clients)

---

### 7. 🟡 HIGH: Dashboard (Aggregates & KPIs)

**Current State**: Likely shows all user data without role context
**Priority**: 🟡 High (affects UX significantly)
**Estimated Effort**: 2 days

#### Required Logic

Dashboard KPIs should reflect role-filtered data:

```typescript
// apps/web/src/app/(authenticated)/dashboard/page.tsx

const { activeRole } = useUserProfile();

// Role-specific KPIs
const kpis = useMemo(() => {
  if (activeRole === 'client') {
    return {
      totalRequests: roleFilteredListings.filter(l => l.listing_type === 'request').length,
      activeRequests: roleFilteredListings.filter(l => l.status === 'published').length,
      totalSpent: roleFilteredTransactions.reduce((sum, t) => sum + t.amount, 0),
      upcomingSessions: roleFilteredBookings.filter(b => b.status === 'Confirmed').length,
    };
  } else if (activeRole === 'tutor') {
    return {
      totalListings: roleFilteredListings.filter(l => l.listing_type !== 'request').length,
      publishedListings: roleFilteredListings.filter(l => l.status === 'published').length,
      totalEarnings: roleFilteredTransactions.reduce((sum, t) => sum + t.amount, 0),
      upcomingSessions: roleFilteredBookings.filter(b => b.status === 'Confirmed').length,
    };
  } else if (activeRole === 'agent') {
    // Agents = Tutors + Recruiters
    // Show tutor KPIs + agent-specific metrics
    return {
      // Tutor metrics (teaching)
      totalListings: roleFilteredListings.filter(l => l.listing_type !== 'request').length,
      publishedListings: roleFilteredListings.filter(l => l.status === 'published').length,
      totalEarnings: roleFilteredTransactions.reduce((sum, t) => sum + t.amount, 0),
      upcomingSessions: roleFilteredBookings.filter(b => b.status === 'Confirmed').length,
      // Agent-specific metrics (recruiting)
      totalReferrals: roleFilteredReferrals.length,
      activeReferrals: roleFilteredReferrals.filter(r => r.status === 'Active').length,
      conversionRate: calculateConversionRate(roleFilteredReferrals),
    };
  }
}, [activeRole, roleFilteredListings, roleFilteredTransactions, roleFilteredBookings, roleFilteredReferrals]);
```

#### Files to Modify

- [ ] `apps/web/src/app/(authenticated)/dashboard/page.tsx`
- [ ] All dashboard widget components
- [ ] Dashboard data fetching hooks

#### Test Cases

- [ ] Client KPIs show requests, spending, and upcoming sessions
- [ ] Tutor KPIs show listings, earnings, and upcoming sessions
- [ ] Agent KPIs show tutor metrics + referral/commission metrics
- [ ] KPIs change when role switches
- [ ] Charts show role-appropriate data
- [ ] Quick actions relevant to current role

---

## Database Changes Required

### New Columns

Some features may require additional columns to support role-based filtering:

| Table | Column | Type | Purpose |
|-------|--------|------|---------|
| `conversation_participants` | `role_context` | VARCHAR(20) | Track which role initiated conversation |
| `profile_graph` | `relationship_type` | VARCHAR(50) | Categorize connection types (agent-tutor, tutor-client) |

### Migration Files Needed

- [ ] `213_add_conversation_role_context.sql`
- [ ] `214_add_network_relationship_types.sql`

---

## Testing Strategy

### Unit Tests

For each API function:
```typescript
describe('getMyBookings', () => {
  it('returns only client bookings when role is client', async () => {
    const bookings = await getMyBookings();
    expect(bookings.every(b => b.client_id === user.id)).toBe(true);
  });

  it('returns only tutor bookings when role is tutor', async () => {
    const bookings = await getMyBookings();
    expect(bookings.every(b => b.tutor_id === user.id)).toBe(true);
  });
});
```

### Integration Tests

- [ ] Role switching updates all features simultaneously
- [ ] Data counts remain consistent across pages
- [ ] No data leakage between roles

### E2E Tests

- [ ] Create multi-role user (tutor + client)
- [ ] Create data in both roles
- [ ] Switch roles and verify data segregation
- [ ] Verify dashboard KPIs update correctly

---

## Rollout Plan

### Phase 1: Critical Security (Week 1)
1. ✅ Listings (COMPLETE)
2. 🔴 Financials
3. ✅ Bookings (COMPLETE)

### Phase 2: High Priority (Week 2)
4. 🟡 Referrals
5. 🟡 Reviews
6. 🟡 Messages
7. 🟡 Dashboard

### Phase 3: Medium Priority (Week 3)
8. 🟢 Network
9. 🟢 My Students
10. 🟢 Wiselists

### Phase 4: Audit & Testing (Week 4)
11. Comprehensive testing
12. Bug fixes
13. Performance optimization
14. Documentation updates

---

## Success Criteria

- [ ] All features implement role-based filtering
- [ ] Zero data leakage between roles
- [ ] Role switching is instant (<100ms)
- [ ] Dashboard KPIs accurate for each role
- [ ] All E2E tests pass
- [ ] Security audit passed
- [ ] Performance benchmarks met

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing functionality | High | Comprehensive testing, gradual rollout |
| Performance degradation | Medium | Query optimization, caching strategy |
| User confusion during migration | Low | Clear communication, changelog |
| Database migration failures | High | Test on staging, backup before migration |

---

## Rollback Plan

If critical issues arise:
1. Revert database migrations (if any)
2. Deploy previous version of affected features
3. Re-enable feature flags to disable new filtering
4. Investigate issues in isolated environment
5. Fix and re-deploy with additional testing

---

## Next Steps

1. **Review this document** with team/stakeholders
2. **Prioritize features** based on business needs
3. **Start with Financials** (highest security impact)
4. **Implement in phases** per rollout plan
5. **Track progress** using the todo list

---

## Document Maintenance

- **Owner**: Development Team
- **Review Frequency**: Weekly during implementation
- **Update Trigger**: New features added, requirements change
- **Version History**:
  - v1.0 (2026-01-22): Initial migration plan created

