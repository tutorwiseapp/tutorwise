# Role-Based Filtering: Method Analysis & Standardization
**Created**: 2026-01-23
**Purpose**: Analyze current filtering methods and recommend standardization

---

## Current Implementation Methods

### Method 1: API-Level Filtering (Server-Side)
**Used by**: Bookings

```typescript
// apps/web/src/lib/api/bookings.ts
export async function getMyBookings() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch profile to get active_role
  const { data: profile } = await supabase
    .from('profiles')
    .select('active_role')
    .eq('id', user.id)
    .single();

  const activeRole = profile.active_role;

  // Apply role-based filter at API level
  let query = supabase.from('bookings').select('*');

  if (activeRole === 'client') {
    query = query.eq('client_id', user.id);
  } else if (activeRole === 'tutor') {
    query = query.eq('tutor_id', user.id);
  } else if (activeRole === 'agent') {
    query = query.or(`client_id.eq.${user.id},tutor_id.eq.${user.id},agent_id.eq.${user.id}`);
  }

  return query;
}
```

### Method 2: Client-Side Filtering (UI-Level)
**Used by**: Listings

```typescript
// apps/web/src/lib/api/listings.ts
export async function getMyListings() {
  const supabase = createClient();

  // Fetch ALL listings owned by user (NO role filtering)
  const { data } = await supabase
    .from('listings')
    .select('*')
    .eq('profile_id', user.id);

  return data; // Returns ALL listings
}

// apps/web/src/app/(authenticated)/listings/page.tsx
const roleFilteredListings = useMemo(() => {
  return rawListings.filter((listing) => {
    // Filter in React component based on activeRole
    if (activeRole === 'client') {
      return listing.listing_type === 'request';
    } else if (activeRole === 'tutor' || activeRole === 'agent') {
      return listing.listing_type !== 'request';
    }
    return true;
  });
}, [rawListings, activeRole]);
```

---

## Comparison: API-Level vs Client-Side

### API-Level Filtering (Method 1)

**Pros:**
- ✅ **Security**: Data never leaves the server
- ✅ **Performance**: Smaller payload, faster network transfer
- ✅ **Database efficiency**: Query only what's needed
- ✅ **Consistent**: Same logic applies to all clients
- ✅ **Scalable**: Handles large datasets (pagination at DB level)

**Cons:**
- ❌ **Extra database query**: Must fetch `active_role` from profiles
- ❌ **Network round-trip**: Additional latency for role lookup
- ❌ **Cache invalidation**: Role switch requires new API call

**Best for:**
- Security-critical data (payments, bookings, sensitive info)
- Large datasets (1000+ records)
- Multi-role involvement (agents see client + tutor + agent bookings)

---

### Client-Side Filtering (Method 2)

**Pros:**
- ✅ **Instant role switching**: No API call needed
- ✅ **Simpler API**: Just fetch all user's data
- ✅ **Better UX**: Immediate feedback on role switch
- ✅ **No extra queries**: Single database call
- ✅ **Client caching**: Data stays in React Query cache

**Cons:**
- ❌ **Security concern**: All data sent to client (visible in Network tab)
- ❌ **Performance**: Larger payload for datasets with mixed roles
- ❌ **Bandwidth**: Transfers data that won't be shown

**Best for:**
- User-owned data with clear segregation (requests vs services)
- Small/medium datasets (<100 records)
- Fast role switching UX
- Non-sensitive catalog data

---

## Current State Analysis

### ✅ Bookings (API-Level) - CORRECT ✓

**Why it's correct:**
- Bookings involve money (security-critical)
- Agent role sees 3x data (client + tutor + agent bookings)
- Typical user has 10-50 bookings (manageable size)
- Multi-party involvement (client, tutor, agent)

**Should we change it?** **NO** - Security justifies the approach.

---

### ✅ Listings (Client-Side) - CORRECT ✓

**Why it's correct:**
- User owns ALL their listings (requests + services)
- Clear binary split: `listing_type === 'request'` (client) vs `!== 'request'` (tutor/agent)
- Typical user has 1-10 listings (small dataset)
- Fast role switching is important for UX
- No security risk (user created these listings)

**Should we change it?** **NO** - UX benefits outweigh minimal security concern.

---

## Do We Need to Address Listings/Bookings?

### Answer: **NO - Both are correctly implemented for their use cases**

Neither needs changes because:

