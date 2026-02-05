# Role-Based Filtering: Actual Implementation State
**Created**: 2026-01-23
**Purpose**: Document the ACTUAL state of role-based filtering vs what the migration doc assumes

---

## Summary of Findings

After reading the actual database schema and API implementations, here's what I found:

### ✅ Already Correctly Implemented

| Feature | Status | Implementation | Notes |
|---------|--------|----------------|-------|
| **Bookings** | ✅ Complete | API-level filtering in `/lib/api/bookings.ts` | Uses `client_id`, `tutor_id`, `agent_id` columns |
| **Listings** | ✅ Complete | Client-side filtering in `/app/(authenticated)/listings/page.tsx` | Filters by `listing_type` (`request` vs service) |
| **Reviews** | ✅ Complete | Separate API endpoints `/api/reviews/received` & `/api/reviews/given` | Bidirectional: `reviewer_id` & `reviewee_id` |
| **Messages** | ✅ Complete | Filtered by `profile_graph` connections | Uses `chat_messages` with `sender_id` & `receiver_id` |
| **Network** | ✅ Complete | Shows all connections from `profile_graph` | Uses `source_profile_id` & `target_profile_id` |

### ❌ Needs Implementation

| Feature | Priority | Issue | Required Changes |
|---------|----------|-------|------------------|
| **Financials** | 🔴 Critical | Migration doc has wrong column names | Use `profile_id` + `type` filtering, NOT `payer_id`/`recipient_id` |
| **Referrals** | 🟡 High | Migration doc has wrong column names | Use `referrer_profile_id` & `referred_profile_id` (NOT `referrer_id`/`referred_user_id`) |
| **Dashboard** | 🟡 High | No role-based KPI filtering | Aggregate data needs role-aware calculations |

---

## Detailed Analysis

### 1. Transactions Table (Financials)

**WRONG in Migration Doc**:
```typescript
// ❌ These columns don't exist!
query.eq('payer_id', user.id)
query.eq('recipient_id', user.id)
```

**ACTUAL Schema** (from `028_create_hubs_v3_6_schema.sql`):
```sql
CREATE TABLE public.transactions (
    id uuid PRIMARY KEY,
    profile_id uuid REFERENCES public.profiles(id), -- The user this transaction belongs to
    booking_id uuid REFERENCES public.bookings(id),
    type transaction_type_enum NOT NULL, -- 'Booking Payment', 'Tutoring Payout', 'Referral Commission', 'Withdrawal', 'Platform Fee'
    amount DECIMAL(10, 2) NOT NULL, -- Negative for debits, Positive for credits
    status transaction_status_enum NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);
```

**Correct Implementation**:
```typescript
// Filter by profile_id AND type
if (activeRole === 'client') {
  // Clients see: payments to tutors (negative) + referral bonuses (positive)
  query = query
    .eq('profile_id', user.id)
    .in('type', ['Booking Payment', 'Referral Commission']);
} else if (activeRole === 'tutor') {
  // Tutors see: teaching earnings (positive) + referral payments (can be either)
  query = query
    .eq('profile_id', user.id)
    .in('type', ['Tutoring Payout', 'Referral Commission']);
} else if (activeRole === 'agent') {
  // Agents see ALL transaction types (teaching + commissions + payments)
  query = query.eq('profile_id', user.id);
}
```

---

### 2. Referrals Table

**WRONG in Migration Doc**:
```typescript
// ❌ These columns don't exist!
referrer:profiles!referrer_id
referred:profiles!referred_user_id
```

**ACTUAL Schema** (from `028_create_hubs_v3_6_schema.sql`):
```sql
CREATE TABLE public.referrals (
    id uuid PRIMARY KEY,
    referrer_profile_id uuid NOT NULL REFERENCES public.profiles(id), -- The user who made the referral
    referred_profile_id uuid REFERENCES public.profiles(id), -- The new user who signed up
    status referral_status_enum NOT NULL,
    booking_id uuid REFERENCES public.bookings(id),
    transaction_id uuid REFERENCES public.transactions(id),
    created_at TIMESTAMPTZ NOT NULL
);
```

**Correct Implementation**:
```typescript
let query = supabase
  .from('referrals')
  .select(`
    *,
    referrer:profiles!referrer_profile_id(id, full_name, avatar_url),
    referred:profiles!referred_profile_id(id, full_name, avatar_url)
  `);

// All roles see bidirectional referrals
query = query.or(`referrer_profile_id.eq.${user.id},referred_profile_id.eq.${user.id}`);
```

---

### 3. Bookings Table

**✅ CORRECT in Migration Doc AND Code**

