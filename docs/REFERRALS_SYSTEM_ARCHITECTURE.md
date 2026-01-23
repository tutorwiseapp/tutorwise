# Referrals System Architecture
**Created**: 2026-01-23
**Purpose**: Document the ACTUAL referrals table structure and design philosophy

---

## Core Principle: ANY User Role Can Make Referrals

The referrals system is designed as a **two-sided marketplace** where:
- ✅ **Clients** can refer other clients (demand-side referrals)
- ✅ **Tutors** can refer other tutors (supply-side referrals)
- ✅ **Agents** can refer both clients and tutors (full-sided referrals)

The column name `agent_id` does NOT mean "only agents can refer" - it means "the person who made the referral acting as an agent/referrer".

---

## Database Schema (Current State)

### Referrals Table

```sql
CREATE TABLE public.referrals (
    id uuid PRIMARY KEY,

    -- WHO made the referral (ANY role: client, tutor, agent)
    agent_id uuid NOT NULL REFERENCES public.profiles(id),
    -- Migration 052: Renamed from referrer_profile_id → agent_id

    -- WHO was referred (the new user who signed up)
    referred_profile_id uuid REFERENCES public.profiles(id),

    -- WHAT type of user was referred
    referral_target_type TEXT DEFAULT 'tutor',
    -- Migration 122: Added for two-sided marketplace
    -- Values: 'tutor' (supply-side) or 'client' (demand-side)

    -- HOW was the referral attributed
    attribution_method TEXT,
    -- Migration 117: Added for hierarchical attribution
    -- Values: 'url_parameter', 'cookie', 'manual_entry', NULL (organic)

    -- Referral lifecycle
    status referral_status_enum NOT NULL DEFAULT 'Referred',
    -- Values: 'Referred', 'Signed Up', 'Converted', 'Expired'

    booking_id uuid REFERENCES public.bookings(id),
    transaction_id uuid REFERENCES public.transactions(id),

    created_at TIMESTAMPTZ NOT NULL,
    signed_up_at TIMESTAMPTZ,
    converted_at TIMESTAMPTZ
);
```

### Key Migrations

1. **Migration 051** - Renamed `referrer_profile_id` → `agent_id` in **bookings** table
2. **Migration 052** - Renamed `referrer_profile_id` → `agent_id` in **referrals** table
3. **Migration 117** - Added `attribution_method` (hierarchical attribution)
4. **Migration 122** - Added `referral_target_type` (two-sided marketplace)

---

## Column Name Philosophy

### Why `agent_id` and NOT `referrer_profile_id`?

The rename from `referrer_profile_id` to `agent_id` was intentional to:

1. **Align with three-role system**: `client_id`, `tutor_id`, `agent_id`
2. **Semantic clarity**: "agent" = someone acting on behalf of the platform to bring in users
3. **Role-agnostic**: A client making a referral is "acting as an agent" in that context

**Important**: `agent_id` ≠ "user must have agent role"

A client with `roles = ['client']` can have records in `referrals.agent_id` because:
- They are acting as a referral agent (lowercase 'a')
- They are NOT necessarily an Agent (capital 'A' - the platform role)

---

## Two-Sided Marketplace Design (Migration 122)

### Supply-Side Referrals (Tutor Referrals)
```
Agent → Refers Tutor → Tutor signs up → Tutor makes bookings → Agent earns 10% commission
```

**Example**: Sarah (tutor) refers John (tutor). When John makes £100 from a booking:
- John earns: £80 (80%)
- Sarah (agent) earns: £10 (10% commission)
- Platform: £10 (10% fee)

### Demand-Side Referrals (Client Referrals)
```
Agent → Refers Client → Client signs up → Client books sessions → Agent earns 5% commission
```

**Example**: Sarah (client) refers Emily (client). When Emily books a £100 session:
- Tutor earns: £85 (85%)
- Sarah (agent) earns: £5 (5% commission)
- Platform: £10 (10% fee)

**Why 5% vs 10%?**
- Tutor referrals are harder (supply-side)
- Client referrals are easier (demand-side)
- Different commission rates incentivize balanced growth

---

## Role-Based Filtering for Referrals

### Current Behavior (Needs Implementation)

**Question**: Should referrals be filtered by active role?

**Answer**: **NO** - Referrals should show ALL referrals where user is involved (bidirectional)

### Correct Implementation

```typescript
// apps/web/src/app/api/referrals/route.ts

export async function GET(request: Request) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get ALL referrals where user is either:
  // 1. The agent (person who made the referral)
  // 2. The referred user (person who was referred)

  const { data: referrals } = await supabase
    .from('referrals')
    .select(`
      *,
      agent:profiles!agent_id(id, full_name, avatar_url),
      referred:profiles!referred_profile_id(id, full_name, avatar_url)
    `)
    .or(`agent_id.eq.${user.id},referred_profile_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  return NextResponse.json({ referrals: referrals || [] });
}
```

### Why NO Role Filtering?

1. **Bidirectional nature**: Users can both MAKE and RECEIVE referrals in any role
2. **Context independence**: A referral I made as a client is still relevant when I'm a tutor
3. **Commission tracking**: I need to see ALL my earnings regardless of current role

### UI Enhancement (Optional)

Instead of filtering by role, add **visual indicators**:

```typescript
function ReferralCard({ referral, currentUserId, activeRole }) {
  const isMadeByMe = referral.agent_id === currentUserId;
  const badge = isMadeByMe ? "I Referred" : "Referred to Me";

  // Show role-appropriate context
  const contextLabel = activeRole === 'client'
    ? `As ${referral.referral_target_type === 'client' ? 'Client' : 'Tutor'} Referral`
    : `${referral.referral_target_type} Referral`;

  return (
    <Card>
      <Badge>{badge}</Badge>
      <Text>{contextLabel}</Text>
      {/* Show commission if I'm the agent */}
      {isMadeByMe && <CommissionAmount amount={referral.commission} />}
    </Card>
  );
}
```

---

## Summary for Role-Based Filtering Implementation

### ✅ Correct Approach
- **Filter**: Show ALL referrals where `agent_id = user.id OR referred_profile_id = user.id`
- **No role filtering**: Same data regardless of active role
- **UI context**: Add role-aware labels and grouping

### ❌ Wrong Approach
- ~~Filter by active role (client vs tutor vs agent)~~
- ~~Show only "agent role" referrals~~
- ~~Hide referrals when switching roles~~

### Why This Matters
- A client who referred 10 people should see those 10 referrals regardless of whether they're currently in "client" or "tutor" role
- Commissions earned from referrals are part of their financial history in ALL roles
- The referral relationship is permanent and role-agnostic

---

## Integration with Financials

Referral commissions show up in the `transactions` table:

```sql
SELECT * FROM transactions
WHERE profile_id = user.id
  AND type = 'Referral Commission';
```

**For role-based filtering**:
- Client role: Shows referral commissions received (if they referred someone)
- Tutor role: Shows referral commissions received (if they referred someone)
- Agent role: Shows ALL transactions including referral commissions

The transactions ARE filtered by role (see Financials section), but the underlying referral records are NOT.