1. **Bookings**: API-level filtering is correct for security/financial data
2. **Listings**: Client-side filtering is correct for fast role-switching UX
3. **Both work perfectly**: No bugs, no performance issues, no security issues

---

## Standardization Recommendation

### Should We Standardize on One Method?

**Answer: NO - Use the right method for each feature**

### Decision Matrix: Which Method to Use?

```
┌────────────────────────────────────────────────────────┐
│  Use API-LEVEL FILTERING if ANY of these apply:       │
├────────────────────────────────────────────────────────┤
│  ✓ Involves money/payments (security critical)        │
│  ✓ Large dataset (>100 records typical)               │
│  ✓ Multi-role involvement (agent sees 3x data)        │
│  ✓ Complex joins (need DB-level aggregations)         │
│  ✓ Pagination required (can't fetch all at once)      │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  Use CLIENT-SIDE FILTERING if ALL of these apply:     │
├────────────────────────────────────────────────────────┤
│  ✓ Small dataset (<100 records typical)               │
│  ✓ User owns all data (no security risk)              │
│  ✓ Simple binary split (type A vs type B)             │
│  ✓ Fast role switching important (UX priority)        │
│  ✓ No sensitive data (public catalog, user content)   │
└────────────────────────────────────────────────────────┘
```

---

## Applying This to Remaining Features

### Financials (Transactions) - Use **API-LEVEL**
**Why:**
- ✅ Involves money (security critical)
- ✅ Can grow large (100+ transactions)
- ✅ Needs pagination eventually
- ✅ Complex type filtering (`type` enum with 5 values)

```typescript
// ✅ CORRECT: API-level filtering
export async function getMyTransactions() {
  const supabase = createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('active_role')
    .eq('id', user.id)
    .single();

  let query = supabase.from('transactions').select('*').eq('profile_id', user.id);

  if (activeRole === 'client') {
    query = query.in('type', ['Booking Payment', 'Referral Commission']);
  } else if (activeRole === 'tutor') {
    query = query.in('type', ['Tutoring Payout', 'Referral Commission']);
  }
  // Agent sees all types (no filter)

  return query;
}
```

---

### Dashboard KPIs - Use **COMPUTED QUERIES**
**Why:**
- ✅ Needs aggregations (SUM, COUNT)
- ✅ Performance critical (multiple metrics)
- ✅ Can leverage database indexes
- ✅ Reduces client processing

```typescript
// ✅ CORRECT: Computed at API level
export async function getDashboardKPIs(activeRole: string) {
  // Use RPC functions or direct aggregation queries
  const { data } = await supabase.rpc('get_role_kpis', {
    p_user_id: user.id,
    p_role: activeRole
  });

  return data;
}
```

---

### Referrals - Use **CLIENT-SIDE** (or NO FILTERING)
**Why:**
- ✅ Small dataset (<50 referrals typical)
- ✅ User sees ALL referrals regardless of role (bidirectional)
- ✅ No role filtering needed (show all)
- ✅ Fast switching between "Sent" vs "Received" tabs

```typescript
// ✅ CORRECT: No role filtering
export async function getMyReferrals() {
  const { data } = await supabase
    .from('referrals')
    .select('*')
    .or(`agent_id.eq.${user.id},referred_profile_id.eq.${user.id}`);

  return data; // Client can filter by direction in UI
}
```

---

## Summary

### Current State: ✅ BOTH CORRECT

| Feature | Method | Status | Action |
|---------|--------|--------|--------|
| Bookings | API-Level | ✅ Correct | **None** - Keep as-is |
| Listings | Client-Side | ✅ Correct | **None** - Keep as-is |

### Standardization: ❌ NOT RECOMMENDED

**Keep both methods** - they serve different purposes:
- **API-Level**: Security, scalability, complex queries
- **Client-Side**: UX, simplicity, instant switching

### For New Features

Use the **Decision Matrix** above to choose:
- **Financials** → API-Level (money + large dataset)
- **Dashboard** → Computed Queries (aggregations)
- **Referrals** → Client-Side or None (small + bidirectional)

---

## Action Items

### ❌ Do NOT Standardize
- Keep Bookings as API-level ✅
- Keep Listings as client-side ✅
- Use appropriate method for each new feature

### ✅ DO Implement
1. **Financials**: API-level filtering by `type`
2. **Dashboard**: Computed KPI queries
3. **Referrals**: Already correct (no role filtering)

### 📝 Document
- Add decision matrix to architecture docs
- Guideline: "Use API-level for money, client-side for catalogs"
- Examples of each method in codebase standards