**Schema** (from `028_create_hubs_v3_6_schema.sql`, updated by migrations 049 & 051):
```sql
CREATE TABLE public.bookings (
    id uuid PRIMARY KEY,
    client_id uuid REFERENCES public.profiles(id), -- Updated from student_id
    tutor_id uuid REFERENCES public.profiles(id),
    agent_id uuid REFERENCES public.profiles(id), -- Updated from referrer_profile_id
    listing_id uuid REFERENCES public.listings(id),
    service_name TEXT NOT NULL,
    session_start_time TIMESTAMPTZ NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status booking_status_enum NOT NULL,
    payment_status transaction_status_enum NOT NULL
);
```

**Current Implementation** (`/lib/api/bookings.ts:146-154`):
```typescript
if (activeRole === 'client') {
  query = query.eq('client_id', user.id);
} else if (activeRole === 'tutor') {
  query = query.eq('tutor_id', user.id);
} else if (activeRole === 'agent') {
  query = query.or(`client_id.eq.${user.id},tutor_id.eq.${user.id},agent_id.eq.${user.id}`);
}
```

**Status**: ✅ **No changes needed**

---

### 4. Reviews Table

**✅ CORRECT Implementation (Better than Migration Doc)**

**Schema** (from reviews migrations):
```sql
CREATE TABLE public.profile_reviews (
    id uuid PRIMARY KEY,
    reviewer_id uuid REFERENCES public.profiles(id), -- Who wrote the review
    reviewee_id uuid REFERENCES public.profiles(id), -- Who is being reviewed
    session_id uuid REFERENCES public.review_sessions(id),
    rating INTEGER NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL
);
```

**Current Implementation** (Separate endpoints):
- `/api/reviews/received` - Shows reviews WHERE `reviewee_id = user.id` (reviews ABOUT me)
- `/api/reviews/given` - Shows reviews WHERE `reviewer_id = user.id` (reviews BY me)

**Why This is Better**:
- Naturally bidirectional - all users can write AND receive reviews
- No role filtering needed - UI just switches default tab based on role
- Client-focused: defaults to "Reviews I Wrote" tab
- Tutor/Agent-focused: defaults to "Reviews About Me" tab

**Status**: ✅ **No API changes needed**, optional UI enhancement for role-aware default tab

---

### 5. Messages/Chat

**✅ CORRECT Implementation**

**Schema** (from chat migrations):
```sql
CREATE TABLE public.chat_messages (
    id uuid PRIMARY KEY,
    sender_id uuid REFERENCES public.profiles(id),
    receiver_id uuid REFERENCES public.profiles(id),
    content TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL
);
```

**Current Implementation** (`/app/api/messages/conversations/route.ts`):
- Fetches all `profile_graph` connections WHERE `status = 'ACTIVE'` AND `relationship_type = 'SOCIAL'`
- Fetches all `chat_messages` WHERE user is sender OR receiver
- Groups messages by conversation partner

**Why Role Filtering is NOT Needed**:
- Messages are inherently role-agnostic
- Based on social connections, not business roles
- A client messaging a tutor sees the same conversation regardless of their active role

**Migration Doc Assumption (WRONG)**:
```typescript
// ❌ This assumes a non-existent role_context column!
query = query.eq('participants.role_context', activeRole);
```

**Status**: ✅ **No changes needed**, remove from migration doc as unnecessary

---

### 6. Network/Connections

**✅ CORRECT Implementation**

**Schema** (from `061_add_profile_graph_v4_6.sql`):
```sql
CREATE TABLE public.profile_graph (
    id uuid PRIMARY KEY,
    source_profile_id uuid REFERENCES public.profiles(id),
    target_profile_id uuid REFERENCES public.profiles(id),
    relationship_type relationship_type NOT NULL, -- 'SOCIAL', 'BOOKING', 'GUARDIAN', 'AGENT_REFERRAL'
    status relationship_status NOT NULL, -- 'ACTIVE', 'PENDING', 'BLOCKED'
    created_at TIMESTAMPTZ NOT NULL
);
```

**Current Implementation** (`/app/api/messages/conversations/route.ts:29-43`):
```typescript
const { data: connections } = await supabase
  .from('profile_graph')
  .select('*')
  .eq('status', 'ACTIVE')
  .eq('relationship_type', 'SOCIAL')
  .or(`source_profile_id.eq.${user.id},target_profile_id.eq.${user.id}`);
```

**Why Role Filtering is NOT Needed**:
- Connections are bidirectional and role-agnostic
- A user's network is the same regardless of their active role
- An agent connected to a tutor sees the same connection in both roles

**Status**: ✅ **No changes needed**

---

### 7. Dashboard KPIs

**❌ NEEDS IMPLEMENTATION**

**Current State**: Unknown - needs audit of `/app/(authenticated)/dashboard/page.tsx`

**Required Changes**:
```typescript
const kpis = useMemo(() => {
  if (activeRole === 'client') {
    return {
      totalRequests: roleFilteredListings.filter(l => l.listing_type === 'request').length,
      totalSpent: roleFilteredTransactions
        .filter(t => t.type === 'Booking Payment')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0),
      upcomingSessions: roleFilteredBookings.length,
    };
  } else if (activeRole === 'tutor') {
    return {
      totalListings: roleFilteredListings.filter(l => l.listing_type !== 'request').length,
      totalEarnings: roleFilteredTransactions
        .filter(t => t.type === 'Tutoring Payout')
        .reduce((sum, t) => sum + t.amount, 0),
      upcomingSessions: roleFilteredBookings.length,
    };
  } else if (activeRole === 'agent') {
    return {
      // Tutor metrics
      totalListings: roleFilteredListings.filter(l => l.listing_type !== 'request').length,
      totalEarnings: roleFilteredTransactions
        .filter(t => ['Tutoring Payout', 'Referral Commission'].includes(t.type))
        .reduce((sum, t) => sum + t.amount, 0),
      // Agent-specific metrics
      totalReferrals: roleFilteredReferrals.length,
      conversionRate: calculateConversionRate(roleFilteredReferrals),
    };
  }
}, [activeRole, roleFilteredListings, roleFilteredTransactions, roleFilteredBookings, roleFilteredReferrals]);
```

---

## Action Items

### Immediate Fixes Required

1. **Update Migration Doc**: Fix incorrect column names for transactions and referrals
2. **Audit Financials**: Check if `/app/(authenticated)/financials` exists and needs implementation
3. **Audit Dashboard**: Check KPI calculations in `/app/(authenticated)/dashboard/page.tsx`

### Optional Enhancements

4. **Reviews UI**: Add role-aware default tab (client → "Given", tutor/agent → "Received")
5. **Remove Unnecessary Items**: Remove Messages and Network from migration doc (already correct, no role filtering needed)

---

## Conclusion

The migration document was written with ASSUMPTIONS about the database schema instead of reading the actual code. This led to:
- ❌ Wrong column names for transactions (`payer_id`, `recipient_id` don't exist)
- ❌ Wrong column names for referrals (`referrer_id`, `referred_user_id` should be `referrer_profile_id`, `referred_profile_id`)
- ❌ Assuming Messages needs role filtering (it doesn't - it's role-agnostic)
- ❌ Assuming Network needs role filtering (it doesn't - connections are bidirectional)

The ACTUAL state shows that most features are already correctly implemented with bidirectional, role-agnostic designs. Only Financials and Dashboard need role-based filtering.

---

### 8. Wiselists

**✅ CORRECT Implementation (Role-Agnostic)**

**Current Implementation** (`/lib/api/wiselists.ts`):
- Owned lists: `WHERE profile_id = user.id`
- Collaborated lists: Via `wiselist_collaborators` table  
- Returns combined list with `is_owner` flag for UI filtering

**Why Role Filtering is NOT Needed**:
- Wiselists are personal collections, not business role-specific
- A tutor saving listings to a "Favorites" wiselist doesn't care about their active role
- Same wiselist is relevant regardless of whether user is acting as client/tutor/agent

**Status**: ✅ **No changes needed**

---

## REVISED Action Items

### Priority 1: Critical (Financials)

1. ✅ **Audit Actual Schema**: Completed - documented correct table structures
2. ❌ **Implement Financials Filtering**: Create filtering using correct `profile_id` + `type` columns
3. ❌ **Test Transaction Types**: Verify all 5 transaction types work with role filtering

### Priority 2: High (Dashboard & Referrals)  

4. ❌ **Audit Dashboard**: Check if KPIs use role-filtered data
5. ❌ **Fix Referrals**: Use correct column names (`agent_id`, `referred_profile_id`)

### Priority 3: Documentation

6. ❌ **Rewrite Migration Doc**: Remove wrong assumptions, fix column names
7. ❌ **Remove Unnecessary Sections**: Messages, Network, Wiselists don't need role filtering

### Conclusion UPDATE

Only **2 features** need role filtering:
1. **Financials** (Critical) - Not yet implemented
2. **Dashboard** (High) - Needs audit

Everything else is:
- ✅ Already correct (Bookings, Listings, Reviews)
- ✅ Correctly role-agnostic (Messages, Network, Wiselists)
